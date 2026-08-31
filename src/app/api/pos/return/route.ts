import { NextResponse } from 'next/server';
import { AppStore } from '@/lib/store';
import { LedgerService } from '@/lib/ledger-service';
import { ReturnOrder, ReturnItem } from '@/lib/types';
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
    const supabase: any = getDbClient();
    let user: any = null;

    // 1. Authenticate user via Supabase session or Bearer token
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
        { error: 'Forbidden: Customers are not authorized to process inventory returns' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sales_order_id, reason, items, order: clientOrder, processed_by, processed_by_name } = body;

    if (!sales_order_id) {
      return NextResponse.json(
        { error: 'Validation Error: sales_order_id is required' },
        { status: 400 }
      );
    }

    const state = AppStore.getState();
    let order = state.salesOrders.find((s) => s.id === sales_order_id) || clientOrder;

    if (!order && supabase) {
      try {
        const { data: dbOrder } = await supabase.from('sales_orders').select('*').eq('id', sales_order_id).maybeSingle();
        if (dbOrder) {
          const { data: dbItems } = await supabase.from('sales_items').select('*').eq('sales_order_id', sales_order_id);
          order = {
            ...dbOrder,
            items: (dbItems || []).map((di: any) => ({
              id: di.id,
              sales_order_id: di.sales_order_id,
              product_id: di.product_id,
              quantity: di.quantity,
              unit_cost: Number(di.unit_cost || 0),
              unit_price: Number(di.unit_price || 0),
              subtotal: Number((di.quantity * (di.unit_price || 0)).toFixed(2)),
              cogs: Number((di.quantity * (di.unit_cost || 0)).toFixed(2)),
            })),
          };
        }
      } catch {}
    }

    if (!order) {
      return NextResponse.json(
        { error: `Invoice / Sales Order not found: ${sales_order_id}` },
        { status: 404 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Validation Error: Return items array is required' },
        { status: 400 }
      );
    }

    // Mathematical verification against original invoice line items & previous returns
    try {
      LedgerService.validateReturn(order, items, state.returnOrders || []);
    } catch (validationErr: any) {
      return NextResponse.json(
        { error: validationErr.message },
        { status: 400 }
      );
    }

    // Build return items with product details
    const returnItems: ReturnItem[] = items
      .filter((i: any) => i.quantity > 0)
      .map((i: any) => {
        const orderItem = order.items.find((oi: any) => oi.product_id === i.product_id)!;
        return {
          id: `reti_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          return_id: '',
          product_id: orderItem.product_id,
          product_name: orderItem.product_name,
          sku: orderItem.sku,
          quantity: i.quantity,
          refund_unit_price: orderItem.unit_price,
          condition: (i.condition === 'DAMAGED' ? 'DAMAGED' : 'RESTOCKABLE') as 'RESTOCKABLE' | 'DAMAGED',
        };
      });

    const returnNumber = `RET-${Date.now().toString().slice(-6)}`;
    const returnOrder: ReturnOrder = {
      id: `ret_${Date.now()}`,
      organization_id: order.organization_id,
      store_id: order.store_id,
      sales_order_id: order.id,
      invoice_number: order.invoice_number,
      return_number: returnNumber,
      refund_amount: 0, // Calculated dynamically in processReturn
      reason: reason || 'Customer Return',
      processed_by: processed_by || user?.id || state.currentUser.id,
      processed_by_name: processed_by_name || (user?.user_metadata?.full_name as string) || state.currentUser.full_name,
      items: returnItems,
      created_at: new Date().toISOString(),
    };

    returnItems.forEach((i) => (i.return_id = returnOrder.id));

    // 1. Process in AppStore
    const result = AppStore.processReturn(returnOrder);

    // 2. Persist to live Supabase database
    if (supabase) {
      try {
        const { error: retErr } = await supabase.from('returns').insert({
          id: returnOrder.id,
          organization_id: returnOrder.organization_id,
          store_id: returnOrder.store_id,
          sales_order_id: returnOrder.sales_order_id,
          return_number: returnOrder.return_number,
          refund_amount: result.refund_amount,
          reason: returnOrder.reason,
          processed_by: null,
          created_at: returnOrder.created_at,
        });
        if (retErr) console.warn('[Supabase returns insert error]:', retErr);

        if (returnItems.length > 0) {
          const { error: retItemsErr } = await supabase.from('return_items').insert(
            returnItems.map((item) => ({
              id: item.id,
              return_id: returnOrder.id,
              product_id: item.product_id,
              quantity: Math.round(item.quantity),
              refund_unit_price: item.refund_unit_price,
              condition: item.condition === 'DAMAGED' ? 'DAMAGED' : 'RESTOCKABLE',
            }))
          );
          if (retItemsErr) console.warn('[Supabase return_items insert error]:', retItemsErr);

          // Insert immutable stock adjustments in ledger
          const { error: retLedgerErr } = await supabase.from('inventory_ledger').insert(
            returnItems.map((item) => {
              const orderItem = order.items.find((oi: any) => oi.product_id === item.product_id);
              const unitCost = orderItem?.unit_cost ?? 0;
              return {
                id: `led_${Math.random().toString(36).substring(2, 9)}`,
                organization_id: returnOrder.organization_id,
                store_id: returnOrder.store_id,
                product_id: item.product_id,
                movement_type: item.condition === 'DAMAGED' ? 'DAMAGED' : 'RETURN',
                quantity_change: item.condition === 'DAMAGED' ? -Math.abs(Math.round(item.quantity)) : Math.abs(Math.round(item.quantity)),
                unit_cost: unitCost,
                reference_id: returnOrder.return_number,
                return_order_id: returnOrder.id,
                reason: `Customer Return (${returnOrder.return_number}): ${item.condition}`,
              };
            })
          );
          if (retLedgerErr) console.warn('[Supabase inventory_ledger return insert error]:', retLedgerErr);
        }

        // Update sales order status
        const { error: soUpdateErr } = await supabase
          .from('sales_orders')
          .update({ status: result.sales_order_status })
          .eq('id', order.id);
        if (soUpdateErr) console.warn('[Supabase sales_orders update error]:', soUpdateErr);
      } catch (dbErr: any) {
        console.warn('[Return DB Persistence Warning]', dbErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Return ${returnNumber} processed successfully.`,
      return_order: returnOrder,
      refund_summary: result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

