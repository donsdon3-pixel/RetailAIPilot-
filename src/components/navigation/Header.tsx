'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
  LogOut,
  User as UserIcon,
} from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AppState>(AppStore.getState());
  const [mounted, setMounted] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);

  if (pathname === '/login') {
    return null;
  }

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setAuthUser(user);
        const userRole = user.app_metadata?.role || user.user_metadata?.role;
        if (userRole) {
          AppStore.setUserRole(userRole);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null);
    });

    const unsubscribe = AppStore.subscribe(() => {
      setState({ ...AppStore.getState() });
    });

    return () => {
      subscription.unsubscribe();
      unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Sign Out Error]', err);
    } finally {
      window.location.href = '/login';
    }
  };

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
      {/* Organization & Store Selector */}
      <div className="flex items-center gap-3">
        {/* Tenant Switcher with RLS Badge */}
        <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-200 rounded-xl px-3 py-1.5 shadow-sm">
          <Building2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              Active Tenant <span className="px-1 py-0.2 rounded bg-emerald-200 text-emerald-900 font-mono text-[8px]">RLS ISOLATED</span>
            </span>
            <select
              aria-label="Select Active Organization"
              value={state.currentOrgId}
              onChange={(e) => AppStore.setOrganization(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer pr-1"
            >
              {state.organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Store Switcher */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
          <StoreIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              Store Location
            </span>
            <select
              aria-label="Select Active Store"
              value={state.currentStoreId}
              onChange={(e) => AppStore.setStore(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer pr-1"
            >
              {orgStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Right Controls: Role Switcher Badge, Notifications, Re-Seed */}
      <div className="flex items-center gap-3">
        {/* Reset Database Button */}
        <button
          type="button"
          onClick={() => {
            if (confirm('Reset database to clean seed state?')) {
              AppStore.resetToSeed();
            }
          }}
          title="Reset database to master seed state"
          aria-label="Reset database to clean seed state"
          className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition font-medium focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset Seed</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            type="button"
            aria-label="System Notifications"
            onClick={() => setShowAlertDropdown(!showAlertDropdown)}
            className="relative p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <Bell className="w-5 h-5" />
            {mounted && unreadAlerts.length > 0 && (
              <span
                suppressHydrationWarning
                className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse"
              >
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {showAlertDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-600" /> System Alerts ({unreadAlerts.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAlertDropdown(false)}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  Close
                </button>
              </div>
              <div className="mt-3 max-h-72 overflow-y-auto space-y-2.5">
                {state.alerts.length === 0 ? (
                  <p className="text-xs text-slate-700 py-4 text-center">No alerts active.</p>
                ) : (
                  state.alerts.slice(0, 5).map((a) => (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() => AppStore.markAlertAsRead(a.id)}
                      aria-label={`System Alert: ${a.title}`}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs cursor-pointer transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                        a.severity === 'CRITICAL'
                          ? 'bg-rose-50 border-rose-200 text-rose-950'
                          : a.severity === 'WARNING'
                          ? 'bg-amber-50 border-amber-200 text-amber-950'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      } ${a.is_read ? 'opacity-60' : 'font-medium'}`}
                    >
                      <div className="flex items-center justify-between font-semibold mb-1">
                        <span>{a.title}</span>
                        {!a.is_read && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        )}
                      </div>
                      <p className="text-[11px] opacity-90">{a.message}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Active Role Selector Badge */}
        <div className="relative">
          <button
            type="button"
            aria-label="Switch User Role RBAC"
            onClick={() => setShowRoleModal(!showRoleModal)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-xs font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span suppressHydrationWarning>{(state.currentUser?.role || 'BUSINESS_OWNER').replace('_', ' ')}</span>
            <ChevronDown className="w-3 h-3 text-slate-300" />
          </button>

          {showRoleModal && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 px-2">
                Switch Evaluator Role (RBAC)
              </div>
              <div className="space-y-1">
                {roles.map((r) => (
                  <button
                    type="button"
                    key={r.role}
                    onClick={() => {
                      AppStore.setUserRole(r.role);
                      setShowRoleModal(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex flex-col focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                      state.currentUser?.role === r.role
                        ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-300'
                        : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <span className="font-semibold">{r.title}</span>
                    <span className="text-[10px] text-slate-600 mt-0.5">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Session & Sign Out */}
        {mounted && authUser && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <span className="text-xs text-slate-800 hidden md:inline font-semibold" title={authUser.email}>
              {authUser.email?.split('@')[0]}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out of Supabase Session"
              aria-label="Sign Out of Supabase Session"
              className="p-1.5 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
