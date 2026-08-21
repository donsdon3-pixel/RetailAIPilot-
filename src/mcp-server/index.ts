/**
 * RetailPilot AI - Model Context Protocol (MCP) Server
 * IRC-SD Main Capstone Project #2
 * Provides live database querying capabilities to LLMs and Autonomous Agents.
 */

import { MCPTools, DataContext } from '../lib/mcp-tools';
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

const defaultContext: DataContext = {
  organizations: INITIAL_ORGANIZATIONS,
  stores: INITIAL_STORES,
  products: INITIAL_PRODUCTS,
  ledgerEntries: INITIAL_LEDGER_ENTRIES,
  salesOrders: INITIAL_SALES_ORDERS,
  purchaseOrders: INITIAL_PURCHASE_ORDERS,
  expenses: INITIAL_EXPENSES,
  suppliers: INITIAL_SUPPLIERS,
};

export const MCP_TOOL_DEFINITIONS = [
  {
    name: 'get_low_stock_products',
    description: 'Queries SKUs where stock <= reorder threshold with velocity data',
    inputSchema: {
      type: 'object',
      properties: {
        store_id: { type: 'string', description: 'Store identifier to check' },
        threshold_days: { type: 'number', description: 'Stockout horizon in days' },
      },
      required: ['store_id'],
    },
  },
  {
    name: 'get_dead_stock',
    description: 'Identifies high-value inventory with zero recorded sales in 60+ days',
    inputSchema: {
      type: 'object',
      properties: {
        organization_id: { type: 'string', description: 'Organization tenant ID' },
        min_days: { type: 'number', description: 'Minimum dormant days (default 60)' },
      },
      required: ['organization_id'],
    },
  },
  {
    name: 'get_profitability',
    description: 'Computes Gross Sales - COGS - Store Operating Expenses for precise P&L',
    inputSchema: {
      type: 'object',
      properties: {
        store_id: { type: 'string', description: 'Store ID or "ALL"' },
        start_date: { type: 'string', description: 'ISO start date YYYY-MM-DD' },
        end_date: { type: 'string', description: 'ISO end date YYYY-MM-DD' },
      },
      required: ['store_id'],
    },
  },
  {
    name: 'get_supplier_outstanding',
    description: 'Aggregates unpaid accounts payable, credit terms, and due dates',
    inputSchema: {
      type: 'object',
      properties: {
        organization_id: { type: 'string', description: 'Organization tenant ID' },
        min_due: { type: 'number', description: 'Minimum balance filter' },
      },
      required: ['organization_id'],
    },
  },
  {
    name: 'generate_business_report',
    description: 'Generates structured JSON payload for executive AI business reports',
    inputSchema: {
      type: 'object',
      properties: {
        organization_id: { type: 'string', description: 'Organization tenant ID' },
        period_month: { type: 'string', description: 'Reporting period string e.g. "August 2026"' },
      },
      required: ['organization_id'],
    },
  },
];

export function handleMCPCall(toolName: string, args: any, context: DataContext = defaultContext) {
  switch (toolName) {
    case 'get_low_stock_products':
      return MCPTools.getLowStockProducts(context, args);
    case 'get_dead_stock':
      return MCPTools.getDeadStock(context, args);
    case 'get_profitability':
      return MCPTools.getProfitability(context, args);
    case 'get_supplier_outstanding':
      return MCPTools.getSupplierOutstanding(context, args);
    case 'generate_business_report':
      return MCPTools.generateBusinessReport(context, args);
    default:
      throw new Error(`Unknown MCP tool: ${toolName}`);
  }
}

// Stdio JSON-RPC runner for MCP CLI clients
if (typeof process !== 'undefined' && process.stdin && !process.env.NEXT_RUNTIME) {
  process.stdin.setEncoding('utf8');
  let buffer = '';

  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const req = JSON.parse(line);
        if (req.method === 'tools/list') {
          process.stdout.write(
            JSON.stringify({
              jsonrpc: '2.0',
              id: req.id,
              result: { tools: MCP_TOOL_DEFINITIONS },
            }) + '\n'
          );
        } else if (req.method === 'tools/call') {
          const result = handleMCPCall(req.params.name, req.params.arguments || {});
          process.stdout.write(
            JSON.stringify({
              jsonrpc: '2.0',
              id: req.id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
              },
            }) + '\n'
          );
        }
      } catch (e: any) {
        process.stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32603, message: e.message },
          }) + '\n'
        );
      }
    }
  });
}
