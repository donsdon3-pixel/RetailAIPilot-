-- ======================================================================================
-- RetailPilot AI - Comprehensive SQL Seed File (supabase/seed.sql)
-- ======================================================================================

-- 1. Organizations
INSERT INTO organizations (id, name, slug, subscription_tier, subscription_status, currency, tax_rate, gstin) VALUES ('org_01', 'SuperMart India Retail Ltd.', 'supermart-india', 'ENTERPRISE', 'ACTIVE', 'INR', 12, '29AAAAA1234A1Z5') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO organizations (id, name, slug, subscription_tier, subscription_status, currency, tax_rate, gstin) VALUES ('org_02', 'Aurelia Luxury Fashion India', 'aurelia-fashion-india', 'PROFESSIONAL', 'ACTIVE', 'INR', 18, '07BBBBB5678B1Z2') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO organizations (id, name, slug, subscription_tier, subscription_status, currency, tax_rate, gstin) VALUES ('org_03', 'Nexus Consumer Electronics India', 'nexus-electronics-india', 'ENTERPRISE', 'ACTIVE', 'INR', 18, '33CCCCC9012C1Z8') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name;

-- 2. Stores
INSERT INTO stores (id, organization_id, name, code, city, address, phone, is_active) VALUES ('store_01', 'org_01', 'SuperMart Bengaluru Indiranagar Flagship', 'SM-BLR-01', 'Bengaluru', 'Plot 100, 100 Feet Road, HAL 2nd Stage, Indiranagar', '+91 80 2520 1199', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO stores (id, organization_id, name, code, city, address, phone, is_active) VALUES ('store_02', 'org_01', 'SuperMart Mumbai Bandra Express', 'SM-MUM-02', 'Mumbai', '24 Hill Road, Bandra West', '+91 22 2640 5544', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO stores (id, organization_id, name, code, city, address, phone, is_active) VALUES ('store_03', 'org_02', 'Aurelia South Ext Boutique', 'AF-DEL-01', 'New Delhi', 'G-14 South Extension Part-I', '+91 11 4160 8811', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO stores (id, organization_id, name, code, city, address, phone, is_active) VALUES ('store_04', 'org_03', 'Nexus Tech Plaza Chennai', 'NX-CHN-01', 'Chennai', '55 2nd Avenue, Anna Nagar', '+91 44 2620 9900', true) ON CONFLICT (id) DO NOTHING;


-- 2.5 Users
INSERT INTO users (id, organization_id, store_id, email, full_name, role, phone, is_active) VALUES 
('user_super_admin', NULL, NULL, 'admin@retailpilot.ai', 'Super Administrator', 'SUPER_ADMIN', '+91 99000 00001', true),
('user_owner', 'org_01', NULL, 'owner@supermart.com', 'Rajesh Sharma (Executive Owner)', 'BUSINESS_OWNER', '+91 98450 12345', true),
('user_manager', 'org_01', 'store_01', 'manager@supermart.com', 'Priya Sundaram (Store Manager)', 'STORE_MANAGER', '+91 98450 67890', true),
('user_cashier', 'org_01', 'store_01', 'sales@supermart.com', 'Kavita Menon (Lead Cashier)', 'SALES_STAFF', '+91 98450 11223', true),
('user_inventory', 'org_01', 'store_01', 'inventory@supermart.com', 'Anil Verma (Inventory Supervisor)', 'INVENTORY_STAFF', '+91 98450 44556', true)
ON CONFLICT (email) DO NOTHING;

-- 2.6 Customers
INSERT INTO customers (id, organization_id, name, email, phone, loyalty_points, total_spend) VALUES
('cust_01', 'org_01', 'Aarav Patel', 'aarav.patel@gmail.com', '+91 98765 43210', 120, 3850.00),
('cust_02', 'org_01', 'Diya Sengupta', 'diya.s@outlook.com', '+91 98765 43211', 450, 12400.00),
('cust_03', 'org_01', 'Vikramaditya Rao', 'vikram.rao@techcorp.in', '+91 98765 43212', 80, 2100.00),
('cust_04', 'org_01', 'Meera Nambiar', 'meera.nambiar@gmail.com', '+91 98765 43213', 210, 6750.00),
('cust_org2_01', 'org_02', 'Radhika Singhania', 'radhika.singhania@luxury.in', '+91 98111 22334', 1500, 185000.00)
ON CONFLICT (id) DO NOTHING;

-- 2.7 Expense Categories
INSERT INTO expense_categories (id, organization_id, name) VALUES
('exp_cat_01', 'org_01', 'Retail Space Rent & Lease'),
('exp_cat_02', 'org_01', 'Staff Salaries & Wages'),
('exp_cat_03', 'org_01', 'Electricity & Utilities'),
('exp_cat_04', 'org_01', 'Software, IT & Cloud Subscriptions'),
('exp_cat_05', 'org_01', 'Packaging, Bags & Disposables'),
('exp_cat_org2_01', 'org_02', 'Boutique Space Lease'),
('exp_cat_org2_02', 'org_02', 'Artisan & Stylist Payroll'),
('exp_cat_org2_03', 'org_02', 'Illumination & Power Settlement')
ON CONFLICT (id) DO NOTHING;

-- 3. Suppliers
INSERT INTO suppliers (id, organization_id, name, contact_person, email, phone, address, credit_period_days, outstanding_balance) VALUES ('sup_01', 'org_01', 'Karnataka Agro Produce Cooperative', 'Venkatesh Murthy', 'supply@karnataka-agro.in', '+91 80 2333 4455', 'APMC Yard, Yeshwanthpur, Bengaluru, KA 560022', 30, 42500) ON CONFLICT (id) DO NOTHING;
INSERT INTO suppliers (id, organization_id, name, contact_person, email, phone, address, credit_period_days, outstanding_balance) VALUES ('sup_02', 'org_01', 'Amul Dairy Cooperative Federation', 'Bhavin Patel', 'distribution@amul.coop', '+91 26 9225 8500', 'Anand Dairy Road, Anand, Gujarat 388001', 15, 28600) ON CONFLICT (id) DO NOTHING;
INSERT INTO suppliers (id, organization_id, name, contact_person, email, phone, address, credit_period_days, outstanding_balance) VALUES ('sup_03', 'org_01', 'Himalayan Organic Estates & Roasters', 'Anand Negi', 'orders@himalayan-coffee.in', '+91 17 7280 1200', 'Estate 12, The Mall Road, Shimla, HP 171001', 45, 14200) ON CONFLICT (id) DO NOTHING;
INSERT INTO suppliers (id, organization_id, name, contact_person, email, phone, address, credit_period_days, outstanding_balance) VALUES ('sup_org2_01', 'org_02', 'Varanasi Master Weavers Cooperative', 'Pandit Ramcharan Shastri', 'craft@varanasi-weavers.in', '+91 54 2250 8899', 'Chowk Silk Market, Varanasi, UP 221001', 45, 85000) ON CONFLICT (id) DO NOTHING;
INSERT INTO suppliers (id, organization_id, name, contact_person, email, phone, address, credit_period_days, outstanding_balance) VALUES ('sup_org2_02', 'org_02', 'Jaipur Royal Zardozi Heritage Guild', 'Mahendra Singh Shekhawat', 'bespoke@jaipur-zardozi.in', '+91 14 1260 7744', 'Johari Bazaar, Pink City, Jaipur, RJ 302003', 30, 120000) ON CONFLICT (id) DO NOTHING;

-- 4. Categories
INSERT INTO categories (id, organization_id, name, description) VALUES ('cat_01', 'org_01', 'Fresh Produce & Farm Direct', 'Farm-fresh organic fruits, vegetables, and daily staples') ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, organization_id, name, description) VALUES ('cat_02', 'org_01', 'Dairy, Paneer & Cold Storage', 'Fresh milk, paneer, artisanal butter, and yogurts') ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, organization_id, name, description) VALUES ('cat_03', 'org_01', 'Bakery & Fresh Breads', 'Artisanal sourdough loaves, whole wheat pav, and buns') ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, organization_id, name, description) VALUES ('cat_04', 'org_01', 'Beverages, Tea & Artisanal Coffee', 'Specialty filter coffee roasts, Assam CTC tea, and tonics') ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, organization_id, name, description) VALUES ('cat_05', 'org_01', 'Staples, Grains & Pulses', 'Super Basmati rice, Sharbati wheat atta, and unpolished dals') ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, organization_id, name, description) VALUES ('cat_06', 'org_01', 'Eco-Friendly Home & Personal Care', 'Cold-pressed oils, eco cleaners, and natural detergents') ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, organization_id, name, description) VALUES ('cat_org2_01', 'org_02', 'Luxury Silk Sarees & Ethnic Couture', 'Pure Banarasi Katan silk, Chanderi weaves, and gold zari') ON CONFLICT (id) DO NOTHING;
INSERT INTO categories (id, organization_id, name, description) VALUES ('cat_org2_02', 'org_02', 'Bridal & Bespoke Menswear', 'Handcrafted velvet lehengas, raw silk bandhgalas, and sherwanis') ON CONFLICT (id) DO NOTHING;

