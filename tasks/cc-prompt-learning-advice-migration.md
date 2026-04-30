# Миграция learning_resources в формат обучающих советов + сидер 70 записей

## Контекст

Полностью переосмысляем модуль `learning_resources`: вместо ссылок на внешние материалы храним кураторски написанные обучающие советы. Каждый совет — это структурированный JSON с разделами `why`, `steps`, `drill`, `avoid`, `progress`. Вместе с миграцией заливаем 70 готовых советов (покрытие A1/A2/B1, все 14 топиков, все 4 модуля + general).

Источник 70 советов: артефакт `learning-advice-70-items.md` приложен пользователем — спросите путь, если не приложен в контекст.

## Этапы

### Этап 1. Миграция схемы (миграция 034)

**Цель:** расширить таблицу `learning_resources` для хранения обучающих советов.

**Изменения схемы:**

```sql
-- supabase/migrations/034_learning_advice_format.sql

-- 1. Сделать url nullable (для советов url не нужен)
ALTER TABLE learning_resources
  ALTER COLUMN url DROP NOT NULL;

-- 2. Добавить колонку body для структурированного содержимого совета
ALTER TABLE learning_resources
  ADD COLUMN body jsonb;

-- 3. Расширить CHECK для resource_type — добавить 'advice'
ALTER TABLE learning_resources
  DROP CONSTRAINT learning_resources_resource_type_check;

ALTER TABLE learning_resources
  ADD CONSTRAINT learning_resources_resource_type_check
  CHECK (resource_type IN ('book','video','exercise','website','app','article','advice'));

-- 4. Гарантировать целостность: для advice обязательно body, для остальных — url
ALTER TABLE learning_resources
  ADD CONSTRAINT learning_resources_content_check
  CHECK (
    (resource_type = 'advice' AND body IS NOT NULL AND jsonb_typeof(body) = 'object') OR
    (resource_type != 'advice' AND url IS NOT NULL AND length(url) > 0)
  );

-- 5. Опциональный GIN-индекс для будущих jsonb-запросов (не критично, но полезно)
CREATE INDEX IF NOT EXISTS idx_learning_resources_body
  ON learning_resources USING gin (body);

COMMENT ON COLUMN learning_resources.body IS
  'Для resource_type=advice: JSON со схемой {why: string, steps: string[], drill: string, avoid: string, progress: string}. Для других типов: NULL.';
```

Применить через `mcp__supabase__apply_migration`. После применения — проверить:

```sql
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'learning_resources';

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.learning_resources'::regclass;
```

### Этап 2. Сидер 70 советов (миграция 035)

**Цель:** залить 70 готовых обучающих советов в `learning_resources`.

**Источник данных:** артефакт `learning-advice-70-items.md` (приложен в чате). Нужно распарсить markdown и преобразовать в SQL INSERT.

**Структура каждой записи:**
```sql
INSERT INTO learning_resources
  (module, level, topic, language, resource_type, is_active, title, description, body)
VALUES
  ('sprechen', 'a1', 'dialoge', 'ru', 'advice', true,
   'Как отвечать на вопросы экзаменатора без долгих пауз',
   'Базовые ответы (имя, профессия, хобби) надо довести до автоматизма — паузы убивают баллы за беглость.',
   '{"why": "...", "steps": ["...", "..."], "drill": "...", "avoid": "...", "progress": "..."}'::jsonb);
```

**Важно при парсинге:**

1. **Все 70 советов** в одной миграции 035 (одна транзакция — либо всё, либо ничего)
2. **Эскейпинг кавычек** в JSON — Postgres требует двойные одинарные кавычки в строках, а внутри JSON одинарные кавычки нужно эскейпить как `''`
3. **Безопаснее использовать dollar-quoted strings** для JSON, чтобы не возиться с эскейпингом:
   ```sql
   INSERT INTO learning_resources (..., body) VALUES
     (..., $json$ {"why": "Текст с 'кавычками' внутри"} $json$::jsonb);
   ```
4. **Проверка после вставки:**
   ```sql
   SELECT count(*) FROM learning_resources WHERE resource_type = 'advice';
   -- должно быть 70

   SELECT module, level, count(*)
   FROM learning_resources
   WHERE resource_type = 'advice'
   GROUP BY module, level
   ORDER BY level, module;
   -- должно соответствовать сводке в артефакте
   ```

