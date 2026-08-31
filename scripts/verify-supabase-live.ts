import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually for standalone script execution
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

console.log('====================================================');
console.log('RETAILPILOT AI - SUPABASE LIVE DATABASE PROBE');
console.log('====================================================');
console.log(`URL: ${supabaseUrl}`);
console.log(`Anon Key Prefix: ${supabaseAnonKey.substring(0, 20)}...`);
console.log(`Service Key Prefix: ${supabaseServiceKey.substring(0, 20)}...`);

async function runLiveVerification() {
  const adminClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

  console.log('\n--- 1. Testing Raw Connection & Table Inspection ---');
  
  // Test query on organizations
  const { data: orgs, error: orgErr } = await adminClient.from('organizations').select('*');
  if (orgErr) {
    console.error('Error querying organizations:', orgErr);
  } else {
    console.log(`Found ${orgs?.length || 0} organizations in live database:`, orgs);
  }

  // Test query on products
  const { data: products, error: prodErr } = await adminClient.from('products').select('*');
  if (prodErr) {
    console.error('Error querying products:', prodErr);
  } else {
    console.log(`Found ${products?.length || 0} products in live database.`);
  }

  // Test query on sales_orders
  const { data: sales, error: salesErr } = await adminClient.from('sales_orders').select('*');
  if (salesErr) {
    console.error('Error querying sales_orders:', salesErr);
  } else {
    console.log(`Found ${sales?.length || 0} sales_orders in live database.`);
  }

  // Test query on inventory_ledger
  const { data: ledger, error: ledErr } = await adminClient.from('inventory_ledger').select('*');
  if (ledErr) {
    console.error('Error querying inventory_ledger:', ledErr);
  } else {
    console.log(`Found ${ledger?.length || 0} inventory_ledger entries in live database.`);
  }

  console.log('\n--- 2. Testing Scoped Tenant Sessions for org_01 vs org_02 ---');

  // Supabase client with custom headers
  const clientOrg1 = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-organization-id': 'org_01',
      },
    },
  });

  const clientOrg2 = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-organization-id': 'org_02',
      },
    },
  });

  const { data: p1, error: ep1 } = await clientOrg1.from('products').select('id, organization_id, sku, name, unit_cost, selling_price');
  console.log('\n[SESSION ORG_01] Products Query Result:');
  console.log('Error:', ep1);
  console.log('Rows Count:', p1?.length);
  console.log('Rows:', p1);

  const { data: p2, error: ep2 } = await clientOrg2.from('products').select('id, organization_id, sku, name, unit_cost, selling_price');
  console.log('\n[SESSION ORG_02] Products Query Result:');
  console.log('Error:', ep2);
  console.log('Rows Count:', p2?.length);
  console.log('Rows:', p2);

  const { data: s1, error: es1 } = await clientOrg1.from('sales_orders').select('id, organization_id, invoice_number, subtotal, total_amount');
  console.log('\n[SESSION ORG_01] Sales Orders Query Result:');
  console.log('Error:', es1);
  console.log('Rows Count:', s1?.length);
  console.log('Rows:', s1);

  const { data: s2, error: es2 } = await clientOrg2.from('sales_orders').select('id, organization_id, invoice_number, subtotal, total_amount');
  console.log('\n[SESSION ORG_02] Sales Orders Query Result:');
  console.log('Error:', es2);
  console.log('Rows Count:', s2?.length);
  console.log('Rows:', s2);

  const { data: l1, error: el1 } = await clientOrg1.from('inventory_ledger').select('id, organization_id, store_id, product_id, movement_type, quantity_change');
  console.log('\n[SESSION ORG_01] Inventory Ledger Query Result:');
  console.log('Error:', el1);
  console.log('Rows Count:', l1?.length);
  console.log('Rows:', l1);

  const { data: l2, error: el2 } = await clientOrg2.from('inventory_ledger').select('id, organization_id, store_id, product_id, movement_type, quantity_change');
  console.log('\n[SESSION ORG_02] Inventory Ledger Query Result:');
  console.log('Error:', el2);
  console.log('Rows Count:', l2?.length);
  console.log('Rows:', l2);
}

runLiveVerification();
