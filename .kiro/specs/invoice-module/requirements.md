# Requirements Document

## Introduction

This document defines the requirements for the Invoice Module enhancement of the Crop2X CRM system. The existing billing system provides basic invoice and payment tracking. This feature extends it into a full-featured invoicing workflow covering structured line items, automatic calculations, Crop2X-branded PDF generation, email delivery, overdue detection, and granular role-based permissions.

All changes must be backward-compatible: existing `/billing/invoices` and `/billing/payments` APIs must continue to function, and the existing `BillingLedger.tsx` component must remain operational throughout the rollout.

---

## Glossary

- **Invoice**: A formal billing document issued by Crop2X to a client, identified by a unique Invoice_Number, containing one or more Line_Items, tax calculation, and payment terms.
- **Invoice_Number**: Auto-generated identifier in `YYMMDD-N` format (e.g., `241028-2`), where `YYMMDD` is the creation date and `N` is the daily sequence counter starting at 1.
- **Line_Item**: A single row in an invoice, containing a serial number, item name, description, and unit price in PKR.
- **Subtotal**: The sum of all Line_Item prices on an Invoice before tax.
- **Tax_Amount**: The monetary value of tax computed as `Subtotal × (Tax_Percentage / 100)`.
- **Total_Amount**: The final payable amount computed as `Subtotal + Tax_Amount`.
- **Tax_Percentage**: The sales-tax rate applied to an invoice (default 15%, configurable per invoice).
- **PDF_Generator**: The backend service that renders an Invoice into a Crop2X-branded PDF document.
- **Email_Service**: The backend service responsible for sending invoice PDFs to recipients via SMTP.
- **Invoice_Recipient**: An email address explicitly associated with an Invoice for email delivery purposes.
- **Overdue_Detector**: The background process that transitions Invoice status from `SENT` to `OVERDUE` when `due_date` is past and the invoice is unpaid.
- **Invoice_Status**: One of `DRAFT`, `SENT`, `PAID`, `OVERDUE`, `CANCELLED` — the lifecycle state of an Invoice.
- **BILLING_READ_ROLES**: Roles `ADMIN`, `MANAGER`, `ACCOUNTS` — may read invoice data.
- **BILLING_WRITE_ROLES**: Roles `ADMIN`, `MANAGER`, `ACCOUNTS` — may create and edit invoices.
- **INVOICE_DELETE_ROLES**: Roles `ADMIN`, `MANAGER` — may permanently delete invoices.
- **INVOICE_SEND_ROLES**: Roles `ADMIN`, `MANAGER`, `ACCOUNTS` — may send invoices by email.
- **NTN**: National Tax Number — a Pakistani tax identifier printed on invoices.
- **SNTN**: Sales Tax National Tax Number — a Pakistani sales-tax identifier printed on invoices.
- **Invoice_Page**: The dedicated Next.js frontend page at `/billing/invoices` providing list, create, detail, edit, and PDF preview functionality.
- **BillingLedger**: The existing `BillingLedger.tsx` component that must continue to operate unchanged.
- **Alembic**: The database migration tool used by this project to apply schema changes.
- **Repository**: The SQLAlchemy async data-access layer used by the backend routers.

---

## Requirements

### Requirement 1: Preserve Existing Billing Functionality

**User Story:** As a system operator, I want all existing billing APIs and the BillingLedger frontend to continue working after the invoice module is deployed, so that no active workflows are interrupted.

#### Acceptance Criteria

