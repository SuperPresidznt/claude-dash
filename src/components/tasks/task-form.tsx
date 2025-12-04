'use client';

import { useState, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tantml:invoke>
import { TaskStatus, TaskPriority } from '@prisma/client';
import { createTask, updateTask, type Task, type CreateTaskInput } from '@/lib/api/tasks';
import { fetchProjects } from '@/lib/api/projects';
import { useToast } from '@/components/ui/toast-provider';
import { trackEvent } from '@/lib/analytics';

type TaskFormProps = {
  task?: Task | null;
  onClose: () => void;
};

export const TaskForm = ({ task, onClose }: TaskFormProps) => {
  const isEdit = !!task;
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<CreateTaskInput>({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || undefined,
    effort: task?.effort || undefined,
    impact: task?.impact || undefined,
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : undefined,
    projectId: task?.projectId || undefined,
    tags: task?.tags || [],
  });

  const [tagInput, setTagInput] = useState('');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast('Task created successfully');
      trackEvent('task_created', {});
      onClose();
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: CreateTaskInput) => updateTask(task!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast('Task updated successfully');
      trackEvent('task_updated', {});
      onClose();
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, 'error');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const input: CreateTaskInput = {
      ...formData,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
    };

    if (isEdit) {
      updateMutation.mutate(input);
    } else {
      createMutation.mutate(input);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {isEdit ? 'Edit Task' : 'Create New Task'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter task title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add more details..."
            />
          </div>

          {/* Status and Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={formData.priority || ''}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority || undefined })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Effort and Impact Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Effort (1-5)
                <span className="text-xs text-gray-500 ml-2">Time/complexity needed</span>
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.effort || ''}
                onChange={(e) => setFormData({ ...formData, effort: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Impact (1-5)
                <span className="text-xs text-gray-500 ml-2">Value delivered</span>
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.impact || ''}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Due Date and Project Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <input
                type="date"
                value={formData.dueDate || ''}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value || undefined })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Project</label>
              <select
                value={formData.projectId || ''}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value || undefined })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a tag and press Enter"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-blue-900 hover:text-red-600 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
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
                ? 'Update Task'
                : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
