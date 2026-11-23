-- Let an employee remove only the photo evidence from their own check-in.
-- Preserve the attendance event, server timestamp, GPS and an auditable removal marker.
alter table public.attendance_events alter column photo_path drop not null;
alter table public.attendance_events add column if not exists photo_removed_at timestamptz;
alter table public.attendance_events add column if not exists photo_removed_by uuid references auth.users(id);

drop policy if exists "Attendance photo owner delete" on storage.objects;
create policy "Attendance photo owner delete" on storage.objects
 for delete to authenticated
 using(bucket_id='attendance-evidence' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.mark_own_attendance_photo_removed(p_event_id uuid)
returns public.attendance_events
language plpgsql security definer set search_path=public
as $$
declare result public.attendance_events;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 update public.attendance_events
 set photo_path=null, photo_removed_at=now(), photo_removed_by=auth.uid()
 where id=p_event_id and employee_id=auth.uid() and photo_path is not null
 returning * into result;
 if not found then raise exception 'Attendance photo not found or you do not own this check-in'; end if;
 insert into public.agent_activity_logs(agent_name,action,status,input_summary,output_summary,created_by,completed_at)
 values('Attendance Integrity','Employee removed own attendance photo','completed',
   jsonb_build_object('attendance_event_id',p_event_id),
   jsonb_build_object('photo_removed',true,'attendance_record_retained',true),auth.uid(),now());
 return result;
end; $$;
revoke all on function public.mark_own_attendance_photo_removed(uuid) from public;
grant execute on function public.mark_own_attendance_photo_removed(uuid) to authenticated;
