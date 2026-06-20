# Requirements

**Crop2X CRM & Operations System: Architecture & Access Rules**

**1\. System Objective**  
We need a centralized system to control client data, field operations, hardware inventory, and financials. The goal is strict departmental accountability and giving Management real-time oversight of all operations.

**2\. Access Control (Strict Two-Tier System)**

* **Tier 1 (Management):** Full administrative access across all departments, dashboards, and financial records.  
* **Tier 2 (Departmental):** Accounts, Agronomy, Business, and Hardware teams get restricted access. They can only view and edit modules directly related to their jobs.  
* **Audit Logging:** Every manual entry, status change, or file upload will permanently log the employee's name and exact timestamp. No anonymous edits.

**3\. Core Business Entities**

* **A. Leads & Sales Pipeline:** Track prospect details, targeted services, sent proposals, and quotation links. Clear Won/Lost status and exact follow-up dates.  
* **B. Active Clients:** Track onboarding date, farm area, location, third-party platform credentials, and crop cycle end dates. Tag clients with their active services (AquaSave Pro, Mobile Device, Soil Sampling, Ag5X, Advisory, Drone Survey, Drone Spray).  
* **C. Hardware & Inventory:** Track finished units (AquaSave Pro, Mobile Devices, POL Devices, Weather Trackers) and raw materials (sensors, PCBs).

**4\. Department Workflows & Requirements**  
**Business Department**

* Manage the sales pipeline (outreach, meetings, farm visits).  
* Log communication with existing clients for feedback or complaints.  
* **Cross-Department Ticketing:** Ability to log a client issue and immediately assign a mandatory task to the specific Hardware or Agronomy person responsible.

**Agronomy Department**

* Maintain a historical timeline of active field operations for each client.  
* Upload and log weekly/bi-weekly field reports.  
* Conduct and log field QA for any newly developed or repaired devices.

**Hardware Department**

* Manage procurement logs with manual entry fields to handle the large variety of raw components and sensors.  
* Track the lifecycle of devices in development or under repair.  
* Upload initial QA reports for faulty/returned devices and final QA clearances for repaired units.

**Accounts Department**

* View client profiles strictly to track upcoming payment dates and subscribed services.  
* Generate and attach invoices/quotations to client profiles.  
* Automate tracking for dues and payment arrears.

**5\. Management Decisions Required**

1. Approve the strict departmental access boundaries.  
2. Review and lock the data fields required for the initial rollout.  
3. Decide whether to migrate historical data or launch the system with a zero-data clean slate.

# Phases

# Accounts

### **1\. Clients Module**

**Access**

* View Clients: Admin, Accounts, Business Development, Agriculture  
* Create Client: Admin, Business Development  
* Edit Client: Admin, Business Development, Agriculture  
* Delete Client: Admin only

**Client Profile**  
 Instead of only showing a list, every client should have a profile page containing:

#### **Basic Information**

* Business Name  
* Contact Person  
* Designation  
* Email  
* Phone Number  
* Address  
* NTN  
* STRN (optional)  
* Industry  
* Source of Lead

#### **Financial Information**

* Total Revenue  
* Outstanding Amount  
* Paid Amount  
* Number of Invoices  
* Last Payment Date

#### **Related Records**

* Quotations  
* Invoices  
* Payments  
* Tasks  
* Documents

---

### **2\. Accounts Dashboard**

Display KPI cards:

| Metric | Description |
| ----- | ----- |
| Total Revenue | Paid invoices |
| Outstanding Payments | Unpaid balance |
| Overdue Invoices | Past due date |
| Due Next 30 Days | Upcoming invoices |
| Total Clients | Active clients |
| Collection Rate | Paid vs invoiced |
| Monthly Revenue | Current month |

Optional Charts:

* Revenue Trend  
* Invoice Status Breakdown  
* Top Clients by Revenue

---

### **3\. Quotations Module**

**Access**

* Create: Admin, Accounts  
* Edit: Admin, Accounts  
* Approve: Admin  
* View: Business, Accounts, Admin

#### **Fields**

