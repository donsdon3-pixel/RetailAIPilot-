-- ======================================================================================
-- RetailPilot AI - PostgreSQL / Supabase Multi-Tenant Schema & Row Level Security (RLS)
-- IRC-SD Main Capstone Project #2
-- ======================================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CUSTOM TYPES & ENUMS
CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN',
    'BUSINESS_OWNER',
    'STORE_MANAGER',
    'SALES_STAFF',
    'INVENTORY_STAFF',
    'CUSTOMER'
);

CREATE TYPE movement_type AS ENUM (
    'OPENING_STOCK',
    'PURCHASE',
    'SALE',
    'RETURN',
    'DAMAGED',
    'ADJUSTMENT',
    'TRANSFER_OUT',
    'TRANSFER_IN'
);

CREATE TYPE transfer_status AS ENUM (
    'DRAFT',
    'REQUESTED',
    'APPROVED',
    'DISPATCHED',
    'RECEIVED',
    'CANCELLED'
);

CREATE TYPE payment_method AS ENUM (
    'CASH',
    'CREDIT_CARD',
    'DEBIT_CARD',
    'UPI',
    'LOYALTY_POINTS',
    'SPLIT'
);

CREATE TYPE po_status AS ENUM (
    'DRAFT',
    'SENT',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'CANCELLED'
);

CREATE TYPE payment_status AS ENUM (
    'PENDING',
    'PARTIAL',
    'PAID',
    'OVERDUE'
);

-- ======================================================================================
-- 3. CORE MULTI-TENANT ENTITIES
-- ======================================================================================

