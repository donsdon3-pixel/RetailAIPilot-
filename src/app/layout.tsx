import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/navigation/Sidebar';
import Header from '@/components/navigation/Header';

export const metadata: Metadata = {
  title: 'RetailPilot AI - Multi-Tenant Retail Operations & MCP SaaS',
  description:
    'Intelligent Retail Inventory, Sales & Business Management SaaS with Supabase RLS, Immutable Stock Ledger, and MCP Autonomous Agents.',
  keywords: [
    'Retail SaaS',
    'Multi-Tenant Retail',
    'Model Context Protocol',
    'MCP Server',
    'Supabase RLS',
    'Immutable Inventory Ledger',
    'POS System',
    'Retail AI Agents',
  ],
  authors: [{ name: 'RetailPilot AI Team' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 antialiased overflow-hidden flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
