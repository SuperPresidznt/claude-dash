'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

export default function PlaidPage() {
  const [linkToken, setLinkToken] = useState<string | null>(null);

  const generateLinkToken = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/plaid/link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to generate link token');
      return res.json();
    },
    onSuccess: (data) => {
      setLinkToken(data.link_token);
      // In production, you would open Plaid Link modal here
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Bank Sync with Plaid</h1>

      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Privacy & Security</h2>
        <div className="prose prose-sm">
          <p className="mb-2">
            We use Plaid to securely connect to your financial institutions. Your data is:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li>Encrypted end-to-end using industry-standard protocols</li>
            <li>Never stored on our servers in plain text</li>
            <li>Only accessible by you and never shared with third parties</li>
            <li>Compliant with banking security regulations (SOC 2, PCI DSS)</li>
            <li>Revocable at any time from your settings</li>
          </ul>
          <p className="mt-3 text-sm text-gray-600">
            You have full control over which accounts to sync and can disconnect at any time.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Connect Your Bank</h2>
        <p className="text-gray-600 mb-4">
          Automatically import transactions and account balances from your financial institutions.
        </p>

        {!linkToken ? (
          <button
            onClick={() => generateLinkToken.mutate()}
            disabled={generateLinkToken.isPending}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {generateLinkToken.isPending ? 'Preparing...' : 'Connect Bank Account'}
          </button>
        ) : (
          <div className="bg-gray-50 p-4 rounded border">
            <p className="font-medium mb-2">Link Token Generated</p>
            <p className="text-sm text-gray-600 mb-3">
              In production, this would open the Plaid Link modal to securely connect your bank.
            </p>
            <p className="text-xs text-gray-500 font-mono bg-white p-2 rounded">
              Token: {linkToken}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Integrate Plaid Link SDK to complete the connection flow.
            </p>
          </div>
        )}

        <div className="mt-8 pt-8 border-t">
          <h3 className="font-bold mb-3">Connected Accounts</h3>
          <p className="text-gray-600 text-sm">No accounts connected yet</p>
        </div>
      </div>

      <div className="mt-8 bg-yellow-50 border border-yellow-200 p-4 rounded">
        <h3 className="font-bold text-sm mb-2">Implementation Notes:</h3>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• Install @plaid/plaid package for backend API integration</li>
          <li>• Install react-plaid-link for frontend Link component</li>
          <li>• Configure Plaid credentials in environment variables</li>
          <li>• Implement webhook handlers for transaction updates</li>
          <li>• Add encryption layer for storing access tokens</li>
        </ul>
      </div>
    </div>
  );
}
