import { SupabaseClient } from '@supabase/supabase-js';
import { DataContext } from './mcp-tools';
import {
  INITIAL_ORGANIZATIONS,
  INITIAL_STORES,
  INITIAL_PRODUCTS,
  INITIAL_LEDGER_ENTRIES,
  INITIAL_SALES_ORDERS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_EXPENSES,
  INITIAL_SUPPLIERS,
} from './seed-data';

/**
 * Fetches live multi-tenant business data directly from PostgreSQL tables via Supabase.
 * Respects database Row Level Security (RLS) according to the caller's authenticated session.
 * Empty tables return [] as valid, real data.
 * Throws immediately if any database query encounters an error.
 */
export async function getLiveDataContext(supabase: SupabaseClient): Promise<DataContext> {
  const [
    { data: orgs, error: orgErr },
    { data: stores, error: storeErr },
    { data: products, error: prodErr },
    { data: ledger, error: ledgerErr },
    { data: sales, error: salesErr },
    { data: purchases, error: poErr },
    { data: expenses, error: expErr },
    { data: suppliers, error: supErr },
    { data: returns, error: retErr },
  ] = await Promise.all([
    supabase.from('organizations').select('*'),
    supabase.from('stores').select('*'),
    supabase.from('products').select('*'),
    supabase.from('inventory_ledger').select('*'),
    supabase.from('sales_orders').select('*, items:sales_items(*), payments(*)'),
    supabase.from('purchase_orders').select('*, items:purchase_order_items(*)'),
    supabase.from('expenses').select('*'),
    supabase.from('suppliers').select('*'),
    supabase.from('returns').select('*, items:return_items(*)'),
  ]);

  // Strict error verification: Any query failure must fail loudly and not return partial data
  const errors = [
    orgErr && { table: 'organizations', error: orgErr.message },
    storeErr && { table: 'stores', error: storeErr.message },
    prodErr && { table: 'products', error: prodErr.message },
    ledgerErr && { table: 'inventory_ledger', error: ledgerErr.message },
    salesErr && { table: 'sales_orders', error: salesErr.message },
    poErr && { table: 'purchase_orders', error: poErr.message },
    expErr && { table: 'expenses', error: expErr.message },
    supErr && { table: 'suppliers', error: supErr.message },
    retErr && { table: 'returns', error: retErr.message },
  ].filter(Boolean);

  if (errors.length > 0) {
    const errorDetails = errors.map((e: any) => `${e.table}: ${e.error}`).join('; ');
    console.error(`[DataContext Database Error] Failed to fetch live data from Supabase: ${errorDetails}`);
    throw new Error(`Database Query Error: ${errorDetails}`);
  }

  return {
    organizations: orgs || [],
    stores: stores || [],
    products: products || [],
    ledgerEntries: ledger || [],
    salesOrders: sales || [],
    purchaseOrders: purchases || [],
    expenses: expenses || [],
    suppliers: suppliers || [],
    returnOrders: returns || [],
  };
}

export function getInitialDataContext(): DataContext {
  return {
    organizations: JSON.parse(JSON.stringify(INITIAL_ORGANIZATIONS)),
    stores: JSON.parse(JSON.stringify(INITIAL_STORES)),
    products: JSON.parse(JSON.stringify(INITIAL_PRODUCTS)),
    ledgerEntries: JSON.parse(JSON.stringify(INITIAL_LEDGER_ENTRIES)),
    salesOrders: JSON.parse(JSON.stringify(INITIAL_SALES_ORDERS)),
    purchaseOrders: JSON.parse(JSON.stringify(INITIAL_PURCHASE_ORDERS)),
    expenses: JSON.parse(JSON.stringify(INITIAL_EXPENSES)),
    suppliers: JSON.parse(JSON.stringify(INITIAL_SUPPLIERS)),
    returnOrders: [],
  };
}
