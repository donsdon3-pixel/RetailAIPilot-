'use client';

import React, { useState, useEffect } from 'react';
import { AppStore, AppState } from '@/lib/store';
import { UserRole } from '@/lib/types';
import {
  Store as StoreIcon,
  Building2,
  Bell,
  UserCheck,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Layers,
  ChevronDown,
} from 'lucide-react';

export default function Header() {
  const [state, setState] = useState<AppState>(AppStore.getState());
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);

  useEffect(() => {
    return AppStore.subscribe(() => {
      setState({ ...AppStore.getState() });
    });
  }, []);

  const unreadAlerts = state.alerts.filter((a) => !a.is_read);
  const currentOrg = state.organizations.find((o) => o.id === state.currentOrgId);
  const currentStore = state.stores.find((s) => s.id === state.currentStoreId);
  const orgStores = state.stores.filter((s) => s.organization_id === state.currentOrgId);

  const roles: { role: UserRole; title: string; desc: string }[] = [
    { role: 'SUPER_ADMIN', title: '1. Super Admin', desc: 'Global multi-tenant provisioning, tiers & system telemetry' },
    { role: 'BUSINESS_OWNER', title: '2. Business Owner', desc: 'Multi-store P&L, revenue, AI dossiers & executive analytics' },
    { role: 'STORE_MANAGER', title: '3. Store Manager', desc: 'Store audits, PO approvals, staff shifts & inventory' },
    { role: 'SALES_STAFF', title: '4. Sales Staff', desc: 'POS terminal, split payments, returns & customer lookup' },
    { role: 'INVENTORY_STAFF', title: '5. Inventory Staff', desc: 'GRN receipts, stock adjustments & branch transfers' },
    { role: 'CUSTOMER', title: '6. Customer (Self-Service)', desc: 'Digital receipts, loyalty points & AI personalized promos' },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Organization & Store Selector */}
      <div className="flex items-center gap-4">
        {state.currentUser.role === 'SUPER_ADMIN' ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>SUPER ADMIN VIEW (ALL TENANTS)</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Org Switcher */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <select
                value={state.currentOrgId}
                onChange={(e) => AppStore.setOrganization(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                {state.organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.subscription_tier})
                  </option>
                ))}
              </select>
            </div>

            {/* Store Switcher */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <StoreIcon className="w-4 h-4 text-blue-600" />
              <select
                value={state.currentStoreId}
                onChange={(e) => AppStore.setStore(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                {orgStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: Role Switcher Badge, Notifications, Re-Seed */}
      <div className="flex items-center gap-3">
        {/* Reset Database Button */}
        <button
          onClick={() => {
            if (confirm('Reset database to clean seed state?')) {
              AppStore.resetToSeed();
            }
          }}
          title="Reset database to master seed state"
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset Seed</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAlertDropdown(!showAlertDropdown)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
          >
            <Bell className="w-5 h-5" />
            {unreadAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {showAlertDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-600" /> System Alerts ({unreadAlerts.length})
                </h4>
                <button
                  onClick={() => setShowAlertDropdown(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Close
                </button>
              </div>
              <div className="mt-3 max-h-72 overflow-y-auto space-y-2.5">
                {state.alerts.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No alerts active.</p>
                ) : (
                  state.alerts.slice(0, 5).map((a) => (
                    <div
                      key={a.id}
                      onClick={() => AppStore.markAlertAsRead(a.id)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                        a.severity === 'CRITICAL'
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : a.severity === 'WARNING'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      } ${a.is_read ? 'opacity-60' : 'font-medium'}`}
                    >
                      <div className="flex items-center justify-between font-semibold mb-1">
                        <span>{a.title}</span>
                        {!a.is_read && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        )}
                      </div>
                      <p className="text-[11px] opacity-85">{a.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Active Role Selector Badge */}
        <div className="relative">
          <button
            onClick={() => setShowRoleModal(!showRoleModal)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-xs font-semibold shadow-sm"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>{state.currentUser.role.replace('_', ' ')}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showRoleModal && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
                Switch Evaluator Role (RBAC)
              </div>
              <div className="space-y-1">
                {roles.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => {
                      AppStore.setUserRole(r.role);
                      setShowRoleModal(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex flex-col ${
                      state.currentUser.role === r.role
                        ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="font-semibold">{r.title}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
