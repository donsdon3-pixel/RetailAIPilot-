'use client';

import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

export interface DemoAccount {
  email: string;
  role: string;
  roleTitle: string;
  orgName: string;
  name: string;
  desc: string;
  color: string;
  badgeColor: string;
}

interface DemoPersonaSelectorProps {
  accounts: DemoAccount[];
  selectedEmail: string;
  onSelect: (account: DemoAccount) => void;
}

export default function DemoPersonaSelector({
  accounts,
  selectedEmail,
  onSelect,
}: DemoPersonaSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1 mb-1">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> 1-Click Demo Personas
        </h4>
        <span className="text-[11px] text-slate-300">Click to autofill</span>
      </div>

      {accounts.map((acc) => (
        <button
          key={acc.email}
          type="button"
          onClick={() => onSelect(acc)}
          aria-label={`Demo Persona ${acc.name} (${acc.roleTitle})`}
          className={`w-full text-left p-3.5 rounded-2xl border transition relative group cursor-pointer ${
            selectedEmail === acc.email
              ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/5'
              : 'border-slate-800/90 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                  {acc.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-200 border border-slate-700">
                  {acc.role}
                </span>
              </div>
              <div className="text-xs text-emerald-300 font-semibold mt-0.5">
                {acc.email}
              </div>
              <div className="text-[11px] text-slate-300 mt-1 line-clamp-1">
                {acc.desc}
              </div>
            </div>
            <ArrowRight
              className={`w-4 h-4 mt-1 transition ${
                selectedEmail === acc.email
                  ? 'text-emerald-400 translate-x-1'
                  : 'text-slate-400 group-hover:text-slate-200'
              }`}
            />
          </div>
        </button>
      ))}
    </div>
  );
}
