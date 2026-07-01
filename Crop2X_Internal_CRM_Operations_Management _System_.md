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

# Agronomy

## **Roles**

1. Admin  
2. Business Team  
3. Agronomist  
4. Accounts Person

---

# **1\. Admin**

Full system access.

### **Permissions**

* Create, edit, delete users  
* Manage all modules  
* Configure settings  
* Approve reports  
* View analytics and finance

---

# **2\. Business Team**

Responsible for client relationships and operations.

### **Permissions**

* Create and manage clients  
* View all farmers  
* Assign agronomists to clients  
* View reports and analytics  
* Monitor reporting schedules  
* Download reports  
* View payment status

Cannot:

* Manage users  
* Modify financial records  
* Access system settings

---

# **3\. Agronomist**

Responsible for field operations and farmer onboarding.

### **Permissions**

#### **Farmer Management**

✓ Create farmers

✓ Edit assigned farmers

✓ Assign farmer to a client

✓ Create farms/fields

✓ Update crop information

#### **Reports**

✓ Create reports

✓ Edit draft reports

✓ Upload images

✓ Add recommendations

#### **Calendar**

✓ View assigned schedules

✓ Reschedule visits

✓ Mark visits complete

#### **Tasks**

✓ Create follow-up tasks

✓ Close tasks

#### **Dashboard**

✓ View own performance

Cannot:

* Delete clients  
* Manage users  
* Access finance  
* Delete submitted reports

---

# **4\. Accounts Person**

Responsible for billing and payment tracking.

### **Permissions**

* Create invoices  
* Record payments  
* View contracts  
* Generate financial reports  
* Track receivables

Cannot:

* Edit reports  
* Manage users  
* Modify farmers

---

# **Module Access Matrix**

| Module | Admin | Business | Agronomist | Accounts |
| ----- | ----- | ----- | ----- | ----- |
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Clients | ✓ | ✓ | View Only | ✓ |
| Farmers | ✓ | ✓ | ✓ | View Only |
| Farms/Fields | ✓ | ✓ | ✓ | No |
| Agronomists | ✓ | ✓ | No | No |
| Reporting Calendar | ✓ | ✓ | ✓ | No |
| Reports | ✓ | ✓ | ✓ | View Only |
| Tasks | ✓ | ✓ | ✓ | No |
| Analytics | ✓ | ✓ | Personal Only | Financial Only |
| Finance | ✓ | View | No | ✓ |
| User Management | ✓ | No | No | No |

---

# **Operational Workflow**

### **Client Acquisition**

Business Team  
↓  
Creates Client

### **Farmer Registration**

Agronomist  
↓  
Creates Farmer  
↓  
Assigns Farmer to Existing Client  
↓  
Creates Farm/Field

### **Reporting Cycle**

System  
↓  
Generates Reporting Schedule

Agronomist  
↓  
Conducts Field Visit  
↓  
Submits Report  
↓  
Creates Follow-Up Tasks

### **Finance**

Accounts Person  
↓  
Generates Invoice  
↓  
Tracks Payments  
↓  
Updates Receivables

---

# **Data Hierarchy**

Client  
│  
├── Farmers  
│  
│── Farms/Fields  
│  
│── Reporting Calendar  
│  
│── Reports  
│  
│── Tasks  
│  
└── Invoices

Agronomist  
│  
├── Assigned Clients  
├── Assigned Farmers  
├── Calendar Events  
├── Reports  
└── Tasks

# Devices

**MASTER SPECIFICATION: FINISHED DEVICES & FAULTY REPAIR WORKFLOW**

Developer, the basic inventory logic is being replaced with a strict, multi-step lifecycle and ticketing loop. The database must track a device from initial creation, through strict two-department QA, into client deployment, and through its repair cycle.

Execute the exact schema, ENUMs, and backend triggers listed below. Do not bypass these validation rules.

### **1\. Database Schema (devices table)**

Update the table with the following mandatory fields. We are separating the internal "Inventory Status" from the "Client Operational Status".

**Core Identifiers:**

