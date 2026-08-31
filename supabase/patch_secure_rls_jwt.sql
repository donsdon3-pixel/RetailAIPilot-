-- ======================================================================================
-- SUPABASE RLS HARDENING PATCH (STRICT JWT VERIFICATION)
-- Fixes: cannot change return type of existing function (via DROP ... CASCADE)
-- Eliminates: Header spoofing vulnerability (x-organization-id / x-user-role)
-- ======================================================================================

-- Step 1: Drop old functions and dependent policies cleanly
DROP FUNCTION IF EXISTS get_auth_org_id() CASCADE;
DROP FUNCTION IF EXISTS get_auth_role() CASCADE;

-- Step 2: Recreate get_auth_org_id() with Strict JWT & Database User Lookup
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

-- Step 3: Recreate get_auth_role() with Strict JWT & Database User Lookup
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
        (current_setting('request.jwt.claims', true)::jsonb -> 'user_role'),
        (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
    );
    
    IF v_role IS NOT NULL AND v_role <> '' AND v_role <> 'authenticated' AND v_role <> 'anon' THEN
        RETURN v_role;
    END IF;

    -- 2. Secure Fallback: Lookup verified user role from public.users using auth.uid() or verified JWT email
    IF auth.uid() IS NOT NULL OR (auth.jwt() ->> 'email') IS NOT NULL THEN
        SELECT role::text INTO v_role 
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

-- Step 4: Re-apply Row Level Security (RLS) Policies across all 22 Tables

-- 1. Organizations
DROP POLICY IF EXISTS rls_organizations ON organizations;
CREATE POLICY rls_organizations ON organizations
    FOR ALL
    USING (id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 2. Stores
DROP POLICY IF EXISTS rls_stores ON stores;
CREATE POLICY rls_stores ON stores
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 3. Users
DROP POLICY IF EXISTS rls_users ON users;
CREATE POLICY rls_users ON users
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 4. Categories
DROP POLICY IF EXISTS rls_categories ON categories;
CREATE POLICY rls_categories ON categories
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 5. Suppliers
DROP POLICY IF EXISTS rls_suppliers ON suppliers;
CREATE POLICY rls_suppliers ON suppliers
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 6. Products
DROP POLICY IF EXISTS rls_products ON products;
CREATE POLICY rls_products ON products
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 7. Inventory Ledger
DROP POLICY IF EXISTS rls_ledger_select ON inventory_ledger;
CREATE POLICY rls_ledger_select ON inventory_ledger
    FOR SELECT
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS rls_ledger_insert ON inventory_ledger;
CREATE POLICY rls_ledger_insert ON inventory_ledger
    FOR INSERT
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 8. Stock Transfers
DROP POLICY IF EXISTS rls_stock_transfers ON stock_transfers;
CREATE POLICY rls_stock_transfers ON stock_transfers
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 9. Stock Transfer Items
DROP POLICY IF EXISTS rls_stock_transfer_items ON stock_transfer_items;
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
DROP POLICY IF EXISTS rls_purchase_orders ON purchase_orders;
CREATE POLICY rls_purchase_orders ON purchase_orders
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 11. Purchase Order Items
DROP POLICY IF EXISTS rls_purchase_order_items ON purchase_order_items;
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
DROP POLICY IF EXISTS rls_goods_receipt_notes ON goods_receipt_notes;
CREATE POLICY rls_goods_receipt_notes ON goods_receipt_notes
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 13. Customers
DROP POLICY IF EXISTS rls_customers ON customers;
CREATE POLICY rls_customers ON customers
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 14. Sales Orders
DROP POLICY IF EXISTS rls_sales_orders ON sales_orders;
CREATE POLICY rls_sales_orders ON sales_orders
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 15. Sales Items
DROP POLICY IF EXISTS rls_sales_items ON sales_items;
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

-- 16. Payments
DROP POLICY IF EXISTS rls_payments ON payments;
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
DROP POLICY IF EXISTS rls_returns ON returns;
CREATE POLICY rls_returns ON returns
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 18. Return Items
DROP POLICY IF EXISTS rls_return_items ON return_items;
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
DROP POLICY IF EXISTS rls_expense_categories ON expense_categories;
CREATE POLICY rls_expense_categories ON expense_categories
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 20. Expenses
DROP POLICY IF EXISTS rls_expenses ON expenses;
CREATE POLICY rls_expenses ON expenses
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 21. Automation Logs
DROP POLICY IF EXISTS rls_automation_logs ON automation_logs;
CREATE POLICY rls_automation_logs ON automation_logs
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');

-- 22. System Alerts
DROP POLICY IF EXISTS rls_system_alerts ON system_alerts;
CREATE POLICY rls_system_alerts ON system_alerts
    FOR ALL
    USING (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN')
    WITH CHECK (organization_id = get_auth_org_id() OR get_auth_role() = 'SUPER_ADMIN');
