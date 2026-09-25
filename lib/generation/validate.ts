import "server-only";
import { z } from "zod";
import { GenerationError } from "./errors";

/**
 * First request body in the project complex enough to earn a real schema
 * library rather than hand-rolled `if` checks (config JSON files and the
 * merge endpoint's one-field body didn't need this) — zod gives runtime
 * validation and the TypeScript type from the same declaration, so the
 * two can't drift apart the way a hand-written validator + a hand-written
 * interface could.
 */
const MAX_INPUT_PARAMS_JSON_LENGTH = 20_000;

export const GenerateRequestSchema = z
  .object({
    toolSlug: z.string().trim().min(1).max(100),
    templateSlug: z.string().trim().min(1).max(100).optional(),
    companyProfileId: z.string().uuid().optional(),
    guestSessionToken: z.string().trim().min(10).max(200).optional(),
    inputParams: z.record(z.string(), z.unknown()).default({}),
  })
  .refine((body) => JSON.stringify(body.inputParams).length <= MAX_INPUT_PARAMS_JSON_LENGTH, {
    message: `inputParams is too large (max ${MAX_INPUT_PARAMS_JSON_LENGTH} JSON characters).`,
    path: ["inputParams"],
  });

export type GenerateRequestBody = z.infer<typeof GenerateRequestSchema>;

export async function parseGenerateRequest(request: Request): Promise<GenerateRequestBody> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new GenerationError("invalid_json", 400, "Request body must be valid JSON.");
  }

  const result = GenerateRequestSchema.safeParse(json);
  if (!result.success) {
    // .issues is safe to summarize back to the client — these are our own
    // field names and constraints, not internal error detail (contrast
    // with AI provider / DB errors, which never get echoed as-is).
    const firstIssue = result.error.issues[0];
    throw new GenerationError(
      "validation_error",
      400,
      firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Invalid request body.",
    );
  }

  return result.data;
}
