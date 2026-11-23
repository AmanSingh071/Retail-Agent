# Akshayakalpa Retail Intelligence

Centralised retail operations and workforce intelligence prototype for a four-store Whitefield demo.

## Modules
- Admin dashboard and employee portal
- Inventory ledger, batch expiry, FEFO alerts and replenishment suggestions
- Daily sales import and store-level sales analytics from Supabase
- Replenishment proposal queue with admin approval/rejection and review notes
- Auditable inventory movement event history (separate from stock balances)
- Demand forecasting: seasonal-naive, moving average, Holt-Winters, ARIMA/SARIMA candidates
- Attendance: private camera evidence upload, browser GPS capture, Postgres server timestamp, server-side geofence evaluation and manual review
- Sales/inventory and attendance PDF reports with admin-triggered email delivery (requires Supabase Edge Function and Resend secrets)
- Admin-only Auth account provisioning and actual agent activity logs
- Multi-agent workflow: Import & Validation, Inventory, Forecasting, Attendance Integrity, Reporting agents

## Demo data
Synthetic one-year data for four illustrative Whitefield stores and 15 products. All synthetic rows are labelled. The original source workbook only contained division-level aggregates, so product, batch, store and attendance records are simulated and are not Akshayakalpa operational facts.

## Setup
1. Copy `.env.example` to `.env` and fill Supabase URL and anon key.
2. Create a Supabase project and run `supabase/migrations/001_initial_schema.sql` in SQL Editor.
3. Install dependencies with `npm install` and run `npm run dev`.
4. Run migrations `0003_secure_attendance.sql` and `0004_agent_replenishment_audit.sql` in order.
5. Deploy `create-workspace-user` and `send-daily-reports` Edge Functions; configure server-side secrets as described in `docs/DEPLOY_REMAINING_FEATURES.md`.
5. Review `docs/SETUP_SUPABASE.md` and `docs/AGENT_ARCHITECTURE.md` before connecting live data.

## Safety and scope
- The web client never receives a Supabase service-role key.
- Attendance time is generated on the server; client metadata is treated as evidence, not proof.
- Browser geolocation and camera require user permission. GPS drift, denied permission, or unusual patterns should be flagged for a human reviewer, not treated as automatic proof of misconduct.
- Forecasts are planning estimates. Replenishment is a human-approved suggestion, not an automatic purchase order.
- No real employee, customer, supplier or store data should be committed to this public repository.

## Status
Authentication, live sales analytics/import, product/store management, inventory batches, expiry monitoring, attendance evidence capture, replenishment review, movement history, report exports and execution history are implemented in the application. Supabase migrations and Edge Functions still require deployment in the target Supabase project; PDF email and account provisioning require the listed server secrets. The original source workbook contained aggregate division-level sales only. Synthetic demo records must remain clearly labelled and must never be presented as verified Akshayakalpa operational data.
