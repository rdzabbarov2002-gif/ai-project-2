/**
 * The FAQ (/faq, and the first few on the landing page). Numbers come from
 * where the app itself reads them — the plans in the database, the trial
 * length, the guest limit — so an answer can't drift from what the app
 * does. Revisit the questions with what people actually ask (support
 * email, feedback, the beta): docs/launch.md.
 */

export interface FaqFacts {
  guestLimit: number;
  /** A plan's monthly generations: null = unlimited, undefined = not known (plans unreadable). */
  freeGenerations: number | null | undefined;
  proGenerations: number | null | undefined;
  proPrice: number | null | undefined;
  trialDays: number;
  refundDays: number;
  perMinute: number;
  supportEmail: string;
  supportResponseHours: number;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

/** "20 generations a month", "unlimited generations", or the fallback when not known. */
const allowance = (value: number | null | undefined, fallback: string) =>
  value === undefined ? fallback : value === null ? "unlimited generations" : `${value} generations a month`;

export function faq(facts: FaqFacts): FaqEntry[] {
  const pro = typeof facts.proPrice === "number" ? `Pro ($${Number(facts.proPrice)} a month)` : "Pro";
  return [
    {
      question: "What is AI Marketing Workspace?",
      answer:
        "Tools that write marketing copy for your business — ads, emails, social posts, landing pages and articles. You fill in a few fields instead of writing prompts, and every result is written for your company, from its profile.",
    },
    {
      question: "Do I need an account to try it?",
      answer: `No. Open any tool and generate — you get ${facts.guestLimit} free generations without signing up. If you then create an account, what you made carries over to it.`,
    },
    {
      question: "How does it know about my business?",
      answer:
        "From your company profile: what you sell, to whom, and in what voice. Fill it in once — or give your website address and it's filled in for you to check — and every tool uses it.",
    },
    {
      question: "How much does it cost?",
      answer: `The free plan gives you ${allowance(facts.freeGenerations, "a monthly allowance of generations")}. ${pro} gives you ${allowance(facts.proGenerations, "more generations")} and every template. Limits reset on the first day of each month (UTC). For more, contact us about Enterprise. See the pricing page for details.`,
    },
    {
      question: "How does the free trial work?",
      answer: `Your first Pro subscription starts with ${facts.trialDays} days free. You enter a card at the start and are charged when the trial ends, unless you cancel before then — and then you pay nothing. One trial per person.`,
    },
    {
      question: "How do I cancel?",
      answer:
        "Billing & Plan → Manage billing → Cancel. Your plan stays until the end of the period you paid for and isn't renewed. No emails or calls needed.",
    },
    {
      question: "Can I get a refund?",
      answer: `If you were charged by mistake, or within ${facts.refundDays} days of your first payment, write to ${facts.supportEmail} and we'll refund you, to the card you paid with.`,
    },
    {
      question: "Who owns the text it writes?",
      answer:
        "You do — use it however you like. AI can get things wrong, so read it before you publish it.",
    },
    {
      question: "Which AI does it use, and is my data used to train it?",
      answer:
        "Claude, by Anthropic. What you type into a tool and your company profile are sent to Anthropic to write each result, and aren't used to train AI models. We don't sell your data or show ads.",
    },
    {
      question: "Where are my results?",
      answer:
        "Signed in, every result is saved in History with the inputs that made it. From there you can copy it, mark it as a favorite, or use the same inputs again.",
    },
    {
      question: "Why can't I generate right now?",
      answer: `Either this month's generations are used up — your dashboard shows what's left, and the count resets on the first of the month — or you made more than ${facts.perMinute} in a minute; wait a moment. If the AI provider is busy, try again shortly.`,
    },
    {
      question: "How do I delete my account?",
      answer:
        "Billing & Plan → Delete account. It deletes your account, company profile and every result at once, and ends a paid subscription immediately.",
    },
    {
      question: "How do I reach you?",
      answer: `Email ${facts.supportEmail} — we answer within ${facts.supportResponseHours} hours. Signed in, you can also use "Send feedback" at the bottom of any page.`,
    },
  ];
}
