import { describe, it, expect } from 'vitest';
import { AIService } from '../lib/ai-service';
import { MCPTools } from '../lib/mcp-tools';
import { AppStore } from '../lib/store';

describe('AI Agents & MCP Calling Test Suite (5 Cases)', () => {
  it('AI-01: Correct MCP tool triggering when querying low-stock SKUs', async () => {
    const res = await AIService.processQuery('Show me low stock items', 'org_01', 'store_01');
    expect(res.toolInvocation?.toolName).toBe('get_low_stock_products');
    expect(res.content).toContain('SKU');
  });

  it('AI-02: Correct MCP tool triggering when querying dead stock', async () => {
    const res = await AIService.processQuery('Find dead stock stagnant capital', 'org_01', 'store_01');
    expect(res.toolInvocation?.toolName).toBe('get_dead_stock');
    expect(res.content).toContain('stagnant');
  });

  it('AI-03: Hallucination guardrail check uses real live numbers from MCP tool result', async () => {
    const res = await AIService.processQuery('What is our store profitability?', 'org_01', 'store_01');
    expect(res.toolInvocation?.toolName).toBe('get_profitability');
    const profit = res.toolInvocation?.result.gross_sales;
    expect(res.content).toContain(`$${profit.toFixed(2)}`);
  });

  it('AI-04: Mandatory AI Disclaimer is always attached to assistant output', async () => {
    const res = await AIService.processQuery('Generate executive monthly business report', 'org_01', 'store_01');
    expect(res.disclaimer).toBeDefined();
    expect(res.disclaimer).toContain('AI-generated recommendation');
  });

  it('AI-05: MCP Tool Execution schema conforms to specification input contracts', () => {
    const context = AppStore.getDataContext();
    const supRes = MCPTools.getSupplierOutstanding(context, { organization_id: 'org_01' });
    expect(Array.isArray(supRes)).toBe(true);
    expect(supRes[0]).toHaveProperty('supplier_name');
    expect(supRes[0]).toHaveProperty('outstanding_balance');
    expect(supRes[0]).toHaveProperty('escalation_status');
  });
});
