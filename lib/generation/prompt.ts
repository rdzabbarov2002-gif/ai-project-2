import type { CompanyContext } from "./company-context";
import type { ResolvedTemplate, ResolvedTool } from "./catalog";

/**
 * Turns company context + template + input params into the two strings
 * the AI Provider Gateway actually wants. This is the one place that
 * combines those three things — every tool (Stage 8 onward) goes through
 * this same function instead of building its own prompt assembly, which
 * is what makes "add a tool = a config row" (project architecture doc §14)
 * true rather than aspirational.
 *
 * No per-tool special-casing lives here on purpose: the moment this file
 * needs an `if (tool.slug === "...")`, that's a sign the tool needs a
 * proper prompt_template row instead.
 */

export function buildSystemPrompt(context: CompanyContext | null, tool: ResolvedTool): string {
  const lines = [
    `You are the "${tool.name}" tool inside AI Marketing Workspace, an AI marketing platform for small businesses. Write copy that is ready to use with minimal editing.`,
  ];

  if (context && hasAnyField(context)) {
    lines.push("", "Company context to tailor your output to:");
    if (context.name) lines.push(`- Company name: ${context.name}`);
    if (context.niche) lines.push(`- Niche/industry: ${context.niche}`);
    if (context.targetAudience) lines.push(`- Target audience: ${context.targetAudience}`);
    if (context.toneOfVoice) lines.push(`- Tone of voice: ${context.toneOfVoice}`);
    if (context.usp) lines.push(`- Unique selling point: ${context.usp}`);
    if (context.websiteUrl) lines.push(`- Website: ${context.websiteUrl}`);
  } else {
    lines.push(
      "",
      "No company profile is available yet — write generically useful marketing copy and avoid inventing specific company facts, names, or claims.",
    );
  }

  return lines.join("\n");
}

export function buildUserPrompt(params: {
  tool: ResolvedTool;
  template: ResolvedTemplate | null;
  inputParams: Record<string, unknown>;
}): string {
  if (params.template) {
    return fillTemplate(params.template.promptTemplate, params.inputParams);
  }

  // No template selected (or none exist yet for this tool — the
  // `templates` table is seeded starting Stage 10). Falls back to a
  // structured-but-generic prompt from the raw params rather than
  // failing the request, so the pipeline is exercisable end-to-end before
  // any real template content exists.
  return [
    `Task: ${params.tool.name}`,
    "",
    "Parameters:",
    JSON.stringify(params.inputParams, null, 2),
  ].join("\n");
}

function hasAnyField(context: CompanyContext): boolean {
  return Object.values(context).some((v) => typeof v === "string" && v.trim() !== "");
}

/** Replaces {{field}} tokens; unknown/missing fields resolve to "". */
function fillTemplate(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
}
