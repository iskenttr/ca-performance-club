-- CemFit production reference schema for Supabase/PostgreSQL.
-- Run only after reviewing it against the chosen Supabase project and policies.

begin;

create extension if not exists pgcrypto;

create type public.app_role as enum ('trainer', 'student');
create type public.student_status as enum ('new', 'active', 'paused');
create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'student',
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null,
  phone text not null default '',
  avatar_path text,
  goal text,
  level text check (level is null or level in ('Başlangıç', 'Orta', 'İleri')),
  weekly_goal smallint check (weekly_goal is null or weekly_goal between 1 and 7),
  height_cm numeric(5,2) check (height_cm is null or height_cm between 100 and 240),
  birth_year smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  default_trainer_id uuid references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now()
);

create table public.student_coaching (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete restrict,
  status public.student_status not null default 'new',
  trainer_notes text not null default '',
  assigned_at timestamptz not null default now(),
  check (student_id <> trainer_id)
);

create table public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id)
);

create table public.workout_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.workout_programs(id) on delete cascade,
  position smallint not null check (position > 0),
  label text not null,
  title text not null,
  focus text not null default '',
  duration_minutes smallint not null check (duration_minutes between 5 and 300),
  unique (program_id, position)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.workout_days(id) on delete cascade,
  position smallint not null check (position > 0),
  name text not null,
  sets smallint not null check (sets between 1 and 20),
  reps text not null,
  rest_seconds smallint not null check (rest_seconds between 0 and 900),
  note text not null default '',
  unique (workout_day_id, position)
);

create table public.workout_completions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  completed_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (student_id, exercise_id, completed_on)
);

create table public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  daily_water_liters numeric(3,1) not null check (daily_water_liters between 0 and 12),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id)
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  nutrition_plan_id uuid not null references public.nutrition_plans(id) on delete cascade,
  position smallint not null check (position > 0),
  meal_time time not null,
  title text not null,
  items text[] not null default '{}',
  unique (nutrition_plan_id, position)
);

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric(5,2) not null check (weight_kg between 30 and 300),
  body_fat_percent numeric(4,1) check (body_fat_percent is null or body_fat_percent between 1 and 80),
  waist_cm numeric(5,2),
  chest_cm numeric(5,2),
  hip_cm numeric(5,2),
  arm_cm numeric(5,2),
  created_at timestamptz not null default now()
);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  caption text not null default '',
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete restrict,
  start_at timestamptz not null,
  duration_minutes smallint not null check (duration_minutes between 15 and 240),
  status public.appointment_status not null default 'pending',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete restrict,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id = student_id or sender_id = trainer_id)
);

create index messages_thread_time_idx on public.messages(student_id, sent_at desc);
create index appointments_start_idx on public.appointments(trainer_id, start_at);
create index measurements_student_time_idx on public.measurements(student_id, measured_at desc);

create or replace function public.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'trainer');
$$;

create or replace function public.can_access_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = target_student_id
    or exists(
      select 1 from public.student_coaching
      where student_id = target_student_id and trainer_id = auth.uid()
    );
$$;

create or replace function public.my_trainer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select trainer_id from public.student_coaching where student_id = auth.uid();
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.app_role;
  assigned_trainer uuid;
begin
  -- raw_app_meta_data can only be set by a trusted server/admin. Never trust raw_user_meta_data for role.
  requested_role := case when new.raw_app_meta_data ->> 'role' = 'trainer' then 'trainer'::public.app_role else 'student'::public.app_role end;

  insert into public.profiles (id, role, full_name, email, phone, goal, level, weekly_goal)
  values (
    new.id,
    requested_role,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    new.raw_user_meta_data ->> 'goal',
    coalesce(new.raw_user_meta_data ->> 'level', 'Başlangıç'),
    coalesce((new.raw_user_meta_data ->> 'weekly_goal')::smallint, 3)
  );

  if requested_role = 'student' then
    select default_trainer_id into assigned_trainer from public.app_settings where key = 'default_trainer';
    if assigned_trainer is null then
      raise exception 'CemFit default trainer is not configured';
    end if;
    insert into public.student_coaching (student_id, trainer_id) values (new.id, assigned_trainer);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create or replace function public.guard_student_appointment_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.student_id and not public.is_trainer() then
    if new.student_id is distinct from old.student_id
      or new.trainer_id is distinct from old.trainer_id
      or new.start_at is distinct from old.start_at
      or new.duration_minutes is distinct from old.duration_minutes
      or new.note is distinct from old.note
      or new.status not in ('pending', 'cancelled') then
      raise exception 'Students may only cancel their own appointment';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger guard_appointment_update
