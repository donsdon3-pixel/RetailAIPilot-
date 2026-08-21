'use client';

import React, { useState, useEffect } from 'react';
import { AppStore, AppState } from '@/lib/store';
import { LedgerService } from '@/lib/ledger-service';
import { MCPTools } from '@/lib/mcp-tools';
import { formatCurrency } from '@/lib/format';
import {
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  Boxes,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverview() {
  const [state, setState] = useState<AppState>(AppStore.getState());
  const [runningWorkflow, setRunningWorkflow] = useState<number | null>(null);
  const [workflowSuccess, setWorkflowSuccess] = useState<string | null>(null);

  useEffect(() => {
    return AppStore.subscribe(() => {
      setState({ ...AppStore.getState() });
    });
  }, []);

  const currentOrg = state.organizations.find((o) => o.id === state.currentOrgId);
  const currentStore = state.stores.find((s) => s.id === state.currentStoreId);
  const context = AppStore.getDataContext();

  // Compute Live Metrics
  const stockBalances = LedgerService.calculateStockBalances(
    state.currentOrgId,
    state.currentStoreId,
    state.ledgerEntries,
    state.products
  );

  const totalInventoryValuation = stockBalances.reduce(
    (sum, b) => sum + b.total_inventory_valuation,
    0
  );
  const lowStockCount = stockBalances.filter((b) => b.is_low_stock).length;

  const profitability = MCPTools.getProfitability(context, {
    store_id: state.currentStoreId,
  });

  const deadStock = MCPTools.getDeadStock(context, {
    organization_id: state.currentOrgId,
    min_days: 60,
  });
  const deadCapital = deadStock.reduce((sum, d) => sum + d.tied_up_capital, 0);

  const orgSales = state.salesOrders.filter((s) => s.organization_id === state.currentOrgId);
  const recentMovements = state.ledgerEntries
    .filter((e) => e.organization_id === state.currentOrgId)
    .slice(0, 6);

  const handleQuickRun = (index: 1 | 2 | 3 | 4 | 5, name: string) => {
    setRunningWorkflow(index);
    setWorkflowSuccess(null);
    setTimeout(() => {
      const res = AppStore.runAutomation(index);
      setRunningWorkflow(null);
      setWorkflowSuccess(`Workflow "${name}" executed successfully! (${res.alerts_generated.length} alert created)`);
      setTimeout(() => setWorkflowSuccess(null), 5000);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {currentOrg?.name} • {currentStore?.name}
            </span>
            <span className="text-[11px] text-slate-400">Tenant ID: {state.currentOrgId}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Retail Operations & Intelligence Hub
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Real-time multi-tenant monitoring, immutable stock movements, live MCP business diagnostics, and automated workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/pos"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
          >
            <Zap className="w-4 h-4" />
            Open POS Terminal
          </Link>
          <Link
            href="/ai-assistant"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-semibold px-4 py-2.5 rounded-xl text-xs transition"
          >
            <Bot className="w-4 h-4 text-emerald-400" />
            AI MCP Assistant
          </Link>
        </div>
      </div>

      {workflowSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{workflowSuccess}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Gross Sales Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(profitability.gross_sales)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{profitability.gross_margin_percent}% Gross Margin</span>
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Net Operating Profit</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(profitability.net_profit)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <span>OpEx: {formatCurrency(profitability.operating_expenses)}</span>
            </div>
          </div>
        </div>

        {/* Stock Asset Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Inventory Valuation</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalInventoryValuation)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <span>{stockBalances.length} tracked product SKUs</span>
            </div>
          </div>
        </div>

        {/* Low Stock & Dead Capital */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Risk & Restock Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span>{lowStockCount} SKUs</span>
              {lowStockCount > 0 && (
                <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                  Low
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-600">
              <span>{formatCurrency(deadCapital)} dead capital (&gt;60d)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: 5 Automated Workflows Runner & Recent Ledger Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 5 Mandatory Automated Workflows Trigger Panel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" /> 5 Automated Workflows
              </h3>
              <p className="text-[11px] text-slate-500">Autonomous business engine triggers</p>
            </div>
            <Link href="/automations" className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">
              View All &rarr;
            </Link>
          </div>

          <div className="mt-4 space-y-2.5">
            {[
              { id: 1, name: '1. Low Stock Auto-Alert', desc: 'SKU <= reorder point webhook trigger' },
              { id: 2, name: '2. Dead Stock Bi-Weekly Audit', desc: 'Identifies 60+ day stagnant capital' },
              { id: 3, name: '3. Supplier Payment Escalation', desc: 'PO payment due <48 hours alerts' },
              { id: 4, name: '4. Daily End-of-Day Dossier', desc: 'Midnight gross revenue summary' },
              { id: 5, name: '5. Monthly Executive AI Report', desc: 'Full MCP diagnostic pipeline' },
            ].map((wf) => (
              <div
                key={wf.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/80 transition flex items-center justify-between gap-2"
              >
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-800 truncate">{wf.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{wf.desc}</div>
                </div>
                <button
                  onClick={() => handleQuickRun(wf.id as 1 | 2 | 3 | 4 | 5, wf.name)}
                  disabled={runningWorkflow === wf.id}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 flex-shrink-0 disabled:opacity-50"
                >
                  {runningWorkflow === wf.id ? (
                    <>
                      <Clock className="w-3 h-3 animate-spin" /> Running
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3 text-emerald-400" /> Run
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Immutable Stock Movement Ledger Live Feed */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-600" /> Immutable Stock Movement Ledger
              </h3>
              <p className="text-[11px] text-slate-500">
                Formula: Stock = Opening + Purchases - Sales + Returns - Damaged ± Adjustments
              </p>
            </div>
            <Link href="/inventory" className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
              Full Ledger &rarr;
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 border-b border-slate-100 pb-2">
                  <th className="pb-2">SKU / Product</th>
                  <th className="pb-2">Movement</th>
                  <th className="pb-2 text-right">Quantity</th>
                  <th className="pb-2 text-right">Unit Cost</th>
                  <th className="pb-2">Reason / Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentMovements.map((entry) => {
                  const isPositive = entry.quantity_change > 0;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 font-medium text-slate-800">
                        <div className="font-semibold text-slate-900">{entry.product_name || entry.sku}</div>
                        <div className="text-[10px] text-slate-400">{entry.sku}</div>
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            entry.movement_type === 'SALE'
                              ? 'bg-rose-50 text-rose-700'
                              : entry.movement_type === 'PURCHASE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : entry.movement_type === 'RETURN'
                              ? 'bg-blue-50 text-blue-700'
                              : entry.movement_type === 'DAMAGED'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {entry.movement_type}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 text-right font-bold ${
                          isPositive ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isPositive ? `+${entry.quantity_change}` : entry.quantity_change}
                      </td>
                      <td className="py-2.5 text-right text-slate-600 font-mono">
                        {formatCurrency(entry.unit_cost)}
                      </td>
                      <td className="py-2.5 text-slate-500 text-[11px] max-w-[200px] truncate">
                        {entry.reason || entry.reference_id || 'System Entry'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
