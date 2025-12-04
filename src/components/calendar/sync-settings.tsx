'use client';

import { useState, useEffect } from 'react';

interface CalendarSync {
  id: string;
  calendarId: string;
  syncEnabled: boolean;
  lastSyncAt?: Date;
  _count: {
    events: number;
  };
}

export default function SyncSettings() {
  const [syncs, setSyncs] = useState<CalendarSync[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchSyncs();
  }, []);

  const fetchSyncs = async () => {
    try {
      const response = await fetch('/api/calendar/sync');
      if (response.ok) {
        const data = await response.json();
        setSyncs(data);
      }
    } catch (error) {
      console.error('Error fetching syncs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (calendarId: string) => {
    setSyncing(calendarId);
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarId })
      });

      if (response.ok) {
        await fetchSyncs();
      } else {
        alert('Failed to sync calendar');
      }
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Error syncing calendar');
    } finally {
      setSyncing(null);
    }
  };

  const handleToggle = async (syncId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/calendar/sync/${syncId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncEnabled: enabled })
      });

      if (response.ok) {
        await fetchSyncs();
      }
    } catch (error) {
      console.error('Error toggling sync:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 border-b dark:border-gray-700">
        <h2 className="text-xl font-bold dark:text-white">
          Calendar Sync Settings
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage your Google Calendar integrations
        </p>
      </div>

      <div className="p-6 space-y-4">
        {syncs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No calendars synced yet
            </p>
            <button
              onClick={() => handleSync('primary')}
              disabled={syncing !== null}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync Primary Calendar'}
            </button>
          </div>
        ) : (
          syncs.map((sync) => (
            <div
              key={sync.id}
              className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700"
            >
              <div className="flex-1">
                <h3 className="font-medium dark:text-white">
                  {sync.calendarId === 'primary'
                    ? 'Primary Calendar'
                    : sync.calendarId}
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {sync._count.events} events synced
                  {sync.lastSyncAt && (
                    <span className="ml-2">
                      Last sync:{' '}
                      {new Date(sync.lastSyncAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sync.syncEnabled}
                    onChange={(e) =>
                      handleToggle(sync.id, e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm dark:text-white">
                    Enabled
                  </span>
                </label>

                <button
                  onClick={() => handleSync(sync.calendarId)}
                  disabled={syncing === sync.calendarId}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {syncing === sync.calendarId ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
