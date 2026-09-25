/**
 * Pipeline-level errors — distinct from `AIProviderError` (lib/ai-provider),
 * which covers failures *inside* a provider call. `GenerationError` covers
 * everything around it: bad input, no access, over a limit. The route
 * handler (app/api/generate/route.ts) is the only place that catches
 * either kind and turns it into an HTTP response — every other module
 * just throws.
 */
export class GenerationError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}
