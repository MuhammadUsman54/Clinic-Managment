alter publication supabase_realtime add table public.tokens_day;
alter publication supabase_realtime add table public.token_purchases;
alter table public.tokens_day replica identity full;
alter table public.token_purchases replica identity full;