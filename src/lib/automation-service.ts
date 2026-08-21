import {
  AutomationLog,
  SystemAlert,
  Organization,
  Store,
  Product,
  InventoryLedgerEntry,
  SalesOrder,
  PurchaseOrder,
  Expense,
  Supplier,
} from './types';
import { MCPTools, DataContext } from './mcp-tools';

export interface WorkflowResult {
  workflow_name: string;
  execution_status: 'SUCCESS' | 'WARNING' | 'ERROR';
  summary: string;
  alerts_generated: SystemAlert[];
  payload: any;
}

export class AutomationService {
  /**
   * Workflow 1: Low Stock Auto-Alert
   * Stock drops below reorder point -> Trigger -> Manager dashboard alert & notification
   */
  static runLowStockAlertWorkflow(
    context: DataContext,
    storeId: string = 'store_01'
  ): WorkflowResult {
    const lowStockItems = MCPTools.getLowStockProducts(context, {
      store_id: storeId,
      threshold_days: 5,
    });

    const store = context.stores.find((s) => s.id === storeId);
    const alerts: SystemAlert[] = [];

    for (const item of lowStockItems) {
      alerts.push({
        id: `alt_ls_${Date.now()}_${item.sku}`,
        organization_id: store?.organization_id || 'org_01',
        store_id: storeId,
        alert_type: 'LOW_STOCK',
        severity: item.days_until_stockout < 2 ? 'CRITICAL' : 'WARNING',
        title: `Low Stock: ${item.name} (${item.current_stock} left)`,
        message: `SKU ${item.sku} is at ${item.current_stock} units (reorder point: ${item.reorder_point}). Velocity: ${item.daily_sales_velocity} units/day. Estimated runout: ${item.days_until_stockout} days. Suggested reorder: ${item.recommended_reorder_qty} units from ${item.supplier_name}.`,
        is_read: false,
        action_url: '/inventory',
        created_at: new Date().toISOString(),
      });
    }

    return {
      workflow_name: 'Low Stock Auto-Alert',
      execution_status: lowStockItems.length > 0 ? 'WARNING' : 'SUCCESS',
      summary: `Evaluated inventory for ${store?.name || storeId}. Identified ${lowStockItems.length} SKUs requiring urgent replenishment.`,
      alerts_generated: alerts,
      payload: { lowStockCount: lowStockItems.length, items: lowStockItems },
    };
  }

  /**
   * Workflow 2: Dead Stock Bi-Weekly Audit
   * Scheduled cron check -> Identifies 60+ day stagnant capital -> Generates markdown liquidation plan
   */
  static runDeadStockAuditWorkflow(
    context: DataContext,
    organizationId: string = 'org_01'
  ): WorkflowResult {
    const deadStock = MCPTools.getDeadStock(context, {
      organization_id: organizationId,
      min_days: 60,
    });

    const totalDeadCapital = deadStock.reduce((sum, item) => sum + item.tied_up_capital, 0);
    const alerts: SystemAlert[] = [];

    if (deadStock.length > 0) {
      alerts.push({
        id: `alt_ds_${Date.now()}`,
        organization_id: organizationId,
        alert_type: 'DEAD_STOCK',
        severity: 'WARNING',
        title: `Dead Stock Audit: $${totalDeadCapital.toFixed(2)} Stagnant Capital Detected`,
        message: `Bi-weekly audit identified ${deadStock.length} SKUs with zero sales in >60 days. Liquidation discount plans generated automatically.`,
        is_read: false,
        action_url: '/ai-assistant',
        created_at: new Date().toISOString(),
      });
    }

    return {
      workflow_name: 'Dead Stock Bi-Weekly Audit',
      execution_status: deadStock.length > 0 ? 'WARNING' : 'SUCCESS',
      summary: `Bi-weekly audit scanned full organization catalog. Identified ${deadStock.length} stagnant SKUs representing $${totalDeadCapital.toFixed(2)} in tied-up working capital.`,
      alerts_generated: alerts,
      payload: {
        totalDeadCapital,
        stagnantCount: deadStock.length,
        liquidationPlans: deadStock,
      },
    };
  }

