import { describe, it, expect } from 'vitest';
import { INITIAL_SALES_ORDERS, INITIAL_PRODUCTS, INITIAL_EXPENSES } from '../lib/seed-data';
import { POST } from '../app/api/pos/checkout/route';

describe('Seed Data Integrity & Traceability Test Suite', () => {
  it('SEED-01: Every sales order is discrete with valid line items (no synthetic aggregate blobs)', () => {
    expect(INITIAL_SALES_ORDERS.length).toBeGreaterThanOrEqual(20);

    for (const order of INITIAL_SALES_ORDERS) {
      expect(order.id).not.toBe('ord_hist_month');
      expect(order.invoice_number).not.toBe('INV-202608-HIST-AGG');
      expect(order.items.length).toBeGreaterThan(0);

      // Verify each line item references valid product and positive values
      for (const item of order.items) {
        expect(item.product_id).toBeTruthy();
        expect(item.sku).toBeTruthy();
        expect(item.quantity).toBeGreaterThan(0);
        expect(item.unit_cost).toBeGreaterThan(0);
        expect(item.unit_price).toBeGreaterThan(0);
        expect(item.subtotal).toBeCloseTo(item.quantity * item.unit_price, 2);
        expect(item.cogs).toBeCloseTo(item.quantity * item.unit_cost, 2);
      }

      // Verify line items sum exactly to order subtotal and COGS
      const calculatedSubtotal = order.items.reduce((sum, it) => sum + it.subtotal, 0);
      const calculatedCOGS = order.items.reduce((sum, it) => sum + it.cogs, 0);
      expect(order.subtotal).toBeCloseTo(calculatedSubtotal, 2);
      expect(order.cogs_amount).toBeCloseTo(calculatedCOGS, 2);

      // Verify payment tender equality
      const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
      expect(totalPaid).toBeCloseTo(order.total_amount, 2);
    }
  });

  it('SEED-02: Dynamically verified financial aggregation on seed data', () => {
    const org1Orders = INITIAL_SALES_ORDERS.filter((o) => o.organization_id === 'org_01');
    const computedGrossSales = org1Orders.reduce((sum, o) => sum + o.subtotal, 0);
    const computedCOGS = org1Orders.reduce((sum, o) => sum + o.cogs_amount, 0);
    const computedOpEx = INITIAL_EXPENSES.filter((e) => e.organization_id === 'org_01').reduce(
      (sum, e) => sum + e.amount,
      0
    );

    const grossProfit = computedGrossSales - computedCOGS;
    const grossMarginPercent = (grossProfit / computedGrossSales) * 100;
    const netProfit = grossProfit - computedOpEx;
    const netMarginPercent = (netProfit / computedGrossSales) * 100;

    console.log(`[Seed Data Build Audit] Gross Sales: ₹${computedGrossSales.toLocaleString('en-IN')}`);
    console.log(`[Seed Data Build Audit] COGS: ₹${computedCOGS.toLocaleString('en-IN')}`);
    console.log(`[Seed Data Build Audit] Gross Margin: ${grossMarginPercent.toFixed(2)}%`);
    console.log(`[Seed Data Build Audit] OpEx: ₹${computedOpEx.toLocaleString('en-IN')}`);
    console.log(`[Seed Data Build Audit] Net Operating Profit: ₹${netProfit.toLocaleString('en-IN')} (${netMarginPercent.toFixed(2)}%)`);

    expect(computedGrossSales).toBe(1353880.0);
    expect(computedCOGS).toBeGreaterThan(0);
    expect(grossProfit).toBeGreaterThan(0);
    expect(grossMarginPercent).toBeGreaterThan(20);
    expect(netProfit).toBeGreaterThan(0);
  });

  it('SEED-03: CGST and SGST split parity for live POS transactions (even and odd-cent tax amounts)', async () => {
    // 1. Standard Even Cent Tax Test
    const evenOrderPayload: any = {
      id: 'ord_test_even',
      organization_id: 'org_01',
      store_id: 'store_01',
      invoice_number: 'INV-TEST-EVEN',
      subtotal: 1000.0,
      tax_amount: 120.0,
      total_amount: 1120.0,
      cogs_amount: 600.0,
      items: [
        {
          id: 'item_test_1',
          sales_order_id: 'ord_test_even',
          product_id: 'prod_01',
          product_name: 'Test Product',
          sku: 'ORG-APL-01',
          quantity: 5,
          unit_cost: 120.0,
          unit_price: 200.0,
          subtotal: 1000.0,
          cogs: 600.0,
        },
      ],
      payments: [
        {
          id: 'pay_test_1',
          sales_order_id: 'ord_test_even',
          payment_method: 'UPI',
          amount: 1120.0,
        },
      ],
      status: 'COMPLETED',
      created_at: new Date().toISOString(),
    };

    const reqEven = new Request('http://localhost:3000/api/pos/checkout', {
      method: 'POST',
      body: JSON.stringify(evenOrderPayload),
    });
    const resEven = await POST(reqEven);
    const jsonEven = await resEven.json();

    expect(jsonEven.success).toBe(true);
    expect(jsonEven.sales_order.cgst_amount + jsonEven.sales_order.sgst_amount).toBeCloseTo(120.0, 2);
    expect(jsonEven.sales_order.cgst_amount).toBe(60.0);
    expect(jsonEven.sales_order.sgst_amount).toBe(60.0);

    // 2. Non-Trivial Odd Cent Tax Test (Rounding Drift Prevention)
    const oddOrderPayload: any = {
      id: 'ord_test_odd',
      organization_id: 'org_01',
      store_id: 'store_01',
      invoice_number: 'INV-TEST-ODD',
      subtotal: 1234.55,
      tax_amount: 148.15, // Odd cents (148.15 / 2 = 74.075 -> CGST 74.08, SGST 74.07)
      total_amount: 1382.7,
      cogs_amount: 700.0,
      items: [
        {
          id: 'item_test_2',
          sales_order_id: 'ord_test_odd',
          product_id: 'prod_01',
          product_name: 'Test Product Odd',
          sku: 'ORG-APL-01',
          quantity: 1,
          unit_cost: 700.0,
          unit_price: 1234.55,
          subtotal: 1234.55,
          cogs: 700.0,
        },
      ],
      payments: [
        {
          id: 'pay_test_2',
          sales_order_id: 'ord_test_odd',
          payment_method: 'CREDIT_CARD',
          amount: 1382.7,
        },
      ],
      status: 'COMPLETED',
      created_at: new Date().toISOString(),
    };

    const reqOdd = new Request('http://localhost:3000/api/pos/checkout', {
      method: 'POST',
      body: JSON.stringify(oddOrderPayload),
    });
    const resOdd = await POST(reqOdd);
    const jsonOdd = await resOdd.json();

    expect(jsonOdd.success).toBe(true);
    // Strict sum parity
    expect(jsonOdd.sales_order.cgst_amount + jsonOdd.sales_order.sgst_amount).toBeCloseTo(148.15, 2);
    // Difference between CGST and SGST cannot exceed 1 cent
    const diff = Number(Math.abs(jsonOdd.sales_order.cgst_amount - jsonOdd.sales_order.sgst_amount).toFixed(2));
    expect(diff).toBeLessThanOrEqual(0.01);
  });
});
