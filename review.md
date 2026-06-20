update_add_feature.md document ko thoroughly review aur analyze karo, phir current codebase ke sath complete comparison karo.

Tumhara task hai update_add_feature.md mein define ki gayi har requirement, workflow, module, entity, field, permission, relationship, status, validation, dashboard, report, notification aur business rule ko current implementation ke sath compare karna.

### Main Objectives

1. Puri update_add_feature.md specification ko detail mein review karo.
2. Frontend, Backend, Database, APIs, RBAC, Dashboards, Reports aur Business Logic sab review karo.
3. Jo features missing, incomplete ya incorrect implement huay hain unki identification karo.
4. update_add_feature.md ke mutabiq tamam missing requirements implement karo.
5. Ensure karo ke final system latest update_add_feature.md specification ke maximum possible level tak match kare.

### Implementation Requirements

#### Modules & Entities

* update_add_feature.md mein define tamam modules aur entities review karo.
* Har field, validation, relationship, constraint aur dependency verify karo.
* Missing entities, tables, models, APIs, forms aur pages create karo.
* Missing database relationships implement karo.

#### Role-Based Access Control (RBAC)

* update_add_feature.md ke mutabiq exact role hierarchy aur permissions implement karo.
* Har role ko sirf uske assigned modules aur actions ka access do.
* Frontend aur Backend dono level par access restrictions lagao.
* Unauthorized requests par proper 403 Forbidden response return karo.

#### Statuses & Workflows

* update_add_feature.md mein define tamam statuses aur status transitions implement karo.
* Approval workflows, quotation workflows, invoice workflows, lead workflows aur task workflows implement karo.
* Required automation triggers aur business rules add karo.

#### Leads Module

* Leads schema ko update_add_feature.md ke mutabiq verify karo.
* Required fields, ENUM statuses, validations, timestamps, notes history aur follow-up rules implement karo.
* Quotation Request → Accounts Upload → Quotation Forwarded workflow exactly update_add_feature.md ke mutabiq implement karo.
* Lead visibility aur editing permissions update_add_feature.md ke hisab se enforce karo.

#### Client / Farmer / Farm Structure

* Entity hierarchy aur relationships verify karo.
* Farmer → Farm → Orders / Invoices / Crop Plans relationships implement karo.
* Farm ko central linked entity ke tor par configure karo jahan update_add_feature.md mein required ho.
* Missing fields aur related records add karo.

#### Accounts Module

* Quotations, Invoices, Payments, Ledger, Tax Calculations, Reminders aur Revenue Tracking implement karo.
* Invoice statuses aur payment workflows verify aur complete karo.
* Multiple payments aur multiple receipts support karo.
* Complete client ledger implement karo.

#### Tasks & Ticketing

* Task assignment, ownership, linked entities, status tracking aur overdue logic implement karo.
* Cross-department ticketing aur assignment workflow implement karo.

#### Hardware & Inventory

* Procurement logs, inventory tracking, QA workflows, repair lifecycle tracking aur device history implement karo.

#### Agronomy Operations

* Field operations history, crop plans, reports, QA records, recommendations aur timelines implement karo.

#### Audit Logs

* Complete audit logging implement karo.
* Har create, update, delete, status change aur file upload ka user name aur timestamp store karo.
* Anonymous changes allow na hon.

#### Reports & Dashboards

* update_add_feature.md mein define tamam KPI cards, reports, charts, analytics aur export features implement karo.
* Role-based dashboard visibility ensure karo.

#### Notifications & Automation

* Due date reminders, overdue alerts, quotation notifications, workflow notifications aur email history tracking implement karo.

#### Database & API Review

* Tamam database relationships review aur fix karo.
* Foreign keys, migrations, indexes aur schema issues resolve karo.
* APIs ko update_add_feature.md ke business rules aur validations ke mutabiq update karo.

### Quality Assurance

Implementation complete karne se pehle:

* Verify karo ke update_add_feature.md ki har requirement implement ho chuki hai.
* Verify karo ke tamam permissions sahi kaam kar rahi hain.
* Verify karo ke workflows expected tarike se execute ho rahe hain.
* Verify karo ke frontend aur backend synchronized hain.
* Verify karo ke database integrity maintained hai.
* Verify karo ke audit logs properly generate ho rahe hain.

### Final Deliverable Report

Implementation complete hone ke baad detailed report provide karo:

1. Gap Analysis Report

   * Kaun kaun se missing features mile
   * Kaun kaun se incorrect implementations mile
   * Kaun kaun se partial implementations mile

2. Implemented Changes Report

   * Tamam completed changes ki list

3. Database Changes Report

   * New tables
   * New columns
   * New relationships
   * New migrations

4. API Changes Report

   * New endpoints
   * Updated endpoints
   * Validation updates

5. Role & Permission Matrix

   * Complete RBAC implementation details

6. Workflow Report

   * Leads Workflow
   * Quotation Workflow
   * Invoice Workflow
   * Payment Workflow
   * Task Workflow
   * Approval Workflow

7. Testing Report

   * Permission Testing
   * Validation Testing
   * Workflow Testing
   * API Testing

8. Remaining Issues

   * Remaining blockers
   * Assumptions
   * Client clarification required items

Sirf analysis par stop mat karo. update_add_feature.md aur current codebase ke darmiyan complete gap analysis karo, phir tamam missing functionality implement karo aur final report ke sath production-ready solution provide karo.
