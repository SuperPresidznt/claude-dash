'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchHabitStreak } from '@/lib/api/habits';

type StreakDisplayProps = {
  habitId: string;
};

export const StreakDisplay = ({ habitId }: StreakDisplayProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['habit-streak', habitId],
    queryFn: () => fetchHabitStreak(habitId),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    );
  }

  const currentStreak = data?.currentStreak || 0;
  const longestStreak = data?.longestStreak || 0;

  return (
    <div className="space-y-2">
      {/* Current Streak */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Current Streak</span>
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold text-orange-600">{currentStreak}</span>
          <span className="text-xs text-gray-500">days</span>
          {currentStreak > 0 && <span className="text-orange-500">🔥</span>}
        </div>
      </div>

      {/* Best Streak */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Best Streak</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-gray-700">{longestStreak}</span>
          <span className="text-xs text-gray-500">days</span>
          {longestStreak >= 7 && <span className="text-yellow-500">⭐</span>}
        </div>
      </div>

      {/* Streak Indicator Bar */}
      {longestStreak > 0 && (
        <div className="mt-2">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-300"
              style={{ width: `${Math.min((currentStreak / longestStreak) * 100, 100)}%` }}
            />
          </div>
          {currentStreak === longestStreak && currentStreak > 0 && (
            <div className="text-xs text-green-600 font-semibold mt-1 text-center">
              New Record! 🎉
            </div>
          )}
        </div>
      )}
    </div>
  );
};
