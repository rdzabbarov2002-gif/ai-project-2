import type { Locale } from "@/lib/i18n/config";
import { plural } from "@/lib/i18n/plural";

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
  /** Stable across languages — the landing page picks entries by it. */
  id: string;
  question: string;
  answer: string;
}

/** "20 generations a month", "unlimited generations", or the fallback when not known. */
const allowance = (value: number | null | undefined, fallback: string) =>
  value === undefined ? fallback : value === null ? "unlimited generations" : `${value} generations a month`;

/** The FAQ in the interface's language (lib/i18n); English by default. */
export function faq(facts: FaqFacts, locale: Locale = "en"): FaqEntry[] {
  return locale === "ru" ? faqRu(facts) : faqEn(facts);
}

function faqEn(facts: FaqFacts): FaqEntry[] {
  const pro = typeof facts.proPrice === "number" ? `Pro ($${Number(facts.proPrice)} a month)` : "Pro";
  return [
    {
      id: "what",
      question: "What is AI Marketing Workspace?",
      answer:
        "Tools that write marketing copy for your business — ads, emails, social posts, landing pages and articles. You fill in a few fields instead of writing prompts, and every result is written for your company, from its profile.",
    },
    {
      id: "account",
      question: "Do I need an account to try it?",
      answer: `No. Open any tool and generate — you get ${facts.guestLimit} free generations without signing up. If you then create an account, what you made carries over to it.`,
    },
    {
      id: "profile",
      question: "How does it know about my business?",
      answer:
        "From your company profile: what you sell, to whom, and in what voice. Fill it in once — or give your website address and it's filled in for you to check — and every tool uses it.",
    },
    {
      id: "cost",
      question: "How much does it cost?",
      answer: `The free plan gives you ${allowance(facts.freeGenerations, "a monthly allowance of generations")}. ${pro} gives you ${allowance(facts.proGenerations, "more generations")} and every template. Limits reset on the first day of each month (UTC). For more, contact us about Enterprise. See the pricing page for details.`,
    },
    {
      id: "trial",
      question: "How does the free trial work?",
      answer: `Your first Pro subscription starts with ${facts.trialDays} days free. You enter a card at the start and are charged when the trial ends, unless you cancel before then — and then you pay nothing. One trial per person.`,
    },
    {
      id: "cancel",
      question: "How do I cancel?",
      answer:
        "Billing & Plan → Manage billing → Cancel. Your plan stays until the end of the period you paid for and isn't renewed. No emails or calls needed.",
    },
    {
      id: "refund",
      question: "Can I get a refund?",
      answer: `If you were charged by mistake, or within ${facts.refundDays} days of your first payment, write to ${facts.supportEmail} and we'll refund you, to the card you paid with.`,
    },
    {
      id: "ownership",
      question: "Who owns the text it writes?",
      answer:
        "You do — use it however you like. AI can get things wrong, so read it before you publish it.",
    },
    {
      id: "ai",
      question: "Which AI does it use, and is my data used to train it?",
      answer:
        "Claude, by Anthropic. What you type into a tool and your company profile are sent to Anthropic to write each result, and aren't used to train AI models. We don't sell your data or show ads.",
    },
    {
      id: "results",
      question: "Where are my results?",
      answer:
        "Signed in, every result is saved in History with the inputs that made it. From there you can copy it, mark it as a favorite, or use the same inputs again.",
    },
    {
      id: "blocked",
      question: "Why can't I generate right now?",
      answer: `Either this month's generations are used up — your dashboard shows what's left, and the count resets on the first of the month — or you made more than ${facts.perMinute} in a minute; wait a moment. If the AI provider is busy, try again shortly.`,
    },
    {
      id: "delete",
      question: "How do I delete my account?",
      answer:
        "Billing & Plan → Delete account. It deletes your account, company profile and every result at once, and ends a paid subscription immediately.",
    },
    {
      id: "contact",
      question: "How do I reach you?",
      answer: `Email ${facts.supportEmail} — we answer within ${facts.supportResponseHours} hours. Signed in, you can also use "Send feedback" at the bottom of any page.`,
    },
  ];
}

const allowanceRu = (value: number | null | undefined, fallback: string) =>
  value === undefined
    ? fallback
    : value === null
      ? "безлимитные генерации"
      : `${plural("ru", value, { one: "генерацию", few: "генерации", many: "генераций", other: "генерации" })} в месяц`;

