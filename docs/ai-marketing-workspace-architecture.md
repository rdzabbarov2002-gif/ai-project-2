# AI Marketing Workspace — Полная архитектура продукта (v2)

> Документ на утверждение перед Stage 1. Код не писался.

---

## 0. Что изменилось относительно v1

| Требование | Решение |
|---|---|
| Провайдеро-независимый AI | Слой `AI Provider Gateway` — единый интерфейс, провайдеры подключаются конфигом |
| Без обязательной регистрации | Guest Mode с локальной сессией + бесшовный merge при регистрации |
| Монетизация с MVP | Таблицы `plans`, `plan_limits`, `usage_counters` с первого дня, оплата — позже |
| Библиотека шаблонов | Таблица `templates`, данные, не код — расширяется без деплоя |
| PWA | Манифест + service worker с самого начала |

---

## 1. Обзор продукта

AI Marketing Workspace — веб-платформа (PWA), где малый бизнес один раз описывает компанию и затем использует набор специализированных AI-инструментов и готовых шаблонов для создания маркетинговых материалов без написания промптов вручную.

---

## 2. Архитектура приложения

```
┌─────────────────────────────────────────────┐
│         Next.js App (PWA, Tailwind)          │
│   Guest Session (localStorage) ⇄ Auth State  │
└───────────────────┬───────────────────────────┘
                     │ REST/Server Actions
┌───────────────────▼───────────────────────────┐
│        Backend (Next.js Server Functions)     │
│  ┌───────────────┐  ┌─────────────────────┐  │
│  │ Business Logic │  │  AI Provider Gateway │  │
│  │ (profiles,      │  │  (единый интерфейс)  │  │
│  │  templates,     │  └─────────┬───────────┘  │
│  │  usage limits)  │            │              │
│  └────────┬────────┘    ┌───────┴───────┐      │
│           │             │ Claude │OpenAI│ ...   │
└───────────┼─────────────┴───────────────┴───────┘
            │
┌───────────▼───────────────────────────────────┐
│   Supabase: Postgres + Auth + Storage + RLS    │
└─────────────────────────────────────────────────┘
```

Принцип: фронт — тонкий, вся логика выбора провайдера, лимитов и промптов — на сервере. Ключи провайдеров никогда не попадают в браузер.

---

## 3. Структура проекта и папок

```
/app
  /(guest)                → доступно без логина
    /tools/[slug]/page.tsx
    /templates/page.tsx
  /(auth)                 → требует логина
    /dashboard/page.tsx
    /profile/page.tsx
    /history/page.tsx
    /settings/billing/page.tsx
  /api
    /generate/route.ts     → единая точка входа генерации
    /session/merge/route.ts→ merge гостя в аккаунт
/lib
  /ai-provider
    index.ts                → фабрика провайдеров
    claude.ts
    openai.ts
    gemini.ts
    types.ts                → общий интерфейс AIProvider
  /limits
    checkUsage.ts
  /guest-session
    storage.ts
/config
  tools.json                → реестр AI-инструментов
  templates.json (сидовые)  → реестр шаблонов
  plans.json                → тарифные планы и лимиты
/components
  /ui                       → дизайн-система (кнопки, карточки, инпуты)
  /tools                    → форма/результат (переиспользуемые)
/public
  manifest.json, sw.js      → PWA
```

---

## 4. Структура базы данных

```sql
-- Пользователи и профиль
users (id, email, created_at, plan_id → plans)
company_profiles (id, user_id, name, niche, tone_of_voice,
                   target_audience, usp, website_url, logo_url)

-- Гостевой режим
guest_sessions (id, session_token, company_profile_draft jsonb,
                created_at, expires_at)

-- Инструменты и шаблоны (данные, не код)
tools (id, slug, name, config_schema jsonb, is_active)
templates (id, tool_id → tools, slug, name, category,
           prompt_template text, required_fields jsonb,
           is_premium boolean)

-- Генерации
generations (id, user_id NULL, guest_session_id NULL,
             tool_id, template_id NULL,
             ai_provider text, ai_model text,
             input_params jsonb, output text,
             is_favorite boolean, created_at)

-- Монетизация
plans (id, slug, name, price_month, is_active)          -- free/pro/enterprise
plan_limits (id, plan_id → plans,
             max_generations_per_month int,
             max_saved_results int,
             max_company_profiles int,
             allowed_tool_ids jsonb,
             allowed_ai_models jsonb)
usage_counters (id, user_id, period_start, period_end,
                generations_count int)
subscriptions (id, user_id, plan_id, status, provider_ref, period_end)
```

Важно: `user_id` в `generations` — nullable, вместо него может стоять `guest_session_id`. Это и есть механизм "без потери данных" при переходе гость → аккаунт (раздел 8).