* Quote Number (Auto)  
* Client  
* Date  
* Expiry Date  
* Services/Products  
* Quantity  
* Unit Price  
* Discount  
* Tax %  
* Tax Amount (Auto)  
* Grand Total (Auto)  
* Terms & Conditions  
* Notes

#### **Actions**

* Convert to Invoice  
* Email from Platform  
* Download PDF  
* Duplicate Quote

---

### **4\. Invoices Module**

**Access**

* Create: Admin, Accounts  
* Edit: Admin, Accounts  
* Delete: Admin  
* View: Business, Accounts, Admin

#### **Fields**

* Invoice Number (Auto)  
* Client  
* Invoice Date  
* Due Date  
* Services/Products  
* Tax %  
* Tax Amount (Auto)  
* Total Amount  
* Status

#### **Statuses**

* Draft  
* Sent  
* Partially Paid  
* Paid  
* Overdue  
* Cancelled

#### **Actions**

* Email Invoice  
* Download PDF  
* Record Payment  
* Add Notes

---

### **5\. Payments Module**

#### **Fields**

* Payment ID  
* Client  
* Invoice Reference  
* Payment Date  
* Amount Received  
* Payment Method  
* Transaction Reference  
* Screenshot/Receipt Upload  
* Remarks

#### **Features**

* Multiple payments against one invoice  
* Auto-calculate remaining balance  
* Payment history timeline  
* Attachment support

---

### **6\. Products & Services Module**

Separate tabs:

#### **Services**

Examples:

