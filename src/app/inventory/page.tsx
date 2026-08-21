'use client';

import React, { useState, useEffect } from 'react';
import { AppStore, AppState } from '@/lib/store';
import { LedgerService } from '@/lib/ledger-service';
import { TransferStatus, Product, StockTransfer } from '@/lib/types';
import { formatCurrency } from '@/lib/format';
import {
  Boxes,
  ArrowRightLeft,
  AlertOctagon,
  ShieldCheck,
  Plus,
  CheckCircle2,
  Send,
  Truck,
  PackageCheck,
  Search,
  SlidersHorizontal,
  History,
  AlertTriangle,
} from 'lucide-react';

export default function InventoryLedgerPage() {
  const [state, setState] = useState<AppState>(AppStore.getState());
  const [activeTab, setActiveTab] = useState<'BALANCES' | 'LEDGER' | 'TRANSFERS'>('BALANCES');
  const [searchQuery, setSearchQuery] = useState('');

  // Transfer creation modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetDestStoreId, setTargetDestStoreId] = useState('');
  const [transferProductId, setTransferProductId] = useState('');
  const [transferQty, setTransferQty] = useState(10);
  const [transferNotes, setTransferNotes] = useState('');

  // Adjustment modal
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjProductId, setAdjProductId] = useState('');
  const [adjType, setAdjType] = useState<'DAMAGED' | 'ADJUSTMENT'>('DAMAGED');
  const [adjQty, setAdjQty] = useState(1);
  const [adjReason, setAdjReason] = useState('');

  useEffect(() => {
    return AppStore.subscribe(() => {
      setState({ ...AppStore.getState() });
    });
  }, []);

  const currentOrg = state.organizations.find((o) => o.id === state.currentOrgId);
  const currentStore = state.stores.find((s) => s.id === state.currentStoreId);
  const orgStores = state.stores.filter((s) => s.organization_id === state.currentOrgId);
  const orgProducts = state.products.filter((p) => p.organization_id === state.currentOrgId);
  const otherStores = orgStores.filter((s) => s.id !== state.currentStoreId);

  // Live stock balances calculated from immutable ledger
  const stockBalances = LedgerService.calculateStockBalances(
    state.currentOrgId,
    state.currentStoreId,
    state.ledgerEntries,
    state.products
  );

  const orgLedger = state.ledgerEntries.filter((e) => e.organization_id === state.currentOrgId);
  const orgTransfers = state.stockTransfers.filter((t) => t.organization_id === state.currentOrgId);

  const filteredBalances = stockBalances.filter(
    (b) =>
      b.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLedger = orgLedger.filter(
    (l) =>
      (l.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.movement_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTransfer = () => {
    if (!targetDestStoreId || !transferProductId || transferQty <= 0) {
      alert('Please fill all required transfer fields.');
      return;
    }

    AppStore.createStockTransfer(
      state.currentStoreId,
      targetDestStoreId,
      [{ productId: transferProductId, quantity: transferQty }],
      transferNotes
    );

    setShowTransferModal(false);
    setActiveTab('TRANSFERS');
  };

  const handleLogAdjustment = () => {
    if (!adjProductId || adjQty <= 0 || !adjReason) {
      alert('Please enter product, valid quantity, and audit reason.');
      return;
    }

    // Damaged is always negative stock deduction
    const qtyChange = adjType === 'DAMAGED' ? -Math.abs(adjQty) : adjQty;
    AppStore.logStockAdjustment(adjProductId, qtyChange, adjType, adjReason);

    setShowAdjustmentModal(false);
    setAdjReason('');
  };

  const getNextTransition = (current: TransferStatus): TransferStatus | null => {
    switch (current) {
      case 'DRAFT':
        return 'REQUESTED';
      case 'REQUESTED':
        return 'APPROVED';
      case 'APPROVED':
        return 'DISPATCHED';
      case 'DISPATCHED':
        return 'RECEIVED';
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner with Invariant Rule */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Immutable PostgreSQL Ledger
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Store: {currentStore?.name}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-600" />
            Inventory & Stock Movement Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enforces formula:{' '}
            <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono text-[11px]">
              Stock = Opening + Purchases - Sales + Returns - Damaged ± Adjustments ± Transfers
            </code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdjustmentModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition"
          >
            <AlertOctagon className="w-4 h-4 text-amber-600" />
            Log Damaged / Audit Adj
          </button>
          <button
            onClick={() => {
              if (otherStores.length > 0) setTargetDestStoreId(otherStores[0].id);
              if (orgProducts.length > 0) setTransferProductId(orgProducts[0].id);
              setShowTransferModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            New Branch Transfer
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('BALANCES')}
            className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'BALANCES'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4" /> Live Stock Balances ({stockBalances.length})
          </button>
          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'LEDGER'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" /> Immutable Audit Ledger ({orgLedger.length})
          </button>
          <button
            onClick={() => setActiveTab('TRANSFERS')}
            className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'TRANSFERS'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" /> Branch Transfers ({orgTransfers.length})
          </button>
        </div>

        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter SKU or item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 w-52"
          />
        </div>
      </div>

      {/* Tab 1: Live Stock Balances */}
      {activeTab === 'BALANCES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <tr>
                  <th className="p-3.5">SKU</th>
                  <th className="p-3.5">Product Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5 text-right">Unit Cost</th>
                  <th className="p-3.5 text-right">Selling Price</th>
                  <th className="p-3.5 text-right">Reorder Threshold</th>
                  <th className="p-3.5 text-right">Calculated Stock</th>
                  <th className="p-3.5 text-right">Valuation</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBalances.map((item) => (
                  <tr key={item.product_id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-mono font-bold text-slate-900">{item.sku}</td>
                    <td className="p-3.5 font-semibold text-slate-800">{item.product_name}</td>
                    <td className="p-3.5 text-slate-500">{item.category_name || 'General'}</td>
                    <td className="p-3.5 text-right font-mono text-slate-600">
                      {formatCurrency(item.unit_cost)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.selling_price)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-500">
                      {item.reorder_point} units
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-sm">
                      <span
                        className={
                          item.current_stock <= item.reorder_point
                            ? 'text-rose-600'
                            : 'text-emerald-700'
                        }
                      >
                        {item.current_stock}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                      {formatCurrency(item.total_inventory_valuation)}
                    </td>
                    <td className="p-3.5 text-center">
                      {item.current_stock <= item.reorder_point ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          Reorder Required
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Optimal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Immutable Stock Movement Ledger */}
      {activeTab === 'LEDGER' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Store Branch</th>
                  <th className="p-3.5">SKU & Item</th>
                  <th className="p-3.5">Movement Type</th>
                  <th className="p-3.5 text-right">Quantity Change</th>
                  <th className="p-3.5 text-right">Unit Cost</th>
                  <th className="p-3.5 text-right">Total Cost Impact</th>
                  <th className="p-3.5">Logged By / Ref Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLedger.map((entry) => {
                  const isPositive = entry.quantity_change > 0;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">{entry.store_name || entry.store_id}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{entry.product_name || entry.sku}</div>
                        <div className="text-[10px] font-mono text-slate-400">{entry.sku}</div>
                      </td>
                      <td className="p-3.5">
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
                              : entry.movement_type === 'TRANSFER_IN'
                              ? 'bg-teal-50 text-teal-700'
                              : entry.movement_type === 'TRANSFER_OUT'
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {entry.movement_type}
                        </span>
                      </td>
                      <td
                        className={`p-3.5 text-right font-bold font-mono text-sm ${
                          isPositive ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isPositive ? `+${entry.quantity_change}` : entry.quantity_change}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-600">
                        {formatCurrency(entry.unit_cost)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(entry.total_cost)}
                      </td>
                      <td className="p-3.5 text-slate-600 text-[11px] max-w-xs">
                        <div className="font-semibold text-slate-800">{entry.created_by_name || entry.created_by || 'System'}</div>
                        <div className="text-slate-500 truncate">{entry.reason || entry.reference_id || 'N/A'}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Branch-to-Branch Transfers (5-Stage State Machine) */}
      {activeTab === 'TRANSFERS' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>
              <strong>5-Stage Transfer Lifecycle:</strong> <code>Draft</code> &rarr; <code>Requested</code> &rarr; <code>Approved</code> &rarr; <code>Dispatched</code> (deducts source stock) &rarr; <code>Received</code> (adds dest stock).
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orgTransfers.map((trf) => {
              const nextStatus = getNextTransition(trf.status);

              return (
                <div
                  key={trf.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {trf.transfer_number}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        Created: {new Date(trf.created_at).toLocaleString()}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        trf.status === 'RECEIVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : trf.status === 'DISPATCHED'
                          ? 'bg-indigo-100 text-indigo-800'
                          : trf.status === 'APPROVED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {trf.status}
                    </span>
                  </div>

                  {/* Route & Items */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400">Source Branch:</span>
                      <div className="font-semibold text-slate-800">{trf.source_store_name || trf.source_store_id}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400">Destination Branch:</span>
                      <div className="font-semibold text-slate-800">{trf.destination_store_name || trf.destination_store_id}</div>
                    </div>
                  </div>

                  {/* Transfer Items */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Transfer Items:</div>
                    {trf.items.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between text-xs p-2 bg-slate-50/80 rounded-lg"
                      >
                        <span className="font-medium text-slate-800">{it.product_name || it.sku}</span>
                        <span className="font-mono font-bold text-slate-900">{it.quantity_requested} units</span>
                      </div>
                    ))}
                  </div>

                  {trf.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                      Note: {trf.notes}
                    </p>
                  )}

                  {/* State Advancement Action */}
                  {nextStatus && (
                    <button
                      onClick={() => AppStore.advanceTransfer(trf.id, nextStatus)}
                      className="w-full py-2 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {nextStatus === 'REQUESTED' && <Send className="w-3.5 h-3.5" />}
                      {nextStatus === 'APPROVED' && <ShieldCheck className="w-3.5 h-3.5" />}
                      {nextStatus === 'DISPATCHED' && <Truck className="w-3.5 h-3.5" />}
                      {nextStatus === 'RECEIVED' && <PackageCheck className="w-3.5 h-3.5" />}
                      <span>Advance Status to &ldquo;{nextStatus}&rdquo;</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Branch Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-600" /> Create Branch Stock Transfer
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Source Store:</label>
                <input
                  type="text"
                  disabled
                  value={currentStore?.name || ''}
                  className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Destination Store:</label>
                <select
                  value={targetDestStoreId}
                  onChange={(e) => setTargetDestStoreId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium"
                >
                  {otherStores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Product:</label>
                <select
                  value={transferProductId}
                  onChange={(e) => setTransferProductId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium"
                >
                  {orgProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Transfer Quantity:</label>
                <input
                  type="number"
                  min="1"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Transfer Notes / Reason:</label>
                <textarea
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Surge demand rebalance for weekend rush"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg h-16"
                />
              </div>
            </div>

            <button
              onClick={handleCreateTransfer}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-emerald-600/20"
            >
              Submit Transfer Request
            </button>
          </div>
        </div>
      )}

      {/* Log Damaged / Audit Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-amber-600" /> Log Stock Adjustment / Damaged
              </h3>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Adjustment Type:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType('DAMAGED')}
                    className={`py-2 rounded-lg font-bold border transition ${
                      adjType === 'DAMAGED'
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Damaged / Broken
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('ADJUSTMENT')}
                    className={`py-2 rounded-lg font-bold border transition ${
                      adjType === 'ADJUSTMENT'
                        ? 'bg-purple-600 text-white border-purple-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Physical Audit Count
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Product:</label>
                <select
                  value={adjProductId}
                  onChange={(e) => setAdjProductId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium"
                >
                  <option value="">-- Choose SKU --</option>
                  {orgProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {adjType === 'DAMAGED' ? 'Damaged Quantity to Write-Off:' : 'Count Delta (± Quantity):'}
                </label>
                <input
                  type="number"
                  value={adjQty}
                  onChange={(e) => setAdjQty(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Audit Reason / Justification:</label>
                <textarea
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Crushed packaging during shelf restocking"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg h-16"
                />
              </div>
            </div>

            <button
              onClick={handleLogAdjustment}
              className="w-full py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition shadow-sm"
            >
              Append to Immutable Ledger
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