before update on public.appointments
for each row execute procedure public.guard_student_appointment_update();

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.student_coaching enable row level security;
alter table public.workout_programs enable row level security;
alter table public.workout_days enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_completions enable row level security;
alter table public.nutrition_plans enable row level security;
alter table public.meals enable row level security;
alter table public.measurements enable row level security;
alter table public.progress_photos enable row level security;
alter table public.appointments enable row level security;
alter table public.messages enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (
  id = auth.uid() or public.can_access_student(id) or id = public.my_trainer_id()
);
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_path, goal, level, weekly_goal, height_cm, birth_year, updated_at) on public.profiles to authenticated;

create policy coaching_read on public.student_coaching for select to authenticated using (public.can_access_student(student_id));
create policy coaching_update_trainer on public.student_coaching for update to authenticated using (trainer_id = auth.uid() and public.is_trainer()) with check (trainer_id = auth.uid());

create policy programs_read on public.workout_programs for select to authenticated using (public.can_access_student(student_id));
create policy programs_write on public.workout_programs for all to authenticated using (trainer_id = auth.uid() and public.is_trainer()) with check (trainer_id = auth.uid() and public.can_access_student(student_id));

create policy workout_days_read on public.workout_days for select to authenticated using (
  exists(select 1 from public.workout_programs p where p.id = program_id and public.can_access_student(p.student_id))
);
create policy workout_days_write on public.workout_days for all to authenticated using (
  exists(select 1 from public.workout_programs p where p.id = program_id and p.trainer_id = auth.uid())
) with check (
  exists(select 1 from public.workout_programs p where p.id = program_id and p.trainer_id = auth.uid())
);

create policy exercises_read on public.exercises for select to authenticated using (
  exists(select 1 from public.workout_days d join public.workout_programs p on p.id = d.program_id where d.id = workout_day_id and public.can_access_student(p.student_id))
);
create policy exercises_write on public.exercises for all to authenticated using (
  exists(select 1 from public.workout_days d join public.workout_programs p on p.id = d.program_id where d.id = workout_day_id and p.trainer_id = auth.uid())
) with check (
  exists(select 1 from public.workout_days d join public.workout_programs p on p.id = d.program_id where d.id = workout_day_id and p.trainer_id = auth.uid())
);

create policy completions_read on public.workout_completions for select to authenticated using (public.can_access_student(student_id));
create policy completions_insert on public.workout_completions for insert to authenticated with check (student_id = auth.uid());
create policy completions_delete on public.workout_completions for delete to authenticated using (student_id = auth.uid());

create policy nutrition_read on public.nutrition_plans for select to authenticated using (public.can_access_student(student_id));
create policy nutrition_write on public.nutrition_plans for all to authenticated using (trainer_id = auth.uid() and public.is_trainer()) with check (trainer_id = auth.uid() and public.can_access_student(student_id));
create policy meals_read on public.meals for select to authenticated using (
  exists(select 1 from public.nutrition_plans n where n.id = nutrition_plan_id and public.can_access_student(n.student_id))
);
create policy meals_write on public.meals for all to authenticated using (
  exists(select 1 from public.nutrition_plans n where n.id = nutrition_plan_id and n.trainer_id = auth.uid())
) with check (
  exists(select 1 from public.nutrition_plans n where n.id = nutrition_plan_id and n.trainer_id = auth.uid())
);

create policy measurements_read on public.measurements for select to authenticated using (public.can_access_student(student_id));
create policy measurements_insert on public.measurements for insert to authenticated with check (student_id = auth.uid());
create policy measurements_delete on public.measurements for delete to authenticated using (student_id = auth.uid());

create policy photos_read on public.progress_photos for select to authenticated using (public.can_access_student(student_id));
create policy photos_insert on public.progress_photos for insert to authenticated with check (student_id = auth.uid());
create policy photos_delete on public.progress_photos for delete to authenticated using (student_id = auth.uid());

create policy appointments_read on public.appointments for select to authenticated using (public.can_access_student(student_id));
create policy appointments_insert on public.appointments for insert to authenticated with check (
  (student_id = auth.uid() and trainer_id = public.my_trainer_id() and status = 'pending')
  or (trainer_id = auth.uid() and public.is_trainer() and public.can_access_student(student_id))
);
create policy appointments_update on public.appointments for update to authenticated using (public.can_access_student(student_id)) with check (public.can_access_student(student_id));

create policy messages_read on public.messages for select to authenticated using (
  public.can_access_student(student_id) and (trainer_id = public.my_trainer_id() or trainer_id = auth.uid() or student_id = auth.uid())
);
create policy messages_insert on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and public.can_access_student(student_id)
  and exists(select 1 from public.student_coaching c where c.student_id = messages.student_id and c.trainer_id = messages.trainer_id)
);
create policy messages_mark_read on public.messages for update to authenticated using (
  public.can_access_student(student_id) and sender_id <> auth.uid()
) with check (public.can_access_student(student_id));

revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- app_settings must remain service-role only. Configure after creating Cem's trusted trainer account:
-- insert into public.app_settings(key, default_trainer_id) values ('default_trainer', '<CEM_AUTH_UUID>');

commit;