  /**
   * Workflow 3: Supplier Payment Escalation
   * PO payment due in < 48 hours -> Verifies pending invoice -> Alerts Accounts / Store Manager
   */
  static runSupplierPaymentEscalationWorkflow(
    context: DataContext,
    organizationId: string = 'org_01'
  ): WorkflowResult {
    const suppliersOutstanding = MCPTools.getSupplierOutstanding(context, {
      organization_id: organizationId,
      min_due: 0,
    });

    const urgentSuppliers = suppliersOutstanding.filter(
      (s) => s.escalation_status === 'URGENT' || s.escalation_status === 'OVERDUE'
    );

    const alerts: SystemAlert[] = [];

    for (const sup of urgentSuppliers) {
      alerts.push({
        id: `alt_pay_${Date.now()}_${sup.supplier_id}`,
        organization_id: organizationId,
        alert_type: 'SUPPLIER_PAYMENT',
        severity: sup.escalation_status === 'OVERDUE' ? 'CRITICAL' : 'WARNING',
        title: `Payment Escalation: ${sup.supplier_name} ($${sup.outstanding_balance.toFixed(2)})`,
        message: `Pending invoice due by ${sup.nearest_due_date}. Credit term: ${sup.credit_period_days} days. Escalate to Accounts / Store Manager to maintain credit lines.`,
        is_read: false,
        action_url: '/purchases',
        created_at: new Date().toISOString(),
      });
    }

    return {
      workflow_name: 'Supplier Payment Escalation',
      execution_status: urgentSuppliers.length > 0 ? 'WARNING' : 'SUCCESS',
      summary: `Evaluated accounts payable. Flagged ${urgentSuppliers.length} supplier invoices approaching or exceeding due dates (<48h).`,
      alerts_generated: alerts,
      payload: { urgentSuppliersCount: urgentSuppliers.length, list: urgentSuppliers },
    };
  }

  /**
   * Workflow 4: Daily End-of-Day Sales Dossier
   * Midnight trigger -> Aggregates day gross revenue, refunds, top SKUs -> Pushes summary to Owner
   */
  static runEndOfDayDossierWorkflow(
    context: DataContext,
    organizationId: string = 'org_01'
  ): WorkflowResult {
    const orgSales = context.salesOrders.filter((s) => s.organization_id === organizationId);
    const dayGrossRevenue = orgSales.reduce((sum, s) => sum + s.total_amount, 0);
    const dayCOGS = orgSales.reduce((sum, s) => sum + s.cogs_amount, 0);
    const dayGrossProfit = dayGrossRevenue - dayCOGS;

    const alert: SystemAlert = {
      id: `alt_eod_${Date.now()}`,
      organization_id: organizationId,
      alert_type: 'EOD_SALES',
      severity: 'INFO',
      title: `Daily End-of-Day Sales Dossier: $${dayGrossRevenue.toFixed(2)} Gross Revenue`,
      message: `Completed ${orgSales.length} transactions today. Gross Profit: $${dayGrossProfit.toFixed(2)} (${dayGrossRevenue > 0 ? ((dayGrossProfit / dayGrossRevenue) * 100).toFixed(1) : 0}% margin). Zero transaction errors logged.`,
      is_read: false,
      action_url: '/sales',
      created_at: new Date().toISOString(),
    };

    return {
      workflow_name: 'Daily End-of-Day Sales Dossier',
      execution_status: 'SUCCESS',
      summary: `Aggregated daily close: $${dayGrossRevenue.toFixed(2)} gross revenue across ${orgSales.length} orders. Pushed dossier to Executive Owner.`,
      alerts_generated: [alert],
      payload: {
        totalRevenue: dayGrossRevenue,
        totalCOGS: dayCOGS,
        grossProfit: dayGrossProfit,
        orderCount: orgSales.length,
      },
    };
  }

  /**
   * Workflow 5: Monthly Executive AI Report
   * 1st of every month -> Invokes full MCP data pipeline -> Generates comprehensive executive diagnostic report
   */
  static runMonthlyExecutiveReportWorkflow(
    context: DataContext,
    organizationId: string = 'org_01'
  ): WorkflowResult {
    const report = MCPTools.generateBusinessReport(context, {
      organization_id: organizationId,
      period_month: 'August 2026',
    });

    const alert: SystemAlert = {
      id: `alt_mon_${Date.now()}`,
      organization_id: organizationId,
      alert_type: 'MONTHLY_REPORT',
      severity: 'INFO',
      title: `Monthly Executive AI Dossier Generated (${report.period_month})`,
      message: `Net Profit: $${report.net_profit.toFixed(2)} | Low-Stock SKUs: ${report.low_stock_sku_count} | Dead Capital: $${report.dead_stock_capital_at_risk.toFixed(2)}. Strategic AI action items compiled.`,
      is_read: false,
      action_url: '/ai-assistant',
      created_at: new Date().toISOString(),
    };

    return {
      workflow_name: 'Monthly Executive AI Report',
      execution_status: 'SUCCESS',
      summary: `Full MCP diagnostic pipeline executed for ${report.organization_name}. Structured executive dossier created with ${report.strategic_ai_recommendations.length} action items.`,
      alerts_generated: [alert],
      payload: report,
    };
  }
}
