'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Session {
  id: string;
  sessionToken: string;
  expires: Date;
}

export default function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/auth/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to sign out this device?')) {
      return;
    }

    try {
      const response = await fetch(`/api/auth/sessions?sessionId=${sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchSessions();
      } else {
        alert('Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Error deleting session');
    }
  };

  const handleSignOutAll = async () => {
    if (!confirm('Are you sure you want to sign out all other devices? You will remain signed in on this device.')) {
      return;
    }

    try {
      const response = await fetch('/api/auth/sessions?all=true', {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchSessions();
        alert('Successfully signed out all other devices');
      } else {
        alert('Failed to sign out all devices');
      }
    } catch (error) {
      console.error('Error signing out all:', error);
      alert('Error signing out all devices');
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold dark:text-white">
              Active Sessions
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage devices where you're signed in
            </p>
          </div>

          {sessions.length > 1 && (
            <button
              onClick={handleSignOutAll}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Sign Out All Other Devices
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-3">
        {sessions.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400 py-8">
            No active sessions found
          </p>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700"
            >
              <div>
                <div className="font-medium dark:text-white">
                  Session {session.id.slice(0, 8)}...
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Expires: {format(new Date(session.expires), 'PPp')}
                </div>
              </div>

              <button
                onClick={() => handleDeleteSession(session.id)}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Sign Out
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
