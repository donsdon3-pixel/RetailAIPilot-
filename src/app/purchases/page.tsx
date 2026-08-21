'use client';

import React, { useState, useEffect } from 'react';
import { AppStore, AppState } from '@/lib/store';
import { PurchaseOrder, Supplier } from '@/lib/types';
import { formatCurrency } from '@/lib/format';
import {
  Truck,
  Plus,
  PackageCheck,
  Clock,
  AlertTriangle,
  FileCheck2,
  DollarSign,
  Building,
  CheckCircle2,
} from 'lucide-react';

export default function PurchasesPage() {
  const [state, setState] = useState<AppState>(AppStore.getState());
  const [showPOModal, setShowPOModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [grnNotes, setGrnNotes] = useState('');

  // PO form state
  const [supplierId, setSupplierId] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [orderQty, setOrderQty] = useState(50);
  const [dueDate, setDueDate] = useState('2026-08-28');
  const [poNotes, setPoNotes] = useState('');

  useEffect(() => {
    return AppStore.subscribe(() => {
      setState({ ...AppStore.getState() });
    });
  }, []);

  const orgPOs = state.purchaseOrders.filter((p) => p.organization_id === state.currentOrgId);
  const orgSuppliers = state.suppliers.filter((s) => s.organization_id === state.currentOrgId);
  const orgProducts = state.products.filter((p) => p.organization_id === state.currentOrgId);

  const handleCreatePO = () => {
    if (!supplierId || !selectedProdId || orderQty <= 0) {
      alert('Please select supplier, product, and quantity.');
      return;
    }

    AppStore.createPurchaseOrder(
      supplierId,
      [{ productId: selectedProdId, quantity: orderQty }],
      dueDate,
      poNotes
    );

    setShowPOModal(false);
  };

  const handleReceiveGRN = () => {
    if (!selectedPO) return;
    AppStore.receivePurchaseOrderGRN(selectedPO.id, grnNotes);
    setShowGRNModal(false);
    setSelectedPO(null);
    setGrnNotes('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Procurement & Accounts Payable
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            Purchase Orders & Goods Receipt Notes (GRN)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Receiving a GRN automatically updates the immutable stock ledger with type <code>PURCHASE</code>.
          </p>
        </div>

        <button
          onClick={() => {
            if (orgSuppliers.length > 0) setSupplierId(orgSuppliers[0].id);
            if (orgProducts.length > 0) setSelectedProdId(orgProducts[0].id);
            setShowPOModal(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Purchase Order
        </button>
      </div>

      {/* Supplier Accounts Payable Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {orgSuppliers.map((sup) => (
          <div key={sup.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-bold text-xs text-slate-800">{sup.name}</div>
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {sup.credit_period_days}d terms
              </span>
            </div>
            <div className="mt-2 text-lg font-black text-slate-900 font-mono">
              {formatCurrency(sup.outstanding_balance)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Contact: {sup.contact_person} ({sup.phone})
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800">
          Purchase Orders Lifecycle
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
              <tr>
                <th className="p-3.5">PO Number</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5">Items Ordered</th>
                <th className="p-3.5 text-right">Total Cost</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Payment Status</th>
                <th className="p-3.5">Due Date</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orgPOs.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-mono font-bold text-slate-900">{po.po_number}</td>
                  <td className="p-3.5 font-semibold text-slate-800">{po.supplier_name}</td>
                  <td className="p-3.5 text-slate-600">
                    {po.items.map((i) => `${i.product_name} (${i.quantity_ordered} qty)`).join(', ')}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(po.total_amount)}
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        po.status === 'RECEIVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : po.status === 'SENT'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        po.payment_status === 'OVERDUE'
                          ? 'bg-rose-100 text-rose-800'
                          : po.payment_status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {po.payment_status}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-600">
                    {po.payment_due_date}
                  </td>
                  <td className="p-3.5 text-right">
                    {po.status !== 'RECEIVED' ? (
                      <button
                        onClick={() => {
                          setSelectedPO(po);
                          setShowGRNModal(true);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto"
                      >
                        <PackageCheck className="w-3.5 h-3.5" /> Receive GRN
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Intake Verified
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      {showPOModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" /> New Purchase Order
              </h3>
              <button onClick={() => setShowPOModal(false)} className="text-xs text-slate-400">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Supplier:</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium"
                >
                  {orgSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.credit_period_days}d credit terms)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Select SKU / Product:</label>
                <select
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium"
                >
                  {orgProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatCurrency(p.unit_cost)} cost)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Order Quantity:</label>
                <input
                  type="number"
                  min="1"
                  value={orderQty}
                  onChange={(e) => setOrderQty(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Due Date:</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleCreatePO}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition"
            >
              Issue Purchase Order
            </button>
          </div>
        </div>
      )}

      {/* GRN Inspection & Receipt Modal */}
      {showGRNModal && selectedPO && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-600" /> Goods Receipt Note (GRN) Inspection
              </h3>
              <button onClick={() => setShowGRNModal(false)} className="text-xs text-slate-400">✕</button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between font-bold">
                <span>PO Reference:</span>
                <span className="font-mono text-emerald-700">{selectedPO.po_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Supplier:</span>
                <span className="font-medium text-slate-800">{selectedPO.supplier_name}</span>
              </div>
              <div className="divide-y divide-slate-200 pt-2">
                {selectedPO.items.map((it) => (
                  <div key={it.id} className="py-1 flex justify-between">
                    <span>{it.product_name}</span>
                    <span className="font-bold font-mono">Receiving {it.quantity_ordered} units</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs">
              <label className="font-bold text-slate-700 block mb-1">Quality Inspection Notes:</label>
              <textarea
                value={grnNotes}
                onChange={(e) => setGrnNotes(e.target.value)}
                placeholder="e.g. Temperature checked, seals intact, batch expiration verified."
                className="w-full p-2 bg-white border border-slate-200 rounded-lg h-16"
              />
            </div>

            <button
              onClick={handleReceiveGRN}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition"
            >
              Verify GRN & Append Stock to Ledger
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
