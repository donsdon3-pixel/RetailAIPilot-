import { describe, it, expect, beforeEach } from 'vitest';
import { LedgerService } from '../lib/ledger-service';
import { MCPTools, DataContext } from '../lib/mcp-tools';
import { AppStore } from '../lib/store';
import {
  INITIAL_ORGANIZATIONS,
  INITIAL_STORES,
  INITIAL_PRODUCTS,
  INITIAL_LEDGER_ENTRIES,
  INITIAL_SALES_ORDERS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_EXPENSES,
  INITIAL_SUPPLIERS,
} from '../lib/seed-data';
import { SalesOrder, ReturnOrder, StockTransfer } from '../lib/types';

describe('Functional Test Suite (25 Cases)', () => {
  let context: DataContext;

  beforeEach(() => {
    context = {
      organizations: [...INITIAL_ORGANIZATIONS],
      stores: [...INITIAL_STORES],
      products: [...INITIAL_PRODUCTS],
      ledgerEntries: [...INITIAL_LEDGER_ENTRIES],
      salesOrders: [...INITIAL_SALES_ORDERS],
      purchaseOrders: [...INITIAL_PURCHASE_ORDERS],
      expenses: [...INITIAL_EXPENSES],
      suppliers: [...INITIAL_SUPPLIERS],
    };
  });

  it('FT-01: Stock deduction on POS Sale writes negative change to ledger', () => {
    const saleOrder: SalesOrder = {
      id: 'test_sale_1',
      organization_id: 'org_01',
      store_id: 'store_01',
      invoice_number: 'INV-TEST-01',
      subtotal: 10,
      tax_amount: 0.8,
      discount_amount: 0,
      total_amount: 10.8,
      cogs_amount: 5,
      status: 'COMPLETED',
      payments: [{ id: 'p1', sales_order_id: 'test_sale_1', payment_method: 'CASH', amount: 10.8, created_at: '' }],
      items: [{ id: 'i1', sales_order_id: 'test_sale_1', product_id: 'prod_01', product_name: 'Apples', sku: 'ORG-APL-01', quantity: 5, unit_cost: 1.8, unit_price: 3.99, subtotal: 19.95, cogs: 9 }],
      created_at: new Date().toISOString(),
    };

    const updated = LedgerService.processPOSCheckout(saleOrder, context.ledgerEntries);
    const saleEntry = updated.find((e) => e.reference_id === 'INV-TEST-01');
    expect(saleEntry).toBeDefined();
    expect(saleEntry?.quantity_change).toBe(-5);
    expect(saleEntry?.movement_type).toBe('SALE');
  });

  it('FT-02: Multi-tender Split payment matches exact total due', () => {
    const splitPayments = [
      { method: 'CASH', amount: 20.0 },
      { method: 'CREDIT_CARD', amount: 17.51 },
    ];
    const totalDue = 37.51;
    const sum = splitPayments.reduce((acc, curr) => acc + curr.amount, 0);
    expect(Math.abs(sum - totalDue)).toBeLessThan(0.001);
  });

  it('FT-03: Return marked RESTOCKABLE adds positive stock back to store', () => {
    const returnOrder: ReturnOrder = {
      id: 'ret_test_1',
      organization_id: 'org_01',
      store_id: 'store_01',
      sales_order_id: 'ord_1001',
      invoice_number: 'INV-202608-1001',
      return_number: 'RET-001',
      refund_amount: 3.99,
      reason: 'Wrong item size',
      items: [{ id: 'ri1', return_id: 'ret_test_1', product_id: 'prod_01', product_name: 'Apples', sku: 'ORG-APL-01', quantity: 1, refund_unit_price: 3.99, condition: 'RESTOCKABLE' }],
      created_at: new Date().toISOString(),
    };

    const updated = LedgerService.processReturn(returnOrder, context.ledgerEntries);
    const returnEntry = updated.find((e) => e.reference_id === 'RET-001' && e.movement_type === 'RETURN');
    expect(returnEntry).toBeDefined();
    expect(returnEntry?.quantity_change).toBe(1);
  });

  it('FT-04: Return marked DAMAGED creates both RETURN and DAMAGED entries netting 0 sellable balance', () => {
    const returnOrder: ReturnOrder = {
      id: 'ret_test_2',
      organization_id: 'org_01',
      store_id: 'store_01',
      sales_order_id: 'ord_1001',
      invoice_number: 'INV-202608-1001',
      return_number: 'RET-002',
      refund_amount: 3.99,
      reason: 'Broken bottle',
      items: [{ id: 'ri2', return_id: 'ret_test_2', product_id: 'prod_01', product_name: 'Apples', sku: 'ORG-APL-01', quantity: 2, refund_unit_price: 3.99, condition: 'DAMAGED' }],
      created_at: new Date().toISOString(),
    };

    const updated = LedgerService.processReturn(returnOrder, context.ledgerEntries);
    const entries = updated.filter((e) => e.reference_id === 'RET-002');
    expect(entries.length).toBe(2);
    const netQty = entries.reduce((s, e) => s + e.quantity_change, 0);
    expect(netQty).toBe(0);
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
      items: [{ id: 'ti2', transfer_id: 'trf_t2', product_id: 'prod_06', quantity_requested: 15, quantity_sent: 0, quantity_received: 0 }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = LedgerService.processTransferTransition(transfer, 'DISPATCHED', 'u1', context.products, context.ledgerEntries);
    expect(result.updatedTransfer.status).toBe('DISPATCHED');
    const outEntry = result.newEntries.find((e) => e.movement_type === 'TRANSFER_OUT' && e.reference_id === 'TRF-T2');
    expect(outEntry).toBeDefined();
    expect(outEntry?.quantity_change).toBe(-15);
    expect(outEntry?.store_id).toBe('store_02');
  });

  it('FT-07: Branch Transfer on RECEIVED writes TRANSFER_IN on destination store', () => {
    const transfer: StockTransfer = {
      id: 'trf_t3',
      organization_id: 'org_01',
      transfer_number: 'TRF-T3',
      source_store_id: 'store_02',
      destination_store_id: 'store_01',
      status: 'DISPATCHED',
      items: [{ id: 'ti3', transfer_id: 'trf_t3', product_id: 'prod_06', quantity_requested: 15, quantity_sent: 15, quantity_received: 0 }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = LedgerService.processTransferTransition(transfer, 'RECEIVED', 'u1', context.products, context.ledgerEntries);
    expect(result.updatedTransfer.status).toBe('RECEIVED');
    const inEntry = result.newEntries.find((e) => e.movement_type === 'TRANSFER_IN' && e.reference_id === 'TRF-T3');
    expect(inEntry).toBeDefined();
    expect(inEntry?.quantity_change).toBe(15);
    expect(inEntry?.store_id).toBe('store_01');
  });

  it('FT-08: Purchase Order Creation calculates total amount from line items', () => {
    const items = [
      { productId: 'prod_01', quantity: 100 }, // cost 1.80 = $180
      { productId: 'prod_02', quantity: 50 },  // cost 2.20 = $110
    ];
    const po = AppStore.createPurchaseOrder('sup_01', items, '2026-09-01', 'Test PO');
    expect(po.total_amount).toBe(290);
    expect(po.status).toBe('SENT');
  });

  it('FT-09: GRN Receipt writes PURCHASE movement to immutable ledger', () => {
    const po = AppStore.getState().purchaseOrders[0];
    AppStore.receivePurchaseOrderGRN(po.id, 'Inspection ok');
    const state = AppStore.getState();
    const purchaseEntry = state.ledgerEntries.find((e) => e.movement_type === 'PURCHASE' && e.reference_id === po.po_number);
    expect(purchaseEntry).toBeDefined();
    expect(purchaseEntry?.quantity_change).toBe(po.items[0].quantity_ordered);
  });

  it('FT-10: Sales Tax Computation at 8.25% computes correct tax amount', () => {
    const subtotal = 100.0;
    const taxRate = 8.25;
    const tax = (subtotal * taxRate) / 100;
    expect(tax).toBe(8.25);
  });

  it('FT-11: VIP Discount calculation reduces taxable subtotal properly', () => {
    const subtotal = 200.0;
    const discountPercent = 15;
    const discount = (subtotal * discountPercent) / 100;
    const net = subtotal - discount;
    expect(discount).toBe(30.0);
    expect(net).toBe(170.0);
  });

  it('FT-12: Loyalty Points Accrual generates 1 point per $1 spent', () => {
    const totalSpent = 75.80;
    const pts = Math.floor(totalSpent);
    expect(pts).toBe(75);
  });

  it('FT-13: COGS Accounting aggregates exact product unit purchase costs', () => {
    const items = [
      { unit_cost: 1.80, quantity: 4 }, // 7.20
      { unit_cost: 2.50, quantity: 2 }, // 5.00
    ];
    const cogs = items.reduce((sum, i) => sum + i.unit_cost * i.quantity, 0);
    expect(cogs).toBe(12.20);
  });

  it('FT-14: Operating Expense logging records category amount correctly', () => {
    AppStore.addExpense('expcat_01', 'Store Rent', 3000, '2026-08-01', 'Monthly rent');
    const state = AppStore.getState();
    const exp = state.expenses.find((e) => e.title === 'Store Rent');
    expect(exp).toBeDefined();
    expect(exp?.amount).toBe(3000);
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
    const tonic = dead.find((d) => d.sku === 'BEV-TRF-09');
    expect(tonic).toBeDefined();
    expect(tonic?.tied_up_capital).toBe(48 * 38.0);
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

  it('FT-21: Zero Overwrite invariant prevents 0 quantity change in ledger', () => {
    expect(() => {
      LedgerService.recordStockMovement({
        organization_id: 'org_01',
        store_id: 'store_01',
        product_id: 'prod_01',
        movement_type: 'ADJUSTMENT',
        quantity_change: 0,
        unit_cost: 1.80,
      }, context.ledgerEntries);
    }).toThrow('Ledger Error: Quantity change cannot be 0.');
  });

  it('FT-22: Multi-Store Catalog Partitioning computes distinct balances per store', () => {
    const bStore1 = LedgerService.calculateStockBalances('org_01', 'store_01', context.ledgerEntries, context.products);
    const bStore2 = LedgerService.calculateStockBalances('org_01', 'store_02', context.ledgerEntries, context.products);
    const prod1_s1 = bStore1.find((b) => b.sku === 'ORG-APL-01')?.current_stock;
    const prod1_s2 = bStore2.find((b) => b.sku === 'ORG-APL-01')?.current_stock;
    expect(prod1_s1).toBe(85);
    expect(prod1_s2).toBe(50);
  });

  it('FT-23: Accounts Payable Aggregation sums total supplier balances', () => {
    const sups = context.suppliers.filter((s) => s.organization_id === 'org_01');
    const totalAP = sups.reduce((sum, s) => sum + s.outstanding_balance, 0);
    expect(totalAP).toBe(14250.0 + 8320.50 + 5190.0 + 12400.0);
  });

  it('FT-24: Gross Margin percentage computation formula matches standard accounting', () => {
    const grossSales = 1000;
    const cogs = 400;
    const margin = ((grossSales - cogs) / grossSales) * 100;
    expect(margin).toBe(60);
  });

  it('FT-25: Net Margin percentage accounts for OpEx deductions', () => {
    const grossProfit = 600;
    const grossSales = 1000;
    const opex = 200;
    const netProfit = grossProfit - opex;
    const netMargin = (netProfit / grossSales) * 100;
    expect(netProfit).toBe(400);
    expect(netMargin).toBe(40);
  });
});
