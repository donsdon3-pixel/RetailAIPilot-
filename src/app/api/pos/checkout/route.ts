import { NextResponse } from 'next/server';
import { AppStore } from '@/lib/store';
import { SalesOrder } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body: SalesOrder = await request.json();

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

    // Verify total paid matches total amount
    const totalPaid = body.payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalPaid - body.total_amount) > 0.05) {
      return NextResponse.json(
        { error: `Payment mismatch: Total amount $${body.total_amount} != Total paid $${totalPaid}` },
        { status: 400 }
      );
    }

    AppStore.processCheckout(body);

    return NextResponse.json({
      success: true,
      message: `Sale ${body.invoice_number} completed and stock deducted from immutable ledger.`,
      sales_order: body,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
