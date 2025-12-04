'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  linkedTaskId?: string;
  linkedHabitId?: string;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  view?: 'month' | 'week' | 'day';
}

export default function CalendarView({
  events,
  onEventClick,
  onDateClick,
  view = 'week'
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysToDisplay = () => {
    if (view === 'month') {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    } else if (view === 'week') {
      const start = startOfWeek(currentDate);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    } else {
      return [currentDate];
    }
  };

  const days = getDaysToDisplay();

  const getEventsForDay = (day: Date) => {
    return events.filter((event) =>
      isSameDay(new Date(event.startTime), day)
    );
  };

  const goToPrevious = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    } else if (view === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const goToNext = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    } else if (view === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPrevious}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Previous
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Today
          </button>
          <button
            onClick={goToNext}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Next
          </button>
        </div>

        <h2 className="text-lg font-semibold dark:text-white">
          {view === 'month'
            ? format(currentDate, 'MMMM yyyy')
            : view === 'week'
            ? `Week of ${format(days[0], 'MMM d, yyyy')}`
            : format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h2>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {view === 'week' && (
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`border rounded-lg p-2 min-h-[120px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    isToday
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  onClick={() => onDateClick?.(day)}
                >
                  <div className="text-sm font-semibold mb-2 dark:text-white">
                    {format(day, 'EEE d')}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                        className={`text-xs p-1 rounded cursor-pointer ${
                          event.linkedTaskId
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                            : event.linkedHabitId
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                        }`}
                      >
                        <div className="font-medium truncate">
                          {event.title}
                        </div>
                        {!event.isAllDay && (
                          <div className="text-[10px] opacity-75">
                            {format(new Date(event.startTime), 'h:mm a')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'month' && (
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-semibold p-2 dark:text-white"
              >
                {day}
              </div>
            ))}
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`border rounded p-1 min-h-[80px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    isToday
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  onClick={() => onDateClick?.(day)}
                >
                  <div className="text-xs font-semibold mb-1 dark:text-white">
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                        className="text-[10px] p-0.5 rounded bg-blue-100 dark:bg-blue-900/30 truncate"
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'day' && (
          <div className="space-y-2">
            {Array.from({ length: 24 }, (_, hour) => {
              const hourEvents = events.filter((event) => {
                const eventHour = new Date(event.startTime).getHours();
                return (
                  isSameDay(new Date(event.startTime), currentDate) &&
                  eventHour === hour
                );
              });

              return (
                <div
                  key={hour}
                  className="flex border-b dark:border-gray-700 py-2"
                >
                  <div className="w-20 text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
                  </div>
                  <div className="flex-1 space-y-1">
                    {hourEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className="p-2 rounded bg-blue-100 dark:bg-blue-900/30 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50"
                      >
                        <div className="font-medium text-sm dark:text-white">
                          {event.title}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {format(new Date(event.startTime), 'h:mm a')} -{' '}
                          {format(new Date(event.endTime), 'h:mm a')}
                        </div>
                        {event.description && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {event.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
