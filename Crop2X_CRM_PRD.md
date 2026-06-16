# Product Requirements Document (PRD)
## Crop2X Internal CRM & Operations Management System

---

**Document Version:** 1.0
**Date:** June 2026
**Status:** Final
**Prepared By:** Crop2X Engineering Team
**Confidentiality:** Internal Use Only

---

## Table of Contents

1. Executive Summary
2. Problem Statement
3. Objectives & Success Metrics
4. User Personas & Roles
5. Scope
6. Functional Requirements
7. User Stories
8. Data Model
9. Non-Functional Requirements
10. Suggested Tech Stack

---

## 1. Executive Summary

Crop2X (Private) Limited is an agricultural technology company that provides IoT-based field monitoring systems, agronomy services, hardware devices, and data-driven crop management solutions to farmers across Pakistan.

Prior to this system, Crop2X operated through disconnected spreadsheets, WhatsApp groups, and manual records. This led to duplicate data entry, missed follow-ups, untracked hardware, delayed invoicing, and zero audit accountability across departments.

The **Crop2X Internal CRM & Operations Management System** is a centralized, role-gated enterprise platform that unifies client management, sales pipeline tracking, hardware lifecycle management, field operations reporting, inventory control, and financial billing into one production-ready application.

The system is deployed with a **FastAPI** backend on Hugging Face Spaces and a **Next.js** frontend on Vercel, connected to a managed **PostgreSQL** database on Neon. It is live and actively used by Crop2X internal teams.

---

## 2. Problem Statement

### Business Pain Points Before This System

| Pain Point | Impact |
|---|---|
| Client data scattered across spreadsheets and individual phones | Account managers lost context during client calls; no single source of truth |
| Sales pipeline managed via WhatsApp | Leads fell through the cracks; no follow-up tracking or conversion metrics |
| Hardware devices tracked in Excel with no lifecycle stages | Field teams did not know device status; devices lost between departments |
| Invoices created manually in Word/Excel | Delayed billing, no payment tracking, no overdue alerts |
| No audit trail for changes | No accountability when data was altered or deleted |
| Tasks assigned verbally or via chat | Tasks forgotten, no priority system, no completion tracking |
| Field reports stored as email attachments | Reports inaccessible to management; no historical timeline per client |
| Inventory managed in personal notebooks | Stock levels unknown; procurement duplicated or missed |

### Core Problem Statement

> Crop2X lacked a single, role-governed platform where all departments — Business, Agronomy, Hardware, and Accounts — could collaborate, record, and track operations with full management oversight and an immutable audit trail.

---

## 3. Objectives & Success Metrics

### Primary Objectives

1. **Centralize** all client, lead, device, inventory, billing, and task data into one system.
2. **Enforce** strict role-based access so each department sees only what they need.
3. **Automate** financial workflows — invoice generation, payment tracking, overdue detection.
4. **Provide** real-time management dashboards with cross-department KPIs.
5. **Ensure** full audit accountability with immutable activity logs.

### Success Metrics

| Metric | Target |
|---|---|
| Time to onboard a new client | < 2 minutes (form-based) |
| Invoice creation to PDF download | < 30 seconds |
| Sales pipeline visibility | 100% of leads tracked with stage, follow-up date, and quotation |
| Hardware device status accuracy | All devices have a current status and assigned owner |
| Payment arrears visibility | Outstanding balance calculable per client in real-time |
| Audit coverage | 100% of create/update/delete actions logged with user + timestamp |
| System uptime | > 99.5% (Hugging Face Spaces + Vercel managed infrastructure) |
| Role enforcement | Zero cases of unauthorized cross-department data access |

---

## 4. User Personas & Roles

The system defines **7 roles** with strictly enforced permissions.

---

### Role 1: ADMIN
**Who:** CEO, CTO, or designated system administrator.
**Access:** Full system access — all modules, all data, all actions.
**Key Responsibilities:**
- Manage user accounts (create, deactivate, assign roles)
- Full oversight of clients, billing, devices, inventory, and reports
- Access complete activity logs and audit trails
- Cannot delete their own account

