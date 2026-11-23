# Agent architecture

- **Sales Intake Agent:** validate uploaded store sales schema, duplicates, nulls and totals; quarantine invalid data.
- **Inventory State Agent:** reconcile opening + inward − sales − waste + adjustments; calculate on-hand by store/SKU/batch.
- **Expiry Agent:** apply FEFO and flag expired/near-expiry stock.
- **Demand Forecast Agent:** benchmark seasonal naive and moving average against Holt-Winters, ARMA, ARIMA and SARIMA; include weekday/weekend and configurable festival effects; chronological MAE/WAPE validation; complex model must beat baseline.
- **Replenishment Agent:** estimate lead-time demand plus safety buffer and submit suggested quantities for admin approval.
- **Attendance Integrity Agent:** capture authenticated worker, live camera evidence, GPS and server receive time; flag anomalies for human review rather than automatic fraud judgements.
- **Reporting Agent:** create two independent PDFs, log delivery status and support audited force-send.

LLMs may explain validated data but must not invent counts, modify attendance, or autonomously order stock.
