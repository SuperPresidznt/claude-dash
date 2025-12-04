'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask, type CreateTaskInput } from '@/lib/api/tasks';
import { useToast } from '@/components/ui/toast-provider';
import { trackEvent } from '@/lib/analytics';

type QuickCaptureProps = {
  onClose: () => void;
};

export const QuickCapture = ({ onClose }: QuickCaptureProps) => {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  useEffect(() => {
    // Auto-focus on mount
    inputRef.current?.focus();
  }, []);

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast('Task created successfully');
      trackEvent('task_quick_captured', {});
      setTitle('');
      inputRef.current?.focus();
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, 'error');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    const input: CreateTaskInput = {
      title: title.trim(),
      status: 'todo',
    };

    createMutation.mutate(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 flex items-start justify-center z-50 pt-20"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl p-6 max-w-xl w-full"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h2 className="text-xl font-bold mb-4">Quick Capture</h2>
        <p className="text-sm text-gray-600 mb-4">
          Quickly add a task. Press Enter to save, Escape to close.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-4 py-3 text-lg border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={createMutation.isPending}
          />

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              {createMutation.isPending && 'Saving...'}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close (Esc)
              </button>
              <button
                type="submit"
                disabled={!title.trim() || createMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add Task (Enter)
              </button>
            </div>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500">
            Tip: You can add more details like priority, due date, and project after capturing the task.
          </p>
        </div>
      </div>
    </div>
  );
};