---

### Role 2: MANAGER
**Who:** Operations manager or department head.
**Access:** Near-full access. Cannot create or delete user accounts.
**Key Responsibilities:**
- Supervise all operational modules
- Assign tasks, review field reports, manage invoices
- Access full management dashboard
- View all activity logs

---

### Role 3: BUSINESS
**Who:** Sales and business development team members.
**Access:** Clients, Leads, Tasks, Issues (create), Dashboard (business stats).
**Key Responsibilities:**
- Manage sales pipeline on the Kanban board
- Onboard new clients
- Log client issues and assign to Hardware/Agronomy
- Track own tasks

---

### Role 4: AGRONOMY
**Who:** Field agronomists and crop advisory staff.
**Access:** Clients (read), Devices (assigned only), Field Reports (full), Tasks (own).
**Key Responsibilities:**
- Upload weekly/bi-weekly/QA field reports
- Update status on assigned devices
- Log field operations per client
- Complete assigned tasks

---

### Role 5: HARDWARE
**Who:** Hardware engineers and device technicians.
**Access:** Devices (full), Inventory (full), Components (full), Tasks (own).
**Key Responsibilities:**
- Track device lifecycle (development → QA → installation)
- Manage inventory stock and procurements
- Upload component images and procurement records
- Complete assigned repair/maintenance tasks

---

### Role 6: ACCOUNTS
**Who:** Finance and accounts team members.
**Access:** Billing (full), Clients (read), Tasks (own), Dashboard (financial stats).
**Key Responsibilities:**
- Create and manage invoices with line items and tax
- Record payments against invoices
- Monitor overdue invoices and client arrears
- Generate and email PDF invoices to clients

---

### Role 7: EMPLOYEE
**Who:** General staff without a specific departmental role.
**Access:** Own tasks only, own activity logs, notification inbox.
**Key Responsibilities:**
- View and update assigned tasks
- Track personal activity history

---

## 5. Scope

### In Scope — Implemented Features

| Module | Description |
|---|---|
| **Authentication** | JWT-based login, refresh tokens, auto-refresh, secure logout |
| **User Management** | CRUD users, role assignment, deactivation with audit |
| **Client Management** | Full client profiles with farm data, services, linked devices, invoices, issues, reports |
| **Leads & Sales Pipeline** | 5-stage Kanban board: New Lead → Contacted → Negotiation → Converted → Lost |
| **Device Lifecycle** | 5-stage tracking: Development → QA → Inventory → Installed → Back at Office |
| **Inventory & Components** | Stock tracking, procurement records, photo uploads, low-stock warnings |
| **Billing & Invoicing** | Invoice CRUD, line items, auto tax calculation, PDF generation, email delivery, payment tracking, overdue detection |
| **Tasks** | 3-status Kanban (Pending/In Progress/Completed), priority levels, device/client linking |
| **Issues / Tickets** | Client issue logging, HARDWARE/AGRONOMY assignment, auto-task creation |
| **Field Reports** | Weekly, bi-weekly, field operation, and QA report types with file attachments |
| **Notifications** | Per-user inbox with read/unread state |
| **Activity Logs** | Immutable audit trail for all create/update/delete actions |
| **Dashboard** | Role-filtered KPI stats, charts, and alerts |
| **File Uploads** | PDF/image uploads for invoices, reports, and inventory |

### Out of Scope — Not Implemented

- Third-party ERP integration (QuickBooks, SAP)
- Customer-facing portal (clients cannot log in)
- SMS/WhatsApp notifications
- Multi-language UI (currently English only)
- Mobile native app (iOS/Android)
- Historical data migration from legacy spreadsheets

---

## 6. Functional Requirements

### FR-01: Authentication & Authorization
- The system SHALL authenticate users via email and password.
- The system SHALL issue a JWT access token (30-minute expiry) and a revocable refresh token on login.
- The system SHALL enforce role-based access control on every API endpoint.
- The system SHALL automatically refresh the access token using the refresh token when it expires.
- The system SHALL revoke all active tokens on logout.
- Every protected route SHALL return HTTP 403 if the authenticated user lacks the required role.