* device\_id: Primary Key (UUID).  
* serial\_number: Varchar (Unique, Mandatory).  
* device\_type: Strict ENUM (Mobile Device, AquaSave Pro).

**Lifecycle & QA Fields:**

* inventory\_status: Strict ENUM (under\_hw\_development, pending\_agro\_qa, ready\_to\_assign, assigned\_to\_client, under\_repair).  
* hw\_developer\_id: Integer (Foreign Key to Users.id).  
* hw\_qa\_report\_url: Varchar (URL for Hardware QA snap/PDF).  
* agro\_qa\_by: Integer (Foreign Key to Users.id).  
* agro\_qa\_report\_url: Varchar (URL for Agronomist QA snap/PDF).

**Client Assignment & Operational Fields:**

* client\_id: Integer (Foreign Key to Clients.id. Nullable).  
* client\_op\_status: Strict ENUM (active, inactive\_crop\_pause, faulty). *This field is only applicable when inventory\_status is assigned\_to\_client.*

**Repair Tracking (Ticketing):**

* repair\_receipt\_timestamp: Timestamp (Starts the repair clock).  
* fault\_cause\_report\_url: Varchar (Hardware's initial inspection report).  
* estimated\_repair\_date: Date.

### 

### **2\. The Device Lifecycle & API Validation Rules**

Your backend must enforce this exact state machine. Block any API request that tries to skip a step with a 400 Bad Request.

**Phase 1: New Device Creation (Hardware Team)**

* Hardware creates the device, logs the device\_type, and uploads the hw\_qa\_report\_url.  
* *Backend Force:* The inventory\_status must automatically be set to pending\_agro\_qa. The device cannot be assigned to a client yet.

**Phase 2: Agronomist QA (The Assignment Blocker)**

* The Agronomist tests the device and hits an endpoint to upload their agro\_qa\_report\_url.  
* *Backend Force:* The API must log the Agronomist's Users.id into agro\_qa\_by.  
* *Backend Force:* Upon successful upload, inventory\_status automatically changes to ready\_to\_assign.

**Phase 3: Client Assignment**

* *Validation Rule:* The API must strictly block assigning a client\_id UNLESS the inventory\_status is ready\_to\_assign (meaning both HW and Agro QA are present).  
* *Backend Force:* When assigned to a client, change inventory\_status to assigned\_to\_client and set client\_op\_status to active. The device will now appear in the Client's profile.

### **3\. The Faulty Device Ticketing Loop (Strict Trigger Sequence)**

If a device breaks in the field, the system must automate the handover back to the Hardware team.

**Step 1: Marking as Faulty (Business/Agronomy Team)**

* A user updates the device's client\_op\_status to faulty.  
* *Backend Trigger:* Automatically generate a Task/Ticket assigned to the Hardware Team. The ticket must include the device\_id, the serial number, and the client\_id. Change inventory\_status to under\_repair.

**Step 2: Hardware Receipt & Inspection (Hardware Team)**

* Hardware receives the physical device and hits a specific "Confirm Receipt" endpoint.  
* *Backend Trigger:* Automatically log the current time in repair\_receipt\_timestamp (This starts the internal repair counter).  
* Hardware inspects it, uploads the fault\_cause\_report\_url, and sets the estimated\_repair\_date.

**Step 3: Repair Completion & QA Loop Reset (Hardware Team)**

* Hardware finishes the repair and hits the "Repair Complete" endpoint.  
* *Backend Trigger:* The system must NOT make it ready\_to\_assign. It must force the inventory\_status back to pending\_agro\_qa.  
* The Agronomist must do their QA process again (repeating Phase 2\) before it can be assigned back to the client.

**Deliverable Constraints:** Build the API routes to enforce these exact status changes. I will test this by attempting to assign a newly created device directly to a client. Your API must reject my request if the Agronomist QA fields are missing. Send a video demo of a device going from assigned\_to\_client \-\> faulty \-\> under\_repair (with receipt timestamp logged) \-\> pending\_agro\_qa.

[image1]: <data:image/png;base64,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>

[image2]: <data:image/png;base64,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>

[image3]: <data:image/png;base64,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>