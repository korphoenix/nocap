begin;
create table if not exists public.event_draw_history (
  id bigint generated always as identity primary key,
  event_id text not null,
  line_user_id text not null,
  user_name text,
  prize_id text not null,
  drawn_at timestamptz not null,
  redeemed_at timestamptz
);
alter table public.event_draw_history enable row level security;
revoke all on public.event_draw_history from public, anon, authenticated;
grant select, insert, delete on public.event_draw_history to service_role;
grant usage on sequence public.event_draw_history_id_seq to service_role;

create or replace function public.redraw_event_prize(
  p_event_id text, p_user_id text, p_user_name text, p_prize_id text
) returns setof public.event_draws
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_event_id || ':' || p_user_id, 0));
  insert into public.event_draw_history (event_id, line_user_id, user_name, prize_id, drawn_at, redeemed_at)
  select event_id, line_user_id, user_name, prize_id, drawn_at, redeemed_at
  from public.event_draws
  where event_id = p_event_id and line_user_id = p_user_id
  for update;
  return query
  insert into public.event_draws as current_draw (event_id, line_user_id, user_name, prize_id, drawn_at, redeemed_at)
  values (p_event_id, p_user_id, p_user_name, p_prize_id, clock_timestamp(), null)
  on conflict (event_id, line_user_id) do update
  set user_name = excluded.user_name, prize_id = excluded.prize_id,
      drawn_at = excluded.drawn_at, redeemed_at = null
  returning current_draw.*;
end;
$$;
revoke all on function public.redraw_event_prize(text,text,text,text) from public, anon, authenticated;
grant execute on function public.redraw_event_prize(text,text,text,text) to service_role;

create or replace view public.admin_event_draws with (security_invoker = true) as
select 'current:' || event_id || ':' || line_user_id as record_id,
       event_id, line_user_id, user_name, prize_id, drawn_at, redeemed_at
from public.event_draws
union all
select 'history:' || id::text as record_id,
       event_id, line_user_id, user_name, prize_id, drawn_at, redeemed_at
from public.event_draw_history;
revoke all on public.admin_event_draws from public, anon, authenticated;
grant select on public.admin_event_draws to service_role;

create or replace function public.clear_event_draws(p_event_id text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.event_draw_history where event_id = p_event_id;
  delete from public.event_draws where event_id = p_event_id;
end;
$$;
revoke all on function public.clear_event_draws(text) from public, anon, authenticated;
grant execute on function public.clear_event_draws(text) to service_role;
commit;