### FR-02: Client Management
- Users with CLIENT_WRITE_ROLES SHALL create, update, and delete client records.
- Each client record SHALL store: name, company name, farm size, address, contact, onboarding date, crop cycle end date, services (array), farm location, third-party credentials.
- Client profiles SHALL display linked devices, invoices, field reports, issues, and outstanding balance.

### FR-03: Leads & Sales Pipeline
- The system SHALL maintain a Kanban board with stages: NEW_LEAD, CONTACTED, NEGOTIATION, CONVERTED, LOST.
- Each lead SHALL track: name, company, stage, email, phone, follow-up date, quotation amount, proposal link, service tags, notes.
- Stage transitions SHALL be logged in the activity trail.
- A CONVERTED lead SHALL be linkable to an existing client record.

### FR-04: Device Lifecycle Management
- Devices SHALL progress through statuses: UNDER_DEVELOPMENT → QA_FOR_AGRONOMIST → QA_PASSED_IN_INVENTORY → INSTALLED → BACK_AT_OFFICE.
- Every status change SHALL create an immutable history record with timestamp and user.
- Devices SHALL support dual assignment: hardware engineer and agronomist.
- Installed devices SHALL be linked to a client record.

### FR-05: Inventory & Components
- The system SHALL track inventory items by SKU, name, category, quantity, and cost.
- Each procurement batch SHALL be recorded with supplier, vendor, quantity, unit cost, and optional photo.
- The system SHALL display a low-stock warning when quantity falls below 10 units.
- The system SHALL separately track electronic components (sensors, PCBs, batteries, casings) with procurement history.

### FR-06: Billing & Invoice Module
- The system SHALL auto-generate unique invoice numbers in YYMMDD-N format.
- Invoices SHALL support multiple line items with item name, description, and unit price in PKR.
- The system SHALL automatically calculate subtotal, tax amount (configurable %), and total amount.
- Invoice status SHALL follow: DRAFT → SENT → PAID / OVERDUE / CANCELLED.
- The system SHALL generate a Crop2X-branded PDF invoice using ReportLab.
- The system SHALL email invoice PDFs to multiple recipients via SMTP.
- The system SHALL automatically mark SENT invoices as OVERDUE when due_date passes, via a daily background job.
- Payment recording SHALL auto-mark the invoice as PAID when fully settled.

### FR-07: Tasks
- Tasks SHALL have statuses: PENDING, IN_PROGRESS, COMPLETED and priorities: LOW, MEDIUM, HIGH.
- Tasks SHALL support optional linking to a device or client.
- ADMIN and MANAGER SHALL view all tasks; other roles see only their own assigned tasks.
- The system SHALL auto-create a HIGH-priority task when a client issue is logged.

### FR-08: Field Reports
- Agronomists SHALL create field reports of types: WEEKLY, BI_WEEKLY, FIELD_OPERATION, QA.
- Reports SHALL support file attachments (PDF, images).
- Reports SHALL be visible on the linked client profile.

### FR-09: Activity Logging
- Every CREATE, UPDATE, DELETE action SHALL generate an activity log entry.
- Each log entry SHALL record: user ID, user name, action type, entity type, entity ID, description, previous value, new value, IP address, and timestamp.
- Logs SHALL be immutable — they cannot be edited or deleted via the API.

### FR-10: Dashboard
- The dashboard SHALL display role-filtered KPIs including: total clients, active leads, active devices, inventory items, monthly revenue, overdue invoices, pending tasks.
- Device and task status breakdowns SHALL be displayed as visual charts.

---

## 7. User Stories

### Authentication

> **US-01** — As a team member, I want to log in with my email and password so that I can access modules relevant to my role.

> **US-02** — As a user, I want my session to stay active without re-logging in every 30 minutes so that I can work without interruption.

### Clients

> **US-03** — As a Business team member, I want to create a new client record with farm details and services so that the entire team has a single source of truth for that client.