**Важная деталь по mapping:**

В артефакте поле `description` — это короткое превью (1-2 строки), используется в admin-списке. Поле `body` — полный совет в JSON (~700-900 символов).

Не путать с предыдущей семантикой `description` как «комментарий куратора».

### Этап 3. TypeScript-типы (types/learning-advice.ts)

Создать файл `types/learning-advice.ts`:

```typescript
import { z } from 'zod';

export const LearningAdviceBodySchema = z.object({
  why: z.string().min(50, 'Раздел "почему" слишком короткий'),
  steps: z.array(z.string().min(20)).min(3).max(6),
  drill: z.string().min(50),
  avoid: z.string().min(30),
  progress: z.string().min(30),
});

export type LearningAdviceBody = z.infer<typeof LearningAdviceBodySchema>;

// Локализованные заголовки разделов (для UI)
export const ADVICE_SECTION_LABELS: Record<
  'ru' | 'de' | 'en',
  Record<keyof LearningAdviceBody, string>
> = {
  ru: {
    why: 'Почему это сложно сейчас',
    steps: 'Что делать на этой неделе',
    drill: 'Упражнение прямо сейчас',
    avoid: 'Чего избегать',
    progress: 'Признак прогресса',
  },
  de: {
    why: 'Warum das jetzt schwierig ist',
    steps: 'Was diese Woche zu tun ist',
    drill: 'Übung jetzt sofort',
    avoid: 'Was zu vermeiden ist',
    progress: 'Zeichen des Fortschritts',
  },
  en: {
    why: 'Why this is hard right now',
    steps: 'What to do this week',
    drill: 'Exercise right now',
    avoid: 'What to avoid',
    progress: 'Signs of progress',
  },
};
```

Обновить `types/supabase.ts` — там уже есть тип `learning_resources.Row`, нужно расширить `body` как `Json | null`. Если используется `supabase gen types` — перегенерировать.

### Этап 4. Обновление admin-формы

**Файлы:**
- `app/admin/learning-resources/page.tsx`
- `app/admin/learning-resources/[id]/edit/page.tsx` (или как называется форма редактирования)
- `app/api/admin/learning-resources/upsert/route.ts`

**Изменения:**

1. В форме добавить переключатель "Тип записи": `Внешний ресурс` / `Обучающий совет`. От выбора зависит, какие поля показываются.

2. Если "Обучающий совет":
   - Поле `url` — скрыто (или nullable)
   - Поле `resource_type` — автоматически `advice`
   - Поле `description` — короткое превью (1-2 строки), textarea
   - **5 полей body** (вместо одного `description`):
     - `body.why` — textarea, ~200-300 символов, заголовок "Почему это сложно сейчас"
     - `body.steps` — массив string'ов с возможностью добавлять/удалять, минимум 3, максимум 6
     - `body.drill` — textarea, ~150-250 символов, "Упражнение прямо сейчас"
     - `body.avoid` — textarea, ~150-250 символов, "Чего избегать"
     - `body.progress` — textarea, ~100-200 символов, "Признак прогресса"
   - Заголовки полей в админке — на русском (для админа)

3. Если "Внешний ресурс" (старый формат):
   - Всё как было: url обязателен, body скрыт

4. На стороне API (`upsert/route.ts`):
   - Валидация через Zod-схему `LearningAdviceBodySchema` для типа `advice`
   - Базовая валидация url (должен быть валидным URL) для остальных типов

5. В списке `/admin/learning-resources`:
   - Добавить колонку "Тип" (Совет / Внешний ресурс)
   - Добавить фильтр по типу (`advice` / `not advice`)
   - В превью показывать `description` (превью)

### Этап 5. Обновление UI рекомендаций

**Файл:** `app/recommendations/[public_id]/page.tsx`

**Текущее состояние:** показывает карточки с title + description + url-кнопкой.

**Новое состояние:** для каждого ресурса с `resource_type=advice` показывать развёрнутую структуру:

