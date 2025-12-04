'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchHabitCompletions, type Habit } from '@/lib/api/habits';

type HabitHeatmapProps = {
  habit: Habit;
  onClose: () => void;
};

export const HabitHeatmap = ({ habit, onClose }: HabitHeatmapProps) => {
  const { data: completions = [], isLoading } = useQuery({
    queryKey: ['habit-completions', habit.id],
    queryFn: () => fetchHabitCompletions(habit.id),
  });

  // Generate last 12 weeks of dates
  const weeks: Date[][] = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 84); // 12 weeks ago

  for (let week = 0; week < 12; week++) {
    const weekDates: Date[] = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + week * 7 + day);
      if (date <= today) {
        weekDates.push(date);
      }
    }
    if (weekDates.length > 0) {
      weeks.push(weekDates);
    }
  }

  // Create completion map for quick lookup
  const completionMap = new Map(
    completions.map((c) => [c.date.split('T')[0], c])
  );

  // Calculate stats
  const totalCompletions = completions.length;
  const daysInPeriod = 84;
  const completionRate = Math.round((totalCompletions / daysInPeriod) * 100);

  // Current streak calculation
  let currentStreak = 0;
  const currentDate = new Date(today);
  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (completionMap.has(dateStr)) {
      currentStreak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Best streak calculation
  let bestStreak = 0;
  let tempStreak = 0;
  for (let i = 0; i < daysInPeriod; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];

    if (completionMap.has(dateStr)) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  const getCellColor = (date: Date): string => {
    const dateStr = date.toISOString().split('T')[0];
    if (completionMap.has(dateStr)) {
      return habit.color || '#10B981';
    }
    return '#E5E7EB';
  };

  const getCellOpacity = (date: Date): number => {
    const dateStr = date.toISOString().split('T')[0];
    return completionMap.has(dateStr) ? 1 : 0.3;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            {habit.icon && <span className="text-3xl">{habit.icon}</span>}
            <div>
              <h2 className="text-2xl font-bold">{habit.name}</h2>
              <p className="text-sm text-gray-600">Activity Heatmap (Last 12 Weeks)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Completions" value={totalCompletions} />
          <StatCard label="Completion Rate" value={`${completionRate}%`} />
          <StatCard label="Current Streak" value={`${currentStreak} days`} />
          <StatCard label="Best Streak" value={`${bestStreak} days`} />
        </div>

        {/* Heatmap */}
        {isLoading ? (
          <div className="text-center py-12">Loading history...</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="mb-2 text-xs text-gray-500 flex justify-between">
              <span>12 weeks ago</span>
              <span>Today</span>
            </div>
            <div className="inline-flex gap-1">
              {/* Day labels */}
              <div className="flex flex-col gap-1 mr-2 justify-around text-xs text-gray-500">
                <div>Mon</div>
                <div>Wed</div>
                <div>Fri</div>
              </div>

              {/* Weeks */}
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((date, dayIndex) => {
                    const isToday = date.toDateString() === today.toDateString();
                    return (
                      <div
                        key={dayIndex}
                        className={`w-4 h-4 rounded-sm transition-all hover:scale-125 ${
                          isToday ? 'ring-2 ring-blue-500' : ''
                        }`}
                        style={{
                          backgroundColor: getCellColor(date),
                          opacity: getCellOpacity(date),
                        }}
                        title={`${date.toLocaleDateString()}: ${
                          completionMap.has(date.toISOString().split('T')[0]) ? 'Completed' : 'Not completed'
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 bg-gray-200 rounded-sm" />
                <div
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: habit.color || '#10B981', opacity: 0.4 }}
                />
                <div
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: habit.color || '#10B981', opacity: 0.7 }}
                />
                <div
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: habit.color || '#10B981', opacity: 1 }}
                />
              </div>
              <span>More</span>
            </div>
          </div>
        )}

        {/* Recent Completions */}
        {completions.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Recent Completions</h3>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {completions.slice(0, 10).map((completion) => (
                <div key={completion.id} className="text-sm flex justify-between py-1 px-2 bg-gray-50 rounded">
                  <span>{new Date(completion.date).toLocaleDateString()}</span>
                  {completion.note && <span className="text-gray-600 italic">{completion.note}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="bg-gray-50 rounded-lg p-4 text-center">
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    <div className="text-xs text-gray-600 mt-1">{label}</div>
  </div>
);