-- 5. Products
INSERT INTO products (id, organization_id, category_id, name, sku, barcode, description, unit_cost, selling_price, reorder_point, is_active) VALUES ('prod_01', 'org_01', 'cat_01', 'Himachal Royal Delicious Apples (1 kg)', 'ORG-APL-01', '8901234000012', 'Crisp, hand-picked pesticide-free Kinnaur apples', 120, 180, 30, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO products (id, organization_id, category_id, name, sku, barcode, description, unit_cost, selling_price, reorder_point, is_active) VALUES ('prod_02', 'org_01', 'cat_01', 'Ratnagiri Alphonso Mango Pulp (850g Tin)', 'ORG-MNG-02', '8901234000029', '100% pure GI-tagged Ratnagiri Alphonso pulp, no added sugar', 240, 360, 15, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO products (id, organization_id, category_id, name, sku, barcode, description, unit_cost, selling_price, reorder_point, is_active) VALUES ('prod_03', 'org_01', 'cat_02', 'Amul Gold Pasteurised Whole Milk (1 Litre Pouch)', 'DRY-MLK-03', '8901234000036', 'Full cream milk with 6.0% fat, vitamin fortified', 54, 68, 50, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO products (id, organization_id, category_id, name, sku, barcode, description, unit_cost, selling_price, reorder_point, is_active) VALUES ('prod_04', 'org_01', 'cat_02', 'Fresh Malai Paneer Block (200g)', 'DRY-PNR-04', '8901234000043', 'Vacuum packed fresh cottage cheese, high protein', 95, 135, 25, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO products (id, organization_id, category_id, name, sku, barcode, description, unit_cost, selling_price, reorder_point, is_active) VALUES ('prod_05', 'org_01', 'cat_03', 'Artisan Sourdough Country Loaf (400g)', 'BAK-SRD-05', '8901234000050', 'Naturally fermented sourdough baked fresh daily with wild yeast', 90, 160, 15, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO products (id, organization_id, category_id, name, sku, barcode, description, unit_cost, selling_price, reorder_point, is_active) VALUES ('prod_06', 'org_01', 'cat_04', 'Madras Specialty Filter Coffee Roast (500g)', 'BEV-CBR-06', '8901234000067', '80:20 Arabica Plantation A and Chicory blend, aromatic roast', 260, 380, 10, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO products (id, organization_id, category_id, name, sku, barcode, description, unit_cost, selling_price, reorder_point, is_active) VALUES ('prod_07', 'org_01', 'cat_05', 'Daawat Super Basmati Rice (5 kg Bag)', 'STP-RCE-07', '8901234000074', 'Aged long-grain aromatic Royal Basmati rice', 380, 520, 20, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO products (id, organization_id, category_id, name, sku, barcode, description, unit_cost, selling_price, reorder_point, is_active) VALUES ('prod_08', 'org_01', 'cat_05', 'Aashirvaad Select Sharbati Atta (5 kg Bag)', 'STP-ATA-08', '8901234000081', '100% MP Sharbati wheat whole grain stone ground atta', 240, 325, 20, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO products (id, organization_id, category_id, name, sku, barcode, description, unit_cost, selling_price, reorder_point, is_active) VALUES ('prod_09', 'org_01', 'cat_04', 'Wagh Bakri Premium CTC Spiced Chai (1 kg Pack)', 'BEV-TEA-09', '8901234000098', 'Assam upper-garden strong CTC blend with cardamom and ginger', 360, 490, 15, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO products (id, organization_id, category_id, name, sku, barcode, description, unit_cost, selling_price, reorder_point, is_active) VALUES ('prod_10', 'org_01', 'cat_06', 'Cold Pressed Organic Virgin Coconut Oil (500 ml Glass Bottle)', 'ECO-OIL-10', '8901234000104', 'Wood-pressed pure edible coconut oil from Pollachi farms', 210, 310, 15, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO products (id, organization_id, category_id, name, sku, barcode, description, unit_cost, selling_price, reorder_point, is_active) VALUES ('prod_11', 'org_01', 'cat_04', 'Kashmiri Saffron & Truffle Infused Tonic (Case of 24)', 'BEV-TRF-11', '8901234000111', 'Gourmet sparkling botanical water infused with genuine Mongra saffron', 1850, 2800, 5, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO products (id, organization_id, category_id, name, sku, barcode, description, unit_cost, selling_price, reorder_point, is_active) VALUES ('prod_org2_01', 'org_02', 'cat_org2_01', 'Banarasi Pure Katan Silk Zari Saree (Crimson Red)', 'AUR-SAR-01', '8902001000014', 'Handwoven pure mulberry silk with antique gold electroplated zari motifs', 18500, 32000, 5, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO products (id, organization_id, category_id, name, sku, barcode, description, unit_cost, selling_price, reorder_point, is_active) VALUES ('prod_org2_02', 'org_02', 'cat_org2_02', 'Handcrafted Raw Silk Bandhgala Sherwani (Royal Navy)', 'AUR-SHR-02', '8902001000021', 'Hand-tailored raw silk with intricate dabka and zardozi threadwork', 24000, 45000, 3, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO products (id, organization_id, category_id, name, sku, barcode, description, unit_cost, selling_price, reorder_point, is_active) VALUES ('prod_org2_03', 'org_02', 'cat_org2_02', 'Embroidered Velvet Bridal Lehenga Set (Deep Emerald)', 'AUR-LHG-03', '8902001000038', 'Bespoke hand-embroidered velvet lehenga featuring semi-precious stone embellishments', 65000, 115000, 2, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO products (id, organization_id, category_id, name, sku, barcode, description, unit_cost, selling_price, reorder_point, is_active) VALUES ('prod_org2_04', 'org_02', 'cat_org2_01', 'Chanderi Handwoven Festive Kurta Ensemble (Ivory Gold)', 'AUR-KRT-04', '8902001000045', 'Lightweight handloom Chanderi silk kurta with pure cotton silk churidar', 6500, 12800, 8, true) ON CONFLICT (id) DO NOTHING;

-- 6. Inventory Ledger
INSERT INTO inventory_ledger (id, organization_id, store_id, product_id, movement_type, quantity_change, unit_cost, reference_id, reason, created_at) VALUES ('led_01', 'org_01', 'store_01', 'prod_01', 'OPENING_STOCK', 85, 120, '', 'Initial fiscal month store opening balance', '2026-08-01T08:00:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory_ledger (id, organization_id, store_id, product_id, movement_type, quantity_change, unit_cost, reference_id, reason, created_at) VALUES ('led_02', 'org_01', 'store_01', 'prod_02', 'OPENING_STOCK', 12, 240, '', 'Store opening balance count', '2026-08-01T08:00:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory_ledger (id, organization_id, store_id, product_id, movement_type, quantity_change, unit_cost, reference_id, reason, created_at) VALUES ('led_03', 'org_01', 'store_01', 'prod_03', 'OPENING_STOCK', 180, 54, '', 'Morning cold chain delivery intake', '2026-08-01T08:00:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory_ledger (id, organization_id, store_id, product_id, movement_type, quantity_change, unit_cost, reference_id, reason, created_at) VALUES ('led_04', 'org_01', 'store_01', 'prod_04', 'OPENING_STOCK', 110, 95, '', 'Dairy opening stock intake', '2026-08-01T08:00:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory_ledger (id, organization_id, store_id, product_id, movement_type, quantity_change, unit_cost, reference_id, reason, created_at) VALUES ('led_05', 'org_01', 'store_01', 'prod_05', 'OPENING_STOCK', 28, 90, '', 'Fresh bakery intake', '2026-08-01T08:00:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory_ledger (id, organization_id, store_id, product_id, movement_type, quantity_change, unit_cost, reference_id, reason, created_at) VALUES ('led_06', 'org_01', 'store_01', 'prod_06', 'OPENING_STOCK', 8, 260, '', 'Coffee bar inventory count', '2026-08-01T08:00:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory_ledger (id, organization_id, store_id, product_id, movement_type, quantity_change, unit_cost, reference_id, reason, created_at) VALUES ('led_07', 'org_01', 'store_01', 'prod_07', 'OPENING_STOCK', 65, 380, '', 'Grains bay intake', '2026-08-01T08:00:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory_ledger (id, organization_id, store_id, product_id, movement_type, quantity_change, unit_cost, reference_id, reason, created_at) VALUES ('led_08', 'org_01', 'store_01', 'prod_08', 'OPENING_STOCK', 55, 240, '', 'Staples pallet intake', '2026-08-01T08:00:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory_ledger (id, organization_id, store_id, product_id, movement_type, quantity_change, unit_cost, reference_id, reason, created_at) VALUES ('led_09', 'org_01', 'store_01', 'prod_09', 'OPENING_STOCK', 40, 360, '', 'Beverages intake', '2026-08-01T08:00:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory_ledger (id, organization_id, store_id, product_id, movement_type, quantity_change, unit_cost, reference_id, reason, created_at) VALUES ('led_10', 'org_01', 'store_01', 'prod_10', 'OPENING_STOCK', 35, 210, '', 'Personal care intake', '2026-08-01T08:00:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory_ledger (id, organization_id, store_id, product_id, movement_type, quantity_change, unit_cost, reference_id, reason, created_at) VALUES ('led_11', 'org_01', 'store_01', 'prod_11', 'OPENING_STOCK', 48, 1850, '', 'Specialty high-tier seasonal inventory intake (>75 days stagnant)', '2026-06-01T08:00:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory_ledger (id, organization_id, store_id, product_id, movement_type, quantity_change, unit_cost, reference_id, reason, created_at) VALUES ('led_org2_01', 'org_02', 'store_03', 'prod_org2_01', 'OPENING_STOCK', 25, 18500, '', 'Luxury boutique opening stock intake', '2026-08-01T08:00:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory_ledger (id, organization_id, store_id, product_id, movement_type, quantity_change, unit_cost, reference_id, reason, created_at) VALUES ('led_org2_02', 'org_02', 'store_03', 'prod_org2_02', 'OPENING_STOCK', 15, 24000, '', 'Bespoke menswear intake', '2026-08-01T08:00:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory_ledger (id, organization_id, store_id, product_id, movement_type, quantity_change, unit_cost, reference_id, reason, created_at) VALUES ('led_org2_03', 'org_02', 'store_03', 'prod_org2_03', 'OPENING_STOCK', 8, 65000, '', 'Bridal couture collection intake', '2026-08-01T08:00:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory_ledger (id, organization_id, store_id, product_id, movement_type, quantity_change, unit_cost, reference_id, reason, created_at) VALUES ('led_org2_04', 'org_02', 'store_03', 'prod_org2_04', 'OPENING_STOCK', 40, 6500, '', 'Festive ready-to-wear intake', '2026-08-01T08:00:00Z') ON CONFLICT (id) DO NOTHING;

-- 7. Sales Orders, Items, Payments
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1001', 'org_01', 'store_01', 'INV-202608-1001', 1927, 231.24, 115.62, 115.62, 2158.24, 1386, 'COMPLETED', '2026-08-20T10:15:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1001_item_1', 'ord_1001', 'prod_01', 3, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1001_item_2', 'ord_1001', 'prod_03', 4, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1001_item_3', 'ord_1001', 'prod_04', 2, 95, 135) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1001_item_4', 'ord_1001', 'prod_07', 1, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1001_item_5', 'ord_1001', 'prod_08', 1, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1001', 'ord_1001', 'UPI', 2158.24, '2026-08-20T10:15:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1002', 'org_01', 'store_01', 'INV-202608-1002', 2290, 256.8, 128.4, 128.4, 2396.8, 1540, 'COMPLETED', '2026-08-20T11:45:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1002_item_1', 'ord_1002', 'prod_06', 2, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1002_item_2', 'ord_1002', 'prod_05', 2, 90, 160) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1002_item_3', 'ord_1002', 'prod_02', 2, 240, 360) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1002_item_4', 'ord_1002', 'prod_09', 1, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1002', 'ord_1002', 'CREDIT_CARD', 2396.8, '2026-08-20T11:45:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1003', 'org_01', 'store_01', 'INV-202608-1003', 3548, 413.76, 206.88, 206.88, 3861.76, 2574, 'COMPLETED', '2026-08-21T14:20:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1003_item_1', 'ord_1003', 'prod_07', 3, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1003_item_2', 'ord_1003', 'prod_08', 2, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1003_item_3', 'ord_1003', 'prod_10', 3, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1003_item_4', 'ord_1003', 'prod_03', 6, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1003', 'ord_1003', 'SPLIT', 3861.76, '2026-08-21T14:20:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1004', 'org_01', 'store_01', 'INV-202608-1004', 1625, 195, 97.5, 97.5, 1820, 1125, 'COMPLETED', '2026-08-22T09:10:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1004_item_1', 'ord_1004', 'prod_01', 4, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1004_item_2', 'ord_1004', 'prod_04', 3, 95, 135) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1004_item_3', 'ord_1004', 'prod_03', 5, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1004_item_4', 'ord_1004', 'prod_05', 1, 90, 160) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1004', 'ord_1004', 'CASH', 1820, '2026-08-22T09:10:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1005', 'org_01', 'store_01', 'INV-202608-1005', 5730, 657.6, 328.8, 328.8, 6137.6, 4020, 'COMPLETED', '2026-08-23T18:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1005_item_1', 'ord_1005', 'prod_06', 4, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1005_item_2', 'ord_1005', 'prod_09', 3, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1005_item_3', 'ord_1005', 'prod_02', 3, 240, 360) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1005_item_4', 'ord_1005', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1005_item_5', 'ord_1005', 'prod_07', 2, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1005', 'ord_1005', 'CREDIT_CARD', 6137.6, '2026-08-23T18:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1006', 'org_01', 'store_01', 'INV-202608-1006', 70020, 8402.4, 4201.2, 4201.2, 78422.4, 50480, 'COMPLETED', '2026-08-01T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1006_item_1', 'ord_1006', 'prod_07', 64, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1006_item_2', 'ord_1006', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1006_item_3', 'ord_1006', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1006_item_4', 'ord_1006', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1006_item_5', 'ord_1006', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1006_item_6', 'ord_1006', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1006_item_7', 'ord_1006', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1006_item_8', 'ord_1006', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1006', 'ord_1006', 'UPI', 78422.4, '2026-08-01T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1007', 'org_01', 'store_01', 'INV-202608-1007', 70050, 8406, 4203, 4203, 78456, 50500, 'COMPLETED', '2026-08-02T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1007_item_1', 'ord_1007', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1007_item_2', 'ord_1007', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1007_item_3', 'ord_1007', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1007_item_4', 'ord_1007', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1007_item_5', 'ord_1007', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1007_item_6', 'ord_1007', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1007_item_7', 'ord_1007', 'prod_09', 1, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1007_item_8', 'ord_1007', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1007', 'ord_1007', 'CREDIT_CARD', 78456, '2026-08-02T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1008', 'org_01', 'store_01', 'INV-202608-1008', 70050, 8406, 4203, 4203, 78456, 50500, 'COMPLETED', '2026-08-03T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1008_item_1', 'ord_1008', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1008_item_2', 'ord_1008', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1008_item_3', 'ord_1008', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1008_item_4', 'ord_1008', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1008_item_5', 'ord_1008', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1008_item_6', 'ord_1008', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1008_item_7', 'ord_1008', 'prod_09', 1, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1008_item_8', 'ord_1008', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1008', 'ord_1008', 'CASH', 78456, '2026-08-03T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1009', 'org_01', 'store_01', 'INV-202608-1009', 70540, 8464.8, 4232.4, 4232.4, 79004.8, 50860, 'COMPLETED', '2026-08-04T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1009_item_1', 'ord_1009', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1009_item_2', 'ord_1009', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1009_item_3', 'ord_1009', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1009_item_4', 'ord_1009', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1009_item_5', 'ord_1009', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1009_item_6', 'ord_1009', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1009_item_7', 'ord_1009', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1009_item_8', 'ord_1009', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1009', 'ord_1009', 'DEBIT_CARD', 79004.8, '2026-08-04T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1010', 'org_01', 'store_01', 'INV-202608-1010', 70540, 8464.8, 4232.4, 4232.4, 79004.8, 50860, 'COMPLETED', '2026-08-05T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1010_item_1', 'ord_1010', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1010_item_2', 'ord_1010', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1010_item_3', 'ord_1010', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1010_item_4', 'ord_1010', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1010_item_5', 'ord_1010', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1010_item_6', 'ord_1010', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1010_item_7', 'ord_1010', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1010_item_8', 'ord_1010', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1010', 'ord_1010', 'UPI', 79004.8, '2026-08-05T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1011', 'org_01', 'store_01', 'INV-202608-1011', 70540, 8464.8, 4232.4, 4232.4, 79004.8, 50860, 'COMPLETED', '2026-08-06T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1011_item_1', 'ord_1011', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1011_item_2', 'ord_1011', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1011_item_3', 'ord_1011', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1011_item_4', 'ord_1011', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1011_item_5', 'ord_1011', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1011_item_6', 'ord_1011', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1011_item_7', 'ord_1011', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1011_item_8', 'ord_1011', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1011', 'ord_1011', 'CREDIT_CARD', 79004.8, '2026-08-06T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1012', 'org_01', 'store_01', 'INV-202608-1012', 70540, 8464.8, 4232.4, 4232.4, 79004.8, 50860, 'COMPLETED', '2026-08-07T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1012_item_1', 'ord_1012', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1012_item_2', 'ord_1012', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1012_item_3', 'ord_1012', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1012_item_4', 'ord_1012', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1012_item_5', 'ord_1012', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1012_item_6', 'ord_1012', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1012_item_7', 'ord_1012', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1012_item_8', 'ord_1012', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1012', 'ord_1012', 'CASH', 79004.8, '2026-08-07T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1013', 'org_01', 'store_01', 'INV-202608-1013', 70540, 8464.8, 4232.4, 4232.4, 79004.8, 50860, 'COMPLETED', '2026-08-08T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1013_item_1', 'ord_1013', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1013_item_2', 'ord_1013', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1013_item_3', 'ord_1013', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1013_item_4', 'ord_1013', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1013_item_5', 'ord_1013', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1013_item_6', 'ord_1013', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1013_item_7', 'ord_1013', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1013_item_8', 'ord_1013', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1013', 'ord_1013', 'DEBIT_CARD', 79004.8, '2026-08-08T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1014', 'org_01', 'store_01', 'INV-202608-1014', 70540, 8464.8, 4232.4, 4232.4, 79004.8, 50860, 'COMPLETED', '2026-08-09T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1014_item_1', 'ord_1014', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1014_item_2', 'ord_1014', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1014_item_3', 'ord_1014', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1014_item_4', 'ord_1014', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1014_item_5', 'ord_1014', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1014_item_6', 'ord_1014', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1014_item_7', 'ord_1014', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1014_item_8', 'ord_1014', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1014', 'ord_1014', 'UPI', 79004.8, '2026-08-09T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1015', 'org_01', 'store_01', 'INV-202608-1015', 70540, 8464.8, 4232.4, 4232.4, 79004.8, 50860, 'COMPLETED', '2026-08-10T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1015_item_1', 'ord_1015', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1015_item_2', 'ord_1015', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1015_item_3', 'ord_1015', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1015_item_4', 'ord_1015', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1015_item_5', 'ord_1015', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1015_item_6', 'ord_1015', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1015_item_7', 'ord_1015', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1015_item_8', 'ord_1015', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1015', 'ord_1015', 'CREDIT_CARD', 79004.8, '2026-08-10T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1016', 'org_01', 'store_01', 'INV-202608-1016', 70540, 8464.8, 4232.4, 4232.4, 79004.8, 50860, 'COMPLETED', '2026-08-11T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1016_item_1', 'ord_1016', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1016_item_2', 'ord_1016', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1016_item_3', 'ord_1016', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1016_item_4', 'ord_1016', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1016_item_5', 'ord_1016', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1016_item_6', 'ord_1016', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1016_item_7', 'ord_1016', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1016_item_8', 'ord_1016', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1016', 'ord_1016', 'CASH', 79004.8, '2026-08-11T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1017', 'org_01', 'store_01', 'INV-202608-1017', 70540, 8464.8, 4232.4, 4232.4, 79004.8, 50860, 'COMPLETED', '2026-08-12T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1017_item_1', 'ord_1017', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1017_item_2', 'ord_1017', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1017_item_3', 'ord_1017', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1017_item_4', 'ord_1017', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1017_item_5', 'ord_1017', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1017_item_6', 'ord_1017', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1017_item_7', 'ord_1017', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1017_item_8', 'ord_1017', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1017', 'ord_1017', 'DEBIT_CARD', 79004.8, '2026-08-12T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1018', 'org_01', 'store_01', 'INV-202608-1018', 70540, 8464.8, 4232.4, 4232.4, 79004.8, 50860, 'COMPLETED', '2026-08-13T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1018_item_1', 'ord_1018', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1018_item_2', 'ord_1018', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1018_item_3', 'ord_1018', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1018_item_4', 'ord_1018', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1018_item_5', 'ord_1018', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1018_item_6', 'ord_1018', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1018_item_7', 'ord_1018', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1018_item_8', 'ord_1018', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1018', 'ord_1018', 'UPI', 79004.8, '2026-08-13T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1019', 'org_01', 'store_01', 'INV-202608-1019', 70540, 8464.8, 4232.4, 4232.4, 79004.8, 50860, 'COMPLETED', '2026-08-14T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1019_item_1', 'ord_1019', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1019_item_2', 'ord_1019', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1019_item_3', 'ord_1019', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1019_item_4', 'ord_1019', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1019_item_5', 'ord_1019', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1019_item_6', 'ord_1019', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1019_item_7', 'ord_1019', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1019_item_8', 'ord_1019', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1019', 'ord_1019', 'CREDIT_CARD', 79004.8, '2026-08-14T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1020', 'org_01', 'store_01', 'INV-202608-1020', 70540, 8464.8, 4232.4, 4232.4, 79004.8, 50860, 'COMPLETED', '2026-08-15T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1020_item_1', 'ord_1020', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1020_item_2', 'ord_1020', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1020_item_3', 'ord_1020', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1020_item_4', 'ord_1020', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1020_item_5', 'ord_1020', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1020_item_6', 'ord_1020', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1020_item_7', 'ord_1020', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1020_item_8', 'ord_1020', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1020', 'ord_1020', 'CASH', 79004.8, '2026-08-15T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1021', 'org_01', 'store_01', 'INV-202608-1021', 70540, 8464.8, 4232.4, 4232.4, 79004.8, 50860, 'COMPLETED', '2026-08-16T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1021_item_1', 'ord_1021', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1021_item_2', 'ord_1021', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1021_item_3', 'ord_1021', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1021_item_4', 'ord_1021', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1021_item_5', 'ord_1021', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1021_item_6', 'ord_1021', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1021_item_7', 'ord_1021', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1021_item_8', 'ord_1021', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1021', 'ord_1021', 'DEBIT_CARD', 79004.8, '2026-08-16T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1022', 'org_01', 'store_01', 'INV-202608-1022', 70540, 8464.8, 4232.4, 4232.4, 79004.8, 50860, 'COMPLETED', '2026-08-17T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1022_item_1', 'ord_1022', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1022_item_2', 'ord_1022', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1022_item_3', 'ord_1022', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1022_item_4', 'ord_1022', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1022_item_5', 'ord_1022', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1022_item_6', 'ord_1022', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1022_item_7', 'ord_1022', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1022_item_8', 'ord_1022', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1022', 'ord_1022', 'UPI', 79004.8, '2026-08-17T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1023', 'org_01', 'store_01', 'INV-202608-1023', 70540, 8464.8, 4232.4, 4232.4, 79004.8, 50860, 'COMPLETED', '2026-08-18T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1023_item_1', 'ord_1023', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1023_item_2', 'ord_1023', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1023_item_3', 'ord_1023', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1023_item_4', 'ord_1023', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1023_item_5', 'ord_1023', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1023_item_6', 'ord_1023', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1023_item_7', 'ord_1023', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1023_item_8', 'ord_1023', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1023', 'ord_1023', 'CREDIT_CARD', 79004.8, '2026-08-18T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_1024', 'org_01', 'store_01', 'INV-202608-1024', 70540, 8464.8, 4232.4, 4232.4, 79004.8, 50860, 'COMPLETED', '2026-08-19T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1024_item_1', 'ord_1024', 'prod_07', 65, 380, 520) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1024_item_2', 'ord_1024', 'prod_08', 40, 240, 325) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1024_item_3', 'ord_1024', 'prod_11', 4, 1850, 2800) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1024_item_4', 'ord_1024', 'prod_03', 80, 54, 68) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1024_item_5', 'ord_1024', 'prod_01', 20, 120, 180) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1024_item_6', 'ord_1024', 'prod_06', 5, 260, 380) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1024_item_7', 'ord_1024', 'prod_09', 2, 360, 490) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_1024_item_8', 'ord_1024', 'prod_10', 2, 210, 310) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_ord_1024', 'ord_1024', 'CASH', 79004.8, '2026-08-19T14:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_org2_101', 'org_02', 'store_03', 'INV-AUR-202608-01', 160000, 28800, 14400, 14400, 188800, 89000, 'COMPLETED', '2026-08-10T16:00:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_org2_101_item_1', 'ord_org2_101', 'prod_org2_03', 1, 65000, 115000) ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_org2_101_item_2', 'ord_org2_101', 'prod_org2_02', 1, 24000, 45000) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_org2_101', 'ord_org2_101', 'CREDIT_CARD', 188800, '2026-08-10T16:00:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_org2_102', 'org_02', 'store_03', 'INV-AUR-202608-02', 64000, 11520, 5760, 5760, 75520, 37000, 'COMPLETED', '2026-08-14T18:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_org2_102_item_1', 'ord_org2_102', 'prod_org2_01', 2, 18500, 32000) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_org2_102', 'ord_org2_102', 'UPI', 75520, '2026-08-14T18:30:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('ord_org2_103', 'org_02', 'store_03', 'INV-AUR-202608-03', 25600, 4608, 2304, 2304, 30208, 13000, 'COMPLETED', '2026-08-18T12:15:00Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price) VALUES ('ord_org2_103_item_1', 'ord_org2_103', 'prod_org2_04', 2, 6500, 12800) ON CONFLICT (id) DO NOTHING;
INSERT INTO payments (id, sales_order_id, payment_method, amount, created_at) VALUES ('pay_org2_103', 'ord_org2_103', 'DEBIT_CARD', 30208, '2026-08-18T12:15:00Z') ON CONFLICT (id) DO NOTHING;

-- 8. Expenses
INSERT INTO expenses (id, organization_id, store_id, category_id, title, amount, expense_date, notes) VALUES ('exp_01', 'org_01', 'store_01', 'exp_cat_01', 'Indiranagar Prime Retail Space Monthly Lease', 75000, '2026-08-01', 'Paid via RTGS to landlord for August 2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO expenses (id, organization_id, store_id, category_id, title, amount, expense_date, notes) VALUES ('exp_02', 'org_01', 'store_01', 'exp_cat_02', 'Store Floor Staff & Cashier Monthly Payroll', 42000, '2026-08-05', 'Direct salary disbursements for 4 staff members') ON CONFLICT (id) DO NOTHING;
INSERT INTO expenses (id, organization_id, store_id, category_id, title, amount, expense_date, notes) VALUES ('exp_03', 'org_01', 'store_01', 'exp_cat_03', 'BESCOM Commercial Power & Walk-in Chiller Electricity', 16500, '2026-08-10', 'Commercial meter power tariff settlement') ON CONFLICT (id) DO NOTHING;
INSERT INTO expenses (id, organization_id, store_id, category_id, title, amount, expense_date, notes) VALUES ('exp_04', 'org_01', 'store_01', 'exp_cat_04', 'RetailPilot AI Cloud SaaS & POS Hardware Terminal Subscriptions', 4500, '2026-08-12', 'Multi-store cloud sync and backup') ON CONFLICT (id) DO NOTHING;
INSERT INTO expenses (id, organization_id, store_id, category_id, title, amount, expense_date, notes) VALUES ('exp_05', 'org_01', 'store_01', 'exp_cat_05', 'Bio-Degradable Bags, Thermal Paper Rolls & Sanitization', 7000, '2026-08-15', 'Monthly consumable supplies replenishment') ON CONFLICT (id) DO NOTHING;
INSERT INTO expenses (id, organization_id, store_id, category_id, title, amount, expense_date, notes) VALUES ('exp_org2_01', 'org_02', 'store_03', 'exp_cat_org2_01', 'DLF Emporio Luxury Showroom Monthly Lease', 180000, '2026-08-01', 'August 2026 prime retail space lease') ON CONFLICT (id) DO NOTHING;
INSERT INTO expenses (id, organization_id, store_id, category_id, title, amount, expense_date, notes) VALUES ('exp_org2_02', 'org_02', 'store_03', 'exp_cat_org2_02', 'Couture Master Artisans & Stylists Monthly Payroll', 95000, '2026-08-05', 'Specialist bespoke tailoring team salaries') ON CONFLICT (id) DO NOTHING;
INSERT INTO expenses (id, organization_id, store_id, category_id, title, amount, expense_date, notes) VALUES ('exp_org2_03', 'org_02', 'store_03', 'exp_cat_org2_03', 'Chandelier Illumination & Climate Control Power Settlement', 22000, '2026-08-10', 'High-amperage boutique aesthetic lighting') ON CONFLICT (id) DO NOTHING;

