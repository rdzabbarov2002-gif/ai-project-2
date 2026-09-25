# Stage 1 — Инженерный аудит

## Статус: Stage 1 завершён. Готов к Stage 2 — жду подтверждения.

---

## 1. Созданные файлы (41)

**Конфигурация проекта**
`package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.json`, `.prettierrc`, `.env.example`, `.gitignore`, `README.md`

**App Router**
`app/layout.tsx`, `app/page.tsx`, `app/globals.css`
`app/(guest)/tools/[slug]/page.tsx`, `app/(guest)/templates/page.tsx`
`app/(auth)/dashboard/page.tsx`, `app/(auth)/profile/page.tsx`, `app/(auth)/history/page.tsx`, `app/(auth)/settings/billing/page.tsx`
`app/api/generate/route.ts`, `app/api/session/merge/route.ts`

**AI Provider Gateway**
`lib/ai-provider/types.ts` — общий интерфейс `AIProvider`, `AIGenerateParams/Result`, `AIProviderError`
`lib/ai-provider/index.ts` — фабрика `getProvider()` / `getDefaultProvider()`
`lib/ai-provider/{claude,openai,gemini,mistral,grok}.ts` — по одному классу-заглушке на провайдера

**Supabase**
`lib/supabase/client.ts` (браузер), `lib/supabase/server.ts` (сервер, через `@supabase/ssr`)

**Прочая инфраструктура**
`lib/limits/checkUsage.ts`, `lib/guest-session/storage.ts`
`config/tools.json`, `config/templates.json`, `config/plans.json`, `config/settings.ts`, `config/design-tokens.md`
`components/ui/{Button,Card,Input}.tsx`, `components/tools/README.md`
`public/manifest.json`, `public/sw.js`, `public/icons/README.md`

Изменённых файлов нет — это первый коммит.

---

## 2. Ключевые архитектурные решения и почему

**AI Provider Gateway реализован полностью на уровне типов и фабрики, но без единого реального вызова API.**
`getProvider(name)` возвращает объект по строковому имени из конфига (`config/plans.json → allowed_ai_models`, будущий `config/tools.json`). Каждый провайдер — отдельный класс в отдельном файле, реализующий один и тот же интерфейс `AIProvider`. Это напрямую проверяет требование "замена модели — конфиг, не код": `/api/generate` в Stage 5 будет вызывать только `getProvider(...).generate(...)`, никогда не импортируя Anthropic/OpenAI SDK напрямую.

**Supabase-клиент разделён на browser/server, без service-role клиента.**
Ключ с полным доступом (`SUPABASE_SERVICE_ROLE_KEY`) специально не подключён нигде в коде — только в `.env.example`. Он появится как отдельный явно названный `lib/supabase/admin.ts`, когда реально понадобится (не раньше Stage 3), чтобы его нельзя было случайно использовать по ошибке в обычном коде.

**Route Groups `(guest)` и `(auth)` созданы уже сейчас**, хотя реальной auth-логики ещё нет — это фиксирует деление на гостевую/авторизованную зону в самой структуре папок с первого дня, а не постфактум в Stage 11.

**`config/tools.json`, `templates.json`, `plans.json`** заполнены минимальными, но реалистичными данными (три инструмента, 16 категорий шаблонов, три тарифа с полями лимитов) — это подтверждает, что схема конфигов пригодна для реального наполнения, а не просто пустой каркас.

**PWA-фундамент — install/activate без кеш-стратегии.**
Специально не добавлена офлайн-логика (как и просил Stage 1) — `sw.js` перехватывает `fetch`, но ничего не делает, чтобы не создавать ложное ощущение офлайн-поддержки раньше времени.

**Дизайн-токены — намеренно не "дефолтный AI-стиль".**
Акцент — глубокий индиго `#3730E0`, а не терракотовый (частый tell AI-генерации) и не фиолетовый градиент. Обоснование зафиксировано в `config/design-tokens.md`, чтобы на Stage 14 (полировка) решение не "уплыло" обратно к дефолту.

---

## 3. Обнаруженные потенциальные проблемы и решения

| Проблема | Решение |
|---|---|
| Легко случайно завести service-role ключ Supabase в клиентский код | Не создавал `admin.ts` вообще; только browser/server клиенты с anon-ключом |
| Провайдеры могли получиться "интерфейс + один Claude", остальные — просто TODO-комментарии, что нарушило бы обещание "добавление провайдера = 1 файл" | Создал реальные файлы-классы для всех пяти провайдеров с самого начала, а не только для Claude |
| PWA legacy-конфликт: некоторые шаблоны регистрируют SW через bundler-плагин, что усложняет ручное редактирование с телефона | Регистрация SW — вручную, инлайн-скриптом в `layout.tsx`, без доп. зависимостей — проще редактировать в мобильном IDE |
| `next.config.js` мог обрасти преждевременными оптимизациями (images domains, experimental flags), которые пришлось бы переписывать | Оставлен минимальным — только то, что реально используется сейчас |

Критических ошибок, блокирующих Stage 2, не обнаружено.

---

## 4. Ограничения текущего состояния (ожидаемо для Stage 1)

- Проект **не запущен и не собран** — сборка (`npm install` / `npm run build`) не выполнялась в этой среде (нет сети в контейнере). Файлы синтаксически корректны, но реальная сборка должна быть проверена в Replit/bolt.new при первом импорте — это первое, что стоит сделать до Stage 2.
- Таблиц БД нет (по заданию — это Stage 3).
- Все API-роуты и `AIProvider.generate()` — заглушки, возвращающие `501` / бросающие `Error`, а не реальную логику.
- Иконок PWA (192/512px) нет физически — оставлена инструкция в `public/icons/README.md`.
- `next.config.js` не содержит официального Next.js PWA-плагина — сделан осознанный выбор в пользу ручной, более простой для редактирования с телефона регистрации SW; можно пересмотреть, если понадобится реальный офлайн-кеш.

---

## 5. Готовность к Stage 2

Да. Структура папок, конфиги и AI Provider Gateway дают основание, на котором Stage 2 (Guest Session + Auth) может подключаться без переделок: route groups уже разведены, `lib/guest-session/storage.ts` уже определяет контракт ключа localStorage, `lib/supabase/{client,server}.ts` готовы для Supabase Auth.

**Рекомендация перед Stage 2:** первым делом импортировать архив в Replit или bolt.new и убедиться, что `npm install && npm run dev` проходит без ошибок — это единственное, что не проверено в текущей среде.
