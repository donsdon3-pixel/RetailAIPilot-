import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | RetailPilot AI - Autonomous Retail ERP & Cloud POS',
  description: 'Sign in to RetailPilot AI portal or explore demo personas.',
  alternates: {
    canonical: 'https://retail-ai-pilot.vercel.app/login',
  },
  openGraph: {
    title: 'Sign In | RetailPilot AI',
    description: 'Sign in to RetailPilot AI multi-tenant retail operations portal.',
    url: 'https://retail-ai-pilot.vercel.app/login',
    siteName: 'RetailPilot AI',
    type: 'website',
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
