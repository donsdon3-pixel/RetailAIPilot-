'use client';

import React, { useState, useEffect } from 'react';
import { AppStore, AppState } from '@/lib/store';
import { WorkflowResult } from '@/lib/automation-service';
import {
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  History,
  Bell,
  Sparkles,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';

export default function AutomationsDashboard() {
  const [state, setState] = useState<AppState>(AppStore.getState());
  const [activeWorkflowResult, setActiveWorkflowResult] = useState<WorkflowResult | null>(null);
  const [runningIndex, setRunningIndex] = useState<number | null>(null);

  useEffect(() => {
    return AppStore.subscribe(() => {
      setState({ ...AppStore.getState() });
    });
  }, []);

  const workflows = [
    {
      id: 1 as const,
      name: '1. Low Stock Auto-Alert',
      trigger: 'Real-time Webhook / Checkout Trigger',
      frequency: 'Continuous on every POS sale',
      action: 'Scans live balances against reorder thresholds. Sends critical manager notification with stockout day velocity.',
      iconColor: 'text-amber-500 bg-amber-50',
    },
    {
      id: 2 as const,
      name: '2. Dead Stock Bi-Weekly Audit',
      trigger: 'Scheduled Cron Engine',
      frequency: 'Every 14 Days (Bi-Weekly)',
      action: 'Identifies inventory with zero sales in >60 days. Generates automated markdown liquidation strategy (25%-40% clearance).',
      iconColor: 'text-rose-500 bg-rose-50',
    },
    {
      id: 3 as const,
      name: '3. Supplier Payment Escalation',
      trigger: 'Scheduled Daily Cron',
      frequency: 'Daily at 08:00 AM',
      action: 'Flags pending purchase order invoices due in < 48 hours. Escalates alerts to Accounts & Store Manager to maintain credit lines.',
      iconColor: 'text-blue-500 bg-blue-50',
    },
    {
      id: 4 as const,
      name: '4. Daily End-of-Day Sales Dossier',
      trigger: 'Midnight Cron Trigger',
      frequency: 'Daily at 23:59 Midnight',
      action: 'Aggregates day gross revenue, refunds, top SKUs, and net margin. Pushes executive summary to Business Owner.',
      iconColor: 'text-emerald-500 bg-emerald-50',
    },
    {
      id: 5 as const,
      name: '5. Monthly Executive AI Report',
      trigger: 'Monthly 1st Calendar Trigger',
      frequency: '1st of Every Month',
      action: 'Invokes full MCP diagnostic pipeline. Computes total P&L, dead capital risk, and autonomous strategic AI growth plans.',
      iconColor: 'text-purple-500 bg-purple-50',
    },
  ];

  const handleRunWorkflow = async (idx: 1 | 2 | 3 | 4 | 5) => {
    setRunningIndex(idx);
    setActiveWorkflowResult(null);

    const t0 = performance.now();
    try {
      // Execute live HTTP API request
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowIndex: idx, organization_id: state.currentOrgId }),
      });

      if (res.ok) {
        const data = await res.json();
        const t1 = performance.now();
        // Attach network latency
        data.networkLatencyMs = parseFloat((t1 - t0).toFixed(1));
        setActiveWorkflowResult(data);
      } else {
        const fallback = AppStore.runAutomation(idx);
        setActiveWorkflowResult(fallback);
      }
    } catch {
      const fallback = AppStore.runAutomation(idx);
      setActiveWorkflowResult(fallback);
    } finally {
      setRunningIndex(null);
    }
  };

  const orgLogs = state.automationLogs.filter(
    (l) => l.organization_id === state.currentOrgId
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Autonomous Business Engine
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-600" />
            5 Mandatory Automated Workflows
          </h1>
          <p className="text-xs text-slate-700 font-medium mt-1">
            Production background triggers and cron jobs executing real-time database audits and push notifications.
          </p>
        </div>
      </div>

      {/* 5 Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((wf) => {
          const isRunning = runningIndex === wf.id;

          return (
            <div
              key={wf.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-500/50 transition group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${wf.iconColor}`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded-full text-slate-800 font-bold">
                    {wf.frequency}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 mt-3">{wf.name}</h3>
                <div className="text-[11px] text-emerald-800 font-bold mt-0.5">
                  Trigger: {wf.trigger}
                </div>
                <p className="text-xs text-slate-700 font-medium mt-2 leading-relaxed">{wf.action}</p>
              </div>

              <button
                type="button"
                aria-label={`Trigger workflow: ${wf.name}`}
                onClick={() => handleRunWorkflow(wf.id)}
                disabled={isRunning}
                className="w-full py-2.5 bg-slate-900 group-hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                {isRunning ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" /> Executing Pipeline...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Trigger Workflow Now
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Real-time Execution Output Viewer */}
      {activeWorkflowResult && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3 font-mono text-xs animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-emerald-400">
                Executed: {activeWorkflowResult.workflow_name}
              </span>
            </div>
            <button
              type="button"
              aria-label="Close workflow output"
              onClick={() => setActiveWorkflowResult(null)}
              className="text-slate-300 hover:text-white font-bold focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              ✕ Close
            </button>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl text-slate-200 font-sans text-xs">
            {activeWorkflowResult.summary}
          </div>

          <div>
            <div className="text-[10px] text-slate-300 uppercase mb-1 font-bold">Generated Output Payload:</div>
            <pre className="p-3 bg-slate-950 rounded-xl text-[11px] text-emerald-300 max-h-60 overflow-y-auto">
              {JSON.stringify(activeWorkflowResult.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Execution Audit Trail Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          Automated Execution History & Audit Logs
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
              <tr>
                <th className="p-3.5">Trigger Timestamp</th>
                <th className="p-3.5">Workflow Name</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Execution Summary Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orgLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.triggered_at).toLocaleString()}
                  </td>
                  <td className="p-3.5 font-bold text-slate-900">{log.workflow_name}</td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        log.execution_status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {log.execution_status}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-600 text-[11px]">{log.result_summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
