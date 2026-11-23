-- Performance and duplicate protection for daily store-product sales.
create index if not exists sales_daily_date_id_idx on public.sales_daily (sale_date desc,id desc);
create index if not exists sales_daily_store_date_idx on public.sales_daily (store_id,sale_date desc);
create index if not exists sales_daily_product_date_idx on public.sales_daily (product_id,sale_date desc);
create unique index if not exists sales_daily_one_store_product_day_uidx on public.sales_daily (sale_date,store_id,product_id);
create index if not exists attendance_events_employee_time_idx on public.attendance_events (employee_id,received_at desc);
create index if not exists attendance_events_time_idx on public.attendance_events (received_at desc);

-- Employee can hard-delete only their own attendance event.
-- A minimal audit record is retained; the full attendance details and photo are removed.
create or replace function public.delete_own_attendance_event(p_event_id uuid)
returns text language plpgsql security definer set search_path=public as $$
declare stored_path text;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 delete from public.attendance_events
 where id=p_event_id and employee_id=auth.uid()
 returning photo_path into stored_path;
 if not found then raise exception 'Attendance record not found or you do not own it'; end if;
 insert into public.agent_activity_logs(agent_name,action,status,input_summary,output_summary,created_by,completed_at)
 values('Attendance Integrity','Employee deleted own attendance record','completed',
  jsonb_build_object('attendance_event_id',p_event_id),
  jsonb_build_object('attendance_record_deleted',true,'photo_storage_cleanup_required',stored_path is not null),auth.uid(),now());
 return stored_path;
end; $$;
revoke all on function public.delete_own_attendance_event(uuid) from public;
grant execute on function public.delete_own_attendance_event(uuid) to authenticated;
