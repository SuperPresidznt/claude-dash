'use client';

import { useState, FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { HabitCadence } from '@prisma/client';
import { createHabit, updateHabit, type Habit, type CreateHabitInput } from '@/lib/api/habits';
import { useToast } from '@/components/ui/toast-provider';
import { trackEvent } from '@/lib/analytics';

type HabitFormProps = {
  habit?: Habit | null;
  onClose: () => void;
};

const COMMON_ICONS = ['🏃', '📚', '💧', '🧘', '🎯', '💪', '🌱', '✍️', '🎨', '🎵', '🍎', '😴'];
const COMMON_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export const HabitForm = ({ habit, onClose }: HabitFormProps) => {
  const isEdit = !!habit;
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<CreateHabitInput>({
    name: habit?.name || '',
    description: habit?.description || '',
    cadence: habit?.cadence || 'daily',
    targetCount: habit?.targetCount || 1,
    color: habit?.color || '#3B82F6',
    icon: habit?.icon || '🎯',
  });

  const createMutation = useMutation({
    mutationFn: createHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      showToast('Habit created successfully');
      trackEvent('habit_created', {});
      onClose();
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: CreateHabitInput) => updateHabit(habit!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      showToast('Habit updated successfully');
      trackEvent('habit_updated', {});
      onClose();
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, 'error');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {isEdit ? 'Edit Habit' : 'Create New Habit'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Habit Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Morning Exercise, Read 30 minutes"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional details about this habit..."
            />
          </div>

          {/* Cadence and Target Count */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Frequency</label>
              <select
                value={formData.cadence}
                onChange={(e) => setFormData({ ...formData, cadence: e.target.value as HabitCadence })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Target Count
                <span className="text-xs text-gray-500 ml-2">per {formData.cadence} period</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.targetCount}
                onChange={(e) => setFormData({ ...formData, targetCount: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-medium mb-2">Icon</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`text-2xl w-12 h-12 rounded border-2 hover:scale-110 transition-transform ${
                    formData.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="w-32 px-3 py-2 border rounded text-center"
              placeholder="Custom emoji"
              maxLength={2}
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium mb-2">Accent Color</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-10 h-10 rounded-full border-4 hover:scale-110 transition-transform ${
                    formData.color === color ? 'border-gray-900' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-32 h-10 border rounded cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : isEdit
                ? 'Update Habit'
                : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
