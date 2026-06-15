# Tasks — Invoice Module

## Task 1: Database Migration & Model Updates

- [ ] 1.1 Add new dependencies to `backend/requirements.txt`: `weasyprint==62.3`, `apscheduler==3.10.4`, `aiosmtplib==3.0.1`
- [ ] 1.2 Update `backend/app/models/billing.py` — add 10 new columns to `Invoice` model: `invoice_number`, `invoice_date`, `subtotal`, `tax_percentage`, `tax_amount`, `total_amount`, `payment_terms`, `bank_details`, `notes`, `sent_at`
- [ ] 1.3 Create `backend/app/models/invoice_item.py` — `InvoiceItem` SQLAlchemy model with `invoice_id` FK, `serial_number`, `item_name`, `description`, `unit_price`, timestamps
- [ ] 1.4 Create `backend/app/models/invoice_recipient.py` — `InvoiceRecipient` SQLAlchemy model with `invoice_id` FK, `email`, `created_at`
- [ ] 1.5 Update `backend/alembic/env.py` — import `InvoiceItem` and `InvoiceRecipient` models
- [ ] 1.6 Create `backend/alembic/versions/add_invoice_module_tables.py` — migration that adds columns to `invoices`, creates `invoice_items` and `invoice_recipients` tables, with full `downgrade()`

## Task 2: Backend — RBAC & Schemas

- [ ] 2.1 Update `backend/app/core/rbac.py` — add `INVOICE_DELETE_ROLES` and `INVOICE_SEND_ROLES` constants
- [ ] 2.2 Create `backend/app/schemas/invoice.py` — Pydantic schemas: `InvoiceItemCreate`, `InvoiceItemUpdate`, `InvoiceItemInDB`, `InvoiceCreateV2`, `InvoiceUpdateV2`, `InvoiceDetailResponse`, `InvoiceSendRequest`, `PaginatedInvoiceResponse`

## Task 3: Backend — Services

- [ ] 3.1 Create `backend/app/services/invoice_number_service.py` — `generate_invoice_number(db)` function that atomically generates `YYMMDD-N` format numbers, collision-safe
- [ ] 3.2 Create `backend/app/templates/invoice_pdf.html` — Jinja2 HTML template matching Crop2X invoice template structure (header, bill-to, items table, totals, terms, bank details)
- [ ] 3.3 Create `backend/app/services/pdf_service.py` — `generate_invoice_pdf(invoice, items, client)` function using WeasyPrint to render HTML template to PDF bytes
- [ ] 3.4 Update `backend/app/core/config.py` — add SMTP settings: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`
- [ ] 3.5 Create `backend/app/services/email_service.py` — `send_invoice_email(invoice, pdf_bytes, recipients)` using aiosmtplib
- [ ] 3.6 Create `backend/app/services/overdue_service.py` — `mark_overdue_invoices(db)` function that queries SENT invoices past due_date and updates them to OVERDUE

## Task 4: Backend — Repository & Router

- [ ] 4.1 Create `backend/app/repositories/invoice_repository.py` — methods: `get_invoices_paginated`, `create_invoice_v2`, `get_invoice_with_items`, `add_item`, `update_item`, `delete_item`, `recalculate_totals`, `mark_sent`
- [ ] 4.2 Update `backend/app/routers/billing.py` — extend `GET /invoices` with `search`, `status`, `page`, `page_size` query params and paginated response
- [ ] 4.3 Add to `backend/app/routers/billing.py`:
  - `POST /invoices/{id}/items`
  - `GET /invoices/{id}/items`
  - `PATCH /invoices/{id}/items/{item_id}`
  - `DELETE /invoices/{id}/items/{item_id}`
  - `POST /invoices/{id}/pdf`
  - `POST /invoices/{id}/send`
  - `POST /invoices/mark-overdue` (ADMIN only, manual trigger)
- [ ] 4.4 Update `backend/app/main.py` — add APScheduler startup event for daily overdue detection

## Task 5: Frontend — TypeScript Types & Routing

- [ ] 5.1 Create `frontend/types/invoice.ts` — TypeScript interfaces: `InvoiceItem`, `InvoiceRecipient`, `InvoiceDetail`, `PaginatedInvoices`, `InvoiceSendPayload`
- [ ] 5.2 Update `frontend/lib/rbac.ts` — add `/billing/invoices` route access for BILLING_READ_ROLES
- [ ] 5.3 Update `frontend/components/layout/Sidebar.tsx` — add "Invoices" nav link pointing to `/billing/invoices`

## Task 6: Frontend — Shared Invoice Components

- [ ] 6.1 Create `frontend/modules/invoices/InvoiceStatusBadge.tsx` — colored status badge (DRAFT/SENT/PAID/OVERDUE/CANCELLED)
- [ ] 6.2 Create `frontend/modules/invoices/LineItemsEditor.tsx` — dynamic add/remove line items with live subtotal/tax/total calculation
- [ ] 6.3 Create `frontend/modules/invoices/EmailModal.tsx` — modal with To/CC/Subject/Message fields and send button
- [ ] 6.4 Create `frontend/modules/invoices/InvoiceForm.tsx` — reusable create/edit form (client dropdown, invoice date, due date, tax %, payment terms, bank details, notes, line items editor)

## Task 7: Frontend — Invoice Pages

- [ ] 7.1 Create `frontend/modules/invoices/InvoiceList.tsx` — list component with search, status filter, date filter, pagination
- [ ] 7.2 Create `frontend/app/billing/invoices/page.tsx` — Invoice List Page (ProtectedRoute: BILLING_READ_ROLES)
- [ ] 7.3 Create `frontend/app/billing/invoices/new/page.tsx` — Invoice Create Page
- [ ] 7.4 Create `frontend/modules/invoices/InvoiceDetail.tsx` — detail component with all invoice fields, line items table, payments, action buttons (Download PDF, Preview PDF, Send Email, Edit, Record Payment, Delete)
- [ ] 7.5 Create `frontend/app/billing/invoices/[id]/page.tsx` — Invoice Detail Page
- [ ] 7.6 Create `frontend/app/billing/invoices/[id]/edit/page.tsx` — Invoice Edit Page

## Task 8: Tests

- [ ] 8.1 Create `backend/tests/test_invoice_api.py` — API tests: create invoice, add items, calculate totals, PDF generation, email send (mocked), overdue detection, permission tests for each role

## Task 9: Backend `.env` Update

- [ ] 9.1 Update `backend/.env` — add SMTP placeholder variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`
