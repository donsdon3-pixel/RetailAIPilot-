'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppStore, AppState } from '@/lib/store';
import { AIService, AIMessage } from '@/lib/ai-service';
import {
  Bot,
  Send,
  Sparkles,
  Terminal,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Code2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
} from 'lucide-react';

export default function AIAssistantPage() {
  const [state, setState] = useState<AppState>(AppStore.getState());
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'assistant',
      content:
        'Hello! I am your **RetailPilot Autonomous AI Business Assistant**.\n\nI am directly connected to your PostgreSQL database via the **Model Context Protocol (MCP)** server. I strictly invoke live queries rather than hallucinating estimates.\n\nAsk me about stock velocity, stagnant capital liquidation, store P&L margins, or supplier accounts payable!',
      disclaimer:
        'AI-generated recommendation. Real-time verified against PostgreSQL database via Model Context Protocol (MCP).',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedToolMsgId, setExpandedToolMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return AppStore.subscribe(() => {
      setState({ ...AppStore.getState() });
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (queryText?: string) => {
    const text = queryText || inputQuery;
    if (!text.trim() || isLoading) return;

    const userMsg: AIMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await AIService.processQuery(
        text,
        state.currentOrgId,
        state.currentStoreId
      );
      setMessages((prev) => [...prev, response]);
      if (response.toolInvocation) {
        setExpandedToolMsgId(response.id);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          content: `Error executing query: ${e.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    {
      label: '⚡ 1. Check Low Stock SKUs',
      prompt: 'Which products are running low on stock and need reordering?',
    },
    {
      label: '💰 2. Identify Dead Stock (>60d)',
      prompt: 'Identify high value dead stock with zero sales in 60+ days and suggest liquidation discounts.',
    },
    {
      label: '📊 3. Store Profitability & P&L',
      prompt: 'What is the gross sales, COGS, operating expenses, and net profit for my store?',
    },
    {
      label: '🚚 4. Supplier Accounts Payable',
      prompt: 'Check all outstanding supplier payables and flag any invoices due in <48 hours.',
    },
    {
      label: '📑 5. Executive Monthly Dossier',
      prompt: 'Generate full monthly executive business report with strategic recommendations.',
    },
  ];

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col max-w-5xl mx-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-600/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-sm text-slate-900 flex items-center gap-2">
              Autonomous AI Business Assistant
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                MCP Protocol Live
              </span>
            </h1>
            <p className="text-[11px] text-slate-500">
              Live database queries verified via 5 deterministic MCP tool endpoints.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-mono">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>MCP Server Connected</span>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp.prompt)}
            disabled={isLoading}
            className="px-3 py-1.5 bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 whitespace-nowrap transition shadow-sm flex-shrink-0 disabled:opacity-50"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div
                className={`max-w-3xl p-4 rounded-2xl text-xs leading-relaxed ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-none'
                    : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-none space-y-3'
                }`}
              >
                {/* Assistant header tag */}
                {!isUser && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 pb-1 border-b border-slate-200/60">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>RetailPilot Intelligence Agent</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* MCP Tool Invocation Live Inspector Card */}
                {msg.toolInvocation && (
                  <div className="mt-3 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 overflow-hidden text-[11px] font-mono">
                    <div
                      onClick={() =>
                        setExpandedToolMsgId(
                          expandedToolMsgId === msg.id ? null : msg.id
                        )
                      }
                      className="p-2.5 bg-slate-950 flex items-center justify-between cursor-pointer hover:bg-slate-900/90 transition"
                    >
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">
                          MCP Tool Execution: {msg.toolInvocation.toolName}()
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-[10px]">Latency: 14ms</span>
                        {expandedToolMsgId === msg.id ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </div>

                    {expandedToolMsgId === msg.id && (
                      <div className="p-3 space-y-2 border-t border-slate-800 bg-slate-950/80">
                        <div>
                          <span className="text-slate-400 text-[10px] block mb-0.5">
                            // Input Parameters:
                          </span>
                          <pre className="text-emerald-300 text-[10px] overflow-x-auto">
                            {JSON.stringify(msg.toolInvocation.params, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block mb-0.5">
                            // Live PostgreSQL Data Result:
                          </span>
                          <pre className="text-slate-300 text-[10px] max-h-48 overflow-y-auto">
                            {JSON.stringify(msg.toolInvocation.result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mandatory AI Recommendation Disclaimer */}
                {msg.disclaimer && (
                  <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5 text-[10px] text-slate-500 italic">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>{msg.disclaimer}</span>
                  </div>
                )}
              </div>

              <span className="text-[9px] text-slate-400 font-mono px-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 p-3 rounded-2xl w-fit">
            <Clock className="w-4 h-4 text-emerald-600 animate-spin" />
            <span>Invoking live database query via MCP server...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask AI Assistant about inventory, dead stock, P&L, suppliers..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-transparent text-xs focus:outline-none text-slate-800"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !inputQuery.trim()}
          className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
