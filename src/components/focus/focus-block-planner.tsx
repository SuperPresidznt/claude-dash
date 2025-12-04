'use client';

import { useState } from 'react';
import { format, startOfDay, addMinutes } from 'date-fns';
import { useFocusBlocks, useCreateFocusBlock, useUpdateFocusBlock, useDeleteFocusBlock } from '@/lib/api/focus-blocks';
import { useTasks } from '@/lib/api/tasks';
import { Clock, Plus, Check, X, Play, Pause } from 'lucide-react';

export function FocusBlockPlanner({ date = new Date() }: { date?: Date }) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  const dateStr = format(startOfDay(date), 'yyyy-MM-dd');
  const { data: focusBlocks, isLoading } = useFocusBlocks({ date: dateStr });
  const { data: tasks } = useTasks({ status: 'todo,in_progress' });

  const createMutation = useCreateFocusBlock();
  const updateMutation = useUpdateFocusBlock(selectedBlock || '');
  const deleteMutation = useDeleteFocusBlock();

  const [formData, setFormData] = useState({
    taskId: '',
    title: '',
    description: '',
    startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    durationMinutes: 60,
  });

  const handleCreate = async () => {
    const start = new Date(formData.startTime);
    const end = addMinutes(start, formData.durationMinutes);

    await createMutation.mutateAsync({
      taskId: formData.taskId || undefined,
      title: formData.title,
      description: formData.description || undefined,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });

    setIsCreating(false);
    setFormData({
      taskId: '',
      title: '',
      description: '',
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      durationMinutes: 60,
    });
  };

  const handleStartBlock = async (blockId: string) => {
    await updateMutation.mutateAsync({
      actualStartTime: new Date().toISOString(),
    });
  };

  const handleCompleteBlock = async (blockId: string) => {
    await updateMutation.mutateAsync({
      actualEndTime: new Date().toISOString(),
      completed: true,
    });
  };

  if (isLoading) {
    return <div className="text-gray-500">Loading focus blocks...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Focus Blocks - {format(date, 'MMM d, yyyy')}</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Block
        </button>
      </div>

      {isCreating && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="font-medium">Create Focus Block</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task (Optional)
            </label>
            <select
              value={formData.taskId}
              onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">No task</option>
              {tasks?.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Deep work on project X"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              rows={2}
              placeholder="What will you work on?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded px-3 py-2"
                min="15"
                step="15"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!formData.title || createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Create Block
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {focusBlocks?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No focus blocks scheduled for this day.
          </div>
        )}

        {focusBlocks?.map((block) => (
          <div
            key={block.id}
            className={`bg-white border rounded-lg p-4 ${
              block.completed ? 'border-green-500 bg-green-50' : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{block.title}</span>
                  {block.completed && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Completed
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-600 mt-1">
                  {format(new Date(block.startTime), 'h:mm a')} -{' '}
                  {format(new Date(block.endTime), 'h:mm a')}
                </div>

                {block.description && (
                  <p className="text-sm text-gray-700 mt-2">{block.description}</p>
                )}

                {block.task && (
                  <div className="text-sm text-blue-600 mt-2">
                    Linked: {block.task.title}
                  </div>
                )}

                {block.pomodoroSessions && block.pomodoroSessions.length > 0 && (
                  <div className="text-sm text-gray-600 mt-2">
                    {block.pomodoroSessions.filter(s => s.completed).length} pomodoros completed
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!block.completed && !block.actualStartTime && (
                  <button
                    onClick={() => {
                      setSelectedBlock(block.id);
                      handleStartBlock(block.id);
                    }}
                    className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    title="Start block"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}

                {block.actualStartTime && !block.completed && (
                  <button
                    onClick={() => {
                      setSelectedBlock(block.id);
                      handleCompleteBlock(block.id);
                    }}
                    className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
                    title="Complete block"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => deleteMutation.mutate(block.id)}
                  className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  title="Delete block"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