```tsx
// Псевдокод компонента LearningAdviceCard
<article className="rounded-lg border p-6 space-y-4">
  <header>
    <h3>{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </header>

  <Section icon="🎯" label={ADVICE_SECTION_LABELS[lang].why}>
    <p>{body.why}</p>
  </Section>

  <Section icon="📋" label={ADVICE_SECTION_LABELS[lang].steps}>
    <ol className="list-decimal pl-5 space-y-2">
      {body.steps.map((step, i) => <li key={i}>{step}</li>)}
    </ol>
  </Section>

  <Section icon="⚡" label={ADVICE_SECTION_LABELS[lang].drill}>
    <p className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
      {body.drill}
    </p>
  </Section>

  <details className="group">
    <summary className="cursor-pointer">Дополнительно</summary>
    <Section icon="⚠️" label={ADVICE_SECTION_LABELS[lang].avoid}>
      <p>{body.avoid}</p>
    </Section>
    <Section icon="✓" label={ADVICE_SECTION_LABELS[lang].progress}>
      <p>{body.progress}</p>
    </Section>
  </details>
</article>
```

Решения по UX:
- `why` и `steps` — всегда видимы (главная ценность)
- `drill` — выделен визуально как «сделай прямо сейчас» (жёлтая плашка)
- `avoid` и `progress` — в `<details>` чтобы не перегружать первый экран

Если `resource_type !== 'advice'` — старый рендер с url-кнопкой, оставить fallback.

### Этап 6. Обновление snapshot.ts

**Файл:** `lib/recommendations/snapshot.ts`

JOIN-логика на `learning_resources` остаётся прежней (фильтр по `module/level/topic/language` + `is_active`, `limit(60)`, по 4 на ключ). Но при формировании snapshot в `matched_resources` нужно сохранять и поле `body`, чтобы публичная страница могла его рендерить без повторного запроса в БД.

Проверьте, что в `matched_resources` структура содержит:
```typescript
{
  id, title, description, url, resource_type, body  // <- body добавлено
}
```

### Этап 7. Тесты и валидация

После всех изменений:

1. **Smoke-test админки:** создать тестовый совет через форму, отредактировать, посмотреть в списке.
2. **Smoke-test рекомендаций:** прогнать тест через `/dashboard/exam/start` (или симулировать вызов snapshot.ts), проверить что snapshot содержит советы и публичная страница их корректно рендерит.
3. **Проверка миграций:** убедиться что миграции 034 и 035 применены через `mcp__supabase__list_migrations`.

## Workflow

1. **RECON:** прочитать миграции 027-033, текущий код snapshot.ts, текущий admin-page, текущий recommendations-page. Понять, что и где менять.
2. **PLAN:** написать короткий отчёт — что планируется изменить, в каком порядке, какие файлы трогаются.
3. **GO:** дождаться подтверждения от Вячеслава.
4. **APPLY:** применить миграции 034 и 035 через Supabase MCP, затем правки кода.
5. **REPORT:** короткий отчёт что сделано, какие тесты прошли, какие issues найдены.

## Что НЕ делать

- Не удалять и не трогать существующие миграции 027-033
- Не ломать совместимость со старыми записями типа `book/video/website/etc` — они должны продолжать работать в snapshot и UI как раньше
- Не делать массовых правок типов в неконечных файлах — только то, что точно нужно
- Не править `lib/learning-tags.ts` (LEARNING_TAGS) — закрытый набор 14 топиков остаётся прежним
- Не добавлять новые топики/уровни/модули в CHECK constraints — только `resource_type` расширяется

## Notion-обновление после завершения

После успешного APPLY обновить страницу 🎯 Текущее состояние (`340006083fb381b4bbbdcecf9b31a3da`):
- В разделе "Что работает в проде" — добавить запись:
  > **D12.1 Learning Advice (30.04.2026)** — `learning_resources` расширена для хранения обучающих советов в формате JSON `{why, steps, drill, avoid, progress}`. Заведено 70 кураторских советов (A1/A2/B1, все 14 топиков). Админка `/admin/learning-resources` обновлена под двухтиповой формат (advice / external resource). UI `/recommendations/[public_id]` рендерит советы с разделами и иконками. Миграции 034, 035.
