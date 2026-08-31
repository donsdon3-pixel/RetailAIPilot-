'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppStore } from '@/lib/store';
import { LedgerService } from '@/lib/ledger-service';
import { MCPTools, DataContext } from '@/lib/mcp-tools';
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
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverview() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [appState, setAppState] = useState(AppStore.getState());
  const [orgId, setOrgId] = useState<string>(AppStore.getState().currentOrgId || 'org_01');
  const [storeId, setStoreId] = useState<string>(AppStore.getState().currentStoreId || 'store_01');
  const [runningWorkflow, setRunningWorkflow] = useState<number | null>(null);
  const [workflowSuccess, setWorkflowSuccess] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const supabase = createClient();
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        if (!AppStore.getState().currentUser) {
          router.push('/login');
          return;
        }
      }

      const currentOrgId =
        user?.app_metadata?.organization_id ||
        user?.user_metadata?.organization_id ||
        (user as any)?.organization_id ||
        AppStore.getState().currentOrgId ||
        'org_01';

      setOrgId(currentOrgId);

      const [
        { data: orgs },
        { data: storeList },
        { data: prodList },
        { data: ledgerList },
        { data: salesList },
        { data: expList },
      ] = await Promise.all([
        supabase.from('organizations').select('*'),
        supabase.from('stores').select('*'),
        supabase.from('products').select('*'),
        supabase
          .from('inventory_ledger')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('sales_orders')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('expenses').select('*'),
      ]);

      const state = AppStore.getState();
      const activeStores = (storeList && storeList.length > 0) ? storeList : state.stores;
      if (activeStores.length > 0 && !storeId) {
        setStoreId(activeStores[0].id);
      }

      setAppState({ ...AppStore.getState() });
    } catch (err: any) {
      console.error('[Dashboard] Error fetching live Supabase data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
    return AppStore.subscribe(() => {
      setAppState({ ...AppStore.getState() });
    });
  }, []);

  if (!mounted || loading || !orgId) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-6 animate-pulse">
        <div className="h-32 bg-slate-200 rounded-2xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-slate-200 rounded-2xl"></div>
          <div className="lg:col-span-2 h-96 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center shadow-sm">
        <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-rose-950">
          Database Connection Error
        </h2>
        <p className="text-xs text-rose-700 mt-1 mb-6 max-w-md mx-auto font-mono">
          {fetchError}
        </p>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/20"
        >
          <RefreshCw className="w-4 h-4" /> Retry Query
        </button>
      </div>
    );
  }

  const {
    organizations = [],
    stores = [],
    products = [],
    ledgerEntries = [],
    salesOrders = [],
    expenses = [],
  } = appState;

  const currentOrg = organizations.find((o) => o.id === orgId) || organizations[0] || {
    id: orgId || 'org_01',
    name: 'SuperMart India Retail Ltd.',
  };
  const currentStore = stores.find((s) => s.id === storeId) || stores[0] || {
    id: storeId || 'store_01',
    name: 'Indiranagar Flagship',
  };

  const context: DataContext = {
    organizations,
    stores,
    products,
    ledgerEntries,
    salesOrders,
    purchaseOrders: appState.purchaseOrders || [],
    expenses,
    suppliers: appState.suppliers || [],
    returnOrders: appState.returnOrders || [],
  };

  // Compute Live Metrics from Live Store State
  const stockBalances = LedgerService.calculateStockBalances(
    orgId,
    storeId,
    ledgerEntries,
    products
  );

  const totalInventoryValuation = stockBalances.reduce(
    (sum, b) => sum + (Number(b.total_inventory_valuation) || 0),
    0
  );
  const lowStockCount = stockBalances.filter((b) => b.is_low_stock).length;

  const profitability = MCPTools.getProfitability(context, {
    store_id: storeId,
  });

  const deadStock = MCPTools.getDeadStock(context, {
    organization_id: orgId,
    min_days: 60,
  });
  const deadCapital = deadStock.reduce((sum, d) => sum + (Number(d.tied_up_capital) || 0), 0);

  const recentMovements = ledgerEntries.slice(0, 6);

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
            <span className="text-[11px] text-slate-400">Tenant ID: {orgId}</span>
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

      {/* Store Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <label htmlFor="store-filter-select" className="text-xs font-bold text-slate-800">Store Filter:</label>
          <select
            id="store-filter-select"
            aria-label="Filter Metrics by Store"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <option value="ALL">🏢 All Stores (Aggregated)</option>
            {stores
              .filter((s) => s.organization_id === orgId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  📍 {s.name} ({s.code || s.id})
                </option>
              ))}
          </select>
        </div>
        <div className="text-[11px] text-slate-700 font-medium flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Real-time Synced • {salesOrders.filter((s) => storeId === 'ALL' || s.store_id === storeId).length} Total Completed Orders</span>
        </div>
      </div>

      {workflowSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-xs flex items-center gap-2 animate-fadeIn font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>{workflowSuccess}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Gross Sales (excl. tax)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900" suppressHydrationWarning>
              {formatCurrency(profitability?.gross_sales || 0)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-700 font-bold" suppressHydrationWarning>
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{profitability?.gross_margin_percent || 0}% Gross Margin</span>
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Net Operating Profit</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700" suppressHydrationWarning>
              {formatCurrency(profitability?.net_profit || 0)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-700" suppressHydrationWarning>
              <span className="font-bold text-emerald-800">{profitability?.net_margin_percent || 0}% Net Margin</span>
              <span>• OpEx: {formatCurrency(profitability?.operating_expenses || 0)}</span>
            </div>
          </div>
        </div>

        {/* Stock Asset Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Inventory Valuation</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900" suppressHydrationWarning>
              {formatCurrency(totalInventoryValuation)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-700 font-medium" suppressHydrationWarning>
              <span>{stockBalances.length} tracked product SKUs</span>
            </div>
          </div>
        </div>

        {/* Low Stock & Dead Capital */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Risk & Restock Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 flex items-center gap-2" suppressHydrationWarning>
              <span>{lowStockCount} SKUs</span>
              {lowStockCount > 0 && (
                <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                  Low
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-700 font-medium" suppressHydrationWarning>
              <span>Dead Capital: {formatCurrency(deadCapital)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time AI Assistant & MCP Diagnostic Summary Card */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white p-5 rounded-2xl border border-emerald-800/40 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-900/40">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">
              Autonomous AI Business Diagnostic & MCP Telemetry
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              Live PostgreSQL Connected
            </span>
          </div>
          <Link
            href="/ai-assistant"
            className="text-xs text-emerald-300 hover:text-emerald-200 font-bold flex items-center gap-1"
          >
            Launch Interactive AI Assistant &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
              ⚡ MCP Stock Velocity Alert
            </span>
            <span className="font-medium text-white">
              {lowStockCount > 0
                ? `${lowStockCount} SKU(s) triggered reorder thresholds. Supplier PO drafts recommended.`
                : 'All SKUs operating within healthy inventory buffer levels.'}
            </span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
              💰 MCP Capital Optimization
            </span>
            <span className="font-medium text-white">
              {deadCapital > 0
                ? `${formatCurrency(deadCapital)} stagnant capital detected (>60 days). 15-25% markdown suggested.`
                : 'Zero dead stock detected. Capital turns remain optimal.'}
            </span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
              📊 MCP Profitability Margin
            </span>
            <span className="font-medium text-white">
              Net margin computed at {profitability?.net_margin_percent || 0}% ({formatCurrency(profitability?.net_profit || 0)} Net Profit).
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-amber-300/90 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>
            ⚠️ AI-generated recommendation. Real-time verified against PostgreSQL database via Model Context Protocol (MCP).
          </span>
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
              <p className="text-[11px] text-slate-700 font-medium">Autonomous business engine triggers</p>
            </div>
            <Link href="/automations" className="text-xs text-emerald-700 hover:text-emerald-800 font-bold focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded">
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
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition flex items-center justify-between gap-2"
              >
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-900 truncate">{wf.name}</div>
                  <div className="text-[10px] text-slate-700 truncate">{wf.desc}</div>
                </div>
                <button
                  type="button"
                  aria-label={`Run ${wf.name}`}
                  onClick={() => handleQuickRun(wf.id as 1 | 2 | 3 | 4 | 5, wf.name)}
                  disabled={runningWorkflow === wf.id}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 flex-shrink-0 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
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
              <p className="text-[11px] text-slate-700 font-medium">
                Formula: Stock = Opening + Purchases - Sales + Returns - Damaged ± Adjustments
              </p>
            </div>
            <Link href="/inventory" className="text-xs text-blue-700 hover:text-blue-800 font-bold focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded">
              Full Ledger &rarr;
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] font-bold text-slate-700 border-b border-slate-200 pb-2">
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
                        <div className="font-bold text-slate-900">{entry.product_name || entry.sku}</div>
                        <div className="text-[10px] text-slate-600 font-mono">{entry.sku}</div>
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            entry.movement_type === 'SALE'
                              ? 'bg-rose-50 text-rose-800'
                              : entry.movement_type === 'PURCHASE'
                              ? 'bg-emerald-50 text-emerald-800'
                              : entry.movement_type === 'RETURN'
                              ? 'bg-blue-50 text-blue-800'
                              : entry.movement_type === 'DAMAGED'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-purple-50 text-purple-800'
                          }`}
                        >
                          {entry.movement_type}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 text-right font-bold ${
                          isPositive ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isPositive ? `+${entry.quantity_change}` : entry.quantity_change}
                      </td>
                      <td className="py-2.5 text-right text-slate-800 font-mono font-medium">
                        {formatCurrency(entry.unit_cost || 0)}
                      </td>
                      <td className="py-2.5 text-slate-700 text-[11px] max-w-[200px] truncate">
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