---

## 5. API и взаимодействие компонентов

Единая точка генерации для всех инструментов:

```
POST /api/generate
{ tool_slug, template_slug?, input_params, session_id | auth_token }
```

Поток:
1. Определить пользователя (auth) или гостя (session_token из cookie/localStorage).
2. Проверить лимиты плана (`checkUsage`) — для гостя действует Free-лимит.
3. Загрузить `company_profile` (или `guest_sessions.company_profile_draft`).
4. Собрать промпт: `template.prompt_template + company_context + input_params`.
5. Вызвать `AIProviderGateway.generate(...)` — провайдер выбирается по конфигу инструмента/плана.
6. Сохранить в `generations`, увеличить `usage_counters`.
7. Вернуть результат.

---

## 6. Архитектура AI Provider (провайдеро-независимость)

Единый интерфейс:

```ts
interface AIProvider {
  generate(params: {
    systemPrompt: string;
    userPrompt: string;
    model: string;
    maxTokens: number;
  }): Promise<{ text: string; usage: TokenUsage }>;
}
```

Каждый провайдер (`claude.ts`, `openai.ts`, `gemini.ts`, `mistral.ts`, `grok.ts`) реализует этот интерфейс. Фабрика:

```ts
function getProvider(name: string): AIProvider { ... }
```

Выбор провайдера и модели — на уровне конфигурации (`tools.json` / `plan_limits.allowed_ai_models`), не в коде бизнес-логики. Добавление нового провайдера = новый файл + запись в конфиг, без изменения `/api/generate`.

Для MVP активным провайдером остаётся Claude, но вызовы бизнес-логики уже идут только через `AIProviderGateway`, а не напрямую в Claude SDK — это и есть независимость.

---

## 7. Навигация

- **Гость**: верхнее меню — Tools, Templates, "Sign up to save" (persistent CTA).
- **Залогинен**: мобайл — нижняя таб-панель (Tools / Templates / History / Profile), десктоп/планшет — sidebar. Единая responsive-компонента.

---

## 8. User Flow

**Гостевой сценарий:**
1. Заход на сайт → сразу видит список инструментов и шаблонов.
2. Выбирает инструмент → мини-форма (без профиля компании, поля вводятся вручную или коротким гостевым профилем, сохранённым в `guest_sessions`).
3. Получает результат, может копировать.
4. При попытке сохранить в историю / создать полный профиль компании / получить более 3 генераций — модалка регистрации.
5. После регистрации: `guest_session_id` переносится в `user_id` (UPDATE, не пересоздание) — все генерации и черновик профиля сохраняются.

**Зарегистрированный:** Onboarding (если профиль ещё черновой) → Dashboard → Инструмент/Шаблон → История.

---

## 9. Экраны

| Экран | Доступ | Содержимое |
|---|---|---|
| Landing / Tools Gallery | Гость+User | Карточки инструментов и шаблонов, без логина |
| Tool/Template Runner | Гость+User | Форма слева, результат справа (стек на мобиле) |
| Sign Up modal | Гость | Контекстный, появляется по триггеру ценности |
| Dashboard | User | Быстрый доступ, последние генерации, статус лимита |
| Company Profile | User | Полная форма + автозаполнение по URL |
| Templates Library | Гость+User | Фильтр по категориям (Ads/Email/SEO/…) |
| History | User | Список, фильтры, повтор параметров |
| Billing/Settings | User | План, лимиты, апгрейд (UI готов, оплата позже) |

---

## 10. UX-логика

- Ценность показывается до регистрации (guest-first).
- Единый паттерн "форма → результат" для всех инструментов и шаблонов — не переизобретать UI под каждый.
- Лимиты показываются проактивно ("осталось 2 генерации"), а не только в момент блокировки.
- "Regenerate this part" вместо полной перегенерации.

---

## 11. Дизайн-система

- Tailwind + токены (цвет, spacing, radius, typography) в одном конфиге.
- Компоненты: Button, Card, Input, Select, Badge (план/лимит), Skeleton loader, Toast.
- Тёмная/светлая тема через CSS-переменные с самого начала (дешевле сделать сразу).

---

## 12. Система компонентов

`ToolRunner` — универсальный компонент: принимает `config_schema` инструмента/шаблона и рендерит форму динамически (input/select/textarea по JSON-схеме). Новый инструмент или шаблон не требует нового React-компонента — только новую запись в `tools`/`templates`.

---

## 13. Механизм масштабирования

- Инструменты и шаблоны — данные (`tools`, `templates`), не код.
- RLS в Supabase — multi-tenant изоляция на уровне БД.
- `usage_counters` и лимиты — с первого дня, не постфактум.

