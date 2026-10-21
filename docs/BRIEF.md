# IRCUB — Software Developer POC Take-Home Brief (verbatim requirements)

**Source:** Farsight Africa Technologies, ICT Department. Role: Software Developer.
POC duration: 5 working days (take-home). Deliverable: repository + demo link.

The test is **technology-neutral**. Candidates may answer in any
mainstream programming language, framework, and relational database of
their choice (for example Java, C#/.NET, Python, JavaScript/TypeScript,
PHP, or Go; and PostgreSQL, MySQL, SQL Server, or similar). Candidates
must state the technology used for each answer and any assumptions made.

## Case Study

The Ministry of Finance of a Federal Member State has contracted
Farsight Africa Technologies to design, build, deploy and support an
**Integrated Revenue Collection & Utility Billing Platform (IRCUB)**.
The platform automates tax revenue collection and administration and
water utility billing for the state-owned water agency, and posts all
collections to the government **Financial Management Information System
(FMIS)**.

All questions in this test refer to the IRCUB case study unless stated
otherwise. Key actors and systems include:

-   **Ministry of Finance (MoF):** owner of tax revenue streams, revenue
    targets and the FMIS.

-   **State Water Agency:** owner of water customers, meters, tariffs
    and billing cycles.

-   **Taxpayers and Water Customers:** individuals and businesses who
    are assessed, billed and who pay.

-   **Payment Channels:** partner banks and mobile money providers that
    collect payments and send notifications.

-   **FMIS:** the government financial system that receives posted
    collections against General Ledger (GL) codes.

### General Instructions

-   Code must be readable, commented where helpful, and include error
    handling. Pseudo-code is accepted only where stated.

-   Use only test, sandbox or mock data. Do not use real personal,
    taxpayer or financial data.

-   State all assumptions clearly. A reasonable assumption that is
    clearly stated will not be penalised.

-   Use of AI coding assistants must be declared. Candidates must be
    able to explain every line of code they submit.

# Proof of Concept (POC) Implementation

### Objective:

Develop a functional prototype of the **IRCUB platform**. The prototype
must handle **high-volume transactions**, **real-time payment updates**,
**complex user roles and workflows**, and **automated posting to FMIS**.
External systems (banks, mobile money, SMS, FMIS) should be simulated
with mock services.

### Modules

## 1. User & Role Management

**Requirements:**

1.  Implement a **hierarchical role system**:

    -   Roles: System Administrator, Revenue Supervisor, Revenue
        Officer, Water Billing Officer, Auditor, Taxpayer/Customer
        (self-service).

    -   Role Permissions:

        -   System Administrator: Create/Edit/Deactivate users, roles
            and system configuration.

        -   Revenue Supervisor: View/Approve/Reverse revenue
            transactions.

        -   Revenue Officer: Register payers, create assessments and
            capture payments.

        -   Water Billing Officer: Capture meter readings and run
            billing cycles.

        -   Auditor: View-only access to transactions, audit logs and
            reports.

        -   Taxpayer/Customer: View own bills and assessments and make
            payments.

    -   Permissions must be dynamically configurable in the database.

2.  Allow administrators to define **custom roles**, assign permissions,
    and enforce **segregation of duties** (e.g. the user who captures a
    reversal cannot approve it).

**Output:**

-   Secure login/logout with password policy and optional two-factor
    authentication.

-   Role-based menus, dashboards and API access control.

## 2. Taxpayer & Customer Registry

**Requirements:**

1.  Register individuals and businesses with a unique **Taxpayer
    Identification Number (TIN)**.

2.  Link one payer to multiple revenue obligations and multiple **water
    accounts** and meters.

3.  Detect likely **duplicate registrations** (same phone, email or
    national ID) and flag them for review.

**Output:**

-   Payer profile with a 360-degree view of assessments, bills, payments
    and balance.

## 3. Tax Revenue Assessment & Collection

**Requirements:**

1.  Configure **revenue types** (e.g. business licence, property rate,
    market fees) with rates and GL codes.

