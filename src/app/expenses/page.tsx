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

import { createClient } from '@/lib/supabase/client';

export default function ExpensesPage() {
  const [state, setState] = useState<AppState>(AppStore.getState());
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Expense form
  const [categoryId, setCategoryId] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(150);
  const [expenseDate, setExpenseDate] = useState('2026-08-20');
  const [notes, setNotes] = useState('');

  const fetchLiveExpenses = async () => {
    try {
      const supabase = createClient();
      const { data: expData } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
      if (expData && expData.length > 0) {
        state.expenses = expData as any;
        setState({ ...state });
      }
    } catch {}
  };

  useEffect(() => {
    fetchLiveExpenses();
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

  const handleAddExpense = async () => {
    if (!categoryId || !expenseTitle || expenseAmount <= 0) {
      alert('Please fill all expense fields.');
      return;
    }

    const newExpId = `exp_${Date.now()}`;
    AppStore.addExpense(categoryId, expenseTitle, expenseAmount, expenseDate, notes);

    // Persist directly to Supabase PostgreSQL
    try {
      const supabase = createClient();
      await supabase.from('expenses').insert({
        id: newExpId,
        organization_id: state.currentOrgId,
        store_id: state.currentStoreId,
        category_id: categoryId,
        title: expenseTitle,
        amount: expenseAmount,
        expense_date: expenseDate,
        notes: notes,
        created_at: new Date().toISOString(),
      });
      await fetchLiveExpenses();
    } catch (err: any) {
      console.warn('[Add Expense Supabase Warning]', err.message);
    }

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
          <p className="text-xs text-slate-700 font-medium mt-1">
            Computes Net Operating Profit = Gross Sales Revenue (
            {formatCurrency(profitability.gross_sales)}) &minus; COGS ({formatCurrency(profitability.cogs)}) &minus; OpEx (
            {formatCurrency(profitability.operating_expenses)}).
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (orgCategories.length > 0) setCategoryId(orgCategories[0].id);
            setShowExpenseModal(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        >
          <Plus className="w-4 h-4" />
          Log Operating Expense
        </button>
      </div>

      {/* P&L Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-700 font-bold">Gross Revenue (excl. tax)</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            {formatCurrency(profitability.gross_sales)}
          </div>
          <div className="text-[11px] text-emerald-700 font-bold mt-1">Verified Pre-Tax Sales</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-700 font-bold">Cost of Goods Sold (COGS)</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            {formatCurrency(profitability.cogs)}
          </div>
          <div className="text-[11px] text-slate-700 font-medium mt-1">Direct item purchase costs</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-700 font-bold">Operating Expenses (OpEx)</span>
          <div className="text-xl font-black text-rose-700 font-mono mt-1">
            {formatCurrency(profitability.operating_expenses)}
          </div>
          <div className="text-[11px] text-slate-700 font-medium mt-1">Rent, payroll & utilities</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-700 font-bold">Net Operating Profit</span>
          <div className="text-xl font-black text-emerald-700 font-mono mt-1">
            {formatCurrency(profitability.net_profit)}
          </div>
          <div className="text-[11px] text-emerald-800 font-bold mt-1">
            {profitability.net_margin_percent}% Net Margin
          </div>
        </div>
      </div>

      {/* Expenses Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-900">
          Store Expense Ledger
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
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
                  <td className="p-3.5 font-mono text-[11px] text-slate-800 font-medium">{exp.expense_date}</td>
                  <td className="p-3.5 font-semibold text-slate-800">{exp.category_name}</td>
                  <td className="p-3.5 font-bold text-slate-900">{exp.title}</td>
                  <td className="p-3.5 text-slate-700 text-[11px]">{exp.notes || '—'}</td>
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
              <button
                type="button"
                aria-label="Close expense modal"
                onClick={() => setShowExpenseModal(false)}
                className="text-xs text-slate-600 hover:text-slate-900 font-bold focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="expense-category-select" className="font-bold text-slate-800 block mb-1">Expense Category:</label>
                <select
                  id="expense-category-select"
                  aria-label="Expense Category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  {orgCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="expense-title-input" className="font-bold text-slate-800 block mb-1">Expense Title:</label>
                <input
                  id="expense-title-input"
                  type="text"
                  aria-label="Expense Title"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="e.g. Monthly Commercial Refrigeration Power"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                />
              </div>

              <div>
                <label htmlFor="expense-amount-input" className="font-bold text-slate-800 block mb-1">Amount ({CURRENCY_SYMBOL}):</label>
                <input
                  id="expense-amount-input"
                  type="number"
                  step="0.01"
                  aria-label={`Expense Amount in ${CURRENCY_SYMBOL}`}
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                />
              </div>

              <div>
                <label htmlFor="expense-date-input" className="font-bold text-slate-800 block mb-1">Expense Date:</label>
                <input
                  id="expense-date-input"
                  type="date"
                  aria-label="Expense Date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                />
              </div>

              <div>
                <label htmlFor="expense-notes-textarea" className="font-bold text-slate-800 block mb-1">Notes / Invoice Ref:</label>
                <textarea
                  id="expense-notes-textarea"
                  aria-label="Expense Notes or Invoice Reference"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Utility billing invoice #4881"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg h-16 text-slate-900 placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddExpense}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              Record Expense Entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