---

## 14. Механизм подключения новых AI-инструментов

1. Добавить запись в `tools` (slug, config_schema формы).
2. Добавить один или несколько `templates`, ссылающихся на этот tool.
3. Написать `prompt_template` (шаблонизированная строка с плейсхолдерами).
4. Всё — `ToolRunner` и `/api/generate` подхватывают новый инструмент без изменения кода.

---

## 15. Библиотека шаблонов

`templates` — категории: Facebook Ads, Google Ads, Instagram Ads, LinkedIn, X, Product Launch, SaaS, Ecommerce, B2B, Cold Email, Newsletter, Landing Page, SEO Article, Blog Post, YouTube Script, Product Description.

Каждый шаблон = `prompt_template` + `required_fields`, автоматически дополняется `company_profile`. Расширение библиотеки — добавление строк в БД, без деплоя.

---

## 16. Стратегия хранения данных

- Postgres (Supabase) — единственный источник правды.
- Гостевые данные — `guest_sessions` с TTL (например, 30 дней), после — очистка.
- `input_params` как jsonb — позволяет повторно открыть форму с теми же значениями.

---

## 17. Стратегия безопасности

- RLS-политики на каждую таблицу с `user_id`.
- API-ключи провайдеров — только в серверных env, никогда в клиентском бандле.
- Rate limiting на `/api/generate` (по IP для гостей, по `user_id` для авторизованных) — защита от злоупотребления и перерасхода бюджета на AI.
- Валидация `input_params` по `config_schema` на сервере (не доверять фронту).

---

## 18. Стратегия монетизации

- `plans`: Free / Pro / Enterprise — уже в БД, значения лимитов в `plan_limits`.
- Free (в т.ч. неявно — гость): ограниченное число генераций/мес, базовые инструменты, один AI-провайдер/модель.
- Pro: больше генераций, вся библиотека шаблонов, история без ограничений.
- Enterprise: команда (задел на будущее), приоритетные модели, кастомные лимиты.
- Оплата (Stripe) не реализуется в MVP, но `subscriptions.status`/`provider_ref` уже заложены — подключение биллинга не потребует миграции схемы.

---

## 19. Стратегия тестирования (с телефона)

- Preview-деплой на Vercel на каждый push из Replit/bolt.new — открывается в браузере телефона.
- Ручные чек-листы сценариев (гость → генерация → регистрация → сохранение) — проверяются напрямую в браузере.
- Supabase Table Editor (веб) — для проверки данных без терминала.

---

## 20. План дальнейшего масштабирования

После MVP: полноценный биллинг, команды/агентства, прямая публикация в соцсети, аналитика эффективности контента, больше провайдеров и моделей "на лету" (выбор пользователем), генерация изображений, публичный API.

---

# Обновлённый план: 15 стадий

| Stage | Цель | Функционал |
|---|---|---|
| 1 | Окружение + PWA-каркас | Repl/bolt.new, GitHub, Supabase, Vercel, manifest.json/SW, базовый Next.js |
| 2 | Guest Session + Auth | localStorage-сессия гостя, Supabase Auth, merge-механизм (ещё без UI) |
| 3 | Схема БД полностью | Все таблицы раздела 4, RLS-политики, сидовые `plans`/`plan_limits` |
| 4 | AI Provider Gateway | Интерфейс, реализация Claude-провайдера, фабрика провайдеров |
| 5 | Core `/api/generate` | Единый пайплайн генерации с лимитами и сохранением |
| 6 | ToolRunner (динамическая форма) | Универсальный компонент по config_schema |
| 7 | Tools Gallery + Landing (гостевой доступ) | Публичная главная, список инструментов без логина |
| 8 | Первый инструмент — Ad Generator | Config + template + сквозная проверка пайплайна |
| 9 | Email + Social Media Generator | Через тот же пайплайн, проверка переиспользуемости |
| 10 | Templates Library | Таблица templates, UI библиотеки, фильтры по категориям |
| 11 | Регистрация + merge гостя | UI триггеры, перенос guest_session → user без потери данных |
| 12 | Company Profile + Onboarding | Форма, автозаполнение по URL, wizard |
| 13 | History + лимиты в UI | Список генераций, usage-индикатор, Billing/Settings (UI без оплаты) |
| 14 | UX-полировка и адаптив | Copy-to-clipboard, лоадеры, тёмная тема, кроссплатформенная проверка |
| 15 | Финальный аудит и релиз | Сквозные сценарии, баги, продакшн-деплой |

Каждая стадия — с аудитом по прежнему чек-листу (архитектура/код/баги/файлы/ограничения) до перехода к следующей.

---

**Документ ждёт подтверждения. После него — Stage 1.**
