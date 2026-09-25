import { NextResponse } from "next/server";
import { parseGenerateRequest } from "@/lib/generation/validate";
import { runGeneration } from "@/lib/generation/pipeline";
import { GenerationError } from "@/lib/generation/errors";
import { AIProviderError, type AIProviderErrorKind } from "@/lib/ai-provider";

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
    return toErrorResponse(error);
  }
}

/**
 * Every branch here returns a message safe to show a real user — no
 * provider error text, no DB error text, no stack traces. Anything with
 * internal detail worth knowing was already `console.error`'d where it
 * happened (see save.ts, identity.ts) before reaching this point.
 */
function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof GenerationError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.httpStatus },
    );
  }

  if (error instanceof AIProviderError) {
    const { status, message } = mapProviderError(error.kind);
    console.error(`[AIProviderError:${error.provider}:${error.kind}]`, error.message);
    return NextResponse.json({ error: { code: "ai_provider_error", message } }, { status });
  }

  console.error("[api/generate] unhandled error:", error);
  return NextResponse.json(
    { error: { code: "internal_error", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
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
