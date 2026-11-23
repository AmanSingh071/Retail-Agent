-- Auditable agent execution, replenishment approvals and inventory movement history.
create table if not exists public.agent_activity_logs(
 id uuid primary key default gen_random_uuid(),
 agent_name text not null,
 action text not null,
 status text not null check(status in ('started','completed','failed','needs_review')),
 input_summary jsonb not null default '{}'::jsonb,
 output_summary jsonb not null default '{}'::jsonb,
 error_message text,
 started_at timestamptz not null default now(),
 completed_at timestamptz,
 created_by uuid references auth.users(id)
);
alter table public.agent_activity_logs enable row level security;
drop policy if exists "Admins manage agent activity logs" on public.agent_activity_logs;
create policy "Admins manage agent activity logs" on public.agent_activity_logs for all to authenticated using(public.current_user_role()='admin') with check(public.current_user_role()='admin');

create table if not exists public.replenishment_reviews(
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id),
 product_id uuid not null references public.products(id),
 suggested_quantity numeric not null check(suggested_quantity>0),
 basis jsonb not null default '{}'::jsonb,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reviewer_note text,
 created_by uuid references auth.users(id),
 reviewed_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz
);
alter table public.replenishment_reviews enable row level security;
drop policy if exists "Admins manage replenishment reviews" on public.replenishment_reviews;
create policy "Admins manage replenishment reviews" on public.replenishment_reviews for all to authenticated using(public.current_user_role()='admin') with check(public.current_user_role()='admin');

create table if not exists public.inventory_movement_events(
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id),
 product_id uuid not null references public.products(id),
 movement_type text not null check(movement_type in ('receipt','sale','waste','adjustment','transfer_in','transfer_out')),
 quantity numeric not null check(quantity<>0),
 reference text,
 note text,
 occurred_at timestamptz not null default now(),
 created_by uuid references auth.users(id)
);
alter table public.inventory_movement_events enable row level security;
drop policy if exists "Admins manage inventory movement events" on public.inventory_movement_events;
create policy "Admins manage inventory movement events" on public.inventory_movement_events for all to authenticated using(public.current_user_role()='admin') with check(public.current_user_role()='admin');

-- Explicit SQL privileges; row-level policies remain the authorization boundary.
grant select,insert,update,delete on public.agent_activity_logs to authenticated;
grant select,insert,update,delete on public.replenishment_reviews to authenticated;
grant select,insert,update,delete on public.inventory_movement_events to authenticated;
