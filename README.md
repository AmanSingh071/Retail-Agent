# Akshayakalpa Retail Intelligence

Centralised retail operations and workforce intelligence prototype for a four-store Whitefield demo.

## Modules
- Admin dashboard and employee portal
- Inventory ledger, batch expiry, FEFO alerts and replenishment suggestions
- Daily sales import and store-level stock reconciliation
- Demand forecasting: seasonal-naive, moving average, Holt-Winters, ARIMA/SARIMA candidates
- Attendance: live camera capture, browser geolocation permission, server timestamp, geofence checks and review queue
- Daily inventory and attendance PDF reports, with admin force-send action
- Multi-agent workflow: Import & Validation, Inventory, Forecasting, Attendance Integrity, Reporting agents

## Demo data
Synthetic one-year data for four illustrative Whitefield stores and 15 products. All synthetic rows are labelled. The original source workbook only contained division-level aggregates, so product, batch, store and attendance records are simulated and are not Akshayakalpa operational facts.

## Setup
1. Copy `.env.example` to `.env` and fill Supabase URL and anon key.
2. Create a Supabase project and run `supabase/migrations/001_initial_schema.sql` in SQL Editor.
3. Install dependencies with `npm install` and run `npm run dev`.
4. For email PDFs, deploy the Supabase Edge Function in `supabase/functions/send-daily-reports` and add an email provider secret. Recipient is configured as `aman18031607@gmail.com` in demo settings.
5. Review `docs/SETUP_SUPABASE.md` and `docs/AGENT_ARCHITECTURE.md` before connecting live data.

## Safety and scope
- The web client never receives a Supabase service-role key.
- Attendance time is generated on the server; client metadata is treated as evidence, not proof.
- Browser geolocation and camera require user permission. GPS drift, denied permission, or unusual patterns should be flagged for a human reviewer, not treated as automatic proof of misconduct.
- Forecasts are planning estimates. Replenishment is a human-approved suggestion, not an automatic purchase order.
- No real employee, customer, supplier or store data should be committed to this public repository.

## Status
Phase 1 authentication is implemented: Supabase email/password login, session restoration, logout, profile-based admin/employee gating, and role-based RLS migration. Operational dashboard modules still use clearly labelled synthetic demo data; attendance persistence, live sales/inventory CRUD, and email delivery remain future phases. Synthetic demo data is provided for evaluation only.
