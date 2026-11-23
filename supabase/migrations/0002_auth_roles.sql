-- Retail Agent Phase 1: role model and least-privilege policies.
-- Existing administrator profile remains admin. Employee profiles are provisioned by an administrator.
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public
as $func$ select role from public.user_profiles where id = auth.uid() limit 1; $func$;
revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles add constraint user_profiles_role_check check (role in ('admin','employee'));
drop policy if exists "Read own profile" on public.user_profiles;
create policy "Read own profile" on public.user_profiles for select to authenticated using (id = auth.uid());
drop policy if exists "Admins manage profiles" on public.user_profiles;
create policy "Admins manage profiles" on public.user_profiles for all to authenticated using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

do $block$ declare t text; begin
  foreach t in array array['stores','products','sales_daily','inventory_batches','stock_movements','attendance_checkins','agent_runs','replenishment_recommendations','report_log'] loop
    execute format('drop policy if exists "Authenticated access" on public.%I', t);
    execute format('drop policy if exists "Admins manage rows" on public.%I', t);
    execute format('create policy "Admins manage rows" on public.%I for all to authenticated using (public.current_user_role() = ''admin'') with check (public.current_user_role() = ''admin'')', t);
  end loop;
end $block$;

drop policy if exists "Employees read stores" on public.stores;
create policy "Employees read stores" on public.stores for select to authenticated using (public.current_user_role() = 'employee');
drop policy if exists "Employees read products" on public.products;
create policy "Employees read products" on public.products for select to authenticated using (public.current_user_role() = 'employee');
drop policy if exists "Employees read own attendance" on public.attendance_checkins;
create policy "Employees read own attendance" on public.attendance_checkins for select to authenticated using (employee_id = auth.uid() and public.current_user_role() = 'employee');
drop policy if exists "Employees create own attendance" on public.attendance_checkins;
create policy "Employees create own attendance" on public.attendance_checkins for insert to authenticated with check (employee_id = auth.uid() and public.current_user_role() = 'employee');
