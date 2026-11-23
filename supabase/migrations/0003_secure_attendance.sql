-- Secure attendance capture: private photo evidence + server timestamp + geofence review.
create table if not exists public.attendance_events (
 id uuid primary key default gen_random_uuid(),
 employee_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.stores(id),
 photo_path text not null,
 latitude double precision not null,
 longitude double precision not null,
 accuracy_m double precision,
 received_at timestamptz not null default now(),
 status text not null default 'pending_review' check (status in ('accepted','pending_review','outside_geofence')),
 review_reason text,
 created_at timestamptz not null default now()
);
alter table public.attendance_events enable row level security;
drop policy if exists "Employees read own attendance events" on public.attendance_events;
create policy "Employees read own attendance events" on public.attendance_events for select to authenticated using (employee_id=auth.uid());
drop policy if exists "Admins read attendance events" on public.attendance_events;
create policy "Admins read attendance events" on public.attendance_events for select to authenticated using (public.current_user_role()='admin');
drop policy if exists "Admins manage attendance events" on public.attendance_events;
create policy "Admins manage attendance events" on public.attendance_events for all to authenticated using (public.current_user_role()='admin') with check (public.current_user_role()='admin');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('attendance-evidence','attendance-evidence',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "Attendance photo owner upload" on storage.objects;
create policy "Attendance photo owner upload" on storage.objects for insert to authenticated with check(bucket_id='attendance-evidence' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Attendance photo owner read" on storage.objects;
create policy "Attendance photo owner read" on storage.objects for select to authenticated using(bucket_id='attendance-evidence' and ((storage.foldername(name))[1]=auth.uid()::text or public.current_user_role()='admin'));

create or replace function public.submit_attendance_event(
 p_store_id uuid,p_photo_path text,p_latitude double precision,p_longitude double precision,p_accuracy_m double precision
) returns public.attendance_events
language plpgsql security definer set search_path=public,storage
as $$
declare s public.stores%rowtype; d double precision; result public.attendance_events; st text:='pending_review'; reason text:='Store geofence could not be verified; manual review required.';
begin
 if auth.uid() is null or public.current_user_role() not in ('admin','employee') then raise exception 'Authenticated workspace account required'; end if;
 if p_photo_path is null or split_part(p_photo_path,'/',1)<>auth.uid()::text then raise exception 'Photo path must belong to the signed-in user'; end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='attendance-evidence' and o.name=p_photo_path) then raise exception 'Upload attendance photo before submitting'; end if;
 if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'Invalid GPS coordinates'; end if;
 select * into s from public.stores where id=p_store_id and is_active=true;
 if not found then raise exception 'Select an active store'; end if;
 if s.latitude is not null and s.longitude is not null and coalesce(s.geofence_radius_m,0)>0 then
  d:=6371000*2*asin(sqrt(power(sin(radians(p_latitude-s.latitude)/2),2)+cos(radians(s.latitude))*cos(radians(p_latitude))*power(sin(radians(p_longitude-s.longitude)/2),2)));
  if d<=s.geofence_radius_m then st:='accepted';reason:=null;
  else st:='outside_geofence';reason:=format('GPS is approximately %s metres from store; configured radius is %s metres.',round(d)::text,s.geofence_radius_m); end if;
 end if;
 insert into public.attendance_events(employee_id,store_id,photo_path,latitude,longitude,accuracy_m,status,review_reason)
 values(auth.uid(),p_store_id,p_photo_path,p_latitude,p_longitude,p_accuracy_m,st,reason) returning * into result;
 insert into public.agent_activity_logs(agent_name,action,status,input_summary,output_summary,created_by,completed_at) values('Attendance Integrity','Employee check-in',case when st='accepted' then 'completed' else 'needs_review' end,jsonb_build_object('store_id',p_store_id,'accuracy_m',p_accuracy_m),jsonb_build_object('attendance_event_id',result.id,'status',st,'review_reason',reason),auth.uid(),now());
 return result;
end; $$;
revoke all on function public.submit_attendance_event(uuid,text,double precision,double precision,double precision) from public;
grant execute on function public.submit_attendance_event(uuid,text,double precision,double precision,double precision) to authenticated;

-- Employees may read only their own rows through RLS; RPC performs inserts as the function owner.
grant select on public.attendance_events to authenticated;
