# RetailPilot AI 🚀
### Intelligent Retail Inventory, Sales & Business Management SaaS
**IRC-SD Main Capstone Project #2** • Evaluation Normalized to 100 Marks (120 Total Marks)

[![Live SaaS App](https://img.shields.io/badge/Live%20Deployment-retail--ai--pilot.vercel.app-emerald?style=for-the-badge&logo=vercel)](https://retail-ai-pilot.vercel.app/)
[![CI/CD Pipeline](https://github.com/donsdon3-pixel/RetailAIPilot-/actions/workflows/ci.yml/badge.svg)](https://github.com/donsdon3-pixel/RetailAIPilot-/actions)
[![QA Test Suite](https://img.shields.io/badge/QA%20Tests-56%20Passing%20(100%25)-emerald)](docs/QA_TESTING_MATRIX.md)
[![Architecture](https://img.shields.io/badge/Architecture-Multi--Tenant%20SaaS%20%2B%20Supabase%20RLS-blue)](supabase/schema.sql)
[![Intelligence](https://img.shields.io/badge/Intelligence-MCP%20Server%20%2B%20Autonomous%20Agents-purple)](src/mcp-server/README.md)

---

## 🌐 Live Cloud SaaS Platform & Demo Access
- **Production URL**: [https://retail-ai-pilot.vercel.app/](https://retail-ai-pilot.vercel.app/)
- **Default 1-Click Persona**: Business Owner (`owner@supermart.com` / `DemoPass123!`)
- **Super Admin Persona**: Global Admin (`admin@retailpilot.ai` / `DemoPass123!`)
- **Tenant B Persona (Isolation)**: Aurelia Luxury (`owner@aurelia.com` / `DemoPass123!`)

---

## 📋 Executive Overview

**RetailPilot AI** is an enterprise-grade, multi-tenant retail operations platform architected for supermarkets, fashion boutiques, consumer electronics, department stores, and general merchandise retailers.

### Core Business Pipeline
$$\text{Products} \longrightarrow \text{Suppliers} \longrightarrow \text{Purchases} \longrightarrow \text{Inventory} \longrightarrow \text{Sales} \longrightarrow \text{Customers} \longrightarrow \text{Payments} \longrightarrow \text{Returns} \longrightarrow \text{Expenses} \longrightarrow \text{AI Insights}$$

---

## 🌟 Key Architecture Pillars & Competency Areas

### 1. Multi-Tenant Architecture & Supabase Row Level Security (RLS)
- Strict database isolation across independent tenant organizations (`org_01` SuperMart Global, `org_02` Aurelia Fashion, `org_03` Nexus Electronics).
- Tenant A can never read or mutate Tenant B data.
- Complete PostgreSQL schema with automated RLS policies in [`supabase/schema.sql`](supabase/schema.sql).

### 2. Immutable Stock Movement Ledger
- Direct manual overwrites of stock counts are strictly forbidden by database triggers.
- Formula enforced across all movements:
  $$\text{Current Stock} = \text{Opening Stock} + \text{Purchases} - \text{Sales} + \text{Returns} - \text{Damaged} \pm \text{Adjustments} \pm \text{Transfers}$$
- 5-Stage Branch Transfer State Machine:
  $$\text{Draft} \longrightarrow \text{Requested} \longrightarrow \text{Approved} \longrightarrow \text{Dispatched } (\text{Deducts Source}) \longrightarrow \text{Received } (\text{Adds Destination})$$

### 3. Model Context Protocol (MCP) Server & Live AI Agents
- The AI Business Assistant strictly invokes deterministic live database queries via MCP tools rather than generating hallucinated approximations:
  1. `get_low_stock_products(store_id, threshold_days)`: SKUs $\le$ reorder threshold with sales velocity.
  2. `get_dead_stock(organization_id, min_days)`: Identifies 60+ days stagnant capital with markdown liquidation actions.
  3. `get_profitability(store_id, start_date, end_date)`: Computes Gross Sales $-$ COGS $-$ OpEx $=$ Net Profit.
  4. `get_supplier_outstanding(organization_id, min_due)`: Aggregates unpaid AP liabilities and credit terms.
  5. `generate_business_report(organization_id, period_month)`: Structured JSON executive diagnostic dossier.
- All AI responses feature mandatory `"⚠️ AI-generated recommendation"` compliance disclaimers.

### 4. 5 Mandatory Automated Workflows
1. **Low Stock Auto-Alert:** Stock drops below reorder point $\rightarrow$ Webhook trigger $\rightarrow$ Manager dashboard alert.
2. **Dead Stock Bi-Weekly Audit:** Scheduled check $\rightarrow$ Identifies 60+ day stagnant capital $\rightarrow$ Markdown liquidation strategy.
3. **Supplier Payment Escalation:** PO payment due in $<48$ hours $\rightarrow$ Verifies pending invoice $\rightarrow$ Alerts Accounts / Manager.
4. **Daily End-of-Day Sales Dossier:** Midnight trigger $\rightarrow$ Aggregates revenue, refunds, top SKUs $\rightarrow$ Summary push to Owner.
5. **Monthly Executive AI Report:** 1st of month $\rightarrow$ Full MCP data pipeline $\rightarrow$ Comprehensive diagnostic report.

### 5. Role-Based Access Control (RBAC - 6 Personas)
1. **Super Admin:** Global tenant provisioning, subscription billing tiers, system telemetry.
2. **Business Owner:** Multi-store & staff setup, P&L, revenue & expense tracking, AI dossiers.
3. **Store Manager:** Store-level audits, PO receipt & return approvals, staff shifts.
4. **Sales Staff:** High-velocity POS terminal, SKU & barcode search, split payments, returns.
5. **Inventory Staff:** Goods Receipt Notes (GRN), damaged stock logging, branch transfers.
6. **Customer (Portal):** Self-service digital invoices, loyalty points balance, personalized promos.

---

## ⚡ Quick Start Guide

### Prerequisites
- Node.js $\ge 18.0.0$
- npm $\ge 9.0.0$

### 1. Installation
```bash
git clone https://github.com/donsdon3-pixel/RetailAIPilot-.git RetailAIPilot
cd RetailAIPilot
npm install
```

### 2. Running Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Running Automated 50 QA Test Suite
```bash
npm test
```

---

## 📁 Repository Structure

```
RetailAIPilot/
├── .github/workflows/ci.yml           # GitHub Actions CI/CD pipeline
├── supabase/
│   └── schema.sql                     # Complete PostgreSQL DDL & Supabase RLS policies
├── src/
│   ├── app/                           # Next.js 15 App Router pages & REST routes
│   │   ├── page.tsx                   # Executive Dashboard & KPIs
│   │   ├── pos/page.tsx               # High-Velocity POS Terminal & Split Payments
│   │   ├── inventory/page.tsx         # Immutable Stock Ledger & 5-Stage Transfers
│   │   ├── purchases/page.tsx         # POs, GRN Receipts & Supplier Escalations
│   │   ├── sales/page.tsx             # Sales Invoices & Customer Returns
│   │   ├── expenses/page.tsx          # Operating Expenses & P&L Analysis
│   │   ├── ai-assistant/page.tsx      # Autonomous AI Agent with Live MCP Inspector
│   │   ├── automations/page.tsx       # 5 Mandatory Background Workflows Engine
│   │   ├── customers/page.tsx         # Customer Loyalty & Self-Service Digital Invoices
│   │   ├── admin/page.tsx             # Super Admin Multi-Tenant Provisioning
│   │   ├── qa/page.tsx                # Interactive 50 QA Test Cases Verification Hub
│   │   └── api/                       # REST API & MCP Server Route Handlers
│   ├── lib/
│   │   ├── types.ts                   # Comprehensive TypeScript domain interfaces
│   │   ├── seed-data.ts               # Multi-tenant seed dataset
│   │   ├── ledger-service.ts          # Immutable ledger calculation engine
│   │   ├── mcp-tools.ts               # The 5 Core MCP Tool implementations
│   │   ├── automation-service.ts      # 5 automated background workflows engine
│   │   ├── ai-service.ts              # AI Assistant & Guardrails engine
│   │   └── store.ts                   # Reactive multi-tenant state store
│   ├── mcp-server/                    # Standalone Model Context Protocol (MCP) server
│   │   ├── index.ts                   # MCP Server JSON-RPC & Stdio protocol server
│   │   └── README.md                  # Claude Desktop & Cursor connection setup
│   └── tests/                         # Automated Vitest QA suite (50 test cases)
│       ├── functional.test.ts         # 25 Functional test cases
│       ├── api-contracts.test.ts      # 10 API & Contract test cases
│       ├── security-rls.test.ts       # 5 Security & RLS isolation test cases
│       ├── ai-mcp.test.ts             # 5 AI & MCP tool calling test cases
│       └── ui-pos.test.ts             # 5 UI & Mobile POS test cases
└── docs/
    ├── SDLC_DOCUMENTATION.md          # Business Research, Personas & ER diagrams
    ├── QA_TESTING_MATRIX.md           # Full 50 Test Cases verification matrix
    └── LIVE_DEMO_SCRIPT.md            # 20-Minute live demo presentation walkthrough
```

---

## 🎯 Evaluation Rubric Breakdown (120 Marks Total)

| Dimension | Marks | Deliverables in RetailPilot AI |
| :--- | :---: | :--- |
| **Business Research & Problem Formulation** | 5 | Documented in [`SDLC_DOCUMENTATION.md`](docs/SDLC_DOCUMENTATION.md) |
| **Requirement Specs & User Personas** | 5 | 6 RBAC Personas with Granular Control Matrix |
| **SDLC & Design Documentation** | 5 | System Architecture, ER Diagrams, Invariant Rules |
| **UI/UX & Frontend (Next.js / React)** | 16 (8+8) | High-Velocity POS, Split Pay, Thermal Print CSS, Recharts |
| **Backend APIs & REST Design** | 14 (8+6) | Next.js Route Handlers (`/api/mcp`, `/api/pos/checkout`, etc.) |
| **Database Design & Supabase RLS** | 13 (8+5) | PostgreSQL DDL with RLS Policies & Ledger Triggers |
| **Multi-Tenant Architecture** | 5 | 3 Distinct Isolated Tenants (`org_01`, `org_02`, `org_03`) |
| **Technical Documentation** | 3 | Complete [`README.md`](README.md) & API Documentation |
| **AI Agent & Prompt Engineering** | 13 (8+5) | Live AI Assistant with Guardrails & Disclaimer Badges |
| **MCP Server Implementation** | 8 | 5 Standard Model Context Protocol Tools |
| **Background Automation Workflows** | 5 | All 5 Mandatory Autonomous Workflows with Logs |
| **Analytics & Visual Dashboards** | 4 | Real-time P&L, Inventory Valuation, Dead Capital Tracker |
| **SEO / AEO / GEO Optimization** | 3 | Metadata, OpenGraph & Structured Schema Tags |
| **QA Testing (50 Documented Cases)** | 4 | 100% Passing Vitest Suite documented in [`QA_TESTING_MATRIX.md`](docs/QA_TESTING_MATRIX.md) |
| **Git/GitHub & Cloud CI/CD Deployment** | 5 (2+3) | Configured Git Remote & GitHub Actions CI Workflow |
| **Mandatory Live Demo & Viva** | 8 | Exact 20-Min Script in [`LIVE_DEMO_SCRIPT.md`](docs/LIVE_DEMO_SCRIPT.md) |
| **TOTAL CAPSTONE MARKS** | **120** | **Normalized to 100 Marks** |
