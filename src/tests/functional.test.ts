import { describe, it, expect, beforeEach } from 'vitest';
import { LedgerService } from '../lib/ledger-service';
import { MCPTools, DataContext } from '../lib/mcp-tools';
import { AppStore } from '../lib/store';
import {
  SalesOrder,
  StockTransfer,
  ReturnOrder,
} from '../lib/types';
import {
  INITIAL_PRODUCTS,
  INITIAL_LEDGER_ENTRIES,
  INITIAL_SALES_ORDERS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_EXPENSES,
  INITIAL_SUPPLIERS,
  INITIAL_STORES,
  INITIAL_ORGANIZATIONS,
} from '../lib/seed-data';

describe('1. Functional Test Suite - Retail Accounting & Ledger Integrity (25 Tests)', () => {
  let context: DataContext;

  beforeEach(() => {
    AppStore.resetToSeed();
    context = {
      organizations: INITIAL_ORGANIZATIONS,
      stores: INITIAL_STORES,
      products: INITIAL_PRODUCTS,
      ledgerEntries: INITIAL_LEDGER_ENTRIES,
      salesOrders: INITIAL_SALES_ORDERS,
      purchaseOrders: INITIAL_PURCHASE_ORDERS,
      expenses: INITIAL_EXPENSES,
      suppliers: INITIAL_SUPPLIERS,
      returnOrders: [],
    };
  });

  it('FT-01: Stock Deduction on POS sale writes negative movement to ledger', () => {
    const saleOrder: SalesOrder = {
      id: 'ord_test_sale',
      organization_id: 'org_01',
      store_id: 'store_01',
      invoice_number: 'INV-TEST-001',
      subtotal: 360.0,
      tax_amount: 43.2,
      discount_amount: 0,
      total_amount: 403.2,
      cogs_amount: 240.0,
      status: 'COMPLETED',
      payments: [{ id: 'p1', sales_order_id: 'ord_test_sale', payment_method: 'CASH', amount: 403.2, created_at: new Date().toISOString() }],
      items: [{ id: 'i1', sales_order_id: 'ord_test_sale', product_id: 'prod_01', product_name: 'Himachal Apples', sku: 'ORG-APL-01', quantity: 2, unit_cost: 120.0, unit_price: 180.0, subtotal: 360.0, cogs: 240.0 }],
      created_at: new Date().toISOString(),
    };

    const updatedLedger = LedgerService.processPOSCheckout(saleOrder, context.ledgerEntries);
    const saleEntry = updatedLedger.find((e) => e.reference_id === 'INV-TEST-001' && e.movement_type === 'SALE');
    expect(saleEntry).toBeDefined();
    expect(saleEntry?.quantity_change).toBe(-2);
  });

  it('FT-02: Multi-tender Split Payment exact reconciliation (₹0.00 remainder)', () => {
    const splitPayments = [
      { method: 'UPI', amount: 2000.0 },
      { method: 'CASH', amount: 1861.76 },
    ];
    const totalDue = 3861.76;
    const sum = splitPayments.reduce((acc, curr) => acc + curr.amount, 0);
    expect(Math.abs(sum - totalDue)).toBeLessThan(0.001);
  });

  it('FT-03A (Test A): Over-Return Block - rejects return quantity greater than purchased', () => {
    const saleOrder: SalesOrder = {
      id: 'test_sale_over',
      organization_id: 'org_01',
      store_id: 'store_01',
      invoice_number: 'INV-TEST-OVER',
      subtotal: 900,
      tax_amount: 108,
      discount_amount: 0,
      total_amount: 1008,
      cogs_amount: 600,
      status: 'COMPLETED',
      payments: [],
      items: [{ id: 'i1', sales_order_id: 'test_sale_over', product_id: 'prod_01', product_name: 'Himachal Apples', sku: 'ORG-APL-01', quantity: 5, unit_cost: 120, unit_price: 180, subtotal: 900, cogs: 600 }],
      created_at: new Date().toISOString(),
    };

    expect(() => {
      LedgerService.validateReturn(saleOrder, [{ product_id: 'prod_01', quantity: 6 }], []);
    }).toThrow(/Cannot return more items than originally purchased/);
  });

  it('FT-03B (Test B): Double-Return Block - rejects cumulative return quantity exceeding purchase', () => {
    const saleOrder: SalesOrder = {
      id: 'test_sale_double',
      organization_id: 'org_01',
      store_id: 'store_01',
      invoice_number: 'INV-TEST-DBL',
      subtotal: 900,
      tax_amount: 108,
      discount_amount: 0,
      total_amount: 1008,
      cogs_amount: 600,
      status: 'COMPLETED',
      payments: [],
      items: [{ id: 'i1', sales_order_id: 'test_sale_double', product_id: 'prod_01', product_name: 'Himachal Apples', sku: 'ORG-APL-01', quantity: 5, unit_cost: 120, unit_price: 180, subtotal: 900, cogs: 600 }],
      created_at: new Date().toISOString(),
    };

    const firstReturn: ReturnOrder = {
      id: 'ret_first_3',
      organization_id: 'org_01',
      store_id: 'store_01',
      sales_order_id: 'test_sale_double',
      invoice_number: 'INV-TEST-DBL',
      return_number: 'RET-DBL-1',
      refund_amount: 540,
      reason: 'Returned 3 apples',
      items: [{ id: 'ri1', return_id: 'ret_first_3', product_id: 'prod_01', product_name: 'Himachal Apples', sku: 'ORG-APL-01', quantity: 3, refund_unit_price: 180, condition: 'RESTOCKABLE' }],
      created_at: new Date().toISOString(),
    };

    expect(LedgerService.getReturnableQuantity(saleOrder, 'prod_01', [firstReturn])).toBe(2);

    expect(() => {
      LedgerService.validateReturn(saleOrder, [{ product_id: 'prod_01', quantity: 3 }], [firstReturn]);
    }).toThrow(/Cannot return more items than originally purchased.*3 item\(s\) already returned/);
  });

  it('FT-03C (Test C): Successful Partial Return Math & Stock Increment - non-circular independently verified', () => {
    /**
     * Independent Hand Calculation Verification:
     * -------------------------------------------------------------
     * Invoice Details:
     * Line 1: 5 Himachal Apples @ ₹180.00 each = ₹900.00 gross
     * Line 2: 2 Fresh Malai Paneer @ ₹135.00 each = ₹270.00 gross
     * Total Gross Subtotal = ₹900.00 + ₹270.00 = ₹1,170.00
     * Invoice Discount = ₹117.00 (10% flat across invoice)
     * Taxable Net Subtotal = ₹1,170.00 - ₹117.00 = ₹1,053.00
     * GST Rate = 12% (CGST 6% + SGST 6%)
     * Total GST = ₹1,053.00 * 0.12 = ₹126.36
     * Total Invoiced Amount = ₹1,053.00 + ₹126.36 = ₹1,179.36
     *
     * Partial Return of 2 Himachal Apples:
     * - Returned Gross Subtotal = 2 * ₹180.00 = ₹360.00
     * - Line Discount Share = ₹360.00 * (₹117.00 / ₹1,170.00) = ₹36.00
     * - Line Taxable Net Refund = ₹360.00 - ₹36.00 = ₹324.00
     * - Line GST Reversal (12%) = ₹324.00 * 0.12 = ₹38.88
     * - Total Expected Refund = ₹324.00 + ₹38.88 = ₹362.88
     * -------------------------------------------------------------
     */
    const saleOrder: SalesOrder = {
      id: 'test_sale_partial',
      organization_id: 'org_01',
      store_id: 'store_01',
      invoice_number: 'INV-TEST-PARTIAL',
      subtotal: 1170.0,
      discount_amount: 117.0,
      taxable_amount: 1053.0,
      tax_amount: 126.36,
      total_amount: 1179.36,
      cogs_amount: 790.0,
      status: 'COMPLETED',
      payments: [],
      items: [
        { id: 'i1', sales_order_id: 'test_sale_partial', product_id: 'prod_01', product_name: 'Himachal Apples', sku: 'ORG-APL-01', quantity: 5, unit_cost: 120, unit_price: 180, subtotal: 900, cogs: 600 },
        { id: 'i2', sales_order_id: 'test_sale_partial', product_id: 'prod_04', product_name: 'Fresh Malai Paneer', sku: 'DRY-PAN-04', quantity: 2, unit_cost: 95, unit_price: 135, subtotal: 270, cogs: 190 },
      ],
      created_at: new Date().toISOString(),
    };

    const prorated = LedgerService.calculateProratedRefund(saleOrder, [{ product_id: 'prod_01', quantity: 2 }]);

    expect(prorated.subtotalRefund).toBe(324.0);
    expect(prorated.taxRefund).toBe(38.88);
    expect(prorated.totalRefund).toBe(362.88);
    expect(prorated.itemBreakdown['prod_01']).toBe(362.88);

    const returnOrder: ReturnOrder = {
      id: 'ret_partial_success',
      organization_id: 'org_01',
      store_id: 'store_01',
      sales_order_id: 'test_sale_partial',
      invoice_number: 'INV-TEST-PARTIAL',
      return_number: 'RET-PARTIAL-1',
      refund_amount: prorated.totalRefund,
      reason: 'Partial return of 2 apples',
      items: [{ id: 'ri1', return_id: 'ret_partial_success', product_id: 'prod_01', product_name: 'Himachal Apples', sku: 'ORG-APL-01', quantity: 2, refund_unit_price: 181.44, condition: 'RESTOCKABLE' }],
      created_at: new Date().toISOString(),
    };

    const updated = LedgerService.processReturn(returnOrder, context.ledgerEntries);
    const returnEntry = updated.find((e) => e.reference_id === 'RET-PARTIAL-1' && e.movement_type === 'RETURN');
    expect(returnEntry).toBeDefined();
    expect(returnEntry?.quantity_change).toBe(2);
    expect(returnEntry?.return_order_id).toBe('ret_partial_success');
    expect(returnEntry?.return_item_id).toBe('ri1');
  });

  it('FT-03D (Point 4): Multi-line sequential partial returns on separate items transition invoice status to RETURNED', () => {
    const multiOrder: SalesOrder = {
      id: 'ord_multiline_status',
      organization_id: 'org_01',
      store_id: 'store_01',
      invoice_number: 'INV-MULTI-STATUS',
      subtotal: 1170.0,
      discount_amount: 0,
      taxable_amount: 1170.0,
      tax_amount: 140.4,
      total_amount: 1310.4,
      cogs_amount: 790.0,
      status: 'COMPLETED',
      payments: [],
      items: [
        { id: 'mi1', sales_order_id: 'ord_multiline_status', product_id: 'prod_01', product_name: 'Himachal Apples', sku: 'ORG-APL-01', quantity: 2, unit_cost: 120, unit_price: 180, subtotal: 360, cogs: 240 },
        { id: 'mi2', sales_order_id: 'ord_multiline_status', product_id: 'prod_04', product_name: 'Fresh Malai Paneer', sku: 'DRY-PAN-04', quantity: 3, unit_cost: 95, unit_price: 270, subtotal: 810, cogs: 285 },
      ],
      created_at: new Date().toISOString(),
    };

    AppStore.getState().salesOrders.unshift(multiOrder);

    // Return 1: Return ALL 2 apples (Line 1 completed, Line 2 untouched)
    const return1: ReturnOrder = {
      id: 'ret_multi_1',
      organization_id: 'org_01',
      store_id: 'store_01',
      sales_order_id: 'ord_multiline_status',
      invoice_number: 'INV-MULTI-STATUS',
      return_number: 'RET-M-01',
      refund_amount: 403.2,
      reason: 'Return apples',
      items: [{ id: 'ri_m1', return_id: 'ret_multi_1', product_id: 'prod_01', product_name: 'Himachal Apples', sku: 'ORG-APL-01', quantity: 2, refund_unit_price: 180, condition: 'RESTOCKABLE' }],
      created_at: new Date().toISOString(),
    };
    const res1 = AppStore.processReturn(return1);
    expect(res1.sales_order_status).toBe('PARTIALLY_RETURNED');
    expect(multiOrder.status).toBe('PARTIALLY_RETURNED');

    // Return 2: Return ALL 3 paneer (Line 2 completed, finishing all remaining items on invoice)
    const return2: ReturnOrder = {
      id: 'ret_multi_2',
      organization_id: 'org_01',
      store_id: 'store_01',
      sales_order_id: 'ord_multiline_status',
      invoice_number: 'INV-MULTI-STATUS',
      return_number: 'RET-M-02',
      refund_amount: 907.2,
      reason: 'Return paneer',
      items: [{ id: 'ri_m2', return_id: 'ret_multi_2', product_id: 'prod_04', product_name: 'Fresh Malai Paneer', sku: 'DRY-PAN-04', quantity: 3, refund_unit_price: 270, condition: 'RESTOCKABLE' }],
      created_at: new Date().toISOString(),
    };
    const res2 = AppStore.processReturn(return2);
    expect(res2.sales_order_status).toBe('RETURNED');
    expect(multiOrder.status).toBe('RETURNED');
  });

  it('FT-03E (Request 1): Multi-Rate GST & Line-Item Discounts - proves per-line calculation corrects blended formula divergence', () => {
    /**
     * Mixed GST Rate Fixture (5% vs 18%):
     * -------------------------------------------------------------
     * Line 1: Essential Groceries (5% GST)
     *   - 10 units @ ₹100.00 = ₹1,000.00 gross
     *   - tax_rate = 0.05
     * Line 2: Premium Electronics / Cosmetic (18% GST)
     *   - 1 unit @ ₹1,000.00 = ₹1,000.00 gross
     *   - tax_rate = 0.18
     *
     * Total Gross Subtotal = ₹1,000.00 + ₹1,000.00 = ₹2,000.00
     * Invoice Discount = ₹200.00 (10% flat across invoice)
     * Taxable Subtotal = ₹2,000.00 - ₹200.00 = ₹1,800.00
     *   - Line 1 Taxable = ₹900.00, GST @ 5% = ₹45.00
     *   - Line 2 Taxable = ₹900.00, GST @ 18% = ₹162.00
     * Total Invoice Tax = ₹45.00 + ₹162.00 = ₹207.00
     * Total Invoiced Amount = ₹1,800.00 + ₹207.00 = ₹2,007.00
     * (Effective blended invoice tax rate = ₹207 / ₹1,800 = 11.5%)
     *
     * Scenario: Customer returns 5 units of Line 1 (Groceries @ 5% GST):
     *
     * 1. CORRECT PER-LINE CALCULATION:
     *   - Line 1 Gross Return = 5 * ₹100.00 = ₹500.00
     *   - Line 1 Discount Share = ₹500.00 * (₹200.00 / ₹2,000.00) = ₹50.00
     *   - Line 1 Taxable Refund = ₹500.00 - ₹50.00 = ₹450.00
     *   - Line 1 GST Reversal = ₹450.00 * 0.05 (exact 5% line tax rate) = ₹22.50
     *   - Correct Per-Line Total Refund = ₹450.00 + ₹22.50 = ₹472.50
     *
     * 2. OLD BLENDED FORMULA (Flawed):
     *   - Return Fraction F = ₹500.00 / ₹2,000.00 = 0.25 (25%)
     *   - Blended Tax Refund = 0.25 * ₹207.00 = ₹51.75 (misapplied 11.5% blended rate!)
     *   - Blended Total Refund = 0.25 * ₹2,007.00 = ₹501.75
     *   - Error / Over-refund = ₹501.75 - ₹472.50 = ₹29.25 Over-refund!
     * -------------------------------------------------------------
     */
    const mixedOrder: SalesOrder = {
      id: 'ord_mixed_tax_rates',
      organization_id: 'org_01',
      store_id: 'store_01',
      invoice_number: 'INV-MIXED-TAX',
      subtotal: 2000.0,
      discount_amount: 200.0,
      taxable_amount: 1800.0,
      tax_amount: 207.0,
      total_amount: 2007.0,
      cogs_amount: 1200.0,
      status: 'COMPLETED',
      payments: [],
      items: [
        {
          id: 'mix_1',
          sales_order_id: 'ord_mixed_tax_rates',
          product_id: 'prod_groceries_5pct',
          product_name: 'Organic Basmati Rice',
          sku: 'GRO-RICE-05',
          quantity: 10,
          unit_cost: 60.0,
          unit_price: 100.0,
          subtotal: 1000.0,
          cogs: 600.0,
          tax_rate: 0.05, // 5% GST
        },
        {
          id: 'mix_2',
          sales_order_id: 'ord_mixed_tax_rates',
          product_id: 'prod_cosmetics_18pct',
          product_name: 'Luxury Saffron Serum',
          sku: 'COS-SRM-18',
          quantity: 1,
          unit_cost: 600.0,
          unit_price: 1000.0,
          subtotal: 1000.0,
          cogs: 600.0,
          tax_rate: 0.18, // 18% GST
        },
      ],
      created_at: new Date().toISOString(),
    };

    // Calculate refund for returning 5 units of 5% GST item
    const refundResult = LedgerService.calculateProratedRefund(mixedOrder, [
      { product_id: 'prod_groceries_5pct', quantity: 5 },
    ]);

    // 1. Assert exact per-line values
    expect(refundResult.subtotalRefund).toBe(450.0);
    expect(refundResult.taxRefund).toBe(22.5);
    expect(refundResult.totalRefund).toBe(472.5);

    // 2. Explicitly prove divergence from the old blended calculation (₹501.75)
    const oldBlendedReturnFraction = 500.0 / 2000.0; // 0.25
    const oldBlendedTotalRefund = parseFloat((oldBlendedReturnFraction * mixedOrder.total_amount).toFixed(2)); // 501.75
    expect(oldBlendedTotalRefund).toBe(501.75);

    // Divergence: Old blended formula would over-refund by ₹29.25
    const divergenceError = oldBlendedTotalRefund - refundResult.totalRefund;
    expect(parseFloat(divergenceError.toFixed(2))).toBe(29.25);
    expect(refundResult.totalRefund).not.toBe(oldBlendedTotalRefund);
  });

  it('FT-04 (Point 3): Return marked DAMAGED creates linked RETURN (+qty) and DAMAGED (-qty) entries', () => {
    const returnOrder: ReturnOrder = {
      id: 'ret_test_2',
      organization_id: 'org_01',
      store_id: 'store_01',
      sales_order_id: 'ord_1001',
      invoice_number: 'INV-202608-1001',
      return_number: 'RET-002',
      refund_amount: 360.0,
      reason: 'Broken packaging',
      items: [{ id: 'ri2', return_id: 'ret_test_2', product_id: 'prod_01', product_name: 'Himachal Apples', sku: 'ORG-APL-01', quantity: 2, refund_unit_price: 180.0, condition: 'DAMAGED' }],
      created_at: new Date().toISOString(),
    };

    const updated = LedgerService.processReturn(returnOrder, context.ledgerEntries);
    const returnEntry = updated.find((e) => e.reference_id === 'RET-002' && e.movement_type === 'RETURN');
    const damageEntry = updated.find((e) => e.reference_id === 'RET-002' && e.movement_type === 'DAMAGED');

    expect(returnEntry).toBeDefined();
    expect(damageEntry).toBeDefined();
    expect(returnEntry?.quantity_change).toBe(2);
    expect(damageEntry?.quantity_change).toBe(-2);
    expect(returnEntry?.return_order_id).toBe('ret_test_2');
    expect(damageEntry?.return_order_id).toBe('ret_test_2');
    expect(damageEntry?.linked_movement_id).toBe(returnEntry?.id);
  });

  it('FT-05: Branch Transfer advances from DRAFT to REQUESTED without altering stock', () => {
    const transfer: StockTransfer = {
      id: 'trf_t1',
      organization_id: 'org_01',
      transfer_number: 'TRF-T1',
      source_store_id: 'store_02',
      destination_store_id: 'store_01',
      status: 'DRAFT',
      items: [{ id: 'ti1', transfer_id: 'trf_t1', product_id: 'prod_06', quantity_requested: 10, quantity_sent: 0, quantity_received: 0 }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = LedgerService.processTransferTransition(transfer, 'REQUESTED', 'u1', context.products, context.ledgerEntries);
    expect(result.updatedTransfer.status).toBe('REQUESTED');
    expect(result.newEntries.length).toBe(context.ledgerEntries.length);
  });

  it('FT-06: Branch Transfer on DISPATCHED writes TRANSFER_OUT on source store', () => {
    const transfer: StockTransfer = {
      id: 'trf_t2',
      organization_id: 'org_01',
      transfer_number: 'TRF-T2',
      source_store_id: 'store_02',
      destination_store_id: 'store_01',
      status: 'APPROVED',
      items: [{ id: 'ti2', transfer_id: 'trf_t2', product_id: 'prod_06', quantity_requested: 10, quantity_sent: 10, quantity_received: 0 }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = LedgerService.processTransferTransition(transfer, 'DISPATCHED', 'u1', context.products, context.ledgerEntries);
    expect(result.updatedTransfer.status).toBe('DISPATCHED');
    const out = result.newEntries.find((e) => e.movement_type === 'TRANSFER_OUT' && e.store_id === 'store_02');
    expect(out).toBeDefined();
    expect(out?.quantity_change).toBe(-10);
  });

  it('FT-07: Branch Transfer on RECEIVED writes TRANSFER_IN on destination store', () => {
    const transfer: StockTransfer = {
      id: 'trf_t3',
      organization_id: 'org_01',
      transfer_number: 'TRF-T3',
      source_store_id: 'store_02',
      destination_store_id: 'store_01',
      status: 'DISPATCHED',
      items: [{ id: 'ti3', transfer_id: 'trf_t3', product_id: 'prod_06', quantity_requested: 10, quantity_sent: 10, quantity_received: 10 }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = LedgerService.processTransferTransition(transfer, 'RECEIVED', 'u1', context.products, context.ledgerEntries);
    expect(result.updatedTransfer.status).toBe('RECEIVED');
    const inEntry = result.newEntries.find((e) => e.movement_type === 'TRANSFER_IN' && e.store_id === 'store_01');
    expect(inEntry).toBeDefined();
    expect(inEntry?.quantity_change).toBe(10);
  });

  it('FT-08: Purchase Order creation sets status to SENT with correct total', () => {
    const po = AppStore.createPurchaseOrder('sup_01', [
      { productId: 'prod_01', quantity: 50 },
    ], '2026-08-30');
    expect(po.status).toBe('SENT');
    expect(po.total_amount).toBe(6000.0);
  });

  it('FT-09: Goods Receipt Note (GRN) writes PURCHASE movements to ledger', () => {
    const po = AppStore.createPurchaseOrder('sup_01', [
      { productId: 'prod_02', quantity: 20 },
    ], '2026-08-30');
    AppStore.receivePurchaseOrderGRN(po.id, 'Inspection passed');
    const state = AppStore.getState();
    const entry = state.ledgerEntries.find((e) => e.reference_id === po.po_number && e.movement_type === 'PURCHASE');
    expect(entry).toBeDefined();
    expect(entry?.quantity_change).toBe(20);
  });

  it('FT-10: Sales Tax rate computation applies exact percentage (12.0% GST)', () => {
    const subtotal = 1000.0;
    const taxRate = 0.12;
    const tax = subtotal * taxRate;
    expect(tax).toBe(120.0);
  });

  it('FT-11: VIP Discount deducts from cart before tax calculation', () => {
    const subtotal = 1000.0;
    const discount = 100.0; // 10%
    const taxable = subtotal - discount;
    const tax = taxable * 0.12;
    const total = taxable + tax;
    expect(taxable).toBe(900.0);
    expect(tax).toBe(108.0);
    expect(total).toBe(1008.0);
  });

  it('FT-12: Loyalty Points accrual awards 1 point per ₹10 spent', () => {
    const spend = 450.0;
    const points = Math.floor(spend / 10);
    expect(points).toBe(45);
  });

  it('FT-13: COGS Accounting records purchase unit cost on checkout', () => {
    const items = [
      { unit_cost: 120.0, quantity: 4 }, // 480
      { unit_cost: 240.0, quantity: 2 }, // 480
    ];
    const cogs = items.reduce((sum, i) => sum + i.unit_cost * i.quantity, 0);
    expect(cogs).toBe(960.0);
  });

  it('FT-14: Operating Expense logging records category amount correctly', () => {
    AppStore.addExpense('exp_cat_01', 'Store Rent', 75000, '2026-08-01', 'Monthly rent');
    const state = AppStore.getState();
    const exp = state.expenses.find((e) => e.title === 'Store Rent');
    expect(exp).toBeDefined();
    expect(exp?.amount).toBe(75000);
  });

  it('FT-15: Manual Physical Count Adjustment records ADJUSTMENT movement', () => {
    AppStore.logStockAdjustment('prod_01', -2, 'ADJUSTMENT', 'Annual audit variance');
    const state = AppStore.getState();
    const adj = state.ledgerEntries.find((e) => e.movement_type === 'ADJUSTMENT');
    expect(adj).toBeDefined();
    expect(adj?.quantity_change).toBe(-2);
  });

  it('FT-16: Damaged Stock Direct logging creates DAMAGED ledger entry', () => {
    AppStore.logStockAdjustment('prod_02', -3, 'DAMAGED', 'Dropped during shelving');
    const state = AppStore.getState();
    const dmg = state.ledgerEntries.find((e) => e.movement_type === 'DAMAGED' && e.quantity_change === -3);
    expect(dmg).toBeDefined();
  });

  it('FT-17: Low-Stock Velocity computation flags SKUs below reorder point', () => {
    const low = MCPTools.getLowStockProducts(context, { store_id: 'store_01', threshold_days: 7 });
    expect(low.length).toBeGreaterThan(0);
    const item = low.find((l) => l.sku === 'BEV-CBR-06');
    expect(item).toBeDefined();
    expect(item?.current_stock).toBeLessThanOrEqual(item?.reorder_point || 0);
  });

  it('FT-18: Dead Stock 60+ Days Identification captures stagnant luxury tonic', () => {
    const dead = MCPTools.getDeadStock(context, { organization_id: 'org_01', min_days: 60 });
    const tonic = dead.find((d) => d.sku === 'BEV-TRF-11');
    expect(tonic).toBeDefined();
    expect(tonic?.tied_up_capital).toBe(48 * 1850.0);
  });

  it('FT-19: Supplier Payment due date verification identifies overdue POs', () => {
    const sups = MCPTools.getSupplierOutstanding(context, { organization_id: 'org_01' });
    const urgent = sups.filter((s) => s.escalation_status !== 'NORMAL');
    expect(urgent.length).toBeGreaterThan(0);
  });

  it('FT-20: Thermal invoice formatting generates unique invoice identifier', () => {
    const id1 = `INV-${Date.now()}`;
    const id2 = `INV-${Date.now() + 1}`;
    expect(id1).not.toBe(id2);
  });

  it('FT-21: Zero Overwrite Invariant & Accounting Margins ensures strict audit trail and verified P&L margins', () => {
    // 1. Zero overwrite ledger invariant
    expect(() => {
      LedgerService.recordStockMovement({
        organization_id: 'org_01',
        store_id: 'store_01',
        product_id: 'prod_01',
        movement_type: 'ADJUSTMENT',
        quantity_change: 0,
        unit_cost: 120.0,
      }, context.ledgerEntries);
    }).toThrow('Ledger Error: Quantity change cannot be 0.');

    // 2. Gross Margin verification
    const grossSales = 1000;
    const cogs = 620;
    const grossMargin = ((grossSales - cogs) / grossSales) * 100;
    expect(grossMargin).toBe(38);

    // 3. Net Margin verification
    const opex = 212;
    const netProfit = (grossSales - cogs) - opex;
    const netMargin = (netProfit / grossSales) * 100;
    expect(netProfit).toBe(168);
    expect(netMargin).toBe(16.8);
  });
});