1. THE Invoice_Module SHALL keep all existing endpoints (`GET /billing/invoices`, `POST /billing/invoices`, `GET /billing/invoices/{id}`, `PATCH /billing/invoices/{id}`, `DELETE /billing/invoices/{id}`, `GET /billing/payments`, `POST /billing/payments`, `GET /billing/overdue`, `GET /billing/balance/{client_id}`, `GET /billing/clients/{client_id}/arrears`, `GET /billing/clients/{client_id}/ledger`) fully operational with their current request and response contracts.
2. THE Invoice_Module SHALL add all new database columns as nullable or with defaults so that existing Invoice and Payment rows remain valid without migration data backfill.
3. THE Invoice_Module SHALL ensure the existing `BillingLedger.tsx` component continues to render invoices and payments using the unchanged API response shape.
4. WHEN the `amount` field is present on an Invoice response, THE Invoice_Module SHALL populate it from `total_amount` when line items exist, or retain the legacy `amount` value when no line items are present, so that callers of the legacy `amount` field receive a consistent value.

---

### Requirement 2: Enhanced Invoice Data Model

**User Story:** As an accounts user, I want invoices to store structured metadata (invoice number, company tax IDs, line items, tax, bank details, notes), so that the system can generate a complete Crop2X-branded invoice document without manual editing.

#### Acceptance Criteria

1. THE Invoice_Module SHALL add the following fields to the `invoices` table via an Alembic migration: `invoice_number` (VARCHAR, unique, not null after backfill), `invoice_date` (DATE), `subtotal` (NUMERIC 12,2), `tax_percentage` (NUMERIC 5,2, default 15.00), `tax_amount` (NUMERIC 12,2), `total_amount` (NUMERIC 12,2), `payment_terms` (TEXT), `bank_details` (TEXT), `notes` (TEXT), `sent_at` (TIMESTAMP).
2. THE Invoice_Module SHALL create an `invoice_items` table with columns: `id` (UUID PK), `invoice_id` (UUID FK → invoices.id, CASCADE DELETE), `serial_number` (INTEGER), `item_name` (VARCHAR 255, not null), `description` (TEXT), `unit_price` (NUMERIC 12,2, not null), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).
3. THE Invoice_Module SHALL create an `invoice_recipients` table with columns: `id` (UUID PK), `invoice_id` (UUID FK → invoices.id, CASCADE DELETE), `email` (VARCHAR 255, not null), `created_at` (TIMESTAMP).
4. THE Invoice_Module SHALL enforce that `serial_number` values within a single invoice are unique via a database unique constraint on `(invoice_id, serial_number)`.

---

### Requirement 3: Automatic Invoice Number Generation

**User Story:** As an accounts user, I want the system to auto-generate invoice numbers in the `YYMMDD-N` format when a new invoice is created, so that invoice numbers are consistent and traceable to their creation date.

#### Acceptance Criteria

1. WHEN a new Invoice is created, THE Invoice_Number_Generator SHALL assign an `invoice_number` in the format `YYMMDD-N`, where `YYMMDD` is the UTC creation date and `N` is a daily sequence integer starting at 1.
2. WHEN multiple invoices are created on the same UTC date, THE Invoice_Number_Generator SHALL increment `N` for each subsequent invoice so that each `invoice_number` is globally unique.
3. THE Invoice_Number_Generator SHALL determine `N` by counting existing invoices with `invoice_date` equal to today's date and adding 1, within a database-level atomic operation to prevent duplicate numbers under concurrent requests.
4. IF an `invoice_number` collision is detected during generation, THEN THE Invoice_Number_Generator SHALL retry with the next available `N` value until a unique number is assigned.

---

### Requirement 4: Line Item Management

**User Story:** As an accounts user, I want to add, edit, and remove individual line items on an invoice, so that the invoice accurately reflects the services or products being billed.

#### Acceptance Criteria

1. WHEN a Line_Item is added to an Invoice, THE Invoice_Module SHALL store `invoice_id`, `serial_number`, `item_name`, `description`, and `unit_price`.
2. WHEN a Line_Item is created without an explicit `serial_number`, THE Invoice_Module SHALL auto-assign the next available integer for that invoice (max existing serial_number + 1).
3. WHILE an Invoice has status `DRAFT`, THE Invoice_Module SHALL allow creating, updating, and deleting its Line_Items.
4. IF an attempt is made to modify Line_Items on an Invoice with status other than `DRAFT`, THEN THE Invoice_Module SHALL return HTTP 422 with the message "Line items can only be modified on DRAFT invoices".
5. WHEN all Line_Items on an Invoice are deleted, THE Invoice_Module SHALL set `subtotal`, `tax_amount`, and `total_amount` to zero.

