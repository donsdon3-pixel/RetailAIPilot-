import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import {
  INITIAL_ORGANIZATIONS,
  INITIAL_STORES,
  INITIAL_SUPPLIERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_LEDGER_ENTRIES,
  INITIAL_SALES_ORDERS,
  INITIAL_EXPENSES,
  INITIAL_PURCHASE_ORDERS,
} from '../src/lib/seed-data';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.trim().match(/^([^=]+)=(.*)$/);
    if (match && !match[1].startsWith('#')) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["'](.*)["']$/, '$1');
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function seedFullDatabase() {
  console.log('Seeding full dataset into live Supabase database...');

  // 1. Organizations
  const { error: orgErr } = await adminClient.from('organizations').upsert(
    INITIAL_ORGANIZATIONS.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      subscription_tier: o.subscription_tier,
      subscription_status: o.subscription_status,
      currency: o.currency,
      tax_rate: o.tax_rate,
      gstin: o.gstin,
    }))
  );
  if (orgErr) console.error('Org Error:', orgErr);
  else console.log('✓ Organizations seeded:', INITIAL_ORGANIZATIONS.length);

  // 2. Stores
  const { error: storeErr } = await adminClient.from('stores').upsert(
    INITIAL_STORES.map((s) => ({
      id: s.id,
      organization_id: s.organization_id,
      name: s.name,
      code: s.code,
      city: s.city,
      address: s.address,
      phone: s.phone,
      is_active: s.is_active,
    }))
  );
  if (storeErr) console.error('Store Error:', storeErr);
  else console.log('✓ Stores seeded:', INITIAL_STORES.length);

  // 3. Suppliers
  const { error: supErr } = await adminClient.from('suppliers').upsert(
    INITIAL_SUPPLIERS.map((s) => ({
      id: s.id,
      organization_id: s.organization_id,
      name: s.name,
      contact_person: s.contact_person,
      email: s.email,
      phone: s.phone,
      address: s.address,
      credit_period_days: s.credit_period_days,
      outstanding_balance: s.outstanding_balance,
    }))
  );
  if (supErr) console.error('Supplier Error:', supErr);
  else console.log('✓ Suppliers seeded:', INITIAL_SUPPLIERS.length);

  // 4. Categories
  const { error: catErr } = await adminClient.from('categories').upsert(
    INITIAL_CATEGORIES.map((c) => ({
      id: c.id,
      organization_id: c.organization_id,
      name: c.name,
      description: c.description,
    }))
  );
  if (catErr) console.error('Category Error:', catErr);
  else console.log('✓ Categories seeded:', INITIAL_CATEGORIES.length);

  // 5. Products
  const { error: prodErr } = await adminClient.from('products').upsert(
    INITIAL_PRODUCTS.map((p) => ({
      id: p.id,
      organization_id: p.organization_id,
      category_id: p.category_id,
      supplier_id: p.supplier_id,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      description: p.description,
      unit_cost: p.unit_cost,
      selling_price: p.selling_price,
      reorder_point: p.reorder_point,
      reorder_quantity: p.reorder_quantity,
      is_active: p.is_active,
    }))
  );
  if (prodErr) console.error('Product Error:', prodErr);
  else console.log('✓ Products seeded:', INITIAL_PRODUCTS.length);

  // 6. Expenses
  const { error: expErr } = await adminClient.from('expenses').upsert(
    INITIAL_EXPENSES.map((e) => ({
      id: e.id,
      organization_id: e.organization_id,
      store_id: e.store_id,
      title: e.title,
      amount: e.amount,
      expense_date: e.expense_date,
      notes: e.notes,
    }))
  );
  if (expErr) console.error('Expense Error:', expErr);
  else console.log('✓ Expenses seeded:', INITIAL_EXPENSES.length);

  // 7. Customers
  const { error: custErr } = await adminClient.from('customers').upsert([
    {
      id: 'cust_01',
      organization_id: 'org_01',
      name: 'Ananya Iyer',
      email: 'ananya.iyer@gmail.com',
      phone: '+91 98801 99223',
      loyalty_points: 240,
      total_spend: 2450.0,
    },
    {
      id: 'cust_02',
      organization_id: 'org_01',
      name: 'Rohan Gupta',
      email: 'rohan.gupta@outlook.com',
      phone: '+91 98450 88776',
      loyalty_points: 120,
      total_spend: 1200.0,
    },
    {
      id: 'cust_03',
      organization_id: 'org_02',
      name: 'Meera Kapoor',
      email: 'meera.kapoor@gmail.com',
      phone: '+91 99100 44332',
      loyalty_points: 500,
      total_spend: 15400.0,
    },
  ]);
  if (custErr) console.error('Customer Error:', custErr);
  else console.log('✓ Customers seeded');

  // 8. Purchase Orders
  const { error: poErr } = await adminClient.from('purchase_orders').upsert(
    INITIAL_PURCHASE_ORDERS.map((po) => ({
      id: po.id,
      organization_id: po.organization_id,
      store_id: po.store_id,
      supplier_id: po.supplier_id,
      po_number: po.po_number,
      status: po.status,
      total_amount: po.total_amount,
      payment_status: po.payment_status,
      payment_due_date: po.payment_due_date,
      notes: po.notes,
    }))
  );
  if (poErr) console.error('PO Error:', poErr);
  else console.log('✓ Purchase Orders seeded:', INITIAL_PURCHASE_ORDERS.length);

  // 9. Sales Orders
  const { error: salesErr } = await adminClient.from('sales_orders').upsert(
    INITIAL_SALES_ORDERS.map((s) => ({
      id: s.id,
      organization_id: s.organization_id,
      store_id: s.store_id,
      customer_id: s.customer_id,
      invoice_number: s.invoice_number,
      subtotal: s.subtotal,
      taxable_amount: s.taxable_amount,
      tax_amount: s.tax_amount,
      cgst_amount: s.cgst_amount,
      sgst_amount: s.sgst_amount,
      discount_amount: s.discount_amount,
      total_amount: s.total_amount,
      cogs_amount: s.cogs_amount,
      status: s.status,
    }))
  );
  if (salesErr) console.error('Sales Order Error:', salesErr);
  else console.log('✓ Sales Orders seeded:', INITIAL_SALES_ORDERS.length);

  // 10. Inventory Ledger Entries
  const { error: ledErr } = await adminClient.from('inventory_ledger').upsert(
    INITIAL_LEDGER_ENTRIES.map((l) => ({
      id: l.id,
      organization_id: l.organization_id,
      store_id: l.store_id,
      product_id: l.product_id,
      movement_type: l.movement_type,
      quantity_change: l.quantity_change,
      unit_cost: l.unit_cost,
      reference_id: l.reference_id,
      linked_movement_id: l.linked_movement_id,
      return_order_id: l.return_order_id,
      reason: l.reason,
    }))
  );
  if (ledErr) console.error('Ledger Error:', ledErr);
  else console.log('✓ Inventory Ledger seeded:', INITIAL_LEDGER_ENTRIES.length);

  // 11. Auth Users
  const DEMO_USERS = [
    { email: 'owner@supermart.com', role: 'BUSINESS_OWNER', organization_id: 'org_01', name: 'Rajesh Sharma' },
    { email: 'manager@supermart.com', role: 'STORE_MANAGER', organization_id: 'org_01', name: 'Priya Sundaram', store_id: 'store_01' },
    { email: 'sales@supermart.com', role: 'SALES_STAFF', organization_id: 'org_01', name: 'Karthik Rao', store_id: 'store_01' },
    { email: 'inventory@supermart.com', role: 'INVENTORY_STAFF', organization_id: 'org_01', name: 'Anil Kumar', store_id: 'store_01' },
    { email: 'admin@retailpilot.ai', role: 'SUPER_ADMIN', organization_id: 'org_01', name: 'Global System Admin' },
    { email: 'owner@aurelia.com', role: 'BUSINESS_OWNER', organization_id: 'org_02', name: 'Aanya Singhania', store_id: 'store_03' },
  ];

  console.log('\n--- Seeding Supabase Auth Users ---');
  for (const u of DEMO_USERS) {
    const { data: createdUser, error: uErr } = await adminClient.auth.admin.createUser({
      email: u.email,
      password: 'DemoPass123!',
      email_confirm: true,
      user_metadata: { full_name: u.name },
      app_metadata: {
        role: u.role,
        organization_id: u.organization_id,
        store_id: (u as any).store_id || null,
      },
    });

    if (uErr && uErr.message?.includes('already been registered')) {
      // Update app_metadata and password
      const { data: users } = await adminClient.auth.admin.listUsers();
      const existing = users?.users?.find((x) => x.email === u.email);
      if (existing) {
        await adminClient.auth.admin.updateUserById(existing.id, {
          password: 'DemoPass123!',
          app_metadata: {
            role: u.role,
            organization_id: u.organization_id,
            store_id: (u as any).store_id || null,
          },
          user_metadata: { full_name: u.name },
        });
        console.log(`✓ Updated existing auth user: ${u.email} (${u.role})`);
      }
    } else if (uErr) {
      console.error(`Auth user create error for ${u.email}:`, uErr.message);
    } else {
      console.log(`✓ Created auth user: ${u.email} (${u.role})`);
    }

    // Sync to public.users table
    await adminClient.from('users').upsert({
      id: `usr_${u.email.split('@')[0]}`,
      organization_id: u.organization_id,
      store_id: (u as any).store_id || null,
      email: u.email,
      full_name: u.name,
      role: u.role,
      is_active: true,
    });
  }

  console.log('\n--- Full Database Seed Completed Successfully ---');
}

seedFullDatabase();
