import { NextResponse } from 'next/server';
import { AppStore } from '@/lib/store';
import { SalesOrder } from '@/lib/types';
import { INITIAL_ORGANIZATIONS } from '@/lib/seed-data';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getDbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key && url.startsWith('https://')) {
    return createSupabaseClient(url, key);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body: SalesOrder = await request.json();
    const supabase: any = getDbClient();
    let user: any = null;

    try {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const directClient = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        );
        const { data: jwtUser } = await directClient.auth.getUser(token);
        if (jwtUser?.user) user = jwtUser.user;
      }

      if (!user) {
        const authClient = await createClient();
        const { data: { user: authUser } } = await authClient.auth.getUser();
        if (authUser) user = authUser;
      }
    } catch {}

    const callerRole = user?.app_metadata?.role || user?.user_metadata?.role || request.headers.get('x-user-role');
    if (callerRole === 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Forbidden: Customers are not authorized to perform POS cashier operations' },
        { status: 403 }
      );
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Cannot checkout with empty items' },
        { status: 400 }
      );
    }

    if (!body.payments || body.payments.length === 0) {
      return NextResponse.json(
        { error: 'Payment information required' },
        { status: 400 }
      );
    }

    // Server-side tax validation & independent recomputation
    const state = AppStore.getState();
    const userOrgId =
      user?.app_metadata?.organization_id ||
      user?.user_metadata?.organization_id ||
      body.organization_id ||
      state?.currentOrgId ||
      'org_01';

    const orgId = userOrgId;
    body.organization_id = orgId;

    const allOrgs = state?.organizations || INITIAL_ORGANIZATIONS;
    const org = allOrgs.find((o) => o.id === orgId) || INITIAL_ORGANIZATIONS.find((o) => o.id === orgId);
    const orgTaxRate = org?.tax_rate ?? 12.0;

    const subtotal = Number((body.subtotal || 0).toFixed(2));
    const discountAmount = Number((body.discount_amount || 0).toFixed(2));
    const taxableAmount = Number((subtotal - discountAmount).toFixed(2));
    const expectedTax = Number((taxableAmount * (orgTaxRate / 100)).toFixed(2));
    const clientTax = Number((body.tax_amount ?? 0).toFixed(2));

    // 1. Validate client-supplied tax against server-computed tax (tolerance of 0.02 for cent rounding)
    if (Math.abs(expectedTax - clientTax) > 0.02) {
      return NextResponse.json(
        {
          error: `Tax mismatch: Expected ₹${expectedTax.toFixed(2)} based on ${orgTaxRate}% GST, received ₹${clientTax.toFixed(2)}`,
          expected_tax: expectedTax,
          received_tax: clientTax,
          tax_rate: orgTaxRate,
        },
        { status: 400 }
      );
    }

    // 2. Validate total_amount against taxable_amount + verifiedTax
    const verifiedTax = expectedTax;
    const expectedTotal = Number((taxableAmount + verifiedTax).toFixed(2));
    const clientTotal = Number((body.total_amount ?? 0).toFixed(2));

    if (Math.abs(expectedTotal - clientTotal) > 0.02) {
      return NextResponse.json(
        {
          error: `Total mismatch: Expected ₹${expectedTotal.toFixed(2)}, received ₹${clientTotal.toFixed(2)}`,
          expected_total: expectedTotal,
          received_total: clientTotal,
        },
        { status: 400 }
      );
    }

    // 3. Verify total tender paid matches server-verified total amount
    const totalPaid = Number(body.payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2));
    if (Math.abs(totalPaid - expectedTotal) > 0.05) {
      return NextResponse.json(
        { error: `Payment mismatch: Total amount ₹${expectedTotal.toFixed(2)} != Total paid ₹${totalPaid.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Derive consistent CGST / SGST split and overwrite with verified amounts
    const cgst = Number((verifiedTax / 2).toFixed(2));
    const sgst = Number((verifiedTax - cgst).toFixed(2));

    body.taxable_amount = taxableAmount;
    body.tax_amount = verifiedTax;
    body.cgst_amount = cgst;
    body.sgst_amount = sgst;
    body.total_amount = expectedTotal;

    // 1. Update in-memory reactive AppStore
    AppStore.processCheckout(body);

    // 2. Persist to live Supabase database
    if (supabase) {
      try {
        const { error: soErr } = await supabase.from('sales_orders').insert({
          id: body.id,
          organization_id: body.organization_id,
          store_id: body.store_id,
          customer_id: body.customer_id || null,
          cashier_id: null,
          invoice_number: body.invoice_number,
          subtotal: body.subtotal,
          taxable_amount: body.taxable_amount || body.subtotal,
          tax_amount: body.tax_amount,
          cgst_amount: body.cgst_amount,
          sgst_amount: body.sgst_amount,
          discount_amount: body.discount_amount || 0,
          total_amount: body.total_amount,
          cogs_amount: body.cogs_amount,
          status: 'COMPLETED',
          created_at: body.created_at || new Date().toISOString(),
        });
        if (soErr) console.warn('[Supabase sales_orders insert error]:', soErr);

        if (body.items && body.items.length > 0) {
          const { error: itemsErr } = await supabase.from('sales_items').insert(
            body.items.map((item) => ({
              id: item.id || `item_${Math.random().toString(36).substring(2, 9)}`,
              sales_order_id: body.id,
              product_id: item.product_id,
              quantity: Math.round(item.quantity),
              unit_cost: item.unit_cost,
              unit_price: item.unit_price,
            }))
          );
          if (itemsErr) console.warn('[Supabase sales_items insert error]:', itemsErr);

          // Insert immutable stock deduction ledger entries
          const { error: ledgerErr } = await supabase.from('inventory_ledger').insert(
            body.items.map((item) => ({
              id: `led_${Math.random().toString(36).substring(2, 9)}`,
              organization_id: body.organization_id,
              store_id: body.store_id,
              product_id: item.product_id,
              movement_type: 'SALE',
              quantity_change: -Math.abs(Math.round(item.quantity)),
              unit_cost: item.unit_cost,
              reference_id: body.invoice_number,
              reason: `POS Checkout Sale (${body.invoice_number})`,
            }))
          );
          if (ledgerErr) console.warn('[Supabase inventory_ledger insert error]:', ledgerErr);
        }

        if (body.payments && body.payments.length > 0) {
          const methodMap: Record<string, string> = {
            CARD: 'CREDIT_CARD',
            CREDIT_CARD: 'CREDIT_CARD',
            DEBIT_CARD: 'DEBIT_CARD',
            CASH: 'CASH',
            UPI: 'UPI',
            LOYALTY_POINTS: 'LOYALTY_POINTS',
            SPLIT: 'SPLIT',
          };
          const { error: payErr } = await supabase.from('payments').insert(
            body.payments.map((pay) => ({
              id: pay.id || `pay_${Math.random().toString(36).substring(2, 9)}`,
              sales_order_id: body.id,
              payment_method: methodMap[pay.payment_method] || 'CASH',
              amount: pay.amount,
              reference_transaction_id: body.invoice_number,
              created_at: pay.created_at || new Date().toISOString(),
            }))
          );
          if (payErr) console.warn('[Supabase payments insert error]:', payErr);
        }
      } catch (dbErr: any) {
        console.warn('[POS Checkout DB Persistence Warning]', dbErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sale ${body.invoice_number} completed and stock deducted from immutable ledger.`,
      sales_order: body,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

