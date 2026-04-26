-- Fix set_updated_at search_path
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- Restrict bucket listing: drop overly broad public read policies, allow authenticated only
drop policy if exists "Public read certificates" on storage.objects;
drop policy if exists "Public read patients" on storage.objects;

create policy "Auth read certificates"
  on storage.objects for select to authenticated using (bucket_id = 'certificates');
create policy "Auth read patients"
  on storage.objects for select to authenticated using (bucket_id = 'patients');