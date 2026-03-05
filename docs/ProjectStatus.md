# ✈️ Project Status Report: MHIRJ Route Optimization Engine

**Phase 1: Data Ingestion & Infrastructure**
**Date:** March 05, 2026
**Status:** 🟡 Planning / Architecture Design
**Owner:** Senior Data Scientist (You)

---

### **1. Executive Summary**

The objective of this project is to build a data-driven "Sales Tool" for MHIRJ. We will identify specific airline routes where the **CRJ Series** aircraft is operationally superior to current competitor aircraft (Turboprops or Large Jets).

**Phase 1 Focus:** Build a robust, automated pipeline to acquire, clean, and store historical and real-time flight data from Toronto Pearson (YYZ) without manual intervention.

---

### **2. Objectives (OKRs)**

* **Objective A:** Establish a "Single Source of Truth" for flight data.
* *Key Result:* Deploy a cloud database (Supabase) capable of storing 100,000+ flight records.


* **Objective B:** Automate Data Collection.
* *Key Result:* Implement a "Set and Forget" system (Cron Job) that fetches daily flight schedules automatically.


* **Objective C:** Enable Historical Analysis.
* *Key Result:* Create a mechanism to "backfill" data from January 2026 to present.



---

### **3. Technical Scope**

#### **In-Scope (What we ARE doing now)**

* **Source:** AeroDataBox API (via RapidAPI).
* **Target:** Supabase PostgreSQL Database.
* **Method:** "ELT" (Extract, Load, Transform later). We will save the **RAW JSON** response directly to the database to ensure no data is lost.
* **Automation:** Scheduled execution (Daily) + Manual Trigger (On-demand).

#### **Out-of-Scope (What we are NOT doing yet)**

* Route Analysis or Profitability Calculations (Phase 2).
* Dashboards or Streamlit Visualizations (Phase 3).
* Machine Learning Models (Phase 4).

---

### **4. Technical Specifications**

#### **A. The Data Source (API)**

* **Provider:** AeroDataBox (FIDS Endpoint).
* **Endpoint:** `GET /flights/airports/iata/{code}/{start}/{end}`
* **Critical Parameters:**
* `withLeg=true` (REQUIRED: Provides destination & arrival time).
* `direction=Departure` (Focus on outbound flights).
* `withCancelled=false` (Ignore noise).



#### **B. The Infrastructure (Stack)**

| Component | Tool Selected | Why? |
| --- | --- | --- |
| **Database** | **Supabase (PostgreSQL)** | Handles JSONB (raw data) perfectly; scalable. |
| **Compute** | **Supabase Edge Functions** | Serverless, TypeScript support, low cost. |
| **Language** | **TypeScript** | Type safety prevents errors with messy API data. |
| **Scheduling** | **pg_cron / Supabase Cron** | Built-in tool to run the script every morning. |

#### **C. The Data Schema (Database Design)**

We are using a **"Raw Dump"** strategy. We create one table to catch everything.

* **Table Name:** `raw_flights`
* **Columns:**
1. `id`: Primary Key.
2. `flight_number`: (Text) For fast searching (e.g., "AC123").
3. `scheduled_time`: (Timestamp) To sort by date.
4. `raw_payload`: (**JSONB**) The entire API response for that flight.


* **Constraint:** `UNIQUE(flight_number, scheduled_time)` to prevent duplicates.

---

### **5. Roadmap & Deliverables**

| Step | Task Name | Description | Outcome |
| --- | --- | --- | --- |
| **1** | **Infrastructure Setup** | Create Supabase Project, define Table & API Secrets. | Database is ready to accept data. |
| **2** | **Edge Function Dev** | Write `sync-flights.ts` to fetch & save raw JSON. | A script that can "Get & Save" one day of data. |
| **3** | **Manual Test** | Trigger the function manually for "Yesterday's Data." | Verify data appears in the table correctly. |
| **4** | **Automation** | Configure Cron Job to run at 04:00 AM daily. | System runs on autopilot. |
| **5** | **Backfill** | Run a loop to fetch data from Jan 1, 2026 – Today. | Historical dataset created for analysis. |

---

### **6. Immediate Next Steps (Action Items)**

1. **Sign up/Login to Supabase** and create a new project named `mhirj-route-analyzer`.
2. **Get the API Key** from RapidAPI (AeroDataBox).
3. **Run the SQL** snippet to create the `raw_flights` table.

Does this document accurately reflect the "Director Level" view of the project you wanted? If you approve this PRD, we move to **Step 1: Infrastructure Setup**.