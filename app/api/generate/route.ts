import { NextResponse } from "next/server";
import { parseGenerateRequest } from "@/lib/generation/validate";
import { runGeneration } from "@/lib/generation/pipeline";
import { GenerationError } from "@/lib/generation/errors";
import { AIProviderError, type AIProviderErrorKind } from "@/lib/ai-provider";
import { logger } from "@/lib/logger";
import { localeFromCookieHeader } from "@/lib/i18n/config";
import { MESSAGES } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";

/**
 * Vercel's default serverless timeout (10s on Hobby, 15s on Pro) is shorter
 * than a typical Claude generation, which would cut requests off mid-call
 * in production. 60s is the Hobby ceiling; ClaudeProvider keeps a whole
 * call, its retry included, within 50s of it (lib/ai-provider/claude.ts).
 */
export const maxDuration = 60;

/**
 * Core Generate Pipeline entry point. This route is deliberately thin: it
 * parses the request, calls `runGeneration`, and maps whatever comes back
 * (success, GenerationError, or AIProviderError) to an HTTP response.
 * The actual pipeline — identity, tool/template lookup, plan limits,
 * usage, company context, prompt assembly, the Gateway call, persistence,
 * usage increment — lives in lib/generation/pipeline.ts, not here, so
 * that logic is testable and reusable independent of the HTTP layer.
 */
export async function POST(request: Request) {
  try {
    const body = await parseGenerateRequest(request);
    const result = await runGeneration(body);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error, localeFromCookieHeader(request.headers.get("cookie")));
  }
}

/**
 * Every branch here returns a message safe to show a real user — no
 * provider error text, no DB error text, no stack traces. Anything with
 * internal detail worth knowing was already `logger.error`'d where it
 * happened (see save.ts, identity.ts) before reaching this point.
 */
function toErrorResponse(error: unknown, locale: Locale): NextResponse {
  // In the visitor's language (lib/i18n), by the error's code — English,
  // and any code without a translation, keep the message below.
  const translated = MESSAGES[locale].generateErrors;

  if (error instanceof GenerationError) {
    return NextResponse.json(
      { error: { code: error.code, message: translated[error.code] ?? error.message } },
      { status: error.httpStatus },
    );
  }

  if (error instanceof AIProviderError) {
    const { status, message } = mapProviderError(error.kind);
    logger.error("api/generate: AI provider error", {
      error,
      provider: error.provider,
      kind: error.kind,
    });
    return NextResponse.json(
      { error: { code: "ai_provider_error", message: translated[`ai:${publicKind(error.kind)}`] ?? message } },
      { status },
    );
  }

  logger.error("api/generate: unhandled error", { error });
  return NextResponse.json(
    { error: { code: "internal_error", message: translated.internal_error ?? "Something went wrong. Please try again." } },
    { status: 500 },
  );
}

/** The provider failures a visitor gets a specific message for; the rest are "other". */
function publicKind(kind: AIProviderErrorKind): string {
  return ["rate_limited", "overloaded", "network", "timeout"].includes(kind) ? kind : "other";
}

function mapProviderError(kind: AIProviderErrorKind): { status: number; message: string } {
  switch (kind) {
    case "rate_limited":
      return { status: 503, message: "The AI provider is busy right now. Please try again shortly." };
    case "overloaded":
      return { status: 503, message: "The AI provider is temporarily unavailable. Please try again shortly." };
    case "network":
      return { status: 503, message: "Couldn't reach the AI provider. Please try again shortly." };
    case "timeout":
      return { status: 504, message: "The request took too long. Please try again." };
    // configuration / authentication / invalid_request / not_implemented /
    // unknown are all *our* bugs or misconfiguration, never the caller's —
    // same generic message and status for all of them so nothing about
    // our setup is distinguishable from the outside.
    default:
      return { status: 500, message: "Something went wrong generating your content. Please try again." };
  }
}
