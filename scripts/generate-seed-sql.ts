import * as fs from 'fs';
import {
  INITIAL_ORGANIZATIONS,
  INITIAL_STORES,
  INITIAL_SUPPLIERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_LEDGER_ENTRIES,
  INITIAL_SALES_ORDERS,
  INITIAL_EXPENSES,
} from '../src/lib/seed-data';

let sql = '-- ======================================================================================\n';
sql += '-- RetailPilot AI - Comprehensive SQL Seed File (supabase/seed.sql)\n';
sql += '-- ======================================================================================\n\n';

// Organizations
sql += '-- 1. Organizations\n';
for (const o of INITIAL_ORGANIZATIONS) {
  sql += `INSERT INTO organizations (id, name, slug, subscription_tier, subscription_status, currency, tax_rate, gstin) VALUES ('${o.id}', '${o.name}', '${o.slug}', '${o.subscription_tier}', '${o.subscription_status}', '${o.currency}', ${o.tax_rate}, '${o.gstin}') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name;\n`;
}
sql += '\n';

// Stores
sql += '-- 2. Stores\n';
for (const s of INITIAL_STORES) {
  sql += `INSERT INTO stores (id, organization_id, name, code, city, address, phone, is_active) VALUES ('${s.id}', '${s.organization_id}', '${s.name}', '${s.code}', '${s.city}', '${s.address}', '${s.phone}', ${s.is_active}) ON CONFLICT (id) DO NOTHING;\n`;
}
sql += '\n';

// Suppliers
sql += '-- 3. Suppliers\n';
for (const sup of INITIAL_SUPPLIERS) {
  sql += `INSERT INTO suppliers (id, organization_id, name, contact_person, email, phone, address, credit_period_days, outstanding_balance) VALUES ('${sup.id}', '${sup.organization_id}', '${sup.name.replace(/'/g, "''")}', '${sup.contact_person}', '${sup.email}', '${sup.phone}', '${sup.address}', ${sup.credit_period_days}, ${sup.outstanding_balance}) ON CONFLICT (id) DO NOTHING;\n`;
}
sql += '\n';

// Categories
sql += '-- 4. Categories\n';
for (const c of INITIAL_CATEGORIES) {
  sql += `INSERT INTO categories (id, organization_id, name, description) VALUES ('${c.id}', '${c.organization_id}', '${c.name.replace(/'/g, "''")}', '${c.description}') ON CONFLICT (id) DO NOTHING;\n`;
}
sql += '\n';

// Products
sql += '-- 5. Products\n';
for (const p of INITIAL_PRODUCTS) {
  sql += `INSERT INTO products (id, organization_id, category_id, name, sku, barcode, description, unit_cost, selling_price, reorder_point, is_active) VALUES ('${p.id}', '${p.organization_id}', '${p.category_id}', '${p.name.replace(/'/g, "''")}', '${p.sku}', '${p.barcode}', '${p.description}', ${p.unit_cost}, ${p.selling_price}, ${p.reorder_point}, ${p.is_active}) ON CONFLICT (id) DO NOTHING;\n`;
}
sql += '\n';

// Inventory Ledger
sql += '-- 6. Inventory Ledger\n';
for (const l of INITIAL_LEDGER_ENTRIES) {
  sql += `INSERT INTO inventory_ledger (id, organization_id, store_id, product_id, movement_type, quantity_change, unit_cost, reference_id, reason, created_at) VALUES ('${l.id}', '${l.organization_id}', '${l.store_id}', '${l.product_id}', '${l.movement_type}', ${l.quantity_change}, ${l.unit_cost}, '${l.reference_id || ''}', '${(l.reason || '').replace(/'/g, "''")}', '${l.created_at}') ON CONFLICT (id) DO NOTHING;\n`;
}
sql += '\n';

// Sales Orders & Items & Payments
sql += '-- 7. Sales Orders, Items, Payments\n';
for (const so of INITIAL_SALES_ORDERS) {
  sql += `INSERT INTO sales_orders (id, organization_id, store_id, invoice_number, subtotal, tax_amount, cgst_amount, sgst_amount, total_amount, cogs_amount, status, created_at) VALUES ('${so.id}', '${so.organization_id}', '${so.store_id}', '${so.invoice_number}', ${so.subtotal}, ${so.tax_amount}, ${so.cgst_amount || 0}, ${so.sgst_amount || 0}, ${so.total_amount}, ${so.cogs_amount}, '${so.status}', '${so.created_at}') ON CONFLICT (id) DO NOTHING;\n`;
  for (const item of so.items) {
    sql += `INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_cost, unit_price, subtotal, cogs_amount) VALUES ('${item.id}', '${so.id}', '${item.product_id}', ${item.quantity}, ${item.unit_cost}, ${item.unit_price}, ${item.subtotal}, ${item.cogs}) ON CONFLICT (id) DO NOTHING;\n`;
  }
  for (const pay of so.payments) {
    sql += `INSERT INTO payments (id, sales_order_id, payment_method, amount, status, created_at) VALUES ('${pay.id}', '${so.id}', '${pay.payment_method}', ${pay.amount}, 'PAID', '${pay.created_at}') ON CONFLICT (id) DO NOTHING;\n`;
  }
}
sql += '\n';

// Expenses
sql += '-- 8. Expenses\n';
for (const e of INITIAL_EXPENSES) {
  sql += `INSERT INTO expenses (id, organization_id, store_id, category_id, title, amount, expense_date, notes) VALUES ('${e.id}', '${e.organization_id}', '${e.store_id}', '${e.category_id}', '${(e.title || '').replace(/'/g, "''")}', ${e.amount}, '${e.expense_date}', '${e.notes || ''}') ON CONFLICT (id) DO NOTHING;\n`;
}
sql += '\n';

fs.writeFileSync('./supabase/seed.sql', sql, 'utf8');
console.log('Successfully generated supabase/seed.sql with complete capstone dataset!');
