'use client';

import { useState, useEffect } from 'react';
import CalendarView from '@/components/calendar/calendar-view';
import SyncSettings from '@/components/calendar/sync-settings';
import { format } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  linkedTaskId?: string;
  linkedHabitId?: string;
}

export default function CalendarPageClient() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'week' | 'day'>('week');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const response = await fetch(
        `/api/calendar/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleDateClick = (date: Date) => {
    console.log('Date clicked:', date);
    // Could open a create event modal here
  };

  const convertedEvents = events.map((e) => ({
    ...e,
    startTime: new Date(e.startTime),
    endTime: new Date(e.endTime)
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your schedule and sync with Google Calendar
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Selector */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-sm rounded ${
                  view === v
                    ? 'bg-white dark:bg-gray-800 shadow'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showSettings ? 'Hide Settings' : 'Sync Settings'}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div>
          <SyncSettings />
        </div>
      )}

      {/* Calendar */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              Loading calendar...
            </p>
          </div>
        </div>
      ) : (
        <CalendarView
          events={convertedEvents}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
          view={view}
        />
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold dark:text-white mb-4">
              {selectedEvent.title}
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">
                  Start:
                </span>{' '}
                <span className="dark:text-white">
                  {format(new Date(selectedEvent.startTime), 'PPpp')}
                </span>
              </div>

              <div>
                <span className="text-gray-600 dark:text-gray-400">
                  End:
                </span>{' '}
                <span className="dark:text-white">
                  {format(new Date(selectedEvent.endTime), 'PPpp')}
                </span>
              </div>

              {selectedEvent.description && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Description:
                  </span>
                  <p className="dark:text-white mt-1">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {selectedEvent.linkedTaskId && (
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded">
                  <span className="text-purple-800 dark:text-purple-200 font-medium">
                    Linked to Task
                  </span>
                </div>
              )}

              {selectedEvent.linkedHabitId && (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                  <span className="text-green-800 dark:text-green-200 font-medium">
                    Linked to Habit
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedEvent(null)}
              className="mt-6 w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
