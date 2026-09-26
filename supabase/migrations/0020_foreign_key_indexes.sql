-- Phase 2 (database): the three foreign keys the Performance Advisor
-- reports without a covering index (lint 0001_unindexed_foreign_keys).
-- Without them, deleting a company profile or a template (ON DELETE SET
-- NULL on generations) or a plan has to scan the whole referencing table.

create index generations_company_profile_id_idx on public.generations(company_profile_id);
create index generations_template_id_idx on public.generations(template_id);
create index subscriptions_plan_id_idx on public.subscriptions(plan_id);
