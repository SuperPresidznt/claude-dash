'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function SocialPage() {
  const [view, setView] = useState<'partners' | 'coworking' | 'recaps'>('partners');
  const queryClient = useQueryClient();

  const { data: partners } = useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const res = await fetch('/api/social/partners');
      if (!res.ok) throw new Error('Failed to fetch partners');
      return res.json();
    },
  });

  const createPartner = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/social/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create partner');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });

  const generateRecap = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/social/recaps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffset: 0 }),
      });
      if (!res.ok) throw new Error('Failed to generate recap');
      return res.json();
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Social & Accountability</h1>

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setView('partners')}
          className={`px-4 py-2 rounded ${view === 'partners' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Partners
        </button>
        <button
          onClick={() => setView('coworking')}
          className={`px-4 py-2 rounded ${view === 'coworking' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Co-Working
        </button>
        <button
          onClick={() => setView('recaps')}
          className={`px-4 py-2 rounded ${view === 'recaps' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Weekly Recaps
        </button>
      </div>

      {view === 'partners' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Invite Accountability Partner</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createPartner.mutate({
                partnerEmail: formData.get('email'),
                permissions: ['dashboard_view', 'goals_view'],
                notes: formData.get('notes'),
              });
              e.currentTarget.reset();
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Partner Email</label>
                  <input type="email" name="email" required className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea name="notes" rows={2} className="w-full border rounded px-3 py-2"></textarea>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                  Send Invitation
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Your Partners</h2>
            <div className="space-y-3">
              {partners?.map((partner: any) => (
                <div key={partner.id} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <p className="font-medium">{partner.partnerEmail}</p>
                    <p className="text-sm text-gray-600">Status: {partner.status}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    Invited {format(new Date(partner.invitedAt), 'MMM dd, yyyy')}
                  </div>
                </div>
              ))}
              {partners?.length === 0 && (
                <p className="text-gray-600 text-center py-4">No partners yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'coworking' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Co-Working Sessions</h2>
          <p className="text-gray-600 mb-4">Schedule focused co-working sessions with accountability partners</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Schedule Session
          </button>
        </div>
      )}

      {view === 'recaps' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Weekly Recaps</h2>
          <p className="text-gray-600 mb-4">Auto-generated summaries shared with your accountability partners</p>
          <button
            onClick={() => generateRecap.mutate()}
            disabled={generateRecap.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {generateRecap.isPending ? 'Generating...' : 'Generate This Week\'s Recap'}
          </button>
          {generateRecap.isSuccess && (
            <div className="mt-4 bg-green-50 border border-green-200 p-4 rounded">
              <p className="text-green-800">Weekly recap generated successfully!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
