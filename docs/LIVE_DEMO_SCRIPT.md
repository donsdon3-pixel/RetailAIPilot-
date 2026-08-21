# RetailPilot AI - Mandatory 20-Minute Live Demo & Viva Presentation Script

This structured script guarantees full marks during the mandatory 20-minute capstone evaluation and viva.

---

## ⏱️ Evaluation Timeline (20 Minutes Total)

```mermaid
gantt
    title 20-Minute Live Demo Structure
    dateFormat  m
    axisFormat %M min
    section Demonstration
    Part 1: Problem Statement & Differentiation :0, 3m
    Part 2: Full App Lifecycle (Tenant->POS->Return) :3, 8m
    Part 3: Technical Architecture & Supabase RLS :11, 4m
    Part 4: Live AI + MCP Tool Execution & Dossier :15, 5m
```

---

### Part 1 (3 Mins): Problem Statement & Market Differentiation
**Speaker Points:**
1. **The Retail Dilemma:** Traditional retail SaaS tools suffer from inventory-sales divergence, easy stock tampering, and multi-tenant security vulnerabilities.
2. **The AI Limitation:** Chatbots in retail hallucinate approximate stock levels and financial margins without real database access.
3. **RetailPilot AI Solution:**
   - Multi-tenant data isolation with Supabase Row Level Security (RLS).
   - Immutable stock movement ledger with zero manual overwrites ($Stock = Opening + Purchases - Sales + Returns - Damaged \pm Adjustments$).
   - Model Context Protocol (MCP) server providing verifiable live database tools to AI agents.

---

### Part 2 (8 Mins): Full App Lifecycle Demonstration
**Demonstration Flow:**
1. **Tenant & Role Switcher:**
   - Start in **SuperMart Global Retail** (`org_01`) at Downtown Flagship (`store_01`).
   - Switch role to **Sales Staff** (`cashier@supermart.com`).
2. **High-Velocity POS Sale & Split Payment:**
   - Open `/pos`. Scan barcode for `ORG-APL-01` (Apples) and `BEV-CBR-06` (Nitro Cold Brew).
   - Click "Proceed to Split Checkout".
   - Split $37.51 total into $20.00 Cash + $17.51 Card.
   - Click "Complete Sale & Deduct Immutable Stock".
   - Show the generated 80mm thermal receipt (`#thermal-receipt`).
3. **Inspect Immutable Stock Ledger:**
   - Switch role to **Store Manager** / **Inventory Staff** and navigate to `/inventory`.
   - Show the newly appended `SALE` entry with negative stock deduction.
4. **5-Stage Branch Transfer:**
   - Click "New Branch Transfer" to move surplus Cold Brew from Midtown Express (`store_02`) to Downtown (`store_01`).
   - Demonstrate advancing through the 5 stages: `Draft` $\rightarrow$ `Requested` $\rightarrow$ `Approved` $\rightarrow$ `Dispatched` (deducts source stock) $\rightarrow$ `Received` (adds destination stock).
5. **Customer Return & Restock:**
   - Navigate to `/sales`. Select invoice `INV-202608-1001`.
   - Process a return for unopened apples marked `RESTOCKABLE`.
   - Verify that positive inventory is returned to the store balance in the audit ledger.

---

### Part 3 (4 Mins): Technical Architecture, Schema & RLS
**Speaker Points & Code Inspection:**
1. **Supabase Schema (`supabase/schema.sql`):**
   - Walk through the `inventory_ledger` table and the trigger `prevent_ledger_tampering()` that blocks all `UPDATE` and `DELETE` queries.
2. **Row Level Security (RLS) Enforcement:**
   - Highlight `tenant_isolation` policies ensuring Tenant A cannot read or write Tenant B data.
3. **REST APIs & Next.js App Router:**
   - Review `/api/pos/checkout`, `/api/mcp`, `/api/automations`, and `/api/ai/chat`.

---

### Part 4 (5 Mins): Live AI + MCP Execution & Report Generation
**Demonstration Flow:**
1. **Navigate to `/ai-assistant`:**
   - Click quick prompt: *"1. Check Low Stock SKUs with velocity"*.
   - Expand the **MCP Tool Execution Card** showing the live call to `get_low_stock_products(store_id: 'store_01')` with raw JSON and 14ms latency.
   - Highlight the mandatory compliance disclaimer: *"⚠️ AI-generated recommendation. Verified against live database via MCP Server."*
2. **Dead Stock Liquidation Audit:**
   - Click prompt: *"2. Identify Dead Stock (>60d)"*.
   - Show the live tool execution `get_dead_stock(organization_id: 'org_01')` detecting the $1,824 stagnant truffle tonic capital and proposing 25%-40% markdown liquidation discounts.
3. **5 Mandatory Automated Workflows (`/automations`):**
   - Click "Trigger Workflow Now" for **Workflow 5: Monthly Executive AI Report**.
   - Show the generated structured executive diagnostic payload and notification push.
4. **50 QA Test Suite Verification (`/qa`):**
   - Click "Run Full 50-Test Suite Now".
   - Show 100% green pass rate across Functional (25), API (10), Security (5), AI (5), and UI (5).