2.  Generate assessments and a unique **payment reference / control
    number** per assessment.

3.  Build a **bulk transaction uploader**:

    -   Accept a CSV file of revenue transactions.

    -   Validate records before saving.

    -   Provide a detailed summary report after upload (total rows,
        accepted, rejected, reason per rejected row).

4.  Add **audit tracking**:

    -   Track who created/edited/reversed each transaction, with
        timestamps and before/after values.

    -   Store changes in a separate, tamper-evident audit log table.

5.  Include advanced filters:

    -   Filter by payer, revenue type, amount range, channel, status or
        custom date ranges.

**Output:**

-   Bulk uploader with real-time validation.

-   Audit log tracking for all revenue activities.

## 4. Water Utility Billing

**Requirements:**

1.  Capture meter readings individually and via CSV upload, rejecting
    readings lower than the previous one unless flagged as rollover or
    meter replacement.

2.  Run a monthly **billing cycle** that applies the configured tiered
    tariff, carries forward arrears, and applies payments.

3.  Generate a **bill (PDF)** and send a mock SMS/email notification to
    the customer.

4.  Flag **abnormal consumption** (e.g. more than 200% of the 3-month
    average) for investigation before bills are released.

**Output:**

-   Billing cycle run with bill generation and exception report.

-   Customer statement showing bills, payments and running balance.

## 5. Payment Channel Integration

**Requirements:**

1.  Connect to mock **bank** and **mobile money** payment APIs:

    -   Support USD and local currency. Exchange rates are dynamic and
        must be retrieved from a separate mock API.

    -   Example API workflow:

        -   Step 1: Retrieve exchange rates
            (https://mock-api.com/rates).

        -   Step 2: Initiate or receive payment
            (https://mock-api.com/payments).

        -   Step 3: Receive a callback, verify it, and update the
            payment and assessment/bill status.

2.  Implement a **retry mechanism** for failed transactions:

    -   Retry failed payment status checks up to 3 times.

    -   Mark payments as permanently failed if retries exceed the limit
        and notify the supervisor.

3.  Produce a daily **channel reconciliation** report comparing IRCUB
    records with the channel statement file.

**Output:**

-   Multi-channel, multi-currency payments with real-time status
    updates.

-   Retry mechanism and reconciliation report implemented.

## 6. FMIS Posting & Reconciliation

**Requirements:**

1.  Maintain a configurable **revenue type to GL code** mapping.

2.  Create daily journal batches automatically, with statuses Pending,
    Posted, Failed and Reversed.

3.  Post to a mock FMIS API, store the FMIS reference, and prevent the
    same payment from being posted twice.

4.  Provide a reconciliation screen showing IRCUB vs FMIS totals per GL
    code and per day, with drill-down to transactions.

**Output:**

-   Automated FMIS posting with full traceability from payment to
    journal line.

## 7. Dashboard with Predictive Analytics

**Requirements:**

1.  Design an **executive dashboard** with:

    -   Revenue trends over time by revenue type and channel (line
        chart).

    -   Collections vs targets, and water billed vs collected
        (collection efficiency).

    -   Predicted revenue for the next quarter using a **linear
        regression** (or better, justified) model.

    -   Real-time alerts for unusual activity (e.g. sudden drops in
        collections, spikes in reversals).

2.  Optimise dashboard performance:

    -   Use server-side processing and pre-aggregated data for large
        datasets.

    -   Implement asynchronous updates for real-time data (e.g.
        WebSockets, server-sent events or polling).

**Output:**

-   Data-driven dashboard with predictive analytics.

-   Alerts for anomalies.

## POC Submission Deliverables

-   Source code in a Git repository with a meaningful commit history.

-   README with setup steps, technology stack, assumptions and known
    limitations.

-   Entity Relationship Diagram (ERD) and seed/test data scripts.

-   API documentation (OpenAPI/Swagger or equivalent) and a Postman
    collection or similar.

-   Automated tests and instructions to run them.

-   Deployment option: Docker Compose or a hosted demo link (preferred).
