/**
 * The changelog (/changelog), newest first. Add an entry for every change
 * people would notice. `date` is the day it went live (YYYY-MM-DD); the
 * launch entry gets its date on launch day (docs/launch.md).
 */

export interface ChangelogEntry {
  version: string;
  title: string;
  date: string | null;
  changes: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: "1.0",
    title: "Public launch",
    date: null,
    changes: [
      "Four AI tools — ads, emails, social posts, and long-form content like landing pages and articles — with 20 ready-made templates.",
      "Try any tool without an account; sign up and everything you made carries over.",
      "A company profile, filled in from your website if you like, so every result is written for your business.",
      "History of every result with its inputs: copy, favorite, or run it again.",
      "Plans: Free, and Pro with a free trial — paid by card through Stripe, managed or cancelled any time from Billing & Plan.",
      "Light and dark theme, works on phones, and installs as an app.",
    ],
  },
];
