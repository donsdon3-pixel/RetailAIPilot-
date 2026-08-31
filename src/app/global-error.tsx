'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
            ⚡
          </div>
          <h2 className="text-xl font-black text-white">RetailPilot AI</h2>
          <p className="text-xs text-slate-400">
            Session refreshed. Click below to enter your dashboard or login screen.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/login';
                } else {
                  reset();
                }
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Go to Login / Dashboard
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
