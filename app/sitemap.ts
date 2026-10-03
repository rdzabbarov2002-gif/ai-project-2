import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { siteOrigin } from "@/config/site";
import type { Database } from "@/lib/supabase/database.types";
import { sitemapFor } from "@/lib/seo";
import { listActiveTools } from "@/lib/tools/catalog";
import { logger } from "@/lib/logger";

// Built per request: the tool list lives in the database, which the build
// doesn't reach.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let slugs: string[] = [];
  try {
    // The public catalog, read as any visitor would (anon key, no cookies).
    const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    slugs = (await listActiveTools(supabase)).map((tool) => tool.slug);
  } catch (error) {
    // The fixed pages still make a useful sitemap.
    logger.warn("sitemap: tools not read", { error });
  }
  return sitemapFor(siteOrigin(), slugs);
}
