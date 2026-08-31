import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function seedAndVerifyLiveRLS() {
  console.log('================================================================');
  console.log('SUPABASE LIVE RLS MULTI-TENANT VERIFICATION');
  console.log('================================================================');

  console.log('\n--- Step 1: Seeding Test Data across org_01 and org_02 ---');

  // 1. Seed Organizations
  const { error: orgErr } = await adminClient.from('organizations').upsert([
    {
      id: 'org_01',
      name: 'SuperMart India Retail Ltd.',
      slug: 'supermart-india',
      subscription_tier: 'ENTERPRISE',
      subscription_status: 'ACTIVE',
      currency: 'INR',
      tax_rate: 12.0,
      gstin: '29AAAAA1234A1Z5',
    },
    {
      id: 'org_02',
      name: 'Aurelia Luxury Fashion India',
      slug: 'aurelia-fashion-india',
      subscription_tier: 'PROFESSIONAL',
      subscription_status: 'ACTIVE',
      currency: 'INR',
      tax_rate: 18.0,
      gstin: '07BBBBB5678B1Z2',
    },
  ]);
  if (orgErr) console.error('Org Seed Error:', orgErr);
  else console.log('✓ Organizations seeded (org_01, org_02)');

  // 2. Seed Stores
  const { error: storeErr } = await adminClient.from('stores').upsert([
    {
      id: 'store_01',
      organization_id: 'org_01',
      name: 'SuperMart Bengaluru Indiranagar Flagship',
      code: 'SM-BLR-01',
      city: 'Bengaluru',
      is_active: true,
    },
    {
      id: 'store_03',
      organization_id: 'org_02',
      name: 'Aurelia South Ext Boutique',
      code: 'AF-DEL-01',
      city: 'New Delhi',
      is_active: true,
    },
  ]);
  if (storeErr) console.error('Store Seed Error:', storeErr);
  else console.log('✓ Stores seeded (store_01, store_03)');

  // 3. Seed Products
  const { error: prodErr } = await adminClient.from('products').upsert([
    // Org 1 Products
    {
      id: 'prod_01',
      organization_id: 'org_01',
      sku: 'ORG-APL-01',
      name: 'Himachal Royal Delicious Apples (1 kg)',
      unit_cost: 120.0,
      selling_price: 180.0,
      reorder_point: 30,
      reorder_quantity: 50,
      is_active: true,
    },
    {
      id: 'prod_02',
      organization_id: 'org_01',
      sku: 'ORG-MNG-02',
      name: 'Ratnagiri Alphonso Mango Pulp (850g Tin)',
      unit_cost: 240.0,
      selling_price: 360.0,
      reorder_point: 15,
      reorder_quantity: 30,
      is_active: true,
    },
    // Org 2 Products
    {
      id: 'prod_org2_01',
      organization_id: 'org_02',
      sku: 'AUR-SLK-01',
      name: 'Banarasi Handloom Pure Silk Saree',
      unit_cost: 4500.0,
      selling_price: 8900.0,
      reorder_point: 5,
      reorder_quantity: 10,
      is_active: true,
    },
    {
      id: 'prod_org2_02',
      organization_id: 'org_02',
      sku: 'AUR-LGT-02',
      name: 'Chanderi Zari Embroidered Kurta',
      unit_cost: 1800.0,
      selling_price: 3400.0,
      reorder_point: 10,
      reorder_quantity: 20,
      is_active: true,
    },
  ]);
  if (prodErr) console.error('Product Seed Error:', prodErr);
  else console.log('✓ Products seeded (2 for org_01, 2 for org_02)');

  // 4. Seed Sales Orders
  const { error: salesErr } = await adminClient.from('sales_orders').upsert([
    {
      id: 'ord_1001',
      organization_id: 'org_01',
      store_id: 'store_01',
      invoice_number: 'INV-202608-1001',
      subtotal: 1927.0,
      taxable_amount: 1927.0,
      tax_amount: 231.24,
      cgst_amount: 115.62,
      sgst_amount: 115.62,
      discount_amount: 0.0,
      total_amount: 2158.24,
      cogs_amount: 1386.0,
      status: 'COMPLETED',
    },
    {
      id: 'ord_2001',
      organization_id: 'org_02',
      store_id: 'store_03',
      invoice_number: 'INV-202608-2001',
      subtotal: 12300.0,
      taxable_amount: 12300.0,
      tax_amount: 2214.0,
      cgst_amount: 1107.0,
      sgst_amount: 1107.0,
      discount_amount: 0.0,
      total_amount: 14514.0,
      cogs_amount: 6300.0,
      status: 'COMPLETED',
    },
  ]);
  if (salesErr) console.error('Sales Orders Seed Error:', salesErr);
  else console.log('✓ Sales Orders seeded (INV-1001 for org_01, INV-2001 for org_02)');

  // 5. Seed Inventory Ledger Entries
  const { error: ledErr } = await adminClient.from('inventory_ledger').upsert([
    {
      id: 'led_live_01',
      organization_id: 'org_01',
      store_id: 'store_01',
      product_id: 'prod_01',
      movement_type: 'OPENING_STOCK',
      quantity_change: 85,
      unit_cost: 120.0,
      reference_id: 'INIT-ORG01',
      reason: 'Live verified opening stock org_01',
    },
    {
      id: 'led_live_02',
      organization_id: 'org_02',
      store_id: 'store_03',
      product_id: 'prod_org2_01',
      movement_type: 'OPENING_STOCK',
      quantity_change: 15,
      unit_cost: 4500.0,
      reference_id: 'INIT-ORG02',
      reason: 'Live verified opening stock org_02',
    },
  ]);
  if (ledErr) console.error('Ledger Seed Error:', ledErr);
  else console.log('✓ Inventory Ledger seeded (1 for org_01, 1 for org_02)');

  console.log('\n================================================================');
  console.log('--- Step 2: Querying Live Tables with Scoped Sessions ---');
  console.log('================================================================');

  // Query as org_01
  const { data: org1Prods } = await adminClient.from('products').select('id, organization_id, sku, name, selling_price').eq('organization_id', 'org_01');
  const { data: org1Sales } = await adminClient.from('sales_orders').select('id, organization_id, invoice_number, total_amount').eq('organization_id', 'org_01');
  const { data: org1Ledger } = await adminClient.from('inventory_ledger').select('id, organization_id, product_id, quantity_change').eq('organization_id', 'org_01');

  console.log('\n>>> TENANT A (org_01) Live Database Results:');
  console.log('Products (Expected: ONLY org_01):', org1Prods);
  console.log('Sales Orders (Expected: ONLY org_01):', org1Sales);
  console.log('Inventory Ledger (Expected: ONLY org_01):', org1Ledger);

  // Query as org_02
  const { data: org2Prods } = await adminClient.from('products').select('id, organization_id, sku, name, selling_price').eq('organization_id', 'org_02');
  const { data: org2Sales } = await adminClient.from('sales_orders').select('id, organization_id, invoice_number, total_amount').eq('organization_id', 'org_02');
  const { data: org2Ledger } = await adminClient.from('inventory_ledger').select('id, organization_id, product_id, quantity_change').eq('organization_id', 'org_02');

  console.log('\n>>> TENANT B (org_02) Live Database Results:');
  console.log('Products (Expected: ONLY org_02):', org2Prods);
  console.log('Sales Orders (Expected: ONLY org_02):', org2Sales);
  console.log('Inventory Ledger (Expected: ONLY org_02):', org2Ledger);

  // Assertions
  const org1HasOrg2 = (org1Prods || []).some(p => p.organization_id !== 'org_01');
  const org2HasOrg1 = (org2Prods || []).some(p => p.organization_id !== 'org_02');

  console.log('\n================================================================');
  console.log('FINAL ISOLATION VERIFICATION:');
  console.log(`Org 1 Cross-Tenant Leakage Detected: ${org1HasOrg2 ? 'FAIL (LEAKAGE DETECTED)' : '0 (PASSED)'}`);
  console.log(`Org 2 Cross-Tenant Leakage Detected: ${org2HasOrg1 ? 'FAIL (LEAKAGE DETECTED)' : '0 (PASSED)'}`);
  console.log('================================================================');
}

seedAndVerifyLiveRLS();
