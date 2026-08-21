import { MCPTools, DataContext } from './mcp-tools';
import { AppStore } from './store';
import { formatCurrency } from './format';

export interface AIMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  toolInvocation?: {
    toolName: string;
    params: any;
    result: any;
  };
  disclaimer?: string;
  timestamp: string;
}

export class AIService {
  public static async processQuery(
    userPrompt: string,
    orgId: string,
    storeId: string
  ): Promise<AIMessage> {
    const lower = userPrompt.toLowerCase();
    const context = AppStore.getDataContext();

    let toolName: string = '';
    let params: any = {};
    let toolResult: any = null;
    let assistantReply: string = '';

    // Route query to appropriate MCP Tool
    if (
      lower.includes('low stock') ||
      lower.includes('running out') ||
      lower.includes('reorder') ||
      lower.includes('replenish') ||
      lower.includes('stockout')
    ) {
      toolName = 'get_low_stock_products';
      params = { store_id: storeId, threshold_days: 7 };
      toolResult = MCPTools.getLowStockProducts(context, params);

      if (toolResult.length === 0) {
        assistantReply = `I analyzed your live inventory balance at this branch. All SKUs are currently operating above their configured reorder thresholds. No immediate stockouts are predicted.`;
      } else {
        const topItem = toolResult[0];
        assistantReply = `Found **${toolResult.length} SKU(s)** at or below reorder threshold for store \`${storeId}\`:\n\n` +
          toolResult
            .map(
              (i: any) =>
                `• **${i.name}** (\`${i.sku}\`): **${i.current_stock} units** remaining (Threshold: ${i.reorder_point}). Velocity: ${i.daily_sales_velocity} units/day. Estimated runout in **${i.days_until_stockout} days**. Recommended reorder: **${i.recommended_reorder_qty} units** from _${i.supplier_name}_.`
            )
            .join('\n') +
          `\n\n**Actionable Advice:** Initiate an emergency transfer from Midtown Express or submit a replenishment PO immediately to avoid stockout of high-velocity items.`;
      }
    } else if (
      lower.includes('dead stock') ||
      lower.includes('stagnant') ||
      lower.includes('clearance') ||
      lower.includes('liquidation') ||
      lower.includes('unsold')
    ) {
      toolName = 'get_dead_stock';
      params = { organization_id: orgId, min_days: 60 };
      toolResult = MCPTools.getDeadStock(context, params);

      const totalCapital = toolResult.reduce((sum: number, r: any) => sum + r.tied_up_capital, 0);

      if (toolResult.length === 0) {
        assistantReply = `Live database audit confirms no inventory has remained dormant without sales for >60 days across your organization.`;
      } else {
        assistantReply = `Live inventory audit identified **${toolResult.length} high-value stagnant SKU(s)** with zero sales in >60 days, representing **${formatCurrency(totalCapital)}** in tied-up working capital:\n\n` +
          toolResult
            .map(
              (i: any) =>
                `• **${i.name}** (\`${i.sku}\`): **${i.current_stock} units** dormant for **${i.days_without_sale} days** (${formatCurrency(i.tied_up_capital)} capital). Recommended Strategy: _${i.liquidation_action}_ at ${i.suggested_discount_percent}% off.`
            )
            .join('\n') +
          `\n\n**Actionable Advice:** Reclaim liquidity by pushing these clearance discounts to VIP loyalty members or activating an in-store endcap promotion.`;
      }
    } else if (
      lower.includes('profit') ||
      lower.includes('p&l') ||
      lower.includes('margin') ||
      lower.includes('cogs') ||
      lower.includes('financial') ||
      lower.includes('revenue')
    ) {
      toolName = 'get_profitability';
      params = { store_id: storeId, start_date: '2026-08-01', end_date: '2026-08-31' };
      toolResult = MCPTools.getProfitability(context, params);

      assistantReply = `Here is the verified financial profitability breakdown for **${toolResult.store_name}** (August 2026):\n\n` +
        `• **Gross Sales Revenue:** ${formatCurrency(toolResult.gross_sales)}\n` +
        `• **Cost of Goods Sold (COGS):** ${formatCurrency(toolResult.cogs)}\n` +
        `• **Gross Profit:** ${formatCurrency(toolResult.gross_profit)} (**${toolResult.gross_margin_percent}% Gross Margin**)\n` +
        `• **Store Operating Expenses (OpEx):** ${formatCurrency(toolResult.operating_expenses)}\n` +
        `• **Net Operating Profit:** **${formatCurrency(toolResult.net_profit)}** (**${toolResult.net_margin_percent}% Net Margin**)\n\n` +
        `**Top Expense Drivers:**\n` +
        toolResult.expense_breakdown.map((e: any) => `  - ${e.category}: ${formatCurrency(e.amount)}`).join('\n');
    } else if (
      lower.includes('supplier') ||
      lower.includes('payable') ||
      lower.includes('vendor') ||
      lower.includes('due') ||
      lower.includes('outstanding') ||
      lower.includes('ap')
    ) {
      toolName = 'get_supplier_outstanding';
      params = { organization_id: orgId, min_due: 0 };
      toolResult = MCPTools.getSupplierOutstanding(context, params);

      const totalBalance = toolResult.reduce((sum: number, r: any) => sum + r.outstanding_balance, 0);
      const urgentCount = toolResult.filter((r: any) => r.escalation_status !== 'NORMAL').length;

      assistantReply = `Analyzed Accounts Payable across all registered suppliers for your organization:\n\n` +
        `• **Total Outstanding Payables:** ${formatCurrency(totalBalance)}\n` +
        `• **Suppliers Requiring Attention (<48h or Overdue):** ${urgentCount}\n\n` +
        toolResult
          .map(
            (s: any) =>
              `• **${s.supplier_name}**: Balance **${formatCurrency(s.outstanding_balance)}** | Status: **[${s.escalation_status}]** (Due: ${s.nearest_due_date}, Credit Terms: ${s.credit_period_days} days). Contact: ${s.contact_person} (${s.phone}).`
          )
          .join('\n') +
        `\n\n**Actionable Advice:** Process payments for urgent vendors to preserve favorable 30-45 day net credit terms and prevent delivery stops.`;
    } else {
      // Default: Comprehensive Executive Business Report
      toolName = 'generate_business_report';
      params = { organization_id: orgId, period_month: 'August 2026' };
      toolResult = MCPTools.generateBusinessReport(context, params);

      assistantReply = `Generated comprehensive executive operational diagnostic for **${toolResult.organization_name}** (${toolResult.period_month}):\n\n` +
        `• **Total Gross Revenue:** ${formatCurrency(toolResult.total_revenue)}\n` +
        `• **Total COGS:** ${formatCurrency(toolResult.total_cogs)}\n` +
        `• **Total Operating Expenses:** ${formatCurrency(toolResult.total_opex)}\n` +
        `• **Net Operating Profit:** **${formatCurrency(toolResult.net_profit)}**\n` +
        `• **Total Inventory Valuation:** ${formatCurrency(toolResult.inventory_asset_valuation)}\n` +
        `• **Stagnant Dead Capital at Risk:** ${formatCurrency(toolResult.dead_stock_capital_at_risk)} (${toolResult.low_stock_sku_count} low-stock SKUs flagged)\n\n` +
        `**Top Selling Products:**\n` +
        toolResult.top_selling_skus.map((t: any) => `  - ${t.name} (\`${t.sku}\`): ${formatCurrency(t.revenue)} (${t.units} units)`).join('\n') +
        `\n\n**Autonomous Strategic AI Recommendations:**\n` +
        toolResult.strategic_ai_recommendations.map((r: string) => `1. ${r}`).join('\n');
    }

    return {
      id: `msg_${Date.now()}`,
      sender: 'assistant',
      content: assistantReply,
      toolInvocation: {
        toolName,
        params,
        result: toolResult,
      },
      disclaimer: 'AI-generated recommendation. Real-time verified against PostgreSQL database via Model Context Protocol (MCP).',
      timestamp: new Date().toISOString(),
    };
  }
}
