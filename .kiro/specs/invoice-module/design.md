# Design Document — Invoice Module

## Overview

This document describes the technical design for the Invoice Module enhancement. It builds on the existing billing system by adding structured line items, automatic calculations, PDF generation using `weasyprint`, email delivery via SMTP, overdue detection as a background task, and a dedicated frontend invoice workflow. All changes are backward-compatible with the existing `/billing/*` endpoints and `BillingLedger.tsx`.

---

## Architecture

```
Frontend (Next.js)
  └── /billing/invoices        — InvoiceListPage (new)
  └── /billing/invoices/new    — InvoiceCreatePage (new)
  └── /billing/invoices/[id]   — InvoiceDetailPage (new)
  └── /billing/invoices/[id]/edit — InvoiceEditPage (new)
  └── /billing              — BillingLedger (unchanged)

Backend (FastAPI)
  └── /billing/invoices        — extended with search/filter/pagination
  └── /billing/invoices/{id}/items        — new: line item CRUD
  └── /billing/invoices/{id}/pdf          — new: PDF generation
  └── /billing/invoices/{id}/send         — new: email sending
  └── /billing/invoices/mark-overdue      — new: manual trigger for overdue
  Background Task (APScheduler)
  └── overdue_detector — runs daily

Database (PostgreSQL via Neon)
  └── invoices        — 10 new columns added via Alembic
  └── invoice_items   — new table
  └── invoice_recipients — new table
```

---

## Database Design

### Modified Table: `invoices`

New columns (all nullable to preserve existing rows):

| Column | Type | Default | Notes |
|---|---|---|---|
| `invoice_number` | VARCHAR(20) | NULL | Unique after backfill, format `YYMMDD-N` |
| `invoice_date` | DATE | NULL | Defaults to `created_at` date on creation |
| `subtotal` | NUMERIC(12,2) | 0.00 | Sum of all item `unit_price` values |
| `tax_percentage` | NUMERIC(5,2) | 15.00 | Configurable per invoice |
| `tax_amount` | NUMERIC(12,2) | 0.00 | `ROUND(subtotal × tax_percentage/100, 2)` |
| `total_amount` | NUMERIC(12,2) | 0.00 | `subtotal + tax_amount` |
| `payment_terms` | TEXT | NULL | e.g. "Payment via cheque to Crop2X Pvt Ltd" |
| `bank_details` | TEXT | NULL | Pre-filled default in frontend |
| `notes` | TEXT | NULL | Free-form notes |
| `sent_at` | TIMESTAMP | NULL | Set when email is successfully sent |

The existing `amount` field is preserved unchanged. When `total_amount > 0`, the API response populates `amount` from `total_amount` for backward compatibility.

### New Table: `invoice_items`

```sql
CREATE TABLE invoice_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    serial_number INTEGER NOT NULL,
    item_name   VARCHAR(255) NOT NULL,
    description TEXT,
    unit_price  NUMERIC(12,2) NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE (invoice_id, serial_number)
);
```

### New Table: `invoice_recipients`

```sql
CREATE TABLE invoice_recipients (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    email       VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## Backend Design

### New Files

```
backend/app/models/invoice_item.py         — InvoiceItem SQLAlchemy model
backend/app/models/invoice_recipient.py    — InvoiceRecipient SQLAlchemy model
backend/app/schemas/invoice.py             — All invoice Pydantic schemas
backend/app/repositories/invoice_repository.py  — Extended invoice data access
backend/app/services/invoice_number_service.py  — Invoice number generation
backend/app/services/pdf_service.py        — WeasyPrint PDF generation
backend/app/services/email_service.py      — SMTP email sending
backend/app/services/overdue_service.py    — Background overdue detection
backend/app/routers/invoices.py            — New dedicated invoice router
backend/alembic/versions/add_invoice_module_tables.py  — Migration
backend/tests/test_invoice_api.py          — API tests
```

### Modified Files

```
backend/app/models/billing.py              — Add new columns to Invoice model
backend/app/core/rbac.py                   — Add INVOICE_DELETE_ROLES, INVOICE_SEND_ROLES
backend/app/main.py                        — Register invoices router + scheduler
backend/alembic/env.py                     — Import new models
backend/requirements.txt                   — Add weasyprint, apscheduler, aiosmtplib
```

### Invoice Number Generation

```python
# Format: YYMMDD-N
# date = today's UTC date → "260612"
# N = COUNT(invoices WHERE invoice_date = today) + 1
# Result: "260612-1", "260612-2", ...
# Atomic: SELECT FOR UPDATE on a daily counter or retry-on-unique-violation
```

Strategy: Use `SELECT COUNT(*) WHERE invoice_date = today FOR UPDATE` inside a transaction, then assign `N = count + 1`. If unique constraint violation occurs (race condition), retry once with `N+1`.

### PDF Generation (WeasyPrint)

HTML template rendered with Jinja2, then converted to PDF via WeasyPrint:

```
backend/app/templates/invoice_pdf.html  — Jinja2 HTML template
```

Template sections:
1. Header: Crop2X logo text, NTN/SNTN, Invoice Number, Invoice Date, Due Date
2. Bill To: Client name, NTN, address, tel, email
3. Items Table: S.No | Item | Description | Price (PKR)
4. Totals: Subtotal, Sales Tax (X%), Total Budget
5. Terms: Payment terms text
6. Bank Details: Meezan Bank, Account, IBAN

### Email Service (aiosmtplib)

```python
# Environment variables:
# SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL

