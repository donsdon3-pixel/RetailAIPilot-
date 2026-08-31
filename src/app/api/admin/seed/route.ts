import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  INITIAL_ORGANIZATIONS,
  INITIAL_STORES,
  INITIAL_USERS,
  INITIAL_SUPPLIERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_LEDGER_ENTRIES,
  INITIAL_SALES_ORDERS,
  INITIAL_EXPENSES,
} from '@/lib/seed-data';

function getDbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key && url.startsWith('https://')) {
    return createClient(url, key);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const supabase = getDbClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured in environment variables.' },
        { status: 400 }
      );
    }

    // 1. Organizations
    await supabase.from('organizations').upsert(
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

    // 2. Stores
    await supabase.from('stores').upsert(
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

    // 3. Users
    await supabase.from('users').upsert(
      INITIAL_USERS.map((u) => ({
        id: u.id,
        organization_id: u.organization_id || null,
        store_id: u.store_id || null,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        phone: u.phone,
        is_active: u.is_active,
      })),
      { onConflict: 'email' }
    );

    // 4. Suppliers
    await supabase.from('suppliers').upsert(
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

    // 5. Categories
    await supabase.from('categories').upsert(
      INITIAL_CATEGORIES.map((c) => ({
        id: c.id,
        organization_id: c.organization_id,
        name: c.name,
        description: c.description,
      }))
    );

    // 6. Products
    await supabase.from('products').upsert(
      INITIAL_PRODUCTS.map((p) => ({
        id: p.id,
        organization_id: p.organization_id,
        category_id: p.category_id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        description: p.description,
        unit_cost: p.unit_cost,
        selling_price: p.selling_price,
        reorder_point: p.reorder_point,
        is_active: p.is_active,
      }))
    );

    // 7. Customers
    await supabase.from('customers').upsert(
      INITIAL_CUSTOMERS.map((c) => ({
        id: c.id,
        organization_id: c.organization_id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        loyalty_points: c.loyalty_points,
        total_spend: c.total_spend,
      }))
    );

    // 8. Expense Categories
    await supabase.from('expense_categories').upsert(
      INITIAL_EXPENSE_CATEGORIES.map((ec) => ({
        id: ec.id,
        organization_id: ec.organization_id,
        name: ec.name,
      }))
    );

    // 9. Inventory Ledger
    for (const led of INITIAL_LEDGER_ENTRIES) {
      await supabase.from('inventory_ledger').upsert({
        id: led.id,
        organization_id: led.organization_id,
        store_id: led.store_id,
        product_id: led.product_id,
        movement_type: led.movement_type,
        quantity_change: led.quantity_change,
        unit_cost: led.unit_cost,
        reference_id: led.reference_id || '',
        reason: led.reason,
        created_at: led.created_at,
      });
    }

    // 10. Sales Orders, Items, Payments
    for (const order of INITIAL_SALES_ORDERS) {
      await supabase.from('sales_orders').upsert({
        id: order.id,
        organization_id: order.organization_id,
        store_id: order.store_id,
        customer_id: order.customer_id || null,
        invoice_number: order.invoice_number,
        subtotal: order.subtotal,
        taxable_amount: order.taxable_amount || order.subtotal,
        tax_amount: order.tax_amount,
        cgst_amount: order.cgst_amount,
        sgst_amount: order.sgst_amount,
        discount_amount: order.discount_amount || 0,
        total_amount: order.total_amount,
        cogs_amount: order.cogs_amount,
        status: order.status,
        created_at: order.created_at,
      });

      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          await supabase.from('sales_items').upsert({
            id: item.id,
            sales_order_id: order.id,
            product_id: item.product_id,
            quantity: Math.round(item.quantity),
            unit_cost: item.unit_cost,
            unit_price: item.unit_price,
          });
        }
      }

      if (order.payments && order.payments.length > 0) {
        const methodMap: Record<string, string> = {
          CARD: 'CREDIT_CARD',
          CREDIT_CARD: 'CREDIT_CARD',
          DEBIT_CARD: 'DEBIT_CARD',
          CASH: 'CASH',
          UPI: 'UPI',
          LOYALTY_POINTS: 'LOYALTY_POINTS',
          SPLIT: 'SPLIT',
        };
        for (const pay of order.payments) {
          await supabase.from('payments').upsert({
            id: pay.id,
            sales_order_id: order.id,
            payment_method: methodMap[pay.payment_method] || 'CASH',
            amount: pay.amount,
            reference_transaction_id: order.invoice_number,
            created_at: pay.created_at,
          });
        }
      }
    }

    // 11. Expenses
    for (const exp of INITIAL_EXPENSES) {
      await supabase.from('expenses').upsert({
        id: exp.id,
        organization_id: exp.organization_id,
        store_id: exp.store_id,
        category_id: exp.category_id,
        title: exp.title,
        amount: exp.amount,
        expense_date: exp.expense_date,
        notes: exp.notes,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase database successfully populated with all master seed entities!',
      organizations: INITIAL_ORGANIZATIONS.length,
      stores: INITIAL_STORES.length,
      products: INITIAL_PRODUCTS.length,
      sales_orders: INITIAL_SALES_ORDERS.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
