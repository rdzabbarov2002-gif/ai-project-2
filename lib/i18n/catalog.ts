import type { Locale } from "./config";
import type { ToolListItem } from "@/lib/tools/types";
import type { TemplateListItem } from "@/lib/templates/types";
import type { ToolConfigSchema } from "@/lib/tool-config/schema";

/**
 * What the database says in English — tool and template names,
 * categories, form labels, hints and choices — in Russian. Keyed by the
 * English text, so a label that repeats across tools ("Call to action",
 * "Shop Now") is translated once. Only what people read changes: a
 * choice's value, which goes into the prompt, stays as it is. Text with
 * no entry (brand names like "Instagram", anything added later) shows in
 * English.
 */
const RU: Record<string, string> = {
  // Tools
  "AI Ad Generator": "Генератор рекламы",
  "AI Content Writer": "Автор статей",
  "AI Email Generator": "Генератор писем",
  "AI Social Media Generator": "Генератор постов",
  "Generate ready-to-run ad copy for your campaigns.": "Готовые рекламные тексты для ваших кампаний.",
  "Draft blog posts, articles, landing pages, video scripts and product descriptions.":
    "Черновики постов для блога, статей, лендингов, сценариев видео и описаний товаров.",
  "Draft marketing emails tailored to your audience.": "Маркетинговые письма под вашу аудиторию.",
  "Create on-brand posts for your social channels.": "Посты для соцсетей в стиле вашего бренда.",
  Ads: "Реклама",
  Content: "Контент",
  Email: "Письма",
  Social: "Соцсети",

  // Templates and their categories
  "Standard Ad": "Стандартная реклама",
  "Standard Content Draft": "Стандартный текст",
  "Standard Email": "Стандартное письмо",
  "Standard Social Post": "Стандартный пост",
  General: "Общее",
  "B2B Follow-up Email": "B2B-письмо после встречи",
  B2B: "B2B",
  "Blog Post": "Пост для блога",
  "Cold Outreach Email": "Холодное письмо",
  "Cold Email": "Холодные письма",
  "Ecommerce Sale Ad": "Реклама распродажи",
  Ecommerce: "Интернет-магазин",
  "Facebook Ad": "Реклама в Facebook",
  "Facebook Ads": "Реклама в Facebook",
  "Google Search Ad": "Реклама в поиске Google",
  "Google Ads": "Google Реклама",
  "Instagram Ad": "Реклама в Instagram",
  "Instagram Ads": "Реклама в Instagram",
  "Landing Page Copy": "Текст для лендинга",
  "Landing Page": "Лендинг",
  "LinkedIn Post": "Пост в LinkedIn",
  "Newsletter Issue": "Выпуск рассылки",
  Newsletter: "Рассылка",
  "Product Description": "Описание товара",
  "Product Launch Ad": "Реклама запуска продукта",
  "Product Launch": "Запуск продукта",
  "SaaS Free-Trial Ad": "Реклама пробного периода SaaS",
  "SEO Article": "SEO-статья",
  "X (Twitter) Thread": "Тред в X (Twitter)",
  "YouTube Video Script": "Сценарий видео для YouTube",
  "YouTube Script": "Сценарий YouTube",

  // Form labels
  Platform: "Площадка",
  "Product or service being advertised": "Что рекламируем",
  "Offer or promotion details": "Предложение или акция",
  "Optional — e.g. a discount, launch, or limited-time deal.": "Необязательно — например, скидка, запуск или ограниченное предложение.",
  "Call to action": "Призыв к действию",
  "Call-to-action button": "Кнопка призыва к действию",
  "Primary call to action": "Главный призыв к действию",
  "Content type": "Тип текста",
  "Topic or product": "Тема или продукт",
  "e.g. How to choose running shoes": "например, Как выбрать беговые кроссовки",
  "Key points to cover": "Главные мысли",
  "Optional — leave empty to let the AI choose.": "Необязательно — оставьте пустым, и ИИ выберет сам.",
  Length: "Объём",
  "Email type": "Тип письма",
  "What is this email about?": "О чём письмо?",
  "Offer or key message": "Предложение или главная мысль",
  "Optional — e.g. a discount, launch, or update worth highlighting.": "Необязательно — например, скидка, запуск или важная новость.",
  "What is this post about?": "О чём пост?",
  "Who you're writing to": "Кому пишем",
  "e.g. Operations Director at a logistics company": "например, операционный директор логистической компании",
  "e.g. Head of Marketing at a mid-size retailer": "например, директор по маркетингу в сети магазинов",
  "Your product or service": "Ваш продукт или услуга",
  "What you offer": "Что вы предлагаете",
  "Previous interaction": "Прошлый контакт",
  "Optional — e.g. met at a trade show, had a demo last week.": "Необязательно — например, встретились на выставке, была демонстрация на прошлой неделе.",
  "Problem you solve for them": "Какую проблему вы решаете",
  "Optional.": "Необязательно.",
  "Blog post topic": "Тема поста",
  "Points to cover": "Главные мысли",
  "Main keywords": "Ключевые слова",
  "Optional — comma-separated search terms you're bidding on.": "Необязательно — поисковые запросы через запятую.",
  "Product or service": "Продукт или услуга",
  "Key benefits or features": "Главные преимущества",
  Topic: "Тема",
  "Key insight or story": "Главная мысль или история",
  "Optional — a lesson, result or anecdote to anchor the post.": "Необязательно — урок, результат или случай, на котором строится пост.",
  "Main topic of this issue": "Главная тема выпуска",
  "Highlights or news to include": "Новости и главное",
  "Optional — one per line works best.": "Необязательно — лучше по одному в строке.",
  "Product name": "Название товара",
  "Key features or specs": "Главные характеристики",
  "Who it's for": "Для кого",
  "e.g. first-time runners": "например, начинающие бегуны",
  "Article topic": "Тема статьи",
  "Target keyword": "Главный поисковый запрос",
  "e.g. best running shoes for beginners": "например, лучшие кроссовки для начинающих",
  "Video topic": "Тема видео",
  "Target length": "Длительность",
  "Offer or link to promote": "Что продвигаем (предложение или ссылка)",

  // Choices
  "Shop Now": "Купить",
  "Learn More": "Подробнее",
  "Sign Up": "Зарегистрироваться",
  "Sign up": "Зарегистрироваться",
  "Get Started": "Начать",
  "Contact Us": "Связаться с нами",
  "Book Now": "Забронировать",
  "Book now": "Забронировать",
  "Send Message": "Написать",
  "Get Offer": "Получить предложение",
  "Buy Now": "Купить сейчас",
  "Get a Quote": "Узнать цену",
  "Book Online": "Записаться онлайн",
  "Call Today": "Позвонить",
  "Book a Call": "Записаться на звонок",
  "Reply to This Email": "Ответить на письмо",
  "Follow Us": "Подписаться",
  "Comment Below": "Написать комментарий",
  "Blog post": "Пост для блога",
  Article: "Статья",
  "Landing page section": "Блок лендинга",
  "Video script": "Сценарий видео",
  "Product description": "Описание товара",
  "Website copy": "Текст для сайта",
  Short: "Короткий",
  Medium: "Средний",
  Long: "Длинный",
  Promotional: "Рекламное",
  Announcement: "Объявление",
  "Welcome email": "Приветственное письмо",
  "Re-engagement": "Возврат клиентов",
  "Schedule a follow-up call": "Назначить звонок",
  "Review the proposal": "Посмотреть предложение",
  "Start a pilot": "Запустить пилот",
  "Reply with questions": "Ответить с вопросами",
  "Short (~400 words)": "Короткий (~400 слов)",
  "Medium (~700 words)": "Средний (~700 слов)",
  "Long (~1100 words)": "Длинный (~1100 слов)",
  "Short (~500 words)": "Короткий (~500 слов)",
  "Medium (~900 words)": "Средний (~900 слов)",
  "Long (~1400 words)": "Длинный (~1400 слов)",
  "Book a 15-minute call": "Записаться на 15-минутный звонок",
  "Reply to this email": "Ответить на письмо",
  "Try a free demo": "Попробовать бесплатно",
  "Visit our website": "Перейти на сайт",
  "Start free trial": "Начать пробный период",
  "Get started": "Начать",
  "Book a demo": "Записаться на демо",
  "Buy now": "Купить сейчас",
  "Join the waitlist": "Встать в лист ожидания",
  "Comment with your thoughts": "Поделиться мнением в комментариях",
  "Follow for more": "Подписаться",
  "Book a call": "Записаться на звонок",
  "Share with your network": "Поделиться с коллегами",
  "Read more on our blog": "Читать в блоге",
  "Shop the collection": "Смотреть коллекцию",
  "Reply and tell us": "Ответить и рассказать",
  "Follow us on social": "Подписаться в соцсетях",
  "Reply with your take": "Ответить своим мнением",
  "Repost if useful": "Сделать репост",
  "Short (under 60 seconds)": "Короткое (до 60 секунд)",
  "3–5 minutes": "3–5 минут",
  "8–10 minutes": "8–10 минут",
  "Subscribe to the channel": "Подписаться на канал",
  "Comment below": "Написать комментарий",
  "Check the link in the description": "Перейти по ссылке в описании",
};

