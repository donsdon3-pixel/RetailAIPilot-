'use client';

import React, { useState, useEffect } from 'react';
import { AppStore, AppState } from '@/lib/store';
import { MCPTools } from '@/lib/mcp-tools';
import { formatCurrency, CURRENCY_SYMBOL } from '@/lib/format';
import {
  DollarSign,
  Plus,
  TrendingUp,
  PieChart,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  Receipt,
} from 'lucide-react';

export default function ExpensesPage() {
  const [state, setState] = useState<AppState>(AppStore.getState());
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Expense form
  const [categoryId, setCategoryId] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(150);
  const [expenseDate, setExpenseDate] = useState('2026-08-20');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    return AppStore.subscribe(() => {
      setState({ ...AppStore.getState() });
    });
  }, []);

  const orgExpenses = state.expenses.filter((e) => e.organization_id === state.currentOrgId);
  const orgCategories = state.expenseCategories.filter((c) => c.organization_id === state.currentOrgId);
  const context = AppStore.getDataContext();

  const profitability = MCPTools.getProfitability(context, {
    store_id: state.currentStoreId,
  });

  const handleAddExpense = () => {
    if (!categoryId || !expenseTitle || expenseAmount <= 0) {
      alert('Please fill all expense fields.');
      return;
    }

    AppStore.addExpense(categoryId, expenseTitle, expenseAmount, expenseDate, notes);
    setShowExpenseModal(false);
    setExpenseTitle('');
    setNotes('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Operating Expenses & P&L Margin Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Computes Net Operating Profit = Gross Sales Revenue (
            {formatCurrency(profitability.gross_sales)}) &minus; COGS ({formatCurrency(profitability.cogs)}) &minus; OpEx (
            {formatCurrency(profitability.operating_expenses)}).
          </p>
        </div>

        <button
          onClick={() => {
            if (orgCategories.length > 0) setCategoryId(orgCategories[0].id);
            setShowExpenseModal(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Log Operating Expense
        </button>
      </div>

      {/* P&L Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Gross Revenue</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            {formatCurrency(profitability.gross_sales)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">100% Invoiced</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Cost of Goods Sold (COGS)</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            {formatCurrency(profitability.cogs)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Direct item purchase costs</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Operating Expenses (OpEx)</span>
          <div className="text-xl font-black text-rose-600 font-mono mt-1">
            {formatCurrency(profitability.operating_expenses)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Rent, payroll & utilities</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Net Operating Profit</span>
          <div className="text-xl font-black text-emerald-600 font-mono mt-1">
            {formatCurrency(profitability.net_profit)}
          </div>
          <div className="text-[11px] text-emerald-700 font-bold mt-1">
            {profitability.net_margin_percent}% Net Margin
          </div>
        </div>
      </div>

      {/* Expenses Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800">
          Store Expense Ledger
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Title / Description</th>
                <th className="p-3.5">Notes</th>
                <th className="p-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orgExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-mono text-[11px] text-slate-500">{exp.expense_date}</td>
                  <td className="p-3.5 font-semibold text-slate-700">{exp.category_name}</td>
                  <td className="p-3.5 font-bold text-slate-900">{exp.title}</td>
                  <td className="p-3.5 text-slate-500 text-[11px]">{exp.notes || '—'}</td>
                  <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(exp.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Log Operating Expense
              </h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-xs text-slate-400">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Expense Category:</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium"
                >
                  {orgCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Expense Title:</label>
                <input
                  type="text"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="e.g. Monthly Commercial Refrigeration Power"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount ({CURRENCY_SYMBOL}):</label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Expense Date:</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes / Invoice Ref:</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Utility billing invoice #4881"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg h-16"
                />
              </div>
            </div>

            <button
              onClick={handleAddExpense}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition"
            >
              Record Expense Entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
