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

import { createClient } from '@/lib/supabase/client';

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

  const handleCreatePO = async () => {
    if (!supplierId || !selectedProdId || orderQty <= 0) {
      alert('Please select supplier, product, and quantity.');
      return;
    }

    const createdPO = AppStore.createPurchaseOrder(
      supplierId,
      [{ productId: selectedProdId, quantity: orderQty }],
      dueDate,
      poNotes
    );

    // Persist to Supabase
    try {
      const supabase = createClient();
      await supabase.from('purchase_orders').insert({
        id: createdPO.id,
        organization_id: createdPO.organization_id,
        store_id: createdPO.store_id,
        supplier_id: createdPO.supplier_id,
        po_number: createdPO.po_number,
        total_amount: createdPO.total_amount,
        status: createdPO.status,
        payment_status: createdPO.payment_status,
        expected_delivery_date: createdPO.payment_due_date,
        notes: createdPO.notes,
        created_at: createdPO.created_at,
      });

      if (createdPO.items && createdPO.items.length > 0) {
        await supabase.from('purchase_order_items').insert(
          createdPO.items.map((item) => ({
            id: item.id,
            purchase_order_id: createdPO.id,
            product_id: item.product_id,
            quantity_ordered: item.quantity_ordered,
            quantity_received: item.quantity_received,
            unit_cost: item.unit_cost,
            total_cost: item.subtotal,
          }))
        );
      }
    } catch (err: any) {
      console.warn('[Create PO Supabase Error]', err.message);
    }

    setShowPOModal(false);
  };

  const handleReceiveGRN = async () => {
    if (!selectedPO) return;
    AppStore.receivePurchaseOrderGRN(selectedPO.id, grnNotes);

    // Persist GRN and stock intake to Supabase
    try {
      const supabase = createClient();
      await supabase
        .from('purchase_orders')
        .update({ status: 'RECEIVED', payment_status: 'PENDING' })
        .eq('id', selectedPO.id);

      // Add PURCHASE entry into immutable ledger for each item
      const ledgerInserts = selectedPO.items.map((item) => ({
        id: `led_${Math.random().toString(36).substring(2, 9)}`,
        organization_id: selectedPO.organization_id,
        store_id: selectedPO.store_id,
        product_id: item.product_id,
        movement_type: 'PURCHASE',
        quantity_change: item.quantity_ordered,
        unit_cost: item.unit_cost,
        reference_id: selectedPO.po_number,
        reason: `GRN Intake for PO ${selectedPO.po_number}: ${grnNotes || 'Stock Received'}`,
      }));

      await supabase.from('inventory_ledger').insert(ledgerInserts);
    } catch (err: any) {
      console.warn('[Receive GRN Supabase Error]', err.message);
    }

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
              <div className="font-bold text-xs text-slate-900">{sup.name}</div>
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-bold">
                {sup.credit_period_days}d terms
              </span>
            </div>
            <div className="mt-2 text-lg font-black text-slate-900 font-mono">
              {formatCurrency(sup.outstanding_balance)}
            </div>
            <div className="text-[11px] text-slate-700 font-medium mt-1">
              Contact: {sup.contact_person} ({sup.phone})
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-900">
          Purchase Orders Lifecycle
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
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
                  <td className="p-3.5 font-semibold text-slate-900">{po.supplier_name}</td>
                  <td className="p-3.5 text-slate-800">
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
                          : 'bg-slate-100 text-slate-800'
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
                  <td className="p-3.5 font-mono text-[11px] text-slate-800 font-medium">
                    {po.payment_due_date}
                  </td>
                  <td className="p-3.5 text-right">
                    {po.status !== 'RECEIVED' ? (
                      <button
                        type="button"
                        aria-label={`Receive GRN for PO ${po.po_number}`}
                        onClick={() => {
                          setSelectedPO(po);
                          setShowGRNModal(true);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                      >
                        <PackageCheck className="w-3.5 h-3.5" /> Receive GRN
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-700 font-bold flex items-center justify-end gap-1">
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
              <button
                type="button"
                aria-label="Close PO Modal"
                onClick={() => setShowPOModal(false)}
                className="text-xs text-slate-600 hover:text-slate-900 font-bold focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="po-supplier-select" className="font-bold text-slate-800 block mb-1">Select Supplier:</label>
                <select
                  id="po-supplier-select"
                  aria-label="Select Supplier for Purchase Order"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  {orgSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.credit_period_days}d credit terms)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="po-product-select" className="font-bold text-slate-800 block mb-1">Select SKU / Product:</label>
                <select
                  id="po-product-select"
                  aria-label="Select Product to Order"
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  {orgProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatCurrency(p.unit_cost)} cost)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="po-order-quantity" className="font-bold text-slate-800 block mb-1">Order Quantity:</label>
                <input
                  id="po-order-quantity"
                  type="number"
                  min="1"
                  aria-label="Order Quantity"
                  value={orderQty}
                  onChange={(e) => setOrderQty(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                />
              </div>

              <div>
                <label htmlFor="po-payment-due-date" className="font-bold text-slate-800 block mb-1">Payment Due Date:</label>
                <input
                  id="po-payment-due-date"
                  type="date"
                  aria-label="Payment Due Date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreatePO}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
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
              <button
                type="button"
                aria-label="Close GRN modal"
                onClick={() => setShowGRNModal(false)}
                className="text-xs text-slate-600 hover:text-slate-900 font-bold focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between font-bold">
                <span className="text-slate-800">PO Reference:</span>
                <span className="font-mono text-emerald-700">{selectedPO.po_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700">Supplier:</span>
                <span className="font-bold text-slate-900">{selectedPO.supplier_name}</span>
              </div>
              <div className="divide-y divide-slate-200 pt-2 text-slate-900 font-medium">
                {selectedPO.items.map((it) => (
                  <div key={it.id} className="py-1 flex justify-between">
                    <span>{it.product_name}</span>
                    <span className="font-bold font-mono">Receiving {it.quantity_ordered} units</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs">
              <label htmlFor="grn-inspection-notes" className="font-bold text-slate-800 block mb-1">Quality Inspection Notes:</label>
              <textarea
                id="grn-inspection-notes"
                aria-label="Quality Inspection Notes"
                value={grnNotes}
                onChange={(e) => setGrnNotes(e.target.value)}
                placeholder="e.g. Temperature checked, seals intact, batch expiration verified."
                className="w-full p-2 bg-white border border-slate-300 rounded-lg h-16 text-slate-900 placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleReceiveGRN}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              Verify GRN & Append Stock to Ledger
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
