'use client';

import React, { useState, useEffect } from 'react';
import { AppStore, AppState } from '@/lib/store';
import { SalesOrder, ReturnOrder, ReturnItem } from '@/lib/types';
import { LedgerService } from '@/lib/ledger-service';
import { formatCurrency } from '@/lib/format';
import {
  Receipt,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Eye,
  ShieldCheck,
  Search,
  FileSpreadsheet,
  Calculator,
  Plus,
  Minus,
  Sparkles,
  AlertTriangle,
  History,
  Check,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

interface ReturnLineState {
  productId: string;
  quantity: number;
  condition: 'RESTOCKABLE' | 'DAMAGED';
}

export default function SalesHistoryPage() {
  const [state, setState] = useState<AppState>(AppStore.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditOrder, setAuditOrder] = useState<SalesOrder | null>(null);

  // Return state
  const [returnLines, setReturnLines] = useState<Record<string, ReturnLineState>>({});
  const [returnReason, setReturnReason] = useState('Customer changed mind / unopened');
  const [returnError, setReturnError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchLiveSales = async () => {
    try {
      AppStore.initClient();
      setState({ ...AppStore.getState() });

      const supabase = createClient();
      const { data: salesData } = await supabase
        .from('sales_orders')
        .select('*, items:sales_items(*), payments(*)')
        .order('created_at', { ascending: false });

      const { data: returnsData } = await supabase
        .from('returns')
        .select('*, items:return_items(*)')
        .order('created_at', { ascending: false });

      if (salesData && salesData.length > 0) {
        const existingIds = new Set(salesData.map((s: any) => s.id));
        const mergedSales = [
          ...salesData,
          ...AppStore.getState().salesOrders.filter((s) => !existingIds.has(s.id)),
        ];
        AppStore.getState().salesOrders = mergedSales;
      }

      if (returnsData && returnsData.length > 0) {
        const existingReturnIds = new Set(returnsData.map((r: any) => r.id));
        const mergedReturns = [
          ...returnsData,
          ...(AppStore.getState().returnOrders || []).filter((r) => !existingReturnIds.has(r.id)),
        ];
        AppStore.getState().returnOrders = mergedReturns;
      }

      AppStore.saveToLocalStorage();
      setState({ ...AppStore.getState() });
    } catch (e) {
      console.warn('[Sales Page Fetch Warning]', e);
    }
  };

  useEffect(() => {
    fetchLiveSales();
    return AppStore.subscribe(() => {
      setState({ ...AppStore.getState() });
    });
  }, []);

  const orgSales = state.salesOrders.filter((s) => s.organization_id === state.currentOrgId);
  const filteredSales = orgSales.filter(
    (s) =>
      (s.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open return modal and initialize return lines
  const handleOpenReturnModal = (order: SalesOrder) => {
    setSelectedOrder(order);
    setReturnError(null);
    setReturnReason('Customer changed mind / unopened');

    const initialLines: Record<string, ReturnLineState> = {};
    for (const item of order.items) {
      const alreadyReturned = LedgerService.getAlreadyReturnedQuantity(order.id, item.product_id, state.returnOrders || []);
      const remaining = Math.max(0, item.quantity - alreadyReturned);
      initialLines[item.product_id] = {
        productId: item.product_id,
        quantity: remaining > 0 ? 1 : 0, // Default to 1 if available
        condition: 'RESTOCKABLE',
      };
    }
    setReturnLines(initialLines);
    setShowReturnModal(true);
  };

  // "Select All / Full Refund" button action
  const handleSelectAllForReturn = () => {
    if (!selectedOrder) return;
    const allLines: Record<string, ReturnLineState> = {};
    for (const item of selectedOrder.items) {
      const alreadyReturned = LedgerService.getAlreadyReturnedQuantity(selectedOrder.id, item.product_id, state.returnOrders || []);
      const remaining = Math.max(0, item.quantity - alreadyReturned);
      allLines[item.product_id] = {
        productId: item.product_id,
        quantity: remaining,
        condition: returnLines[item.product_id]?.condition || 'RESTOCKABLE',
      };
    }
    setReturnLines(allLines);
    setReturnError(null);
  };

  // "Clear" button action
  const handleClearReturnQuantities = () => {
    if (!selectedOrder) return;
    const cleared: Record<string, ReturnLineState> = {};
    for (const item of selectedOrder.items) {
      cleared[item.product_id] = {
        productId: item.product_id,
        quantity: 0,
        condition: returnLines[item.product_id]?.condition || 'RESTOCKABLE',
      };
    }
    setReturnLines(cleared);
    setReturnError(null);
  };

  // Update specific item quantity with clamp
  const handleQuantityChange = (productId: string, newQty: number, maxReturnable: number) => {
    const clamped = Math.max(0, Math.min(maxReturnable, Math.floor(newQty || 0)));
    setReturnLines((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity: clamped,
      },
    }));
    setReturnError(null);
  };

  // Toggle item condition
  const handleToggleCondition = (productId: string, condition: 'RESTOCKABLE' | 'DAMAGED') => {
    setReturnLines((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        condition,
      },
    }));
  };

  // Compute live prorated refund
  const itemsForCalculation = selectedOrder
    ? Object.values(returnLines).map((l) => ({
        product_id: l.productId,
        quantity: l.quantity,
      }))
    : [];

  const liveProrated = selectedOrder
    ? LedgerService.calculateProratedRefund(selectedOrder, itemsForCalculation)
    : { subtotalRefund: 0, taxRefund: 0, totalRefund: 0, itemBreakdown: {} };

  const totalReturnQty = Object.values(returnLines).reduce((sum, l) => sum + (l.quantity || 0), 0);

  // Process return submission
  const handleProcessReturn = () => {
    if (!selectedOrder) return;

    if (totalReturnQty <= 0) {
      setReturnError('Please specify a return quantity greater than 0 for at least one item.');
      return;
    }

    const itemsToSubmit: ReturnItem[] = [];

    for (const item of selectedOrder.items) {
      const line = returnLines[item.product_id];
      if (line && line.quantity > 0) {
        const alreadyReturned = LedgerService.getAlreadyReturnedQuantity(selectedOrder.id, item.product_id, state.returnOrders || []);
        const remaining = item.quantity - alreadyReturned;

        if (line.quantity > remaining) {
          setReturnError(
            `Cannot return more items than originally purchased. ${alreadyReturned} item(s) already returned for ${item.product_name}. Maximum returnable: ${remaining}.`
          );
          return;
        }

        const lineRefund = liveProrated.itemBreakdown[item.product_id] || 0;

        itemsToSubmit.push({
          id: `reti_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          return_id: '',
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          quantity: line.quantity,
          refund_unit_price: line.quantity > 0 ? parseFloat((lineRefund / line.quantity).toFixed(2)) : item.unit_price,
          condition: line.condition,
        });
      }
    }

    const returnNumber = `RET-${Date.now().toString().slice(-6)}`;
    const returnOrder: ReturnOrder = {
      id: `ret_${Date.now()}`,
      organization_id: state.currentOrgId,
      store_id: selectedOrder.store_id,
      sales_order_id: selectedOrder.id,
      invoice_number: selectedOrder.invoice_number,
      return_number: returnNumber,
      refund_amount: liveProrated.totalRefund,
      reason: returnReason,
      processed_by: state.currentUser.id,
      processed_by_name: state.currentUser.full_name,
      items: itemsToSubmit,
      created_at: new Date().toISOString(),
    };

    itemsToSubmit.forEach((i) => (i.return_id = returnOrder.id));

    try {
      const result = AppStore.processReturn(returnOrder);

      // Persist to backend API & Supabase
      fetch('/api/pos/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_order_id: returnOrder.sales_order_id,
          reason: returnOrder.reason,
          order: selectedOrder,
          items: itemsToSubmit.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            condition: i.condition,
          })),
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.warn('[Return API Persistence Failed]:', errData);
          } else {
            console.log('[Return Persisted to Supabase Successfully]');
          }
        })
        .catch((err) => console.warn('[Return API Persistence Error]', err));

      setShowReturnModal(false);
      setSelectedOrder(null);
      setActionSuccess(
        `Return ${returnNumber} processed successfully! Refund amount: ${formatCurrency(result.refund_amount)}. Status: ${result.sales_order_status}.`
      );
      setTimeout(() => setActionSuccess(null), 6000);
    } catch (err: any) {
      setReturnError(err.message || 'Error processing return.');
    }
  };

  const totalInvoicedSum = orgSales.reduce((acc, s) => acc + s.total_amount, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-xl shadow-md flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-xs font-bold text-emerald-700">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            Sales Transactions, GST Invoices & Partial Returns
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Auditable transaction history with GST itemization, partial item returns with quantity limits, and prorated discount reversals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Invoiced (incl. GST)</span>
            <span className="font-mono font-black text-slate-900 text-sm">{formatCurrency(totalInvoicedSum)}</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              aria-label="Search invoice number or customer"
              placeholder="Search invoice # or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none w-60"
            />
          </div>
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Items Summary</th>
                <th className="p-3.5 text-right">Subtotal</th>
                <th className="p-3.5 text-right">GST (12%)</th>
                <th className="p-3.5 text-right">Invoiced Total</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-mono font-bold text-slate-900">
                    <button
                      onClick={() => {
                        setAuditOrder(sale);
                        setShowAuditModal(true);
                      }}
                      className="text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1"
                    >
                      <span>{sale.invoice_number}</span>
                      <Eye className="w-3 h-3 text-slate-400" />
                    </button>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-500">
                    {new Date(sale.created_at).toLocaleDateString()} {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3.5 font-medium text-slate-800">
                    {sale.customer_name || 'Walk-in Guest'}
                  </td>
                  <td className="p-3.5 text-slate-600 max-w-[220px] truncate">
                    {sale.items.map((i) => `${i.product_name} (×${i.quantity})`).join(', ')}
                  </td>
                  <td className="p-3.5 text-right font-mono text-slate-600">
                    {formatCurrency(sale.subtotal)}
                  </td>
                  <td className="p-3.5 text-right font-mono text-slate-500">
                    {formatCurrency(sale.tax_amount)}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                    {formatCurrency(sale.total_amount)}
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        sale.status === 'RETURNED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : sale.status === 'PARTIALLY_RETURNED'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {sale.status === 'PARTIALLY_RETURNED' ? 'PARTIAL RETURN' : sale.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setAuditOrder(sale);
                          setShowAuditModal(true);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                        title="Inspect itemized math & GST breakdown"
                      >
                        <Calculator className="w-3 h-3 text-emerald-600" /> Inspect
                      </button>

                      {sale.status !== 'RETURNED' && (
                        <button
                          onClick={() => handleOpenReturnModal(sale)}
                          className="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Return
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Itemization & Mathematical Audit Modal */}
      {showAuditModal && auditOrder && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Tax Invoice Audit Breakdown: {auditOrder.invoice_number}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    GSTIN: 29AAAAA1234A1Z5 • Store: {auditOrder.store_name}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="text-sm font-bold text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* Meta Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">Customer:</span>
                <span className="font-bold text-slate-800">{auditOrder.customer_name || 'Walk-in'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Cashier:</span>
                <span className="font-bold text-slate-800">{auditOrder.cashier_name || 'Amit Verma'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Date:</span>
                <span className="font-mono text-slate-800">{new Date(auditOrder.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Status:</span>
                <span className="font-bold text-emerald-700">{auditOrder.status}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Item & SKU</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Unit Cost (COGS)</th>
                    <th className="p-2.5 text-right">Line Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditOrder.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-medium text-slate-800">
                        <div>{item.product_name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-700">×{item.quantity}</td>
                      <td className="p-2.5 text-right font-mono text-slate-600">{formatCurrency(item.unit_price)}</td>
                      <td className="p-2.5 text-right font-mono text-slate-400">{formatCurrency(item.unit_cost)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Reconciled Financial Math Breakdown */}
            <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>1. Gross Subtotal (Sum of Items, excl. GST):</span>
                <span className="font-bold text-white">{formatCurrency(auditOrder.subtotal)}</span>
              </div>
              {auditOrder.discount_amount > 0 && (
                <div className="flex justify-between text-amber-300">
                  <span>2. VIP / Promotional Discount:</span>
                  <span>- {formatCurrency(auditOrder.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                <span>3. Taxable Net Value:</span>
                <span>{formatCurrency(auditOrder.taxable_amount || auditOrder.subtotal - auditOrder.discount_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>4. Central GST (CGST 6.0%):</span>
                <span>{formatCurrency(auditOrder.cgst_amount || auditOrder.tax_amount / 2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>5. State GST (SGST 6.0%):</span>
                <span>{formatCurrency(auditOrder.sgst_amount || auditOrder.tax_amount / 2)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold text-sm pt-2 border-t border-slate-700">
                <span>6. Total Invoiced Amount Due:</span>
                <span className="text-base">{formatCurrency(auditOrder.total_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                <span>Payment Tenders:</span>
                <span>{auditOrder.payments.map((p) => `${p.payment_method} (${formatCurrency(p.amount)})`).join(' + ')}</span>
              </div>
            </div>

            {/* Return History for this Invoice */}
            {AppStore.getReturnsForOrder(auditOrder.id).length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-900">
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span>Processed Returns for this Invoice:</span>
                </div>
                <div className="space-y-1.5 text-xs text-rose-800">
                  {AppStore.getReturnsForOrder(auditOrder.id).map((ret) => (
                    <div key={ret.id} className="bg-white p-2 rounded-lg border border-rose-200 flex justify-between items-center">
                      <div>
                        <span className="font-mono font-bold text-slate-900">{ret.return_number}</span>
                        <span className="text-slate-500 text-[11px] ml-2">({new Date(ret.created_at).toLocaleDateString()})</span>
                        <div className="text-[11px] text-slate-600">
                          {ret.items.map((i) => `${i.product_name} (×${i.quantity} ${i.condition.toLowerCase()})`).join(', ')}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-rose-700">{formatCurrency(ret.refund_amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowAuditModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition"
            >
              Close Audit Inspector
            </button>
          </div>
        </div>
      )}

      {/* Partial / Full Return & Refund Modal */}
      {showReturnModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Process Itemized Return & Refund: {selectedOrder.invoice_number}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Customer: {selectedOrder.customer_name || 'Walk-in'} • Invoiced Total: {formatCurrency(selectedOrder.total_amount)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReturnModal(false)}
                className="text-sm font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Fast Action Buttons Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-600 font-medium">Quick Return Actions:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllForReturn}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition shadow-sm flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Select All / Full Return
                </button>
                <button
                  type="button"
                  onClick={handleClearReturnQuantities}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium text-[11px] transition"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {returnError && (
              <div className="bg-rose-50 border border-rose-300 text-rose-900 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{returnError}</span>
              </div>
            )}

            {/* Itemized Return Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100/70 p-2.5 font-bold text-xs text-slate-700 flex justify-between items-center border-b border-slate-200">
                <span>Select Line Item Quantities to Return</span>
                <span className="text-[11px] text-slate-500 font-normal">Cap enforced against purchase history</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {selectedOrder.items.map((item) => {
                  const alreadyReturned = LedgerService.getAlreadyReturnedQuantity(selectedOrder.id, item.product_id, state.returnOrders || []);
                  const maxReturnable = Math.max(0, item.quantity - alreadyReturned);
                  const lineState = returnLines[item.product_id] || { productId: item.product_id, quantity: 0, condition: 'RESTOCKABLE' };
                  const lineRefund = liveProrated.itemBreakdown[item.product_id] || 0;
                  const isEligible = maxReturnable > 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 transition ${
                        lineState.quantity > 0 ? 'bg-rose-50/40' : 'bg-white'
                      } ${!isEligible ? 'opacity-50' : ''}`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        {/* Item Info */}
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-slate-900">{item.product_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            SKU: {item.sku} • Orig Price: {formatCurrency(item.unit_price)}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                              Purchased: {item.quantity}
                            </span>
                            {alreadyReturned > 0 && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
                                Already Ret: {alreadyReturned}
                              </span>
                            )}
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                              Max Returnable: {maxReturnable}
                            </span>
                          </div>
                        </div>

                        {/* Controls & Refund */}
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          {/* Restockable vs Damaged Toggle */}
                          <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden text-[10px] font-bold">
                            <button
                              type="button"
                              disabled={!isEligible}
                              onClick={() => handleToggleCondition(item.product_id, 'RESTOCKABLE')}
                              className={`px-2 py-1 transition ${
                                lineState.condition === 'RESTOCKABLE'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              Restockable
                            </button>
                            <button
                              type="button"
                              disabled={!isEligible}
                              onClick={() => handleToggleCondition(item.product_id, 'DAMAGED')}
                              className={`px-2 py-1 transition ${
                                lineState.condition === 'DAMAGED'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              Damaged
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Decrease return quantity for ${item.product_name}`}
                              disabled={!isEligible || lineState.quantity <= 0}
                              onClick={() => handleQuantityChange(item.product_id, lineState.quantity - 1, maxReturnable)}
                              className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center justify-center font-bold disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            <input
                              type="number"
                              min="0"
                              max={maxReturnable}
                              aria-label={`Return quantity for ${item.product_name}`}
                              disabled={!isEligible}
                              value={lineState.quantity}
                              onChange={(e) => handleQuantityChange(item.product_id, parseInt(e.target.value, 10) || 0, maxReturnable)}
                              className="w-12 p-1 text-center font-mono font-bold text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                            />

                            <button
                              type="button"
                              aria-label={`Increase return quantity for ${item.product_name}`}
                              disabled={!isEligible || lineState.quantity >= maxReturnable}
                              onClick={() => handleQuantityChange(item.product_id, lineState.quantity + 1, maxReturnable)}
                              className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center justify-center font-bold disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Line Refund Amount */}
                          <div className="text-right min-w-[70px]">
                            <span className="text-[10px] text-slate-600 font-medium block">Line Refund</span>
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {formatCurrency(lineRefund)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Return Reason Field */}
            <div>
              <label htmlFor="sales-return-reason" className="font-bold text-xs text-slate-800 block mb-1">Return Reason / Notes:</label>
              <input
                id="sales-return-reason"
                type="text"
                aria-label="Return Reason or Notes"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Reason for return (e.g. customer changed mind, unopened, wrong size)..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              />
            </div>

            {/* Live Financial Reversal Breakdown */}
            <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-200 font-medium">
                <span>Total Items Returning:</span>
                <span className="font-bold text-white">{totalReturnQty} units</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Prorated Subtotal Reversal (excl. GST):</span>
                <span className="font-bold">{formatCurrency(liveProrated.subtotalRefund)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Prorated GST Reversal (12%):</span>
                <span>{formatCurrency(liveProrated.taxRefund)}</span>
              </div>
              <div className="pt-2 border-t border-slate-700 flex justify-between text-sm font-black text-rose-400">
                <span>TOTAL CUSTOMER REFUND DUE:</span>
                <span>{formatCurrency(liveProrated.totalRefund)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={totalReturnQty === 0}
                onClick={handleProcessReturn}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
              >
                <RotateCcw className="w-4 h-4" />
                Process Refund & Restock ({formatCurrency(liveProrated.totalRefund)})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
