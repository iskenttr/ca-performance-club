-- Photo meal analysis, daily nutrition targets, and private meal history.
-- Existing rows remain valid because all target columns are nullable.

begin;

create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');

alter table public.nutrition_plans
  add column target_calories_kcal numeric(7,1),
  add column target_protein_g numeric(6,1),
  add column target_carbs_g numeric(6,1),
  add column target_fat_g numeric(6,1),
  add constraint nutrition_targets_positive check (
    (target_calories_kcal is null and target_protein_g is null and target_carbs_g is null and target_fat_g is null)
    or (
      target_calories_kcal between 1 and 10000
      and target_protein_g between 1 and 1000
      and target_carbs_g between 1 and 1500
      and target_fat_g between 1 and 500
    )
  );

create table public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  eaten_at timestamptz not null,
  meal_type public.meal_type not null,
  photo_path text not null,
  food_name text not null,
  detected_foods jsonb not null default '[]'::jsonb,
  portion_grams numeric(7,1) check (portion_grams is null or portion_grams between 1 and 5000),
  calories_kcal numeric(7,1) not null check (calories_kcal >= 0),
  protein_g numeric(7,1) not null check (protein_g >= 0),
  carbs_g numeric(7,1) not null check (carbs_g >= 0),
  fat_g numeric(7,1) not null check (fat_g >= 0),
  logmeal_image_id bigint not null,
  logmeal_dish_ids bigint[] not null default '{}',
  created_at timestamptz not null default now()
);

create index meal_entries_student_date_idx on public.meal_entries(student_id, eaten_at desc);

alter table public.meal_entries enable row level security;

create policy meal_entries_read on public.meal_entries
for select to authenticated
using (public.can_access_student(student_id));

create policy meal_entries_insert_self on public.meal_entries
for insert to authenticated
with check (student_id = auth.uid());

create policy meal_entries_update_self on public.meal_entries
for update to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid());

create policy meal_entries_delete_self on public.meal_entries
for delete to authenticated
using (student_id = auth.uid());

commit;
