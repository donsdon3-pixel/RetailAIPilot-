'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppStore } from '@/lib/store';
import {
  Store,
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Building2,
  Boxes,
} from 'lucide-react';

const DemoPersonaSelector = dynamic(() => import('@/components/auth/DemoPersonaSelector'), {
  loading: () => (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-slate-800 rounded w-1/3 mb-2" />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-20 bg-slate-900/60 border border-slate-800 rounded-2xl" />
      ))}
    </div>
  ),
  ssr: false,
});

const DEMO_ACCOUNTS = [
  {
    email: 'owner@supermart.com',
    role: 'BUSINESS_OWNER',
    roleTitle: '1. Business Owner',
    orgName: 'SuperMart India Retail Ltd. (org_01)',
    name: 'Rajesh Sharma',
    desc: 'Executive P&L, revenue dashboards, OpEx margins & AI dossiers',
    color: 'border-emerald-500/40 bg-emerald-50/50 hover:bg-emerald-50',
    badgeColor: 'bg-emerald-100 text-emerald-800',
  },
  {
    email: 'manager@supermart.com',
    role: 'STORE_MANAGER',
    roleTitle: '2. Store Manager',
    orgName: 'Indiranagar Flagship (store_01)',
    name: 'Priya Sundaram',
    desc: 'Stock audits, purchase orders, cashier shifts & approvals',
    color: 'border-blue-500/40 bg-blue-50/50 hover:bg-blue-50',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  {
    email: 'sales@supermart.com',
    role: 'SALES_STAFF',
    roleTitle: '3. Sales Staff / Cashier',
    orgName: 'Cloud POS Terminal (store_01)',
    name: 'Karthik Rao',
    desc: 'High-speed barcode scanning, split payments & returns',
    color: 'border-amber-500/40 bg-amber-50/50 hover:bg-amber-50',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  {
    email: 'inventory@supermart.com',
    role: 'INVENTORY_STAFF',
    roleTitle: '4. Inventory Staff',
    orgName: 'Central Cold Storage & GRN',
    name: 'Anil Kumar',
    desc: 'Chilled intake, immutable ledger entries & branch transfers',
    color: 'border-indigo-500/40 bg-indigo-50/50 hover:bg-indigo-50',
    badgeColor: 'bg-indigo-100 text-indigo-800',
  },
  {
    email: 'admin@retailpilot.ai',
    role: 'SUPER_ADMIN',
    roleTitle: '5. Super Admin',
    orgName: 'RetailPilot SaaS Platform',
    name: 'Global System Admin',
    desc: 'Multi-tenant provisioning, RLS telemetry & security diagnostics',
    color: 'border-purple-500/40 bg-purple-50/50 hover:bg-purple-50',
    badgeColor: 'bg-purple-100 text-purple-800',
  },
  {
    email: 'owner@aurelia.com',
    role: 'BUSINESS_OWNER',
    roleTitle: '6. Tenant B Owner (Cross-Tenant)',
    orgName: 'Aurelia Luxury Fashion (org_02)',
    name: 'Aanya Singhania',
    desc: 'DLF Emporio luxury couture P&L, silk inventory & tenant isolation',
    color: 'border-rose-500/40 bg-rose-50/50 hover:bg-rose-50',
    badgeColor: 'bg-rose-100 text-rose-800',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('owner@supermart.com');
  const [password, setPassword] = useState('DemoPass123!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignIn = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const loginEmail = (customEmail || email).trim();
    const loginPassword = customPass || password;

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        throw error;
      }

      if (data?.session) {
        const user = data.user;
        const userName = user.user_metadata?.full_name || user.email;
        const userOrg = user.app_metadata?.organization_id || user.user_metadata?.organization_id || 'org_01';
        const userRole = user.app_metadata?.role || user.user_metadata?.role || 'BUSINESS_OWNER';
        
        // Sync user role and tenant to local AppStore state
        AppStore.setOrganization(userOrg);
        AppStore.setUserRole(userRole as any);

        setSuccessMsg(`Authenticated successfully as ${userName} (${userRole}). Redirecting...`);
        setTimeout(() => {
          window.location.href = '/';
        }, 200);
      } else {
        throw new Error('Authentication failed: No active session was returned by Supabase.');
      }
    } catch (err: any) {
      console.error('[Supabase Auth Error]', err);
      setErrorMsg(err.message || 'Invalid login credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLoginAsOwner = () => {
    setEmail('owner@supermart.com');
    setPassword('DemoPass123!');
    handleSignIn(undefined, 'owner@supermart.com', 'DemoPass123!');
  };

  const handleQuickFill = (acc: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(acc.email);
    setPassword('DemoPass123!');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-slate-950 shadow-xl shadow-emerald-500/20 mb-4">
          <Store className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white">
          RetailPilot <span className="text-emerald-400">AI</span>
        </h2>
        <p className="mt-2 text-xs text-slate-300 max-w-sm mx-auto">
          Autonomous Retail ERP & Cloud POS SaaS with PostgreSQL Row Level Security (RLS)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl px-4 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sign-in Form */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Authenticated Sign-In
            </h3>
            <p className="text-xs text-slate-300 mb-6">
              Enter your credentials or click any demo persona on the right.
            </p>

            {errorMsg && (
              <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Quick 1-Click Business Owner Login Button */}
            <div className="mb-5">
              <button
                type="button"
                onClick={handleQuickLoginAsOwner}
                disabled={loading}
                className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm group"
              >
                <Sparkles className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition" />
                <span>⚡ 1-Click Login as Business Owner</span>
              </button>
              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-slate-800" />
                <span className="px-3 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Or enter manually</span>
                <div className="flex-1 border-t border-slate-800" />
              </div>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-label="Email Address"
                    placeholder="user@supermart.com"
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    aria-label="Password"
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Authenticating with Supabase...</span>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2.5">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  <strong className="text-white">Academic Evaluation Sandbox:</strong> Select any persona on the right for instant 1-click authentication. PostgreSQL Row Level Security (RLS) is strictly enforced.
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 italic">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>⚠️ AI-generated recommendation. Verified against PostgreSQL database via Model Context Protocol (MCP).</span>
              </div>
            </div>
          </div>

          {/* Right Column: Demo Personas (Dynamically Imported) */}
          <div className="lg:col-span-6">
            <DemoPersonaSelector
              accounts={DEMO_ACCOUNTS}
              selectedEmail={email}
              onSelect={handleQuickFill}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