# Flow:
# 1. Generate PDF bytes
# 2. Build MIMEMultipart email
# 3. Attach PDF
# 4. Send via aiosmtplib
# 5. On success: update invoice sent_at, status=SENT, store recipients
# 6. On failure: return 502 with failed addresses
```

### Overdue Detection (APScheduler)

```python
# Runs daily at 00:05 UTC
# Query: SELECT * FROM invoices WHERE status='SENT' AND due_date < TODAY()
# Update: status = 'OVERDUE'
# Log: count of updated invoices
```

### New Router: `/billing/invoices` (extended)

New endpoints added alongside existing billing router:

```
GET    /billing/invoices                        — list (search, filter, pagination) [extended]
POST   /billing/invoices/{id}/items             — create line item
GET    /billing/invoices/{id}/items             — list line items
PATCH  /billing/invoices/{id}/items/{item_id}   — update line item
DELETE /billing/invoices/{id}/items/{item_id}   — delete line item
POST   /billing/invoices/{id}/pdf               — generate PDF
POST   /billing/invoices/{id}/send              — send email
POST   /billing/invoices/mark-overdue           — manual trigger (ADMIN only)
```

The new endpoints are added to the **existing** `billing.py` router to avoid route prefix conflicts.

---

## Frontend Design

### New Files

```
frontend/app/billing/invoices/page.tsx                — Invoice List Page
frontend/app/billing/invoices/new/page.tsx            — Invoice Create Page
frontend/app/billing/invoices/[id]/page.tsx           — Invoice Detail Page
frontend/app/billing/invoices/[id]/edit/page.tsx      — Invoice Edit Page
frontend/modules/invoices/InvoiceList.tsx             — List component
frontend/modules/invoices/InvoiceForm.tsx             — Create/Edit form
frontend/modules/invoices/InvoiceDetail.tsx           — Detail view
frontend/modules/invoices/EmailModal.tsx              — Email send modal
frontend/modules/invoices/LineItemsEditor.tsx         — Dynamic line items
frontend/modules/invoices/InvoiceStatusBadge.tsx      — Status badge
frontend/types/invoice.ts                             — TypeScript interfaces
```

### Modified Files

```
frontend/components/layout/Sidebar.tsx        — Add "Invoices" nav link
frontend/lib/rbac.ts                          — Add invoice route permissions
```

### Permission Checks (Frontend)

```typescript
// Derived from user.role
const canCreateInvoice = ['ADMIN', 'MANAGER', 'ACCOUNTS'].includes(user.role)
const canEditInvoice   = ['ADMIN', 'MANAGER', 'ACCOUNTS'].includes(user.role)
const canDeleteInvoice = ['ADMIN', 'MANAGER'].includes(user.role)
const canSendInvoice   = ['ADMIN', 'MANAGER', 'ACCOUNTS'].includes(user.role)
const canDownloadPDF   = ['ADMIN', 'MANAGER', 'ACCOUNTS'].includes(user.role)
```

### InvoiceForm Live Calculation

```typescript
// On every item change:
subtotal     = items.reduce((sum, item) => sum + item.unit_price, 0)
tax_amount   = Math.round(subtotal * (tax_percentage / 100) * 100) / 100
total_amount = subtotal + tax_amount
```

---

## Dependencies to Add

### Backend (`requirements.txt`)

```
weasyprint==62.3          # PDF generation from HTML
jinja2==3.1.4             # HTML template rendering (already present via fastapi[all])
apscheduler==3.10.4       # Background scheduler for overdue detection
aiosmtplib==3.0.1         # Async SMTP for email sending
```

### Frontend

No new npm packages needed. Uses existing `axios`, `react-hook-form`, `zod`, `lucide-react`.

---

## Backward Compatibility

1. Existing `GET /billing/invoices` — extended with optional query params; existing callers without params continue to receive all invoices.
2. Existing `InvoiceInDB` schema — extended with new nullable fields; existing frontend `BillingLedger.tsx` ignores unknown fields.
3. Existing `amount` field — preserved; `total_amount` added alongside it.
4. Existing `BillingLedger.tsx` — unchanged; new UI is at `/billing/invoices/*`.
5. Alembic migration — all new columns nullable initially, backfill then constrain.

---

## Alembic Migration Chain

```
add_performance_indexes (current HEAD)
    ↓
add_invoice_module_tables (new migration)
```

Revision ID: `add_invoice_module_tables`
Down revision: `add_performance_indexes`