---

### Requirement 5: Automatic Financial Calculations

**User Story:** As an accounts user, I want subtotal, tax amount, and total to be recalculated automatically whenever line items change, so that I never need to enter totals manually and the figures are always accurate.

#### Acceptance Criteria

1. WHEN a Line_Item is created, updated, or deleted on an Invoice, THE Invoice_Module SHALL recalculate `subtotal` as the sum of all `unit_price` values for that invoice.
2. WHEN `subtotal` is recalculated, THE Invoice_Module SHALL recalculate `tax_amount` as `ROUND(subtotal × (tax_percentage / 100), 2)`.
3. WHEN `tax_amount` is recalculated, THE Invoice_Module SHALL recalculate `total_amount` as `subtotal + tax_amount`.
4. WHEN `tax_percentage` is updated on an Invoice, THE Invoice_Module SHALL immediately recalculate `tax_amount` and `total_amount`.
5. THE Invoice_Module SHALL store `subtotal`, `tax_amount`, and `total_amount` as NUMERIC(12, 2) values, rounding intermediate calculations to 2 decimal places.
6. FOR ALL invoices with at least one Line_Item, THE Invoice_Module SHALL ensure `total_amount = subtotal + tax_amount` holds after every mutation.

---

### Requirement 6: PDF Generation

**User Story:** As an accounts user, I want to generate and download a Crop2X-branded PDF of any invoice, so that I can share a professional document with clients.

#### Acceptance Criteria

