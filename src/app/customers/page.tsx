'use client';

import React, { useState, useEffect } from 'react';
import { AppStore, AppState } from '@/lib/store';
import { Customer, Promotion } from '@/lib/types';
import {
  Users,
  Award,
  Tag,
  Receipt,
  Sparkles,
  Search,
  Plus,
  CheckCircle2,
} from 'lucide-react';

export default function CustomersPage() {
  const [state, setState] = useState<AppState>(AppStore.getState());
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    return AppStore.subscribe(() => {
      setState({ ...AppStore.getState() });
    });
  }, []);

  const orgCustomers = state.customers.filter((c) => c.organization_id === state.currentOrgId);
  const orgPromotions = state.promotions.filter((p) => p.organization_id === state.currentOrgId);
  const orgSales = state.salesOrders.filter((s) => s.organization_id === state.currentOrgId);

  const customerInvoices = selectedCustomer
    ? orgSales.filter((s) => s.customer_id === selectedCustomer.id)
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Customer Loyalty & Self-Service Portal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Loyalty point rewards (1 pt / $1), digital invoice archives, and personalized AI promotions.
          </p>
        </div>
      </div>

      {/* Promotions Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {orgPromotions.map((promo) => (
          <div
            key={promo.id}
            className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900 to-slate-900 text-white flex items-center justify-between shadow-lg border border-emerald-800/40"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Target Tier: {promo.target_tier}
                </span>
              </div>
              <h3 className="font-bold text-sm text-white">{promo.title}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Valid until: {promo.valid_until}</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl font-mono text-xs font-bold">
                {promo.code}
              </span>
              <div className="text-emerald-400 font-bold text-xs mt-1">
                {promo.discount_percentage}% OFF
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Customers List & Digital Invoice History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-3">
          <div className="font-bold text-xs text-slate-800 flex items-center justify-between">
            <span>VIP Loyalty Members</span>
            <span className="text-[10px] text-slate-400">{orgCustomers.length} registered</span>
          </div>

          <div className="space-y-2">
            {orgCustomers.map((cust) => (
              <div
                key={cust.id}
                onClick={() => setSelectedCustomer(cust)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                  selectedCustomer?.id === cust.id
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                    : 'bg-slate-50 border-slate-100 hover:bg-slate-100/80 text-slate-800'
                }`}
              >
                <div>
                  <div className="font-bold">{cust.name}</div>
                  <div className="text-[10px] text-slate-500">{cust.email}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-emerald-600 font-bold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    {cust.loyalty_points} pts
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    ${cust.total_spend.toFixed(2)} spend
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Self-Service Digital Invoices */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Customer Digital Receipts Archive
              </h3>
              <p className="text-[11px] text-slate-500">
                {selectedCustomer ? `Viewing history for ${selectedCustomer.name}` : 'Select a customer to inspect digital invoice history'}
              </p>
            </div>
          </div>

          {selectedCustomer ? (
            customerInvoices.length > 0 ? (
              <div className="space-y-3">
                {customerInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="font-mono text-slate-900">{inv.invoice_number}</span>
                      <span className="font-mono text-emerald-600 font-black text-sm">
                        ${inv.total_amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Date: {new Date(inv.created_at).toLocaleString()} • Store: {inv.store_name}
                    </div>
                    <div className="pt-2 border-t border-slate-200 text-slate-700">
                      {inv.items.map((it) => (
                        <div key={it.id} className="flex justify-between py-0.5">
                          <span>{it.product_name} x {it.quantity}</span>
                          <span className="font-mono">${it.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No previous purchase invoices recorded for this member.
              </div>
            )
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Please click on a customer from the left list to view digital receipts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
