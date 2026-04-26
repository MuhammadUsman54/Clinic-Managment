-- Role enum
create type public.user_role as enum ('company', 'user');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role public.user_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles viewable by authenticated"
  on public.profiles for select to authenticated using (true);
create policy "Users update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Users insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Auto profile trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Companies
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  since int,
  timings text,
  address text not null,
  latitude double precision,
  longitude double precision,
  certificate_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.companies enable row level security;
create policy "Companies viewable by authenticated"
  on public.companies for select to authenticated using (true);
create policy "Owner manages companies insert"
  on public.companies for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owner manages companies update"
  on public.companies for update to authenticated using (auth.uid() = owner_id);
create policy "Owner manages companies delete"
  on public.companies for delete to authenticated using (auth.uid() = owner_id);
create trigger companies_updated before update on public.companies
  for each row execute function public.set_updated_at();

-- Per-day token state (one row per company per day)
create table public.tokens_day (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  day date not null default current_date,
  total_tokens int not null,
  current_token int not null default 0,
  estimated_minutes_per_token int not null default 10,
  is_allowed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, day)
);
alter table public.tokens_day enable row level security;
create policy "Tokens day viewable by authenticated"
  on public.tokens_day for select to authenticated using (true);
create policy "Owner manages tokens_day insert"
  on public.tokens_day for insert to authenticated with check (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
  );
create policy "Owner manages tokens_day update"
  on public.tokens_day for update to authenticated using (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
  );
create policy "Owner manages tokens_day delete"
  on public.tokens_day for delete to authenticated using (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
  );
create trigger tokens_day_updated before update on public.tokens_day
  for each row execute function public.set_updated_at();

-- Token purchases
create table public.token_purchases (
  id uuid primary key default gen_random_uuid(),
  tokens_day_id uuid not null references public.tokens_day(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_number int not null,
  patient_image_url text,
  status text not null default 'active', -- active | cancelled
  created_at timestamptz not null default now(),
  unique (tokens_day_id, token_number)
);
alter table public.token_purchases enable row level security;
create policy "Purchases viewable by user or company owner"
  on public.token_purchases for select to authenticated using (
    auth.uid() = user_id or exists (
      select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()
    )
  );
create policy "User creates own purchase"
  on public.token_purchases for insert to authenticated with check (auth.uid() = user_id);
create policy "User updates own purchase"
  on public.token_purchases for update to authenticated using (auth.uid() = user_id);
create policy "User deletes own purchase"
  on public.token_purchases for delete to authenticated using (auth.uid() = user_id);

-- Storage buckets
insert into storage.buckets (id, name, public) values ('certificates','certificates', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('patients','patients', true)
  on conflict (id) do nothing;

create policy "Public read certificates"
  on storage.objects for select using (bucket_id = 'certificates');
create policy "Authenticated upload certificates"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owner update certificates"
  on storage.objects for update to authenticated
  using (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owner delete certificates"
  on storage.objects for delete to authenticated
  using (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Public read patients"
  on storage.objects for select using (bucket_id = 'patients');
create policy "Authenticated upload patients"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'patients' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owner update patients"
  on storage.objects for update to authenticated
  using (bucket_id = 'patients' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owner delete patients"
  on storage.objects for delete to authenticated
  using (bucket_id = 'patients' and (storage.foldername(name))[1] = auth.uid()::text);