1. WHEN `POST /billing/invoices/{invoice_id}/pdf` is called, THE PDF_Generator SHALL render the invoice as a PDF containing: Invoice_Number, invoice_date, due_date, Crop2X NTN (`A278468`), Crop2X SNTN (`A278468-8`), client name, client NTN, client address, client email, a line-items table with columns S.No / Item / Description / Price (PKR), subtotal row, sales tax row (with percentage), total amount row, payment terms, and Crop2X bank details (Meezan Bank, Account: 9952-0105470950, IBAN: PK14MEZN0099520105470950).
2. WHEN PDF generation succeeds, THE PDF_Generator SHALL return the PDF file as a binary response with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="invoice_{invoice_number}.pdf"`.
3. WHEN the requested Invoice does not exist, THE PDF_Generator SHALL return HTTP 404.
4. IF an error occurs during PDF rendering, THEN THE PDF_Generator SHALL return HTTP 500 with a descriptive error message and SHALL NOT write a partial file to storage.
5. THE PDF_Generator SHALL support generating PDFs for invoices that have zero line items, displaying an empty line-items table.
6. WHERE the invoice has no line items and uses the legacy `amount` field, THE PDF_Generator SHALL display the legacy amount as the total in the generated PDF.

---

### Requirement 7: Email Sending

**User Story:** As an accounts user, I want to send an invoice PDF to one or more recipient email addresses directly from the CRM, so that clients receive their invoices without manual file export.

#### Acceptance Criteria

1. WHEN `POST /billing/invoices/{invoice_id}/send` is called with a list of recipient email addresses, THE Email_Service SHALL generate the invoice PDF and send it as an attachment to all specified recipients.
2. WHEN the email is sent successfully, THE Email_Service SHALL record `sent_at` as the current UTC timestamp on the Invoice and transition the Invoice status from `DRAFT` to `SENT`.
3. IF the email delivery fails for any recipient, THEN THE Email_Service SHALL return HTTP 502 with the failed recipient addresses and SHALL NOT update the Invoice status.
4. THE Email_Service SHALL store each recipient email in the `invoice_recipients` table upon a successful send.
5. WHEN `POST /billing/invoices/{invoice_id}/send` is called on an Invoice with status `CANCELLED`, THE Email_Service SHALL return HTTP 422 with the message "Cannot send a cancelled invoice".
6. WHEN `POST /billing/invoices/{invoice_id}/send` is called on an Invoice with status `PAID`, THE Email_Service SHALL return HTTP 422 with the message "Invoice is already paid".
7. THE Email_Service SHALL use SMTP credentials from the application environment configuration.

---

### Requirement 8: Overdue Invoice Detection

**User Story:** As an accounts user, I want invoices to be automatically marked as overdue once their due date has passed without payment, so that the team always has an accurate view of outstanding receivables.

#### Acceptance Criteria

1. WHEN the current UTC date is strictly after an Invoice's `due_date` and the Invoice status is `SENT`, THE Overdue_Detector SHALL transition the Invoice status to `OVERDUE`.
2. THE Overdue_Detector SHALL run at least once every 24 hours as a scheduled background task.
3. WHILE an Invoice status is `PAID` or `CANCELLED`, THE Overdue_Detector SHALL NOT change that Invoice's status.
4. WHEN the Overdue_Detector processes invoices, THE Invoice_Module SHALL log the count of invoices transitioned to `OVERDUE` status.
5. IF the Overdue_Detector encounters a database error, THEN THE Invoice_Module SHALL log the error and continue processing remaining invoices without raising an unhandled exception.

---

### Requirement 9: Invoice List with Search, Filter, and Pagination

**User Story:** As an accounts user, I want to search, filter, and page through invoices in a dedicated invoice list page, so that I can quickly locate specific invoices among a large dataset.

#### Acceptance Criteria

1. THE Invoice_Page SHALL display a paginated table of invoices with columns: Invoice_Number, Client Name, Invoice Date, Due Date, Total Amount, Status.
2. WHEN a search term is entered, THE Invoice_Page SHALL filter invoices by Invoice_Number or client name (case-insensitive, partial match).
3. WHEN a status filter is selected, THE Invoice_Page SHALL display only invoices matching the selected status.
4. THE Invoice_Page SHALL support pagination with a configurable page size defaulting to 20 invoices per page.
5. WHEN the total invoice count exceeds the page size, THE Invoice_Page SHALL display page navigation controls (previous, next, page numbers).
6. THE Invoice_Module backend SHALL expose `GET /billing/invoices` query parameters: `search` (string), `status` (InvoiceStatus), `page` (integer, default 1), `page_size` (integer, default 20, max 100), returning a response body `{ "total": int, "page": int, "page_size": int, "items": [Invoice] }`.
7. WHEN no invoices match the applied filters, THE Invoice_Page SHALL display a "No invoices found" message.

---

### Requirement 10: Invoice Create Page with Dynamic Line Items

**User Story:** As an accounts user, I want a dedicated create-invoice page where I can select a client, set invoice metadata, and add multiple line items dynamically before saving, so that I can build a complete invoice in one step.

#### Acceptance Criteria

1. THE Invoice_Page SHALL provide a create-invoice form with fields: Client (required, dropdown), Invoice Date (required, date picker), Due Date (required, date picker), Tax Percentage (numeric, default 15), Payment Terms (text), Bank Details (text, pre-filled with Crop2X default), Notes (text).
2. THE Invoice_Page SHALL allow adding one or more Line_Items dynamically, each with fields: Item Name (required), Description (optional), Unit Price in PKR (required, positive number).
3. WHEN a Line_Item is added or its Unit Price is changed, THE Invoice_Page SHALL immediately update the displayed Subtotal, Tax Amount, and Total Amount without requiring form submission.
4. WHEN the create form is submitted, THE Invoice_Module SHALL create the Invoice with status `DRAFT` and persist all Line_Items in a single atomic operation.
5. IF the create form is submitted with no Line_Items, THE Invoice_Module SHALL accept the submission and create the Invoice with zero subtotal.
6. WHEN an Invoice is created successfully, THE Invoice_Page SHALL navigate to the Invoice Detail page for the newly created invoice.

---

### Requirement 11: Invoice Detail Page

**User Story:** As an accounts user, I want a dedicated invoice detail page that shows all invoice information and provides action buttons, so that I can review, download, or act on an invoice in one place.

#### Acceptance Criteria

1. THE Invoice_Page SHALL render a detail view for a single invoice displaying: Invoice_Number, status badge, client name and contact details, Invoice Date, Due Date, all Line_Items in a table (S.No, Item, Description, Price PKR), Subtotal, Tax (with percentage), Total Amount, Payment Terms, Bank Details, Notes, and a list of recorded payments.
2. THE Invoice_Page SHALL display a "Download PDF" button that calls `POST /billing/invoices/{id}/pdf` and triggers a browser file download.
3. THE Invoice_Page SHALL display a "Send Email" button (visible to INVOICE_SEND_ROLES) that opens an email modal allowing entry of one or more recipient addresses.
4. THE Invoice_Page SHALL display an "Edit" button (visible to BILLING_WRITE_ROLES) linking to the edit page, disabled when Invoice status is `PAID` or `CANCELLED`.
5. THE Invoice_Page SHALL display a "Record Payment" button (visible to BILLING_WRITE_ROLES) for invoices with status `SENT` or `OVERDUE`.
6. THE Invoice_Page SHALL display a "Delete" button (visible to INVOICE_DELETE_ROLES) for invoices with status not `PAID`.
7. WHEN the Invoice status is `OVERDUE`, THE Invoice_Page SHALL render the due date and status badge in a visually distinct red style.

---

### Requirement 12: Invoice Edit Page

**User Story:** As an accounts user, I want to edit an existing draft invoice's metadata and line items, so that I can correct errors before sending it to the client.

#### Acceptance Criteria

1. THE Invoice_Page SHALL provide an edit form pre-populated with all existing Invoice fields and Line_Items.
2. WHILE an Invoice has status `DRAFT`, THE Invoice_Page SHALL allow editing all Invoice fields and adding, editing, or deleting Line_Items.
3. WHEN an Invoice has status other than `DRAFT`, THE Invoice_Page SHALL display the edit form in a read-only state and show a notice explaining why editing is disabled.
4. WHEN the edit form is submitted, THE Invoice_Module SHALL update the Invoice and all modified Line_Items in a single atomic operation.
5. WHEN a Line_Item is removed in the edit form and the form is submitted, THE Invoice_Module SHALL delete that Line_Item from the database.
6. WHEN the edit form is submitted with valid data, THE Invoice_Page SHALL navigate back to the Invoice Detail page.

---

### Requirement 13: Granular Role-Based Permissions for Invoices

**User Story:** As a system administrator, I want fine-grained permission checks for invoice operations so that each role can only perform the actions appropriate to its responsibilities.

#### Acceptance Criteria

1. THE Invoice_Module SHALL enforce that only BILLING_READ_ROLES (`ADMIN`, `MANAGER`, `ACCOUNTS`) may call `GET /billing/invoices`, `GET /billing/invoices/{id}`, `GET /billing/invoices/{id}/pdf`, `GET /billing/overdue`, `GET /billing/balance/{client_id}`, `GET /billing/clients/{client_id}/arrears`, `GET /billing/clients/{client_id}/ledger`.
2. THE Invoice_Module SHALL enforce that only BILLING_WRITE_ROLES (`ADMIN`, `MANAGER`, `ACCOUNTS`) may call `POST /billing/invoices`, `PATCH /billing/invoices/{id}`, `POST /billing/invoices/{id}/items`, `PATCH /billing/invoices/{id}/items/{item_id}`, `DELETE /billing/invoices/{id}/items/{item_id}`.
3. THE Invoice_Module SHALL enforce that only INVOICE_DELETE_ROLES (`ADMIN`, `MANAGER`) may call `DELETE /billing/invoices/{id}`.
4. THE Invoice_Module SHALL enforce that only INVOICE_SEND_ROLES (`ADMIN`, `MANAGER`, `ACCOUNTS`) may call `POST /billing/invoices/{id}/send`.
5. THE Invoice_Module SHALL enforce that only BILLING_WRITE_ROLES may call `POST /billing/invoices/{id}/pdf` (PDF generation is a write-side operation because it may persist the file_path).
6. WHEN a user without the required role calls any invoice endpoint, THE Invoice_Module SHALL return HTTP 403 with the message "Insufficient permissions".
7. THE Invoice_Page SHALL hide action buttons (Edit, Delete, Send, Record Payment) from users whose role does not grant the corresponding permission, using client-side role checks consistent with the backend enforcement.

---

### Requirement 14: Invoice PDF Preview in Frontend

**User Story:** As an accounts user, I want to preview a rendered invoice PDF in the browser before downloading or sending it, so that I can verify the content looks correct.

#### Acceptance Criteria

1. THE Invoice_Page SHALL provide a "Preview PDF" action on the Invoice Detail page that fetches the PDF from `POST /billing/invoices/{id}/pdf` and opens it in a browser tab or an in-page PDF viewer.
2. WHEN the PDF is loading, THE Invoice_Page SHALL display a loading indicator and disable the preview button to prevent duplicate requests.
3. IF the PDF generation request fails, THE Invoice_Page SHALL display an error message with the failure reason and SHALL NOT open a blank tab.

---

### Requirement 15: Activity Logging for Invoice Actions

**User Story:** As a system administrator, I want all invoice create, update, send, and delete actions to be recorded in the activity log, so that there is a complete audit trail for billing operations.

#### Acceptance Criteria

1. WHEN an Invoice is created, THE Invoice_Module SHALL write an activity log entry with action `CREATE`, entity type `Invoice`, the invoice's ID, and the creating user's ID and name.
2. WHEN an Invoice is updated, THE Invoice_Module SHALL write an activity log entry with action `UPDATE`, the previous field values, and the new field values.
3. WHEN an Invoice is sent by email, THE Invoice_Module SHALL write an activity log entry with action `SEND`, the invoice ID, and the list of recipient addresses.
4. WHEN an Invoice is deleted, THE Invoice_Module SHALL write an activity log entry with action `DELETE`, the invoice ID, and the deleting user's ID and name.
5. THE Invoice_Module SHALL use the existing `ActivityLogService.log_activity` method for all logging, following the same call signature used in the existing billing router.

---

### Requirement 16: Alembic Database Migration

**User Story:** As a developer, I want a single Alembic migration script to apply all new invoice schema changes in one step, so that the database can be upgraded safely without manual SQL.

#### Acceptance Criteria

1. THE Invoice_Module SHALL provide an Alembic migration that adds all new columns to the `invoices` table (`invoice_number`, `invoice_date`, `subtotal`, `tax_percentage`, `tax_amount`, `total_amount`, `payment_terms`, `bank_details`, `notes`, `sent_at`) as nullable first, then backfills `invoice_number` for existing rows, then applies a NOT NULL constraint.
2. THE Invoice_Module SHALL provide an Alembic migration that creates the `invoice_items` table with all required columns and constraints.
3. THE Invoice_Module SHALL provide an Alembic migration that creates the `invoice_recipients` table with all required columns and constraints.
4. THE Alembic migration SHALL include a `downgrade()` function that fully reverses all schema changes.
5. WHEN the migration is applied to a database containing existing Invoice and Payment records, THE Invoice_Module SHALL leave those existing rows intact with no data loss.