> **US-04** — As an Accounts team member, I want to view a client's outstanding balance and payment history without being able to edit client data, so that I can follow up on dues.

### Leads

> **US-05** — As a Business team member, I want to move a lead through the sales pipeline on a Kanban board so that I can visually track deal progress without updating spreadsheets.

> **US-06** — As a Manager, I want to see all leads across all stages so that I can forecast conversions and identify stalled deals.

### Devices

> **US-07** — As a Hardware engineer, I want to update a device's status from "Under Development" to "QA Passed" so that the Agronomy team knows the device is ready for field installation.

> **US-08** — As a Manager, I want to see a full history of every status change on a device so that I can audit how long each device stayed in each stage.

### Billing & Invoices

> **US-09** — As an Accounts team member, I want to create an invoice with multiple line items and have the tax and total calculated automatically so that I don't make manual arithmetic errors.

> **US-10** — As an Accounts team member, I want to download a Crop2X-branded PDF invoice so that I can send a professional document to the client.

> **US-11** — As an Accounts team member, I want to email the invoice PDF directly from the system to multiple recipients so that I don't need to export and attach files manually.

> **US-12** — As a Manager, I want overdue invoices to be automatically flagged so that the accounts team is notified without manual checking.

### Tasks & Issues

> **US-13** — As a Business team member, I want to log a client complaint and automatically create a task for the responsible Hardware engineer so that nothing falls through the cracks.

> **US-14** — As an Employee, I want to see only my assigned tasks so that I am not overwhelmed by tasks meant for other departments.

### Field Reports

> **US-15** — As an Agronomist, I want to upload a weekly field report with attachments for a specific client so that management can track field operations without asking me directly.

### Administration

> **US-16** — As an Admin, I want to deactivate a user account when an employee leaves so that they can no longer access the system while preserving their historical records.

> **US-17** — As an Admin, I want to view a complete activity log for any user so that I can audit who changed what and when.

---

## 8. Data Model

### Core Entities

