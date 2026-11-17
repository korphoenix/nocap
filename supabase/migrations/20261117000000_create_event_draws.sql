create table public.event_draws (
  event_id text not null,
  line_user_id text not null,
  prize_id text not null,
  drawn_at timestamptz not null default now(),
  redeemed_at timestamptz,
  primary key (event_id, line_user_id)
);

alter table public.event_draws enable row level security;
revoke all on table public.event_draws from public, anon, authenticated;
grant select, insert, update on table public.event_draws to service_role;