-- Organizations (Tenants)
CREATE TABLE organizations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'ENTERPRISE',
    subscription_status VARCHAR(50) DEFAULT 'ACTIVE',
    currency VARCHAR(10) DEFAULT 'INR',
    tax_rate NUMERIC(5, 2) DEFAULT 12.00,
    gstin VARCHAR(50),
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores / Branches belonging to an Organization
CREATE TABLE stores (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- Users with Organization, Store, and RBAC Role
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
    store_id VARCHAR(64) REFERENCES stores(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'SALES_STAFF',
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers
CREATE TABLE suppliers (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    credit_period_days INT DEFAULT 30,
    outstanding_balance NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Categories
CREATE TABLE categories (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products & SKUs
CREATE TABLE products (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id VARCHAR(64) REFERENCES categories(id) ON DELETE SET NULL,
    supplier_id VARCHAR(64) REFERENCES suppliers(id) ON DELETE SET NULL,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    reorder_point INT NOT NULL DEFAULT 10,
    reorder_quantity INT NOT NULL DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, sku)
);

-- ======================================================================================
-- 4. IMMUTABLE STOCK MOVEMENT LEDGER
-- Formula: Current Stock = Opening Stock + Purchases - Sales + Returns - Damaged ± Adjustments
-- Direct manual overwrites are strictly forbidden.
-- ======================================================================================

CREATE TABLE inventory_ledger (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id VARCHAR(64) NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type movement_type NOT NULL,
    quantity_change INT NOT NULL, -- Positive or Negative
    unit_cost NUMERIC(10, 2) NOT NULL,
    total_cost NUMERIC(12, 2) GENERATED ALWAYS AS (ABS(quantity_change) * unit_cost) STORED,
    reference_id VARCHAR(100), -- E.g. Sale ID, PO ID, Transfer ID, Return ID
    linked_movement_id VARCHAR(64) REFERENCES inventory_ledger(id) ON DELETE SET NULL,
    return_order_id VARCHAR(64),
    reason TEXT,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ledger_org_store_prod ON inventory_ledger(organization_id, store_id, product_id);
CREATE INDEX idx_ledger_created_at ON inventory_ledger(created_at);

-- Branch-to-Branch Stock Transfers
-- States: Draft -> Requested -> Approved -> Dispatched -> Received
CREATE TABLE stock_transfers (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    transfer_number VARCHAR(100) NOT NULL,
    source_store_id VARCHAR(64) NOT NULL REFERENCES stores(id),
    destination_store_id VARCHAR(64) NOT NULL REFERENCES stores(id),
    status transfer_status NOT NULL DEFAULT 'DRAFT',
    requested_by VARCHAR(64) REFERENCES users(id),
    approved_by VARCHAR(64) REFERENCES users(id),
    dispatched_by VARCHAR(64) REFERENCES users(id),
    received_by VARCHAR(64) REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, transfer_number)
);

CREATE TABLE stock_transfer_items (
    id VARCHAR(64) PRIMARY KEY,
    transfer_id VARCHAR(64) NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id),
    quantity_requested INT NOT NULL,
    quantity_sent INT DEFAULT 0,
    quantity_received INT DEFAULT 0
);

-- ======================================================================================
-- 5. PURCHASING, SUPPLIERS & AP (ACCOUNTS PAYABLE)
-- ======================================================================================

CREATE TABLE purchase_orders (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id VARCHAR(64) NOT NULL REFERENCES stores(id),
    supplier_id VARCHAR(64) NOT NULL REFERENCES suppliers(id),
    po_number VARCHAR(100) NOT NULL,
    status po_status NOT NULL DEFAULT 'DRAFT',
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_status payment_status NOT NULL DEFAULT 'PENDING',
    payment_due_date DATE NOT NULL,
    created_by VARCHAR(64) REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, po_number)
);

CREATE TABLE purchase_order_items (
    id VARCHAR(64) PRIMARY KEY,
    purchase_order_id VARCHAR(64) NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id),
    quantity_ordered INT NOT NULL,
    quantity_received INT DEFAULT 0,
    unit_cost NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(12, 2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED
);

-- Goods Receipt Notes (GRN)
CREATE TABLE goods_receipt_notes (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id VARCHAR(64) NOT NULL REFERENCES stores(id),
    purchase_order_id VARCHAR(64) REFERENCES purchase_orders(id),
    grn_number VARCHAR(100) NOT NULL,
    received_by VARCHAR(64) REFERENCES users(id),
    inspection_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================================================================
-- 6. POS SALES, SPLIT PAYMENTS & CUSTOMERS
-- ======================================================================================

CREATE TABLE customers (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    loyalty_points INT DEFAULT 0,
    total_spend NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sales_orders (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id VARCHAR(64) NOT NULL REFERENCES stores(id),
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    cashier_id VARCHAR(64) REFERENCES users(id),
    invoice_number VARCHAR(100) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cogs_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Cost of Goods Sold for exact P&L
    status VARCHAR(50) DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, invoice_number)
);

CREATE TABLE sales_items (
    id VARCHAR(64) PRIMARY KEY,
    sales_order_id VARCHAR(64) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    cogs NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED
);

-- Payments Supporting Split Methods (Cash + Card + UPI + Loyalty Points)
CREATE TABLE payments (
    id VARCHAR(64) PRIMARY KEY,
    sales_order_id VARCHAR(64) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    payment_method payment_method NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    reference_transaction_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Returns & Refunds
CREATE TABLE returns (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id VARCHAR(64) NOT NULL REFERENCES stores(id),
    sales_order_id VARCHAR(64) NOT NULL REFERENCES sales_orders(id),
    return_number VARCHAR(100) NOT NULL,
    refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    reason TEXT NOT NULL,
    processed_by VARCHAR(64) REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, return_number)
);

CREATE TABLE return_items (
    id VARCHAR(64) PRIMARY KEY,
    return_id VARCHAR(64) NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    refund_unit_price NUMERIC(10, 2) NOT NULL,
    condition VARCHAR(50) NOT NULL DEFAULT 'RESTOCKABLE' -- 'RESTOCKABLE' or 'DAMAGED'
);

-- ======================================================================================
-- 7. OPERATING EXPENSES & P&L TRACKING
-- ======================================================================================

CREATE TABLE expense_categories (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE expenses (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id VARCHAR(64) NOT NULL REFERENCES stores(id),
    category_id VARCHAR(64) REFERENCES expense_categories(id),
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    logged_by VARCHAR(64) REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================================================================
-- 8. AUTOMATION LOGS, SYSTEM ALERTS & AUDIT
-- ======================================================================================

CREATE TABLE automation_logs (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workflow_name VARCHAR(100) NOT NULL,
    execution_status VARCHAR(50) NOT NULL,
    payload JSONB,
    result_summary TEXT,
    triggered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_alerts (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id VARCHAR(64) REFERENCES stores(id),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) DEFAULT 'INFO',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================================================================
-- 9. DYNAMIC INVENTORY BALANCE VIEW (WITH SECURITY INVOKER)
-- ======================================================================================

DROP VIEW IF EXISTS view_inventory_balance CASCADE;

CREATE OR REPLACE VIEW view_inventory_balance 
WITH (security_invoker = true) AS
SELECT 
    l.organization_id,
    l.store_id,
    l.product_id,
    p.sku,
    p.name AS product_name,
    p.unit_cost,
    p.selling_price,
    p.reorder_point,
    SUM(l.quantity_change) AS current_stock,
    (SUM(l.quantity_change) * p.unit_cost) AS total_inventory_valuation
FROM inventory_ledger l
JOIN products p ON l.product_id = p.id
GROUP BY l.organization_id, l.store_id, l.product_id, p.sku, p.name, p.unit_cost, p.selling_price, p.reorder_point;

-- ======================================================================================
-- 10. SECURITY HARDENED HELPER FUNCTIONS
-- ======================================================================================

CREATE OR REPLACE FUNCTION get_auth_org_id() 
RETURNS VARCHAR 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_org_id VARCHAR;
BEGIN
    -- 1. Extract from cryptographically verified JWT claims
    v_org_id := COALESCE(
        (auth.jwt() ->> 'organization_id'),
        (auth.jwt() -> 'app_metadata' ->> 'organization_id'),
        (auth.jwt() -> 'user_metadata' ->> 'organization_id'),
        (current_setting('request.jwt.claims', true)::jsonb ->> 'organization_id'),
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'organization_id'),
        (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'organization_id')
    );
    
    IF v_org_id IS NOT NULL AND v_org_id <> '' THEN
        RETURN v_org_id;
    END IF;

    -- 2. Secure Fallback: Lookup verified user organization from public.users using auth.uid() or verified JWT email
    IF auth.uid() IS NOT NULL OR (auth.jwt() ->> 'email') IS NOT NULL THEN
        SELECT organization_id INTO v_org_id 
        FROM public.users 
        WHERE id = auth.uid()::text OR email = (auth.jwt() ->> 'email')
        LIMIT 1;
        
        IF v_org_id IS NOT NULL AND v_org_id <> '' THEN
            RETURN v_org_id;
        END IF;
    END IF;

    -- STRICT SECURITY: Reject unauthenticated and spoofed header requests with NULL (blocks cross-tenant access)
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION get_auth_role() 
RETURNS VARCHAR 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role VARCHAR;
BEGIN
    -- 1. Extract from cryptographically verified JWT claims
    v_role := COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'role'),
        (auth.jwt() -> 'user_metadata' ->> 'role'),
        (auth.jwt() ->> 'user_role'),
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'),
        (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role'),
        (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
    );
    
    IF v_role IS NOT NULL AND v_role <> '' AND v_role <> 'authenticated' AND v_role <> 'anon' THEN
        RETURN v_role;
    END IF;

    -- 2. Secure Fallback: Lookup verified user role from public.users using auth.uid() or verified JWT email
    IF auth.uid() IS NOT NULL OR (auth.jwt() ->> 'email') IS NOT NULL THEN
        SELECT role INTO v_role 
        FROM public.users 
        WHERE id = auth.uid()::text OR email = (auth.jwt() ->> 'email')
        LIMIT 1;
        
        IF v_role IS NOT NULL AND v_role <> '' THEN
            RETURN v_role;
        END IF;
    END IF;

    -- STRICT SECURITY: Reject unauthenticated and spoofed header requests with NULL
    RETURN NULL;
END;
$$;

-- Ledger Anti-Tampering Trigger Function
CREATE OR REPLACE FUNCTION prevent_ledger_tampering()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'TAMPERING FORBIDDEN: inventory_ledger is immutable. Changes must be recorded as new movements.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_ledger_update ON inventory_ledger;
CREATE TRIGGER trg_prevent_ledger_update
    BEFORE UPDATE OR DELETE ON inventory_ledger
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_tampering();

-- ======================================================================================
-- 11. SUPABASE ROW LEVEL SECURITY (RLS) POLICIES FOR ALL 22 TABLES
-- ======================================================================================

-- Enable RLS across all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Drop any old policies to avoid duplicates
DO $$ 
DECLARE
    tbl record;
    pol record;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl.tablename LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', pol.policyname, tbl.tablename);
        END LOOP;
    END LOOP;
END $$;

-- 1. Organizations
CREATE POLICY rls_organizations ON organizations
    FOR ALL
    USING (id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 2. Stores
CREATE POLICY rls_stores ON stores
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 3. Users
CREATE POLICY rls_users ON users
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 4. Categories
CREATE POLICY rls_categories ON categories
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 5. Suppliers
CREATE POLICY rls_suppliers ON suppliers
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 6. Products
CREATE POLICY rls_products ON products
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 7. Inventory Ledger (Append-only: SELECT and INSERT)
CREATE POLICY rls_ledger_select ON inventory_ledger
    FOR SELECT
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

CREATE POLICY rls_ledger_insert ON inventory_ledger
    FOR INSERT
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 8. Stock Transfers
CREATE POLICY rls_stock_transfers ON stock_transfers
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 9. Stock Transfer Items (Joined to stock_transfers)
CREATE POLICY rls_stock_transfer_items ON stock_transfer_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM stock_transfers st 
            WHERE st.id = stock_transfer_items.transfer_id 
            AND (st.organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM stock_transfers st 
            WHERE st.id = stock_transfer_items.transfer_id 
            AND (st.organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
        )
    );

-- 10. Purchase Orders
CREATE POLICY rls_purchase_orders ON purchase_orders
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 11. Purchase Order Items (Joined to purchase_orders)
CREATE POLICY rls_purchase_order_items ON purchase_order_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM purchase_orders po 
            WHERE po.id = purchase_order_items.purchase_order_id 
            AND (po.organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM purchase_orders po 
            WHERE po.id = purchase_order_items.purchase_order_id 
            AND (po.organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
        )
    );

-- 12. Goods Receipt Notes
CREATE POLICY rls_goods_receipt_notes ON goods_receipt_notes
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 13. Customers
CREATE POLICY rls_customers ON customers
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 14. Sales Orders
CREATE POLICY rls_sales_orders ON sales_orders
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 15. Sales Items (Joined to sales_orders)
CREATE POLICY rls_sales_items ON sales_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM sales_orders so 
            WHERE so.id = sales_items.sales_order_id 
            AND (so.organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sales_orders so 
            WHERE so.id = sales_items.sales_order_id 
            AND (so.organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
        )
    );

-- 16. Payments (Joined to sales_orders)
CREATE POLICY rls_payments ON payments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM sales_orders so 
            WHERE so.id = payments.sales_order_id 
            AND (so.organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sales_orders so 
            WHERE so.id = payments.sales_order_id 
            AND (so.organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
        )
    );

-- 17. Returns
CREATE POLICY rls_returns ON returns
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 18. Return Items (Joined to returns)
CREATE POLICY rls_return_items ON return_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM returns r 
            WHERE r.id = return_items.return_id 
            AND (r.organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM returns r 
            WHERE r.id = return_items.return_id 
            AND (r.organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
        )
    );

-- 19. Expense Categories
CREATE POLICY rls_expense_categories ON expense_categories
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 20. Expenses
CREATE POLICY rls_expenses ON expenses
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 21. Automation Logs
CREATE POLICY rls_automation_logs ON automation_logs
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 22. System Alerts
CREATE POLICY rls_system_alerts ON system_alerts
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');