```
users
├── id (UUID, PK)
├── email (unique)
├── password_hash
├── full_name
├── role (ENUM: ADMIN, MANAGER, BUSINESS, AGRONOMY, HARDWARE, ACCOUNTS, EMPLOYEE)
├── is_active
└── timestamps

clients
├── id (UUID, PK)
├── name, company_name
├── farm_size, address, contact_info
├── onboarding_date, crop_cycle_end_date
├── services (JSON array)
├── farm_location, third_party_credentials (JSON)
├── contract_value, contract_start_date, contract_end_date
├── contract_status (ENUM: ACTIVE, EXPIRED, PENDING)
└── timestamps

leads
├── id (UUID, PK)
├── name, company_name, email, phone
├── stage (ENUM: NEW_LEAD, CONTACTED, NEGOTIATION, CONVERTED, LOST)
├── follow_up_date, quotation_amount
├── proposal_link, service_tags (JSON), notes
├── client_id (FK → clients.id, nullable)
└── timestamps

devices
├── id (UUID, PK)
├── name, serial_number (unique)
├── status (ENUM: UNDER_DEVELOPMENT, QA_FOR_AGRONOMIST, QA_PASSED_IN_INVENTORY, INSTALLED, BACK_AT_OFFICE)
├── installation_location, notes
├── client_id (FK → clients.id, nullable)
├── assigned_hardware_id (FK → users.id)
├── assigned_agronomist_id (FK → users.id)
└── timestamps

device_history
├── id (UUID, PK)
├── device_id (FK → devices.id)
├── old_status, new_status
├── changed_by_id (FK → users.id)
├── notes
└── changed_at

inventory_items
├── id (UUID, PK)
├── name, sku (unique), category
├── quantity, unit_cost
├── description
└── timestamps

procurements
├── id (UUID, PK)
├── item_id (FK → inventory_items.id)
├── supplier, vendor
├── quantity, unit_cost
├── purchase_date, image_url
└── timestamps

invoices
├── id (UUID, PK)
├── client_id (FK → clients.id)
├── invoice_number (unique, format YYMMDD-N)
├── invoice_date, due_date
├── amount (legacy), subtotal, tax_percentage, tax_amount, total_amount
├── status (ENUM: DRAFT, SENT, PAID, OVERDUE, CANCELLED)
├── payment_terms, bank_details, notes
├── file_path, sent_at
└── timestamps

invoice_items
├── id (UUID, PK)
├── invoice_id (FK → invoices.id, CASCADE DELETE)
├── serial_number, item_name, description, unit_price
└── timestamps

invoice_recipients
├── id (UUID, PK)
├── invoice_id (FK → invoices.id, CASCADE DELETE)
├── email
└── created_at

payments
├── id (UUID, PK)
├── invoice_id (FK → invoices.id)
├── client_id (FK → clients.id)
├── amount, payment_date, payment_method
└── timestamps

tasks
├── id (UUID, PK)
├── title, description
├── status (ENUM: PENDING, IN_PROGRESS, COMPLETED)
├── priority (ENUM: LOW, MEDIUM, HIGH)
├── assigned_to_id (FK → users.id)
├── device_id (FK → devices.id, nullable)
├── client_id (FK → clients.id, nullable)
├── due_date
└── timestamps

client_issues
├── id (UUID, PK)
├── client_id (FK → clients.id)
├── title, description
├── status (ENUM: OPEN, IN_PROGRESS, RESOLVED)
├── priority (ENUM: LOW, MEDIUM, HIGH)
├── assigned_to_id (FK → users.id, nullable)
└── timestamps

field_reports
├── id (UUID, PK)
├── client_id (FK → clients.id)
├── report_type (ENUM: WEEKLY, BI_WEEKLY, FIELD_OPERATION, QA)
├── title, summary, notes
├── report_date, attachments (JSON array)
└── timestamps

activity_logs
├── id (UUID, PK)
├── user_id (FK → users.id)
├── user_name, role
├── action (CREATE, UPDATE, DELETE, LOGIN, LOGOUT)
├── entity_type, entity_id
├── description, previous_value, new_value
├── ip_address
└── created_at

notifications
├── id (UUID, PK)
├── user_id (FK → users.id)
├── title, message
├── type (ENUM: INFO, WARNING, ERROR, SUCCESS)
├── is_read
└── timestamps

refresh_tokens
├── id (UUID, PK)
├── user_id (FK → users.id)
├── token (unique)
├── is_revoked
└── timestamps
```

### Key Relationships

```
clients ──< invoices ──< invoice_items
clients ──< payments
clients ──< devices
clients ──< leads
clients ──< client_issues ──> users (assigned_to)
clients ──< field_reports
users ──< tasks
users ──< activity_logs
users ──< notifications
devices ──< device_history
inventory_items ──< procurements
```

---

## 9. Non-Functional Requirements

### Performance
- API response time for standard GET requests: **< 200ms** (p95)
- PDF generation: **< 3 seconds**
- Dashboard stats: **< 500ms**
- Pagination enforced on all list endpoints (default page size: 20)
- Database indexes on: `client_id`, `user_id`, `invoice_date`, `status` fields

### Security
- All passwords hashed using **bcrypt** with salt rounds ≥ 12
- JWT tokens signed with HS256 and a 256-bit secret key
- Refresh tokens stored hashed in the database and revocable on demand
- All endpoints require authentication except `/auth/login`, `/auth/register`, `/auth/create-admin`
- CORS restricted to known Vercel deployment origins + localhost
- Rate limiting: **100 requests per minute** per IP address
- File uploads restricted to `.pdf`, `.jpg`, `.jpeg`, `.png` with size validation
- No secrets or credentials exposed in API responses

### Reliability
- Backend: Hugging Face Spaces with automatic restarts
- Frontend: Vercel with CDN-based delivery
- Database: Neon managed PostgreSQL with automatic backups and connection pooling
- Background job (overdue invoice detection) runs daily at 00:05 UTC

