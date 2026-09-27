import { NextResponse } from "next/server";
import { DEFAULT_DAILY_BUDGET_USD, aiSpendSince } from "@/lib/ai-spend";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Daily check of what the AI cost over the last 24 hours (vercel.json):
 * at or over the budget — AI_DAILY_BUDGET_USD, $10 by default — it's logged as
 * an error, which reaches Sentry and its alert (docs/production.md). An
 * early warning; the hard stop is the spend limit set at Anthropic.
 *
 * Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET`. To fire
 * the alert by hand, call it with `?budget=0` (any spend, even none,
 * reaches a budget of 0).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const override = new URL(request.url).searchParams.get("budget");
  const budgetUsd = Number(override ?? process.env.AI_DAILY_BUDGET_USD ?? DEFAULT_DAILY_BUDGET_USD);
  if (!Number.isFinite(budgetUsd) || budgetUsd < 0) {
    return NextResponse.json({ error: "budget must be a number of dollars." }, { status: 400 });
  }

  let spend;
  try {
    spend = await aiSpendSince(createAdminClient(), new Date(Date.now() - DAY_MS));
  } catch (error) {
    logger.error("ai: spend check failed", { error });
    return NextResponse.json({ error: "Spend check failed." }, { status: 500 });
  }

  const over = spend.costUsd >= budgetUsd;
  if (over) {
    logger.error("ai: daily spend over budget", { ...spend, budgetUsd });
  } else {
    logger.info("ai: daily spend within budget", { ...spend, budgetUsd });
  }
  return NextResponse.json({ ...spend, budgetUsd, over });
}