const DICTIONARIES: Record<Locale, Record<string, string> | null> = { en: null, ru: RU };

/** One piece of catalog text in `locale`, or as it is when there's no entry. */
export function localizeText(text: string, locale: Locale): string;
export function localizeText(text: string | null, locale: Locale): string | null;
export function localizeText(text: string | undefined, locale: Locale): string | undefined;
export function localizeText(text: string | null | undefined, locale: Locale) {
  if (!text) return text;
  return DICTIONARIES[locale]?.[text] ?? text;
}

export function localizeTool(tool: ToolListItem, locale: Locale): ToolListItem {
  return {
    ...tool,
    name: localizeText(tool.name, locale),
    description: localizeText(tool.description, locale),
    category: localizeText(tool.category, locale),
  };
}

export function localizeTemplate(template: TemplateListItem, locale: Locale): TemplateListItem {
  return {
    ...template,
    name: localizeText(template.name, locale),
    category: localizeText(template.category, locale),
    toolName: localizeText(template.toolName, locale),
  };
}

/** A form's labels, hints, placeholders and choice labels — never its names or values. */
export function localizeSchema(schema: ToolConfigSchema, locale: Locale): ToolConfigSchema {
  if (!DICTIONARIES[locale]) return schema;
  return {
    ...schema,
    fields: schema.fields.map((field) => {
      const localized = {
        ...field,
        label: localizeText(field.label, locale),
        helpText: localizeText(field.helpText, locale),
        placeholder: localizeText(field.placeholder, locale),
      };
      return "options" in field
        ? { ...localized, options: field.options.map((option) => ({ ...option, label: localizeText(option.label, locale) })) }
        : localized;
    }) as ToolConfigSchema["fields"],
  };
}