* [https://crop2x.com/pages/Pricing/](https://crop2x.com/pages/Pricing/) 

#### **Products**

Examples:

* [https://crop2x.com/pages/Pricing/](https://crop2x.com/pages/Pricing/) 

**Access**

* Create/Edit: Admin, BDM  
* View: All authorized users

Fields:

* Name  
* Category  
* Description  
* Price  
* Tax %  
* Status

---

### **7\. Tasks Integration**

**Access**

* Create: Admin, Business, Accounts  
* Assign: Admin, Team Leads  
* View Own Tasks: All Users  
* View All Tasks: Admin

Task linked to:

* Client  
* Quotation  
* Invoice  
* Payment Follow-up

Statuses:

* Pending  
* In Progress  
* Completed  
* Overdue

---

### **8\. Reports**

#### **Revenue Reports**

* Monthly Revenue  
* Yearly Revenue  
* Client Revenue

#### **Invoice Reports**

* Paid  
* Unpaid  
* Overdue

#### **Payment Reports**

* Collections by Month  
* Outstanding Balances

Export:

* Excel  
* PDF

---

### **9\. Recommended Roles Matrix**

| Function | Admin | Business | Accounts | BDM |
| ----- | ----- | ----- | ----- | ----- |
| Create Client | ✓ | ✓ | ✗ | ✓ |
| Edit Client | ✓ | ✓ | ✗ | ✓ |
| Create Quote | ✓ | ✗ | ✓ | ✗ |
| Create Invoice | ✓ | ✗ | ✓ | ✗ |
| Record Payment | ✓ | ✗ | ✓ | ✗ |
| Create Service/Product | ✓ | ✗ | ✗ | ✓ |
| View Reports | ✓ | ✓ | ✓ | ✓ |
| User Management | ✓ | ✗ | ✗ | ✗ |

### **Additional Recommendations**

* Fix database relationship errors before adding features.  
* Add audit logs (who created/edited records).  
* Auto-generated invoice and quotation numbers.  
* Email history tracking.  
* Invoice reminders (7 days before due date and overdue alerts).  
* GST/Tax calculations should be automatic.  
* Support multiple payment receipts per invoice.  
* Add client ledger showing all invoices, payments, and balance in one place.

# Overview

### **System overview**

crop2x needs to serve five distinct user types across a single unified platform. The architecture divides into five core modules, all sharing a common data layer built around the **Farm** as the central entity.

![][image1]..

### **Core data model**

The **Farm** is the master record everything connects to. Here's the entity hierarchy:

![][image2]

### **User journeys by role**

Here's how each of your five user types interacts with the system day-to-day:

**Sales & field agents** own the top of the funnel — they prospect farmers, log farm visits, capture photos and GPS coordinates, create leads, and convert them to accounts. Their mobile-first view shows a daily task list, a map of assigned farms, and quick order entry.

**Agronomists** are attached to farms and seasons. They create crop plans (what to grow, when to sow, which inputs to apply), issue recommendations, and log scouting observations with photos. They need calendar views and farm-history timelines.

**Operations / supply chain** team manages product availability, fulfills orders raised by sales agents or farmers, and tracks delivery status. They see a dispatch board, inventory levels by warehouse, and pending vs completed orders.

**Accounts team** handles the financial layer — generating invoices from confirmed orders, managing farmer credit limits, recording payments, and flagging overdues.

**Management / executives** see aggregated dashboards: revenue pipeline, coverage maps (which territories are being served), yield-vs-input performance by crop, and month-on-month sales trends.

---

### **Recommended module breakdown**

| Module | Key screens | Primary users |
| ----- | ----- | ----- |
| **CRM** | Lead list, contact profile, farm profile, pipeline board | Sales, field agents |
| **Field ops** | Task calendar, visit log, photo upload, GPS map | Field agents, agronomists |
| **Agronomy** | Crop plan builder, recommendation library, season history | Agronomists |
| **Supply chain** | Order management, inventory, dispatch tracking | Ops team |
| **Accounts** | Invoice list, credit ledger, payment tracker, aging report | Accounts team |
| **Dashboard** | KPI cards, territory map, crop performance, revenue funnel | Management |

---

### **Suggested tech decisions**

For a platform like this, a few architectural choices matter early:

**Mobile-first for field agents.** Field agents and agronomists work offline in remote areas. The app needs offline-first data sync (local SQLite → cloud sync when connectivity resumes), GPS capture, and camera integration.

**Role-based access control (RBAC).** Each role sees only their module. A field agent shouldn't touch invoices; an accounts person shouldn't see agronomic recommendations.

**Farm as the universal foreign key.** Every record — order, crop plan, visit log, invoice — links back to a Farm ID. This makes cross-module reporting possible without complex joins.

**Seasonal data structure.** Agriculture is inherently seasonal. Design data models with `season_id` as a first-class citizen so year-over-year comparisons are native, not bolted on.

![][image3]

**The Farmer record is the CRM contact.** One farmer has one profile — phone, address, credit limit, relationship history, assigned agent. This is the entity you prospect, qualify, and maintain.

**Each Farm is a property owned or operated by that farmer.** A farmer might have one farm in Kotri and another in Sanghar — different locations, different crops, potentially different seasons and orders. Each farm gets its own GPS coordinates, acreage, soil type, and field breakdown.

**Orders, invoices, and crop plans attach to individual Farms**, not to the Farmer directly. But credit, payment history, and total outstanding balance roll up to the Farmer account — because it's the same person you're collecting from.

**Activity logs can sit at either level.** A phone call about credit sits on the Farmer. A farm visit with photos and GPS sits on the specific Farm.

---

Here's how the corrected entity split looks as a data model:

**Farmer entity** (CRM contact)

| Field | Notes |
| ----- | ----- |
| `farmer_id` | Primary key |
| `full_name`, `cnic` | Identity |
| `phone_primary`, `phone_whatsapp` | Contact |
| `village`, `tehsil`, `district` | Home address |
| `assigned_agent` | FK → users |
| `pipeline_stage` | Prospect → Active (across all farms) |
| `total_credit_limit` | Set by accounts |
| `outstanding_balance` | Aggregated across all farm orders |
| `lead_source` | Referral / field visit / campaign |
| `tags` | High potential, Credit risk, etc. |

**Farm entity** (child of Farmer, many per farmer)

| Field | Notes |
| ----- | ----- |
| `farm_id` | Primary key |
| `farmer_id` | FK → Farmer |
| `farm_name` | e.g. "Kotri plot", "Sanghar land" |
| `gps_lat`, `gps_lng` | Location |
| `total_acreage` | Acres |
| `ownership_type` | Owner / tenant / sharecropper |
| `water_source` | Canal / tubewell / rain |
| `soil_type` | Clay loam / sandy / etc. |
| `primary_crop` | FK → crop catalogue |
| `secondary_crop` | Optional |

# Leads

**MASTER SPECIFICATION: LEADS ENTITY & ACCOUNTS WORKFLOW**

### 

### **1\. Database Schema (**leads **table)**

Create the table with the exact following fields and constraints.  
**Creation Fields (Set upon creation):**

* name: Varchar (Mandatory)  
* contact\_mobile: Varchar (Mandatory)  
* email: Varchar (Optional)  
* farm\_company\_name: Varchar (Optional)  
* location: Varchar (Mandatory)  
* assigned\_to: Integer/UUID (Mandatory Foreign Key linking to Users.id). *Frontend API must only populate this dropdown with users who have the 'Business/Sales' role.*

**Services Selection:**

* services\_interested: Array of Strings. Must allow multiple selections and validate against this strict list: \['AquaSave Pro', 'Ag5x', 'Faas', 'Drone Spray', 'Drone Survey'\].  
* other\_services: Text (Optional blank field for custom unlisted requirements).

**Modifiable Tracking & Sales Fields:**

* status: Strict ENUM (discovery, outreach, quotation\_requested, quotation\_forwarded, in-negotiation, won, lost).  
* next\_follow\_up: Date. *Backend constraint: This date must strictly be \>= the current date.*  
* notes\_log: JSONB or separate 1-to-Many table. Every new note must be appended with the user's name and a timestamp. Do not overwrite previous notes.

**Quotation & Accounts Fields:**

* quotation\_file\_url: Varchar/Text (To store the uploaded PDF path).  
* quotation\_requested\_at: Timestamp (Null by default).  
* quotation\_uploaded\_by: Integer (Foreign Key linking to Users.id of the Accounts person).

**System Auto-Fields (No manual editing allowed):**

* created\_at: Auto-timestamp.  
* updated\_at: Auto-timestamp.

### **2\. Role-Based Access Control (RBAC) & API Permissions**

Your backend middleware must enforce these strict read/write boundaries. Block unauthorized requests with a 403 Forbidden error.

* **Creation (POST /leads):**  
  * Only Admin and BDM roles are authorized to create leads.  
* **Visibility (GET /leads):**  
  * Admin and BDM: Can fetch and view ALL leads.  
  * Assigned Person (Sales role): Can ONLY fetch leads where assigned\_to matches their own user\_id.  
* **Sales Modifications (PATCH/PUT /leads/{id}):**  
  * Admin, BDM, and the specific Assigned Person are authorized to modify status, next\_follow\_up, and append to the notes\_log.  
  * *Restriction:* They are strictly BLOCKED from uploading the quotation\_file\_url.

### **3\. The Quotation Handover Workflow (Strict API Logic)**

Your APIs must automate this exact multi-step process when a lead requires pricing:  
**Step 1: Requesting Pricing (Sales/BDM/Admin)**

* The Sales user or BDM changes the lead's status to quotation\_requested.  
* *Backend Trigger:* Automatically log the current timestamp into quotation\_requested\_at.

**Step 2: Accounts Upload (Accounts Role)**

* *Visibility:* When status is quotation\_requested, the system temporarily grants the Accounts role read access to the lead profile to see the required services.  
* The Accounts user hits a specific upload endpoint (e.g., PATCH /leads/{id}/quotation) with the PDF file.  
* *Backend Trigger:* Upon successful upload:  
  1. Save the file path to quotation\_file\_url.  
  2. Automatically force the lead's status to change to quotation\_forwarded.  
  3. Log the Accounts user's ID into quotation\_uploaded\_by.

**Step 3: Resuming Sales Operations**

* Once the status reads quotation\_forwarded, the Accounts role loses write access. The Sales rep resumes control to move the deal to in-negotiation, won, or lost.

**Deliverable Constraints:**  
Set up the PostgreSQL table and the API endpoints with these exact validation rules. Test the creation restrictions (BDM/Admin only), the Date validation (next\_follow\_up), and the file upload role restriction before submitting for review. 
