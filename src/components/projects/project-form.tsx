'use client';

import { useState, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProjectStatus } from '@prisma/client';
import { createProject, updateProject, type Project, type CreateProjectInput } from '@/lib/api/projects';
import { useToast } from '@/components/ui/toast-provider';
import { trackEvent } from '@/lib/analytics';

type ProjectFormProps = {
  project?: Project | null;
  onClose: () => void;
};

export const ProjectForm = ({ project, onClose }: ProjectFormProps) => {
  const isEdit = !!project;
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<CreateProjectInput>({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'planning',
    macroGoalId: project?.macroGoalId || undefined,
    targetDate: project?.targetDate ? project.targetDate.split('T')[0] : undefined,
  });

  // Fetch macro goals for linking
  const { data: macroGoals = [] } = useQuery({
    queryKey: ['macro-goals'],
    queryFn: async () => {
      const response = await fetch('/api/macro-goals', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch macro goals');
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      showToast('Project created successfully');
      trackEvent('project_created', {});
      onClose();
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: CreateProjectInput) => updateProject(project!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      showToast('Project updated successfully');
      trackEvent('project_updated', {});
      onClose();
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, 'error');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const input: CreateProjectInput = {
      ...formData,
      targetDate: formData.targetDate ? new Date(formData.targetDate).toISOString() : undefined,
    };

    if (isEdit) {
      updateMutation.mutate(input);
    } else {
      createMutation.mutate(input);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {isEdit ? 'Edit Project' : 'Create New Project'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter project name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the project goals and scope..."
            />
          </div>

          {/* Status and Target Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Target Date</label>
              <input
                type="date"
                value={formData.targetDate || ''}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value || undefined })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Macro Goal */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Link to Macro Goal
              <span className="text-xs text-gray-500 ml-2">(optional)</span>
            </label>
            <select
              value={formData.macroGoalId || ''}
              onChange={(e) => setFormData({ ...formData, macroGoalId: e.target.value || undefined })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {macroGoals.map((goal: any) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </div>

          {/* Info Box */}
          {isEdit && project && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tasks:</span>
                  <span className="font-semibold">
                    {project.stats.completedTasks}/{project.stats.totalTasks}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Progress:</span>
                  <span className="font-semibold">{project.stats.progressPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}

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
                ? 'Update Project'
                : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
