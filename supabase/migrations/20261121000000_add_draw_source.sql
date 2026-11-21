begin;
alter table public.event_draws add column if not exists source_origin text;
alter table public.event_draw_history add column if not exists source_origin text;
create or replace function public.redraw_event_prize(
  p_event_id text, p_user_id text, p_user_name text, p_prize_id text, p_source_origin text
) returns setof public.event_draws
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_event_id || ':' || p_user_id, 0));
  insert into public.event_draw_history (event_id, line_user_id, user_name, prize_id, drawn_at, redeemed_at, source_origin)
  select event_id, line_user_id, user_name, prize_id, drawn_at, redeemed_at, source_origin
  from public.event_draws
  where event_id = p_event_id and line_user_id = p_user_id
  for update;
  return query
  insert into public.event_draws as current_draw (event_id, line_user_id, user_name, prize_id, drawn_at, redeemed_at, source_origin)
  values (p_event_id, p_user_id, p_user_name, p_prize_id, clock_timestamp(), null, p_source_origin)
  on conflict (event_id, line_user_id) do update
  set user_name = excluded.user_name, prize_id = excluded.prize_id,
      drawn_at = excluded.drawn_at, redeemed_at = null, source_origin = excluded.source_origin
  returning current_draw.*;
end;
$$;
revoke all on function public.redraw_event_prize(text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.redraw_event_prize(text,text,text,text,text) to service_role;

create or replace function public.redraw_event_prize(
  p_event_id text, p_user_id text, p_user_name text, p_prize_id text
) returns setof public.event_draws
language sql security invoker set search_path = '' as $$
  select * from public.redraw_event_prize(p_event_id,p_user_id,p_user_name,p_prize_id,null);
$$;
create or replace view public.admin_event_draws with (security_invoker = true) as
select 'current:' || event_id || ':' || line_user_id as record_id,
       event_id,line_user_id,user_name,prize_id,drawn_at,redeemed_at,source_origin
from public.event_draws
union all
select 'history:' || id::text as record_id,
       event_id,line_user_id,user_name,prize_id,drawn_at,redeemed_at,source_origin
from public.event_draw_history;
commit;
