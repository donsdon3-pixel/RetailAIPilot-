# RetailPilot AI - Software Development Lifecycle (SDLC) & System Architecture Specification

## 1. Business Research & Problem Formulation

Modern retail operations across supermarkets, fashion boutiques, consumer electronics, and department stores suffer from severe fragmentation:
- **Disjointed Inventory & Sales Systems:** Point-of-Sale (POS) software frequently diverges from backroom inventory levels due to unrecorded shrinkage, untracked damaged items, and missing transfer records.
- **Vulnerability to Stock Tampering:** Traditional databases allow manual overwrites of `stock_count` columns, destroying audit trails and masking internal shrinkage.
- **Disconnected Artificial Intelligence:** Generic LLM chatbots deployed in retail produce dangerous hallucinations regarding inventory levels, margins, and accounts payable because they lack structured, real-time database interfaces.
- **Multi-Tenant Data Leakage:** Multi-brand operators and SaaS platforms risk compliance disasters if Tenant A's customer or sales data bleeds into Tenant B's reporting.

### Core Business Pipeline
$$\text{Products} \longrightarrow \text{Suppliers} \longrightarrow \text{Purchases} \longrightarrow \text{Inventory} \longrightarrow \text{Sales} \longrightarrow \text{Customers} \longrightarrow \text{Payments} \longrightarrow \text{Returns} \longrightarrow \text{Expenses} \longrightarrow \text{AI Insights}$$

---

## 2. Target User Roles & Role-Based Access Control (RBAC)

RetailPilot AI implements 6 distinct user personas with granular access control:

| Role | Operational Scope & Capabilities |
| :--- | :--- |
| **1. Super Admin** | Global tenant provisioning, subscription billing tiers (Starter/Pro/Enterprise), global telemetry, system security settings. |
| **2. Business Owner** | Multi-store P&L, gross revenue, operating expense tracking, automated monthly AI dossiers, strategic liquidation decisions. |
| **3. Store Manager** | Store-level stock audits, PO receipt approvals, customer return authorizations, staff shifts, sales targets. |
| **4. Sales Staff** | High-velocity POS terminal, SKU & barcode lookup, cart split payments (Cash/Card/UPI), customer returns processing. |
| **5. Inventory Staff** | Goods Receipt Notes (GRN) intake, damaged stock write-offs, physical count adjustments, 5-stage branch transfers. |
| **6. Customer (Portal)** | Self-service digital invoice downloads, loyalty points balance, personalized AI promotions, order feedback. |

---

## 3. Multi-Tenant Architecture & Supabase Row Level Security (RLS)

Every database table is isolated by `organization_id` and enforced using PostgreSQL Row Level Security:

```sql
-- Enforce RLS on Inventory Ledger
ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY ledger_tenant_isolation ON inventory_ledger
    FOR ALL
    USING (organization_id = get_auth_org_id() OR current_setting('request.jwt.claims', true)::json->>'role' = 'SUPER_ADMIN');
```

```
RetailPilot AI Multi-Tenant Topology
├── Organization A: SuperMart Global (Tenant ID: org_01)
│   ├── Store 01: Downtown Flagship
│   └── Store 02: Midtown Express
├── Organization B: Aurelia Luxury Fashion (Tenant ID: org_02)
│   └── Store 03: Soho Boutique
└── Organization C: Nexus Electronics (Tenant ID: org_03)
    └── Store 04: Tech Plaza SF
```

---

## 4. Immutable Stock Movement Ledger

**Non-Negotiable Rule:** Direct manual overwrites of stock counts (`UPDATE products SET stock = X`) are strictly forbidden by database triggers and architectural design.

### Ledger Balance Invariant Formula:
$$\text{Current Stock} = \text{Opening Stock} + \text{Purchases} - \text{Sales} + \text{Returns} - \text{Damaged} \pm \text{Adjustments} + \text{Transfers In} - \text{Transfers Out}$$

### 5-Stage Branch Transfer State Machine:
$$\text{Draft} \longrightarrow \text{Requested} \longrightarrow \text{Approved} \longrightarrow \text{Dispatched } (\text{Deducts Source}) \longrightarrow \text{Received } (\text{Adds Destination})$$

---

## 5. Model Context Protocol (MCP) & AI Integration

The Autonomous AI Assistant queries live database states via 5 standard MCP tools:
1. `get_low_stock_products(store_id, threshold_days)`: SKUs $\le$ reorder point with velocity.
2. `get_dead_stock(organization_id, min_days)`: Identifies 60+ day dormant stock with capital at risk.
3. `get_profitability(store_id, start_date, end_date)`: Gross Sales $-$ COGS $-$ OpEx $=$ Net Profit.
4. `get_supplier_outstanding(organization_id, min_due)`: Aggregates AP liabilities and credit terms.
5. `generate_business_report(organization_id, period_month)`: Structured executive JSON payload.

**Compliance Disclaimer:** All AI outputs carry mandatory `"⚠️ AI-generated recommendation. Verified against live database via MCP Server."` badges.
