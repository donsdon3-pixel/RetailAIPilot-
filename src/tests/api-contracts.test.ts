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
    const res = handleMCPCall('get_low_stock_products', { store_id: 'store_01', threshold_days: 7 }, context);
    expect(Array.isArray(res)).toBe(true);
    if (res.length > 0) {
      expect(res[0]).toHaveProperty('sku');
      expect(res[0]).toHaveProperty('daily_sales_velocity');
      expect(res[0]).toHaveProperty('days_until_stockout');
    }
  });

  it('API-03: MCP tools/call get_dead_stock returns stagnant capital and discount plans', () => {
    const res = handleMCPCall('get_dead_stock', { organization_id: 'org_01', min_days: 60 }, context);
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBeGreaterThan(0);
    expect(res[0]).toHaveProperty('tied_up_capital');
    expect(res[0]).toHaveProperty('suggested_discount_percent');
  });

  it('API-04: MCP tools/call get_profitability returns financial breakdown', () => {
    const res = handleMCPCall('get_profitability', { store_id: 'store_01' }, context);
    expect(res).toHaveProperty('gross_sales');
    expect(res).toHaveProperty('cogs');
    expect(res).toHaveProperty('net_profit');
    expect(res).toHaveProperty('expense_breakdown');
  });

  it('API-05: MCP tools/call get_supplier_outstanding returns AP balances', () => {
    const res = handleMCPCall('get_supplier_outstanding', { organization_id: 'org_01' }, context);
    expect(Array.isArray(res)).toBe(true);
    expect(res[0]).toHaveProperty('outstanding_balance');
    expect(res[0]).toHaveProperty('escalation_status');
  });

  it('API-06: MCP tools/call generate_business_report returns executive dossier', () => {
    const res = handleMCPCall('generate_business_report', { organization_id: 'org_01', period_month: 'August 2026' }, context);
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
});
