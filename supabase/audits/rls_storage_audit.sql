-- Run in Supabase SQL Editor as project owner after migrations.
-- 1) Inspect RLS status for application tables.
select n.nspname as schema_name,c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
and c.relname in ('user_profiles','stores','products','sales_daily','inventory_batches','attendance_events','agent_activity_logs','replenishment_reviews','inventory_movement_events')
order by c.relname;

-- 2) Inspect policies (look for any unintended broad anon/authenticated policies).
select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies
where schemaname in ('public','storage')
and (tablename in ('user_profiles','stores','products','sales_daily','inventory_batches','attendance_events','agent_activity_logs','replenishment_reviews','inventory_movement_events','objects'))
order by schemaname,tablename,policyname;

-- 3) Confirm attendance evidence bucket is private.
select id,name,public,file_size_limit,allowed_mime_types
from storage.buckets where id='attendance-evidence';

-- 4) Confirm only the expected roles exist in profiles.
select role,count(*) from public.user_profiles group by role order by role;

-- Do not paste service-role keys, access tokens or passwords into query results or chat.
