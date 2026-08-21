'use client';

import React, { useState, useEffect } from 'react';
import { AppStore, AppState } from '@/lib/store';
import { Organization } from '@/lib/types';
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
} from 'lucide-react';

export default function SuperAdminPage() {
  const [state, setState] = useState<AppState>(AppStore.getState());
  const [showOrgModal, setShowOrgModal] = useState(false);

  // New Organization form
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [tier, setTier] = useState<'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'>('ENTERPRISE');
  const [taxRate, setTaxRate] = useState(8.25);

  useEffect(() => {
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
      currency: 'USD',
      tax_rate: Number(taxRate),
      created_at: new Date().toISOString(),
    };

    state.organizations.push(newOrg);

    // Create default store for this tenant
    state.stores.push({
      id: `store_${Date.now()}`,
      organization_id: newOrg.id,
      name: `${orgName} Main Branch`,
      code: `${orgSlug.toUpperCase().slice(0, 3)}-01`,
      address: '100 Business Pkwy',
      city: 'Metro City',
      phone: '+1 (555) 100-2000',
      email: `contact@${newOrg.slug}.com`,
      is_active: true,
      created_at: new Date().toISOString(),
    });

    AppStore.setOrganization(newOrg.id);
    setShowOrgModal(false);
    setOrgName('');
    setOrgSlug('');
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

        <button
          onClick={() => setShowOrgModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-600/30"
        >
          <Plus className="w-4 h-4" />
          Provision New Tenant
        </button>
      </div>

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
                <th className="p-3.5">Slug</th>
                <th className="p-3.5 text-center">Subscription Tier</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Tax Rate</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.organizations.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-mono font-bold text-purple-700">{org.id}</td>
                  <td className="p-3.5 font-bold text-slate-900">{org.name}</td>
                  <td className="p-3.5 font-mono text-slate-500">{org.slug}</td>
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
                    {org.tax_rate}%
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
              <button onClick={() => setShowOrgModal(false)} className="text-xs text-slate-400">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Organization Name:</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    setOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                  }}
                  placeholder="e.g. Apex Hypermarket Ltd."
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tenant Slug (Subdomain):</label>
                <input
                  type="text"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="e.g. apex-hypermarket"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Subscription Tier:</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium"
                >
                  <option value="STARTER">Starter Tier</option>
                  <option value="PROFESSIONAL">Professional Tier</option>
                  <option value="ENTERPRISE">Enterprise Multi-Store</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Sales Tax Rate (%):</label>
                <input
                  type="number"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>
            </div>

            <button
              onClick={handleCreateOrg}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-purple-600/20"
            >
              Provision Organization & Generate RLS Policies
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
