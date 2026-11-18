create table if not exists public.line_users (
  line_user_id text primary key,
  first_login_at timestamptz not null default now()
);
alter table public.line_users enable row level security;
revoke all on table public.line_users from public, anon, authenticated;
grant select, insert on table public.line_users to service_role;
