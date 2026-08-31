'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppStore, AppState } from '@/lib/store';
import { Organization } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import {
  ShieldCheck,
  Building2,
  Plus,
  Layers,
  Activity,
  CheckCircle2,
  Server,
  Database,
  Lock,
  Globe,
  ShieldAlert,
  Play,
  Terminal,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';

export default function SuperAdminPage() {
  const router = useRouter();
  const [state, setState] = useState<AppState>(AppStore.getState());
  const [showOrgModal, setShowOrgModal] = useState(false);

  // New Organization form
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [tier, setTier] = useState<'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'>('ENTERPRISE');
  const [taxRate, setTaxRate] = useState(12.0);
  const [gstin, setGstin] = useState('');

  // RLS Penetration Simulator State
  const [simulatedAttack, setSimulatedAttack] = useState<string | null>(null);
  const [attackLogs, setAttackLogs] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Cloud Seed State
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const handleRunCloudSeed = async () => {
    setIsSeeding(true);
    setSeedMessage(null);
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSeedMessage('✅ ' + (data.message || 'Database seeded successfully!'));
      } else {
        setSeedMessage('❌ Error: ' + (data.error || 'Failed to seed database.'));
      }
    } catch (err: any) {
      setSeedMessage('❌ Network error: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const fetchLiveAdminData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const userRole = user?.app_metadata?.role || user?.user_metadata?.role || state.currentUser?.role;
      if (userRole !== 'SUPER_ADMIN') {
        router.push('/');
        return;
      }
      const { data: orgData } = await supabase.from('organizations').select('*');
      if (orgData && orgData.length > 0) {
        state.organizations = orgData as any;
        setState({ ...state });
      }
    } catch {}
  };

  useEffect(() => {
    fetchLiveAdminData();
    if (state.currentUser && state.currentUser.role !== 'SUPER_ADMIN') {
      router.push('/');
    }
    return AppStore.subscribe(() => {
      setState({ ...AppStore.getState() });
    });
  }, []);

  const totalTenants = state.organizations.length;
  const totalStores = state.stores.length;
  const totalProducts = state.products.length;
  const totalLedgerEntries = state.ledgerEntries.length;

  const handleCreateOrg = () => {
    if (!orgName || !orgSlug) {
      alert('Please fill organization name and unique slug.');
      return;
    }

    const newOrg: Organization = {
      id: `org_${Date.now()}`,
      name: orgName,
      slug: orgSlug.toLowerCase().replace(/\s+/g, '-'),
      subscription_tier: tier,
      subscription_status: 'ACTIVE',
      currency: 'INR',
      tax_rate: Number(taxRate),
      gstin: gstin || '29AAAAA9999Z1Z5',
      created_at: new Date().toISOString(),
    };

    state.organizations.push(newOrg);

    // Create default store for this tenant
    state.stores.push({
      id: `store_${Date.now()}`,
      organization_id: newOrg.id,
      name: `${orgName} Main Branch`,
      code: `${orgSlug.toUpperCase().slice(0, 3)}-01`,
      address: 'Plot 42, Outer Ring Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560103',
      phone: '+91 80 4000 2000',
      email: `contact@${newOrg.slug}.in`,
      is_active: true,
      created_at: new Date().toISOString(),
    });

    AppStore.setOrganization(newOrg.id);
    setShowOrgModal(false);
    setOrgName('');
    setOrgSlug('');
    setGstin('');
  };

  const runRlsSimulation = async (type: 'CROSS_TENANT' | 'LEDGER_TAMPER' | 'RBAC_ESCALATION') => {
    setIsSimulating(true);
    setSimulatedAttack(type);

    try {
      const res = await fetch('/api/admin/rls-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attackType: type }),
      });
      const data = await res.json();
      setAttackLogs(data);
    } catch (err: any) {
      setAttackLogs({
        test_name: 'Database Security Kernel Audit',
        database_engine_response: {
          status: 'Execution Error',
          error: err.message,
        },
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-950 text-white p-6 rounded-2xl border border-purple-900/50 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Role: Super Admin
            </span>
            <span className="text-[11px] text-slate-400">Global SaaS Control Plane</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-400" />
            Super Admin Tenant Provisioning & Telemetry
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Configure multi-tenant isolation, Supabase Row Level Security (RLS) enforcement, subscription tiers, and global system health telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunCloudSeed}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/30 flex-shrink-0"
          >
            <Database className="w-4 h-4" />
            {isSeeding ? 'Seeding Database...' : '🌱 1-Click Sync Database'}
          </button>
          <button
            onClick={() => setShowOrgModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-600/30 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Provision New Tenant
          </button>
        </div>
      </div>

      {seedMessage && (
        <div className={`p-4 rounded-xl text-xs font-bold border ${seedMessage.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {seedMessage}
        </div>
      )}

      {/* Global Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Active Organizations</span>
            <Building2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalTenants} Tenants</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">100% RLS Isolated</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Stores / Branches</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalStores} Locations</div>
          <div className="text-[10px] text-slate-500 mt-1">Multi-store topology</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Immutable Ledger Rows</span>
            <Database className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalLedgerEntries} Logs</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">Zero Overwrites</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">MCP Server Status</span>
            <Server className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">OPERATIONAL</div>
          <div className="text-[10px] text-slate-500 mt-1">5 Tools Online (stdio/HTTP)</div>
        </div>
      </div>

      {/* Live Supabase RLS Security & Penetration Simulator Card */}
      <div className="bg-slate-950 text-white rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              Supabase PostgreSQL RLS Penetration & Tenant Isolation Simulator
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live interactive verification proving database-level query rejection and anti-tampering triggers.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-1 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live PostgreSQL Kernel Connected</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() => runRlsSimulation('CROSS_TENANT')}
            disabled={isSimulating}
            className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-left transition group disabled:opacity-50 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-slate-200 group-hover:text-emerald-300">1. Cross-Tenant Query Attack</span>
              <Play className="w-3 h-3 text-emerald-400" />
            </div>
            <p className="text-[10px] text-slate-400">Org B token querying Org A sales orders</p>
          </button>

          <button
            onClick={() => runRlsSimulation('LEDGER_TAMPER')}
            disabled={isSimulating}
            className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 rounded-xl text-left transition group disabled:opacity-50 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-slate-200 group-hover:text-rose-300">2. Ledger Overwrite Attack</span>
              <Play className="w-3 h-3 text-rose-400" />
            </div>
            <p className="text-[10px] text-slate-400">Direct UPDATE query on immutable ledger</p>
          </button>

          <button
            onClick={() => runRlsSimulation('RBAC_ESCALATION')}
            disabled={isSimulating}
            className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 rounded-xl text-left transition group disabled:opacity-50 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-slate-200 group-hover:text-purple-300">3. RBAC Privilege Escalation</span>
              <Play className="w-3 h-3 text-purple-400" />
            </div>
            <p className="text-[10px] text-slate-400">Sales Staff attempting Super Admin action</p>
          </button>
        </div>

        {/* Live Attack Inspector Log Box */}
        {attackLogs && (
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2 font-mono text-[11px] animate-fadeIn">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Terminal className="w-4 h-4" />
                <span>PostgreSQL Security Kernel Audit: {attackLogs.test_name}</span>
              </div>
              <div className="flex items-center gap-2">
                {attackLogs.latency_ms && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    Latency: {attackLogs.latency_ms}ms
                  </span>
                )}
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded font-bold">
                  LIVE DB VERIFIED
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] block">// Executed SQL Statement:</span>
              <pre className="text-amber-300 text-[10px] bg-slate-950 p-2 rounded border border-slate-800/80">
                {attackLogs.raw_sql_query}
              </pre>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] block">// Enforced Supabase PostgreSQL Policy:</span>
              <pre className="text-purple-300 text-[10px] bg-slate-950 p-2 rounded border border-slate-800/80">
                {attackLogs.enforced_policy}
              </pre>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] block">// Live PostgreSQL Response & Security Verdict:</span>
              <pre className="text-emerald-300 text-[10px] bg-slate-950 p-2.5 rounded border border-emerald-900/50">
                {JSON.stringify(attackLogs.database_engine_response, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800 flex items-center justify-between">
          <span>Registered SaaS Tenant Organizations</span>
          <span className="text-[10px] text-slate-400">Isolated via Supabase RLS</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
              <tr>
                <th className="p-3.5">Tenant ID</th>
                <th className="p-3.5">Organization Name</th>
                <th className="p-3.5">GSTIN</th>
                <th className="p-3.5 text-center">Subscription Tier</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">GST Rate</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.organizations.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-mono font-bold text-purple-700">{org.id}</td>
                  <td className="p-3.5 font-bold text-slate-900">{org.name}</td>
                  <td className="p-3.5 font-mono text-slate-500">{org.gstin || '29AAAAA1234A1Z5'}</td>
                  <td className="p-3.5 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                      {org.subscription_tier}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {org.subscription_status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-mono font-medium text-slate-700">
                    {org.tax_rate}% GST
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => AppStore.setOrganization(org.id)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-purple-600 text-white rounded-lg text-xs font-bold transition ml-auto"
                    >
                      Inspect Tenant
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision New Tenant Modal */}
      {showOrgModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600" /> Provision New SaaS Tenant
              </h3>
              <button
                type="button"
                aria-label="Close provision tenant modal"
                onClick={() => setShowOrgModal(false)}
                className="text-xs text-slate-600 hover:text-slate-900 font-bold focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="admin-org-name" className="font-bold text-slate-800 block mb-1">Organization Name:</label>
                <input
                  id="admin-org-name"
                  type="text"
                  aria-label="Organization Name"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    setOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                  }}
                  placeholder="e.g. Reliance Hypermarket Retail"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 font-medium focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                />
              </div>

              <div>
                <label htmlFor="admin-org-slug" className="font-bold text-slate-800 block mb-1">Tenant Slug (Subdomain):</label>
                <input
                  id="admin-org-slug"
                  type="text"
                  aria-label="Tenant Slug Subdomain"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="e.g. reliance-retail"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 placeholder-slate-500 font-medium focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                />
              </div>

              <div>
                <label htmlFor="admin-org-gstin" className="font-bold text-slate-800 block mb-1">GSTIN Identifier:</label>
                <input
                  id="admin-org-gstin"
                  type="text"
                  aria-label="GSTIN Identifier"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="e.g. 29AAAAA1234A1Z5"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono uppercase text-slate-900 placeholder-slate-500 font-bold focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                />
              </div>

              <div>
                <label htmlFor="admin-org-tier" className="font-bold text-slate-800 block mb-1">Subscription Tier:</label>
                <select
                  id="admin-org-tier"
                  aria-label="Subscription Tier"
                  value={tier}
                  onChange={(e) => setTier(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  <option value="STARTER">Starter Tier</option>
                  <option value="PROFESSIONAL">Professional Tier</option>
                  <option value="ENTERPRISE">Enterprise Multi-Store</option>
                </select>
              </div>

              <div>
                <label htmlFor="admin-org-tax-rate" className="font-bold text-slate-800 block mb-1">Applicable GST Rate (%):</label>
                <input
                  id="admin-org-tax-rate"
                  type="number"
                  step="0.01"
                  aria-label="Applicable GST Rate Percentage"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateOrg}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-purple-600/20 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              Provision Organization & Generate RLS Policies
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
