import { describe, it, expect } from 'vitest';
import { handleMCPCall, MCP_TOOL_DEFINITIONS } from '../mcp-server';
import { MCPTools } from '../lib/mcp-tools';
import { AppStore } from '../lib/store';

describe('API & Contracts Test Suite (10 Cases)', () => {
  const context = AppStore.getDataContext();

  it('API-01: MCP tools/list returns exactly 5 mandatory tools with JSON schemas', () => {
    expect(MCP_TOOL_DEFINITIONS.length).toBe(5);
    const names = MCP_TOOL_DEFINITIONS.map((t) => t.name);
    expect(names).toContain('get_low_stock_products');
    expect(names).toContain('get_dead_stock');
    expect(names).toContain('get_profitability');
    expect(names).toContain('get_supplier_outstanding');
    expect(names).toContain('generate_business_report');
  });

  it('API-02: MCP tools/call get_low_stock_products executes and returns velocity data', () => {
    const res = handleMCPCall('get_low_stock_products', { store_id: 'store_01', threshold_days: 7 }, context) as any[];
    expect(Array.isArray(res)).toBe(true);
    if (res.length > 0) {
      expect(res[0]).toHaveProperty('sku');
      expect(res[0]).toHaveProperty('daily_sales_velocity');
      expect(res[0]).toHaveProperty('days_until_stockout');
    }
  });

  it('API-03: MCP tools/call get_dead_stock returns stagnant capital and discount plans', () => {
    const res = handleMCPCall('get_dead_stock', { organization_id: 'org_01', min_days: 60 }, context) as any[];
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBeGreaterThan(0);
    expect(res[0]).toHaveProperty('tied_up_capital');
    expect(res[0]).toHaveProperty('suggested_discount_percent');
  });

  it('API-04: MCP tools/call get_profitability returns financial breakdown', () => {
    const res = handleMCPCall('get_profitability', { store_id: 'store_01' }, context) as any;
    expect(res).toHaveProperty('gross_sales');
    expect(res).toHaveProperty('cogs');
    expect(res).toHaveProperty('net_profit');
    expect(res).toHaveProperty('expense_breakdown');
  });

  it('API-05: MCP tools/call get_supplier_outstanding returns AP balances', () => {
    const res = handleMCPCall('get_supplier_outstanding', { organization_id: 'org_01' }, context) as any[];
    expect(Array.isArray(res)).toBe(true);
    expect(res[0]).toHaveProperty('outstanding_balance');
    expect(res[0]).toHaveProperty('escalation_status');
  });

  it('API-06: MCP tools/call generate_business_report returns executive dossier', () => {
    const res = handleMCPCall('generate_business_report', { organization_id: 'org_01', period_month: 'August 2026' }, context) as any;
    expect(res).toHaveProperty('total_revenue');
    expect(res).toHaveProperty('strategic_ai_recommendations');
    expect(res.strategic_ai_recommendations.length).toBeGreaterThan(0);
  });

  it('API-07: Unknown MCP tool call throws structured JSON-RPC error', () => {
    expect(() => {
      handleMCPCall('unknown_nonexistent_tool', {}, context);
    }).toThrow('Unknown MCP tool: unknown_nonexistent_tool');
  });

  it('API-08: Automation Workflow API handles invalid workflow index', () => {
    expect(() => {
      AppStore.runAutomation(99 as any);
    }).toThrow();
  });

  it('API-09: Automation Workflow index 1 executes Low Stock Alert', () => {
    const res = AppStore.runAutomation(1);
    expect(res.workflow_name).toBe('Low Stock Auto-Alert');
    expect(res).toHaveProperty('alerts_generated');
  });

  it('API-10: Automation Workflow index 4 executes Daily End of Day Dossier', () => {
    const res = AppStore.runAutomation(4);
    expect(res.workflow_name).toBe('Daily End-of-Day Sales Dossier');
    expect(res.execution_status).toBe('SUCCESS');
  });

  it('API-11: Server-side POS checkout rejects tampered/incorrect tax_amount with 400 error', async () => {
    const { POST } = await import('../app/api/pos/checkout/route');

    // Org 01 tax rate is 12%. Subtotal = 1000. Expected tax = 120.00.
    // Client attempts to tamper tax_amount to 10.00 (under-declaring tax)
    const tamperedOrder: any = {
      id: 'ord_tampered_tax',
      organization_id: 'org_01',
      store_id: 'store_01',
      invoice_number: 'INV-TAMPERED-001',
      subtotal: 1000.0,
      discount_amount: 0.0,
      tax_amount: 10.0, // Deliberately incorrect tax
      total_amount: 1010.0,
      cogs_amount: 500.0,
      items: [
        {
          id: 'item_t1',
          sales_order_id: 'ord_tampered_tax',
          product_id: 'prod_01',
          product_name: 'Test Apples',
          sku: 'ORG-APL-01',
          quantity: 5,
          unit_cost: 100.0,
          unit_price: 200.0,
          subtotal: 1000.0,
          cogs: 500.0,
        },
      ],
      payments: [
        {
          id: 'pay_t1',
          sales_order_id: 'ord_tampered_tax',
          payment_method: 'UPI',
          amount: 1010.0,
        },
      ],
      status: 'COMPLETED',
      created_at: new Date().toISOString(),
    };

    const request = new Request('http://localhost:3000/api/pos/checkout', {
      method: 'POST',
      body: JSON.stringify(tamperedOrder),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Tax mismatch');
    expect(data.error).toContain('Expected');
    expect(data.expected_tax).toBe(120.0);
    expect(data.received_tax).toBe(10.0);
  });

  it('API-12: Server-side POS checkout rejects tampered/incorrect total_amount with 400 error', async () => {
    const { POST } = await import('../app/api/pos/checkout/route');

    // Org 01 tax rate is 12%. Subtotal = 1000. Expected tax = 120.00.
    // Client provides correct tax_amount (120.00), but deliberately tampered total_amount (999.00 instead of 1120.00)
    const tamperedTotalOrder: any = {
      id: 'ord_tampered_total',
      organization_id: 'org_01',
      store_id: 'store_01',
      invoice_number: 'INV-TAMPERED-TOTAL-001',
      subtotal: 1000.0,
      discount_amount: 0.0,
      tax_amount: 120.0, // Correct tax
      total_amount: 999.0, // Deliberately incorrect total (should be 1120.00)
      cogs_amount: 500.0,
      items: [
        {
          id: 'item_tot_1',
          sales_order_id: 'ord_tampered_total',
          product_id: 'prod_01',
          product_name: 'Test Apples',
          sku: 'ORG-APL-01',
          quantity: 5,
          unit_cost: 100.0,
          unit_price: 200.0,
          subtotal: 1000.0,
          cogs: 500.0,
        },
      ],
      payments: [
        {
          id: 'pay_tot_1',
          sales_order_id: 'ord_tampered_total',
          payment_method: 'UPI',
          amount: 999.0,
        },
      ],
      status: 'COMPLETED',
      created_at: new Date().toISOString(),
    };

    const request = new Request('http://localhost:3000/api/pos/checkout', {
      method: 'POST',
      body: JSON.stringify(tamperedTotalOrder),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Total mismatch');
    expect(data.error).toContain('Expected');
    expect(data.expected_total).toBe(1120.0);
    expect(data.received_total).toBe(999.0);
  });
});