### Scalability
- Async FastAPI with asyncpg driver — supports concurrent requests without blocking
- Database connection pooling via asyncpg
- Stateless API — horizontally scalable by adding replicas
- Next.js standalone output mode for optimized Docker deployment

### Maintainability
- All database schema changes managed through **Alembic** versioned migrations
- Repository pattern separates business logic from data access
- Pydantic v2 schemas enforce strict input validation
- TypeScript throughout the frontend for type safety
- Activity logs provide full audit trail for debugging production issues

### Accessibility & Usability
- Responsive UI — functional on desktop and tablet (1024px+)
- Role-filtered sidebar — users see only relevant navigation items
- Toast notifications for all action results (success, error, warning)
- All tables have empty-state messages
- Status badges color-coded consistently across all modules

---

## 10. Suggested Tech Stack

### Currently Deployed Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| **Backend Language** | Python | 3.11+ | FastAPI ecosystem, async support, rich library ecosystem |
| **Backend Framework** | FastAPI | 0.110.0 | High performance, async-first, automatic OpenAPI/Swagger docs |
| **ORM** | SQLAlchemy (async) | 2.0.28 | Industry standard, type-safe mapped columns, async support |
| **Database** | PostgreSQL | 15+ | ACID compliance, UUID support, JSON columns, full-text search |
| **DB Hosting** | Neon | — | Serverless PostgreSQL, auto-scaling, branching, free tier |
| **Migrations** | Alembic | 1.18.4 | Version-controlled schema changes, auto-generation |
| **Auth** | python-jose + passlib | — | JWT token management, bcrypt password hashing |
| **PDF Generation** | ReportLab | 4.2.2 | Pure Python, no system dependencies, professional PDF output |
| **Email** | aiosmtplib | 3.0.1 | Async SMTP client, Gmail/Brevo compatible |
| **Task Scheduler** | APScheduler | 3.10.4 | In-process async scheduler for daily overdue detection |
| **Backend Hosting** | Hugging Face Spaces | — | Free hosting, HTTPS, persistent process, Git-based deploy |
| **Frontend Framework** | Next.js | 16 | App Router, SSR/SSG, React ecosystem, Vercel-native |
| **Frontend Language** | TypeScript | 5+ | Type safety, better DX, reduced runtime errors |
| **Styling** | Tailwind CSS | v4 | Utility-first, zero custom CSS files, consistent design |
| **State Management** | Zustand | — | Lightweight, no boilerplate, persist middleware |
| **HTTP Client** | Axios | — | Interceptors for auth token injection and auto-refresh |
| **Form Validation** | React Hook Form + Zod | — | Schema-driven validation, zero re-renders |
| **Charts** | Recharts | — | React-native chart library, responsive, customizable |
| **Icons** | Lucide React | — | Clean, consistent icon set |
| **Frontend Hosting** | Vercel | — | Next.js native, CDN, preview deployments, free tier |

### Recommended Enhancements (Future Roadmap)

| Enhancement | Technology | Why |
|---|---|---|
| Transactional Email (production) | Brevo / SendGrid | More reliable than Gmail SMTP; no App Password issues |
| Background Jobs (scale) | Celery + Redis | Replace APScheduler for distributed task processing |
| File Storage | AWS S3 / Cloudflare R2 | Replace local file storage; CDN delivery for uploads |
| Search | PostgreSQL full-text / Meilisearch | Fast client/invoice/lead search across large datasets |
| Monitoring | Sentry | Error tracking and performance monitoring in production |
| API Rate Limiting | Redis-backed | Replace in-memory rate limiter for multi-instance deployments |
| Cache | Redis | Cache dashboard stats and frequently queried lists |
| Testing | pytest-asyncio + HTTPX | Full async API test suite with fixtures |
| CI/CD | GitHub Actions | Automated lint, test, and deploy on push |
| Mobile | React Native / Expo | Field teams need mobile access for reports and tasks |

---

*End of Document*

---
**Crop2X (Private) Limited**
NTN: A278468 | SNTN: A278468-8
Bank: Meezan Bank | Account: 9952-0105470950 | IBAN: PK14MEZN0099520105470950
