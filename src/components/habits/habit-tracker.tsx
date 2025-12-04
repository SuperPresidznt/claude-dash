'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchHabits, updateHabit, deleteHabit, toggleHabitCompletion, type Habit } from '@/lib/api/habits';
import { useToast } from '@/components/ui/toast-provider';
import { trackEvent } from '@/lib/analytics';
import { HabitForm } from './habit-form';
import { HabitHeatmap } from './habit-heatmap';
import { StreakDisplay } from './streak-display';

export const HabitTracker = () => {
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapHabit, setHeatmapHabit] = useState<Habit | null>(null);

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: fetchHabits,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string }) =>
      toggleHabitCompletion(habitId, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit-completions'] });
      queryClient.invalidateQueries({ queryKey: ['habit-streak'] });
      showToast('Habit logged successfully');
      trackEvent('habit_toggled', {});
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => updateHabit(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      showToast('Habit updated successfully');
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      showToast('Habit deleted successfully');
      trackEvent('habit_deleted', {});
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, 'error');
    },
  });

  const handleToggleToday = (habitId: string) => {
    const today = new Date().toISOString().split('T')[0];
    toggleMutation.mutate({ habitId, date: today });
  };

  const handleEdit = (habit: Habit) => {
    setSelectedHabit(habit);
    setShowHabitForm(true);
  };

  const handleDelete = (habitId: string) => {
    if (confirm('Are you sure you want to delete this habit? All completion history will be lost.')) {
      deleteMutation.mutate(habitId);
    }
  };

  const handleToggleActive = (habitId: string, isActive: boolean) => {
    updateMutation.mutate({ id: habitId, input: { isActive: !isActive } });
  };

  const handleViewHeatmap = (habit: Habit) => {
    setHeatmapHabit(habit);
    setShowHeatmap(true);
  };

  const activeHabits = habits.filter((h) => h.isActive);
  const inactiveHabits = habits.filter((h) => !h.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Habit Tracker</h1>
          <p className="text-sm text-gray-600 mt-1">
            {activeHabits.length} active habits
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedHabit(null);
            setShowHabitForm(true);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          New Habit
        </button>
      </div>

      {/* Active Habits */}
      {isLoading ? (
        <div className="text-center py-12">Loading habits...</div>
      ) : activeHabits.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No active habits yet</p>
          <p className="text-sm">Create your first habit to start tracking!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onToggle={handleToggleToday}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onViewHeatmap={handleViewHeatmap}
            />
          ))}
        </div>
      )}

      {/* Inactive Habits */}
      {inactiveHabits.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-600">
            Inactive Habits ({inactiveHabits.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {inactiveHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onToggle={handleToggleToday}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
                onViewHeatmap={handleViewHeatmap}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showHabitForm && (
        <HabitForm
          habit={selectedHabit}
          onClose={() => {
            setShowHabitForm(false);
            setSelectedHabit(null);
          }}
        />
      )}
      {showHeatmap && heatmapHabit && (
        <HabitHeatmap
          habit={heatmapHabit}
          onClose={() => {
            setShowHeatmap(false);
            setHeatmapHabit(null);
          }}
        />
      )}
    </div>
  );
};

const HabitCard = ({
  habit,
  onToggle,
  onEdit,
  onDelete,
  onToggleActive,
  onViewHeatmap,
}: {
  habit: Habit;
  onToggle: (id: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onViewHeatmap: (habit: Habit) => void;
}) => {
  const cardStyle = habit.color
    ? { borderLeft: `4px solid ${habit.color}` }
    : {};

  return (
    <div
      className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
      style={cardStyle}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {habit.icon && <span className="text-2xl">{habit.icon}</span>}
          <div>
            <h3 className="font-semibold">{habit.name}</h3>
            {habit.description && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{habit.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Cadence */}
      <div className="mb-3">
        <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
          {habit.cadence} • Target: {habit.targetCount}x
        </span>
      </div>

      {/* Streak Display */}
      <StreakDisplay habitId={habit.id} />

      {/* Today's Check-in */}
      <div className="mt-4 pt-3 border-t">
        <button
          onClick={() => onToggle(habit.id)}
          className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          Log Today
        </button>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mt-3 text-xs">
        <button
          onClick={() => onViewHeatmap(habit)}
          className="text-blue-600 hover:text-blue-800"
        >
          View History
        </button>
        <button
          onClick={() => onEdit(habit)}
          className="text-gray-600 hover:text-gray-800"
        >
          Edit
        </button>
        <button
          onClick={() => onToggleActive(habit.id, habit.isActive)}
          className="text-yellow-600 hover:text-yellow-800"
        >
          {habit.isActive ? 'Pause' : 'Activate'}
        </button>
        <button
          onClick={() => onDelete(habit.id)}
          className="text-red-600 hover:text-red-800"
        >
          Delete
        </button>
      </div>
    </div>
  );
};
