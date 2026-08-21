'use client';

import React, { useState, useEffect } from 'react';
import { AppStore, AppState } from '@/lib/store';
import { SalesOrder, ReturnOrder } from '@/lib/types';
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
} from 'lucide-react';

export default function SalesHistoryPage() {
  const [state, setState] = useState<AppState>(AppStore.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);

  // Return state
  const [returnReason, setReturnReason] = useState('Customer changed mind / unopened');
  const [returnCondition, setReturnCondition] = useState<'RESTOCKABLE' | 'DAMAGED'>('RESTOCKABLE');
  const [returnQty, setReturnQty] = useState(1);

  useEffect(() => {
    return AppStore.subscribe(() => {
      setState({ ...AppStore.getState() });
    });
  }, []);

  const orgSales = state.salesOrders.filter((s) => s.organization_id === state.currentOrgId);
  const filteredSales = orgSales.filter(
    (s) =>
      s.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProcessReturn = () => {
    if (!selectedOrder || selectedOrder.items.length === 0) return;

    const targetItem = selectedOrder.items[0];
    const refundAmt = targetItem.unit_price * returnQty;

    const returnOrder: ReturnOrder = {
      id: `ret_${Date.now()}`,
      organization_id: state.currentOrgId,
      store_id: selectedOrder.store_id,
      sales_order_id: selectedOrder.id,
      invoice_number: selectedOrder.invoice_number,
      return_number: `RET-${Date.now().toString().slice(-5)}`,
      refund_amount: refundAmt,
      reason: returnReason,
      processed_by: state.currentUser.id,
      processed_by_name: state.currentUser.full_name,
      items: [
        {
          id: `reti_${Date.now()}`,
          return_id: '',
          product_id: targetItem.product_id,
          product_name: targetItem.product_name,
          sku: targetItem.sku,
          quantity: returnQty,
          refund_unit_price: targetItem.unit_price,
          condition: returnCondition,
        },
      ],
      created_at: new Date().toISOString(),
    };

    returnOrder.items[0].return_id = returnOrder.id;

    AppStore.processReturn(returnOrder);
    setShowReturnModal(false);
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            Sales Transactions & Returns Processing
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Customer returns verify original invoice pricing and properly restock or write off inventory.
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search invoice # or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-60"
          />
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
              <tr>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Items Purchased</th>
                <th className="p-3.5">Payment Split</th>
                <th className="p-3.5 text-right">Total Amount</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-mono font-bold text-slate-900">{sale.invoice_number}</td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-500">
                    {new Date(sale.created_at).toLocaleString()}
                  </td>
                  <td className="p-3.5 font-medium text-slate-800">
                    {sale.customer_name || 'Walk-in Guest'}
                  </td>
                  <td className="p-3.5 text-slate-600">
                    {sale.items.map((i) => `${i.product_name} (${i.quantity})`).join(', ')}
                  </td>
                  <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                    {sale.payments.map((p) => `${p.payment_method}: ${formatCurrency(p.amount)}`).join(' + ')}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                    {formatCurrency(sale.total_amount)}
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        sale.status === 'RETURNED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {sale.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    {sale.status !== 'RETURNED' && (
                      <button
                        onClick={() => {
                          setSelectedOrder(sale);
                          setShowReturnModal(true);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Process Return
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Modal */}
      {showReturnModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-600" /> Customer Return & Refund
              </h3>
              <button onClick={() => setShowReturnModal(false)} className="text-xs text-slate-400">✕</button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between font-bold">
                <span>Invoice Ref:</span>
                <span className="font-mono text-slate-900">{selectedOrder.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Item to Return:</span>
                <span className="font-semibold text-slate-800">{selectedOrder.items[0]?.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Original Sale Price:</span>
                <span className="font-mono font-bold">{formatCurrency(selectedOrder.items[0]?.unit_price || 0)}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Returned Item Condition:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReturnCondition('RESTOCKABLE')}
                    className={`py-2 rounded-lg font-bold border transition ${
                      returnCondition === 'RESTOCKABLE'
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Restockable (Add to Stock)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturnCondition('DAMAGED')}
                    className={`py-2 rounded-lg font-bold border transition ${
                      returnCondition === 'DAMAGED'
                        ? 'bg-rose-600 text-white border-rose-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Damaged (Write-off)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Return Reason:</label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 font-bold flex justify-between">
                <span>Refund Amount Due to Customer:</span>
                <span className="font-mono">
                  {formatCurrency((selectedOrder.items[0]?.unit_price || 0) * returnQty)}
                </span>
              </div>
            </div>

            <button
              onClick={handleProcessReturn}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-rose-600/20"
            >
              Confirm Refund & Adjust Ledger
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
