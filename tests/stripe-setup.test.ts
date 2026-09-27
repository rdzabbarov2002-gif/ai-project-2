import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(__dirname, "..", path), "utf8");

/**
 * scripts/stripe-setup.mjs registers the webhook endpoint in Stripe with a
 * list of events; the route handles its own list. An event missing from
 * the first is never sent; one missing from the second is ignored.
 */
describe("Stripe webhook events", () => {
  it("are the same in the setup script and the webhook route", () => {
    const script = read("scripts/stripe-setup.mjs");
    const list = script.slice(script.indexOf("const WEBHOOK_EVENTS"), script.indexOf("];", script.indexOf("const WEBHOOK_EVENTS")));
    const registered = [...list.matchAll(/"([a-z_.]+)"/g)].map((m) => m[1]).sort();

    const route = read("app/api/stripe/webhook/route.ts");
    const handled = [...route.matchAll(/case "([a-z_.]+)":/g)].map((m) => m[1]).sort();

    expect(registered.length).toBeGreaterThan(0);
    expect(registered).toEqual(handled);
  });
});
