import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ToolConfigSchemaSchema } from "@/lib/tool-config/schema";

/**
 * Guards the "tools and templates are data" contract (architecture doc
 * §14) at the only place that data is written: the SQL migrations. For
 * every seeded template, the form it renders must parse with the real
 * config_schema format, every {{placeholder}} in its prompt must be a
 * field of that form (and every field used), and `required_fields` must
 * equal the form's required fields — the invariants Stage 8/9 checked by
 * hand, and migration 0017's header promises are enforced here.
 */

const MIGRATIONS = join(__dirname, "..", "supabase", "migrations");
const read = (file: string) => readFileSync(join(MIGRATIONS, file), "utf8");
const migrationFiles = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
const allSql = migrationFiles.map(read).join("\n");

interface SeededTemplate {
  slug: string;
  toolSlug: string;
  category: string;
  prompt: string;
  required: string[];
  premium: boolean;
  ownConfig: unknown | null;
  flaggedDefault: boolean;
}

function toolConfigs(): Map<string, unknown> {
  const configs = new Map<string, unknown>();
  for (const m of allSql.matchAll(
    /update public\.tools\s+set[\s\S]*?config_schema = \$json\$([\s\S]*?)\$json\$::jsonb\s+where slug = '([^']+)'/g,
  )) {
    configs.set(m[2]!, JSON.parse(m[1]!));
  }
  for (const m of allSql.matchAll(
    /insert into public\.tools[^;]*?values \(\s*'([^']+)'[\s\S]*?\$json\$([\s\S]*?)\$json\$::jsonb/g,
  )) {
    configs.set(m[1]!, JSON.parse(m[2]!));
  }
  return configs;
}

function seededTemplates(): SeededTemplate[] {
  const templates: SeededTemplate[] = [];
  const re =
    /insert into public\.templates \([^)]*\)\s*select\s*id,\s*'([^']+)',\s*'(?:[^']|'')*',\s*'([^']+)',\s*\$prompt\$([\s\S]*?)\$prompt\$,\s*'([^']*)'::jsonb,\s*(true|false)(?:,\s*(null|\$json\$([\s\S]*?)\$json\$::jsonb))?(?:,\s*(true|false))?\s*from public\.tools\s*where slug = '([^']+)'/g;
  for (const m of allSql.matchAll(re)) {
    templates.push({
      slug: m[1]!,
      category: m[2]!,
      prompt: m[3]!,
      required: JSON.parse(m[4]!) as string[],
      premium: m[5] === "true",
      ownConfig: m[7] ? JSON.parse(m[7]) : null,
      flaggedDefault: m[8] === "true",
      toolSlug: m[9]!,
    });
  }
  const promoted = allSql.match(
    /update public\.templates\s+set is_default = true\s+where slug in \(([^)]*)\)/,
  );
  for (const slug of promoted?.[1]?.match(/'([^']+)'/g) ?? []) {
    const t = templates.find((x) => x.slug === slug.replace(/'/g, ""));
    if (t) t.flaggedDefault = true;
  }
  return templates;
}

const configs = toolConfigs();
const templates = seededTemplates();

describe("seeded tools and templates", () => {
  it("finds every tool and template the migrations seed", () => {
    expect([...configs.keys()].sort()).toEqual([
      "ad-generator",
      "content-generator",
      "email-generator",
      "social-generator",
    ]);
    expect(templates).toHaveLength(20);
  });

  it("covers all 16 Templates Library categories from the architecture doc (§15)", () => {
    const categories = new Set(templates.map((t) => t.category));
    for (const category of [
      "Facebook Ads", "Google Ads", "Instagram Ads", "LinkedIn", "X",
      "Product Launch", "SaaS", "Ecommerce", "B2B", "Cold Email",
      "Newsletter", "Landing Page", "SEO Article", "Blog Post",
      "YouTube Script", "Product Description",
    ]) {
      expect(categories).toContain(category);
    }
  });

  it("gives every tool exactly one explicit, non-premium default template", () => {
    for (const tool of configs.keys()) {
      const defaults = templates.filter((t) => t.toolSlug === tool && t.flaggedDefault);
      expect(defaults, tool).toHaveLength(1);
      expect(defaults[0]!.premium, tool).toBe(false);
    }
  });

  describe.each(templates.map((t) => [t.slug, t] as const))("%s", (_slug, template) => {
    const rawForm = template.ownConfig ?? configs.get(template.toolSlug);
    const parsed = ToolConfigSchemaSchema.safeParse(rawForm);

    it("renders a form that parses with the config_schema format", () => {
      expect(parsed.success, parsed.success ? "" : parsed.error.message).toBe(true);
      expect(parsed.success && parsed.data.fields.length).toBeGreaterThan(0);
    });

    it("uses exactly its form's fields as placeholders", () => {
      if (!parsed.success) return;
      const fields = new Set(parsed.data.fields.map((f) => f.name));
      const placeholders = new Set(
        [...template.prompt.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]!),
      );
      expect([...placeholders].filter((p) => !fields.has(p)), "orphan placeholders").toEqual([]);
      expect([...fields].filter((f) => !placeholders.has(f)), "unused fields").toEqual([]);
    });

    it("lists exactly its form's required fields in required_fields", () => {
      if (!parsed.success) return;
      const required = parsed.data.fields.filter((f) => f.required).map((f) => f.name);
      expect([...template.required].sort()).toEqual(required.sort());
    });
  });
});

describe("combined SQL files", () => {
  // supabase/README.md: schema.sql / seed.sql are generated by
  // concatenating migrations and must never drift from them.
  const combined = (files: string[]) =>
    files
      .map((prefix) => {
        const file = migrationFiles.find((f) => f.startsWith(prefix))!;
        return `-- ---------- migrations/${file} ----------\n${read(file)}\n`;
      })
      .join("");
  const body = (path: string) => {
    const text = readFileSync(join(__dirname, "..", "supabase", path), "utf8");
    return text.slice(text.indexOf("-- ---------- migrations/"));
  };

  it("schema.sql is exactly the structural migrations", () => {
    expect(body("schema.sql")).toBe(
      combined(["0001", "0002", "0003", "0004", "0005", "0006", "0007", "0008", "0009", "0011", "0012", "0016", "0018", "0019", "0020", "0021", "0022"]),
    );
  });

  it("seed.sql is exactly the data migrations", () => {
    expect(body("seed.sql")).toBe(combined(["0010", "0013", "0014", "0015", "0017"]));
  });
});
