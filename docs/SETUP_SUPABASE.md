# Supabase setup

## Application environment
The Vite client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Set these in Vercel Project → Settings → Environment Variables. The publishable/anon key is intended for browser use with RLS enabled. Never add a service-role key to a `VITE_*` variable or commit a real `.env` file.

## Authentication setup
1. In Supabase Authentication → URL Configuration, set Site URL to the deployed Vercel URL.
2. Add redirect URLs for the deployed Vercel origin and `http://localhost:5173/**`.
3. Create users from Authentication → Users. Public self-registration is intentionally not implemented.
4. Run `supabase/migrations/0002_auth_roles.sql` in SQL Editor after the initial tables and policies have been created.
5. The migration changes allowed profile roles to `admin` and `employee`, adds a security-definer role lookup helper, and replaces broad authenticated access with role-based RLS.
6. Provision an employee after creating their Auth user. Replace the UUID and employee details:

```sql
insert into public.user_profiles (id, full_name, role, employee_id)
values ('AUTH_USER_UUID_HERE', 'Employee Name', 'employee', 'EMP-001');
```

7. The existing administrator profile should retain role `admin`. Check with:

```sql
select id, full_name, role, employee_id from public.user_profiles;
```

## Role permissions
- Admin: manage user profiles and operational tables.
- Employee: read store/product reference data; create and read only their own attendance records.
- Employees cannot read sales, inventory, replenishment, reports or agent runs.
- The web app restricts employee navigation to Attendance. Database RLS remains the security boundary.
- Do not let users assign their own roles. Provision accounts and roles through trusted admin workflows.

## Current implementation boundary
Phase 1 adds email/password login, session restoration, logout, profile lookup and role-gated navigation. Employee attendance capture is still a UI prototype and does not yet persist photos or check-ins. Admin operational screens still display synthetic demo data until later phases connect them to Supabase.

For local development, copy `.env.example` to `.env`, fill the Vite variables, then run `npm install` and `npm run dev`. The default Vite URL is `http://localhost:5173`.

## Production safety
- Never expose the Supabase `service_role` key in the browser.
- Use real store coordinates and geofence radii only after they are verified.
- Treat GPS and camera evidence as supporting information, not proof of identity or misconduct.
- Forecasts are planning estimates; replenishment requires human approval.
