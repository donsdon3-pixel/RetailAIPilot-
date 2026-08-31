import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/navigation/Sidebar';
import Header from '@/components/navigation/Header';

export const metadata: Metadata = {
  title: 'RetailPilot AI - Enterprise Multi-Tenant Retail ERP & Autonomous MCP POS',
  description:
    'Production-grade Multi-Tenant Retail Inventory, Cloud POS & Business Management SaaS powered by Supabase PostgreSQL Row Level Security (RLS), Immutable Stock Ledger, and Model Context Protocol (MCP) Autonomous AI Agents.',
  keywords: [
    'Retail SaaS',
    'Multi-Tenant Retail Operations',
    'Model Context Protocol',
    'MCP Server',
    'Supabase PostgreSQL RLS',
    'Immutable Inventory Ledger',
    'Cloud POS System',
    'Retail AI Agents',
    'Prorated Returns GST',
    'Automated Stock Audits',
    'Enterprise Cloud ERP',
    'Autonomous Retail Intelligence',
  ],
  authors: [{ name: 'RetailPilot AI Engineering Team' }],
  metadataBase: new URL('https://retail-ai-pilot.vercel.app'),
  alternates: {
    canonical: 'https://retail-ai-pilot.vercel.app',
  },
  openGraph: {
    title: 'RetailPilot AI - Enterprise Multi-Tenant Retail ERP & Autonomous MCP POS',
    description:
      'Autonomous retail intelligence platform with live Supabase RLS isolation, immutable audit ledger, split-tender POS, and real-time MCP business analytics.',
    url: 'https://retail-ai-pilot.vercel.app',
    siteName: 'RetailPilot AI',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RetailPilot AI - Autonomous Retail Operations SaaS',
    description:
      'Live Supabase RLS multi-tenancy, immutable stock ledgers, Model Context Protocol (MCP) diagnostics, and AI workflows.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'RetailPilot AI',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, Cloud, POS Hardware',
  url: 'https://retail-ai-pilot.vercel.app',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
  },
  description:
    'Multi-tenant intelligent retail inventory, POS checkout, and ERP SaaS with Supabase PostgreSQL Row Level Security (RLS) and Model Context Protocol (MCP) diagnostics.',
  featureList: [
    'Multi-Tenant Database Row Level Security (RLS)',
    'Append-Only Immutable Stock Movement Ledger',
    'Model Context Protocol (MCP) Diagnostic Server',
    'Split-Tender POS with Barcode Scanning',
    'Prorated Line-Item Returns & GST Calculations',
    'Automated Event-Driven Business Workflows',
  ],
  spatialCoverage: {
    '@type': 'Place',
    name: 'India (Bengaluru, Mumbai)',
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '12.9716',
      longitude: '77.5946',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