function faqRu(facts: FaqFacts): FaqEntry[] {
  const pro = typeof facts.proPrice === "number" ? `Pro ($${Number(facts.proPrice)} в месяц)` : "Pro";
  const days = (count: number) => plural("ru", count, { one: "день", few: "дня", many: "дней", other: "дня" });
  return [
    {
      id: "what",
      question: "Что такое AI Marketing Workspace?",
      answer:
        "Инструменты, которые пишут маркетинговые тексты для вашего бизнеса — рекламу, письма, посты, лендинги и статьи. Вместо промптов вы заполняете несколько полей, и каждый результат пишется под вашу компанию, по её профилю.",
    },
    {
      id: "account",
      question: "Нужен ли аккаунт, чтобы попробовать?",
      answer: `Нет. Откройте любой инструмент и создавайте — без регистрации доступно ${plural("ru", facts.guestLimit, { one: "бесплатная генерация", few: "бесплатные генерации", many: "бесплатных генераций", other: "бесплатной генерации" })}. Если потом создадите аккаунт, всё созданное перейдёт в него.`,
    },
    {
      id: "profile",
      question: "Откуда сервис знает о моём бизнесе?",
      answer:
        "Из профиля компании: что вы продаёте, кому и каким тоном. Заполните его один раз — или укажите адрес сайта, и он заполнится сам, а вы проверите, — и его будет использовать каждый инструмент.",
    },
    {
      id: "cost",
      question: "Сколько это стоит?",
      answer: `Бесплатный тариф даёт ${allowanceRu(facts.freeGenerations, "ежемесячный лимит генераций")}. ${pro} даёт ${allowanceRu(facts.proGenerations, "больше генераций")} и все шаблоны. Лимиты обновляются первого числа каждого месяца (UTC). Если нужно больше, свяжитесь с нами насчёт корпоративного тарифа. Подробности — на странице цен.`,
    },
    {
      id: "trial",
      question: "Как работает бесплатный пробный период?",
      answer: `Первая подписка Pro начинается с ${days(facts.trialDays)} бесплатно. Карту вы указываете сразу, а списание будет, когда пробный период закончится, — если не отмените раньше, тогда вы ничего не платите. Один пробный период на человека.`,
    },
    {
      id: "cancel",
      question: "Как отменить подписку?",
      answer:
        "«Тариф и оплата» → «Управлять оплатой» → «Отменить». Тариф действует до конца оплаченного периода и не продлевается. Писать или звонить не нужно.",
    },
    {
      id: "refund",
      question: "Можно ли вернуть деньги?",
      answer: `Если списание было по ошибке или прошло не больше ${days(facts.refundDays)} после первой оплаты, напишите на ${facts.supportEmail}, и мы вернём деньги на карту, с которой вы платили.`,
    },
    {
      id: "ownership",
      question: "Кому принадлежат созданные тексты?",
      answer: "Вам — используйте их как угодно. ИИ может ошибаться, поэтому перечитайте текст перед публикацией.",
    },
    {
      id: "ai",
      question: "Какой ИИ используется и обучают ли его на моих данных?",
      answer:
        "Claude от компании Anthropic. То, что вы вводите в инструмент, и профиль компании отправляются в Anthropic, чтобы написать каждый результат, и не используются для обучения моделей. Мы не продаём ваши данные и не показываем рекламу.",
    },
    {
      id: "results",
      question: "Где мои результаты?",
      answer:
        "После входа каждый результат сохраняется в «Истории» вместе с данными, по которым он создан. Оттуда его можно скопировать, добавить в избранное или повторить с теми же данными.",
    },
    {
      id: "blocked",
      question: "Почему сейчас не получается создать текст?",
      answer: `Либо закончился лимит на этот месяц — сколько осталось, видно в кабинете, а обновляется лимит первого числа, — либо вы сделали больше ${plural("ru", facts.perMinute, { one: "генерации", few: "генераций", many: "генераций", other: "генерации" })} за минуту; подождите немного. Если сервис ИИ перегружен, попробуйте чуть позже.`,
    },
    {
      id: "delete",
      question: "Как удалить аккаунт?",
      answer:
        "«Тариф и оплата» → «Удалить аккаунт». Удаляются сразу аккаунт, профиль компании и все результаты, а платная подписка сразу заканчивается.",
    },
    {
      id: "contact",
      question: "Как с вами связаться?",
      answer: `Напишите на ${facts.supportEmail} — ответим в течение ${plural("ru", facts.supportResponseHours, { one: "часа", few: "часов", many: "часов", other: "часа" })}. После входа можно также нажать «Написать отзыв» внизу любой страницы.`,
    },
  ];
}
