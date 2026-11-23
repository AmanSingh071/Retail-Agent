# Supabase setup

1. Visit https://supabase.com/dashboard and create a project. Choose a strong DB password and a region suitable for your users. Keep the password private.
2. Open Project Settings → API (or Connect). Copy the Project URL and publishable/anon key. Copy `.env.example` to `.env` and fill `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_REPORT_RECIPIENT=aman18031607@gmail.com`.
3. Open SQL Editor → New query. Paste and run `supabase/migrations/0001_initial_schema.sql`. It creates schema, RLS, a private attendance evidence bucket and anomaly trigger.
4. In Authentication → Users, create/invite `aman18031607@gmail.com` as an admin. Copy the user's Auth UUID, then run (replace the placeholder):

```sql
insert into public.user_profiles(id,full_name,role,employee_id) values ('AUTH_USER_UUID_HERE','Aman Singh','admin','ADMIN-001');
```

5. Create employee accounts and profiles with role `employee`; do not permit browser self-promotion to admin.
6. Add real store coordinates/geofence radius before enabling attendance. The synthetic store codes are demo fixtures, not confirmed company locations.
7. Never expose the `service_role` key in browser or `VITE_` variables. Keep it only in trusted server environments.
8. Configure Resend and deploy report email function:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy send-daily-reports
supabase secrets set RESEND_API_KEY=YOUR_RESEND_API_KEY ADMIN_REPORT_EMAILS=aman18031607@gmail.com REPORT_FROM_EMAIL='Retail Reports <reports@your-verified-domain.com>'
```

A verified sending domain is required for production mail. The provided function requires an authenticated admin JWT. For automatic unattended scheduling, implement a separate service-role-only scheduler wrapper; never place its secret in client code.

Run locally: `npm install` then `npm run dev`. Demo mode works without Supabase. Real use still requires auth UI, trusted import endpoint and policy tests.
