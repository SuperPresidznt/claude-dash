'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function WellbeingPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queryClient = useQueryClient();

  const { data: checkIns } = useQuery({
    queryKey: ['wellbeing-checkins'],
    queryFn: async () => {
      const res = await fetch('/api/wellbeing/check-ins');
      if (!res.ok) throw new Error('Failed to fetch check-ins');
      return res.json();
    },
  });

  const { data: correlations } = useQuery({
    queryKey: ['wellbeing-correlations'],
    queryFn: async () => {
      const res = await fetch('/api/wellbeing/correlations?days=30');
      if (!res.ok) throw new Error('Failed to fetch correlations');
      return res.json();
    },
  });

  const createCheckIn = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/wellbeing/check-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create check-in');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wellbeing-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['wellbeing-correlations'] });
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Wellbeing & Health</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Daily Check-In</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createCheckIn.mutate({
              date: new Date(selectedDate).toISOString(),
              sleepHours: parseFloat(formData.get('sleepHours') as string),
              sleepQuality: parseInt(formData.get('sleepQuality') as string),
              mood: formData.get('mood'),
              energy: formData.get('energy'),
              stressLevel: parseInt(formData.get('stressLevel') as string),
              notes: formData.get('notes'),
            });
          }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Sleep Hours</label>
                <input type="number" name="sleepHours" step="0.5" className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sleep Quality (1-10)</label>
                <input type="range" name="sleepQuality" min="1" max="10" className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mood</label>
                <select name="mood" className="w-full border rounded px-3 py-2">
                  <option value="very_low">Very Low</option>
                  <option value="low">Low</option>
                  <option value="neutral">Neutral</option>
                  <option value="good">Good</option>
                  <option value="excellent">Excellent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Energy</label>
                <select name="energy" className="w-full border rounded px-3 py-2">
                  <option value="exhausted">Exhausted</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                  <option value="energized">Energized</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stress Level (1-10)</label>
                <input type="range" name="stressLevel" min="1" max="10" className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea name="notes" rows={3} className="w-full border rounded px-3 py-2"></textarea>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                Save Check-In
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Correlations & Insights</h2>
          {correlations?.insights?.map((insight: string, idx: number) => (
            <div key={idx} className="bg-blue-50 p-3 rounded mb-2 text-sm">
              {insight}
            </div>
          ))}
          <div className="mt-6 space-y-3">
            <div>
              <p className="text-sm text-gray-600">Sleep vs Tasks Correlation</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${Math.abs(correlations?.correlations?.sleepVsTasks || 0) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm">{(correlations?.correlations?.sleepVsTasks || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Recent Check-Ins</h2>
        <div className="space-y-2">
          {checkIns?.checkIns?.slice(0, 7).map((checkIn: any) => (
            <div key={checkIn.id} className="flex justify-between items-center border-b pb-2">
              <span className="text-sm">{format(new Date(checkIn.date), 'MMM dd, yyyy')}</span>
              <div className="flex gap-4 text-sm">
                <span>Sleep: {checkIn.sleepHours}h</span>
                <span>Mood: {checkIn.mood}</span>
                <span>Energy: {checkIn.energy}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
