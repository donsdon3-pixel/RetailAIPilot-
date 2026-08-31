'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppStore, AppState } from '@/lib/store';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Truck,
  Receipt,
  DollarSign,
  Bot,
  Zap,
  Users,
  ShieldAlert,
  FileCheck2,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [state, setState] = useState<AppState>(AppStore.getState());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return AppStore.subscribe(() => {
      setState({ ...AppStore.getState() });
    });
  }, []);

  if (pathname === '/login') {
    return null;
  }

  const navItems = [
    {
      title: 'Executive Dashboard',
      href: '/',
      icon: LayoutDashboard,
      roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'STORE_MANAGER'],
    },
    {
      title: 'POS Terminal',
      href: '/pos',
      icon: ShoppingCart,
      roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'STORE_MANAGER', 'SALES_STAFF'],
      badge: 'Split Pay',
    },
    {
      title: 'Stock Ledger & Transfers',
      href: '/inventory',
      icon: Boxes,
      roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'STORE_MANAGER', 'INVENTORY_STAFF'],
      badge: 'Immutable',
    },
    {
      title: 'Purchases & GRN',
      href: '/purchases',
      icon: Truck,
      roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'STORE_MANAGER', 'INVENTORY_STAFF'],
    },
    {
      title: 'Sales & Returns',
      href: '/sales',
      icon: Receipt,
      roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'STORE_MANAGER', 'SALES_STAFF'],
    },
    {
      title: 'Expenses & P&L',
      href: '/expenses',
      icon: DollarSign,
      roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'STORE_MANAGER'],
    },
    {
      title: 'AI Business Assistant',
      href: '/ai-assistant',
      icon: Bot,
      roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'STORE_MANAGER'],
      badge: 'MCP Live',
      highlight: true,
    },
    {
      title: 'Automated Workflows',
      href: '/automations',
      icon: Zap,
      roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'STORE_MANAGER'],
      badge: '5 Workflows',
    },
    {
      title: 'Customer Club',
      href: '/customers',
      icon: Users,
      roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'STORE_MANAGER', 'SALES_STAFF', 'CUSTOMER'],
    },
    {
      title: 'Super Admin Console',
      href: '/admin',
      icon: ShieldAlert,
      roles: ['SUPER_ADMIN'],
      badge: 'Multi-Tenant',
    },
    {
      title: 'QA Testing (50 Cases)',
      href: '/qa',
      icon: FileCheck2,
      roles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'STORE_MANAGER', 'SALES_STAFF', 'INVENTORY_STAFF', 'CUSTOMER'],
      badge: '50 Tests',
    },
  ];

  const currentRole = mounted ? (state.currentUser?.role || 'BUSINESS_OWNER') : 'BUSINESS_OWNER';
  const filteredNav = navItems.filter((item) => item.roles.includes(currentRole));

  const userName = state.currentUser?.full_name || 'Rajesh Sharma';
  const userEmail = state.currentUser?.email || 'owner@supermart.com';

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col h-screen sticky top-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-white tracking-tight flex items-center gap-1.5">
            RetailPilot <span className="text-emerald-400 text-xs px-1 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/40">AI</span>
          </h1>
          <p className="text-[10px] text-slate-300 font-medium">Multi-Tenant SaaS + MCP</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Main Platform Navigation" className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300 px-3 mb-2">
          Platform Navigation
        </div>
        {filteredNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : item.highlight
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/40'
                  : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-emerald-400' : 'text-slate-300'}`} />
                <span>{item.title}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                    isActive
                      ? 'bg-emerald-700 text-white'
                      : item.highlight
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer Context */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50">
        <div className="bg-slate-800/50 rounded-xl p-2.5 border border-slate-700/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400" suppressHydrationWarning>
            {userName.charAt(0)}
          </div>
          <div className="overflow-hidden flex-1">
            <div className="text-xs font-semibold text-white truncate" suppressHydrationWarning>
              {userName}
            </div>
            <div className="text-[10px] text-slate-300 truncate" suppressHydrationWarning>
              {userEmail}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
