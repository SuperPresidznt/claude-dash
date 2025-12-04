'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectStatus } from '@prisma/client';
import { fetchProjects, updateProject, deleteProject, type Project } from '@/lib/api/projects';
import { useToast } from '@/components/ui/toast-provider';
import { trackEvent } from '@/lib/analytics';
import { ProjectForm } from './project-form';
import { ProgressCharts } from './progress-charts';

const STATUS_GROUPS: { status: ProjectStatus; label: string; color: string }[] = [
  { status: 'planning', label: 'Planning', color: 'bg-gray-100' },
  { status: 'active', label: 'Active', color: 'bg-blue-100' },
  { status: 'paused', label: 'Paused', color: 'bg-yellow-100' },
  { status: 'completed', label: 'Completed', color: 'bg-green-100' },
  { status: 'cancelled', label: 'Cancelled', color: 'bg-red-100' },
];

export const ProjectBoard = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => updateProject(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast('Project updated successfully');
      trackEvent('project_updated', {});
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      showToast('Project deleted successfully');
      trackEvent('project_deleted', {});
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, 'error');
    },
  });

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setShowProjectForm(true);
  };

  const handleDelete = (projectId: string) => {
    if (confirm('Are you sure you want to delete this project? All tasks will remain but will be unlinked.')) {
      deleteMutation.mutate(projectId);
    }
  };

  const handleStatusChange = (projectId: string, newStatus: ProjectStatus) => {
    updateMutation.mutate({ id: projectId, input: { status: newStatus } });
  };

  const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'planning');
  const completedProjects = projects.filter((p) => p.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-gray-600 mt-1">
            {activeProjects.length} active • {completedProjects.length} completed
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCharts(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            View Analytics
          </button>
          <button
            onClick={() => {
              setSelectedProject(null);
              setShowProjectForm(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            New Project
          </button>
        </div>
      </div>

      {/* Project Board */}
      {isLoading ? (
        <div className="text-center py-12">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No projects yet</p>
          <p className="text-sm">Create your first project to organize your tasks!</p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {STATUS_GROUPS.map(({ status, label, color }) => {
            const statusProjects = projects.filter((p) => p.status === status);
            return (
              <div key={status} className="flex flex-col">
                <div className={`${color} rounded-t-lg p-3`}>
                  <h3 className="font-semibold text-sm">{label}</h3>
                  <span className="text-xs text-gray-600">({statusProjects.length})</span>
                </div>
                <div className="flex-1 bg-gray-50 rounded-b-lg p-2 space-y-3 min-h-[400px]">
                  {statusProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onStatusChange={handleStatusChange}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showProjectForm && (
        <ProjectForm
          project={selectedProject}
          onClose={() => {
            setShowProjectForm(false);
            setSelectedProject(null);
          }}
        />
      )}
      {showCharts && (
        <ProgressCharts projects={projects} onClose={() => setShowCharts(false)} />
      )}
    </div>
  );
};

const ProjectCard = ({
  project,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  project: Project;
  onStatusChange: (id: string, status: ProjectStatus) => void;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
}) => {
  const progressPercent = project.stats.progressPercent;
  const isOverdue = project.targetDate && new Date(project.targetDate) < new Date() && project.status !== 'completed';

  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="mb-3">
        <h4 className="font-semibold text-sm mb-1">{project.name}</h4>
        {project.description && (
          <p className="text-xs text-gray-600 line-clamp-2">{project.description}</p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center text-xs mb-1">
          <span className="text-gray-600">Progress</span>
          <span className="font-semibold">{progressPercent}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Task Stats */}
      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
        <span>{project.stats.completedTasks}/{project.stats.totalTasks} tasks</span>
      </div>

      {/* Macro Goal */}
      {project.macroGoal && (
        <div className="mb-2">
          <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
            Goal: {project.macroGoal.title}
          </span>
        </div>
      )}

      {/* Target Date */}
      {project.targetDate && (
        <div className={`text-xs mb-2 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
          Target: {new Date(project.targetDate).toLocaleDateString()}
          {isOverdue && ' (Overdue)'}
        </div>
      )}

      {/* Status Selector */}
      <select
        value={project.status}
        onChange={(e) => onStatusChange(project.id, e.target.value as ProjectStatus)}
        className="w-full px-2 py-1 border rounded text-xs mb-2"
      >
        {STATUS_GROUPS.map(({ status, label }) => (
          <option key={status} value={status}>{label}</option>
        ))}
      </select>

      {/* Actions */}
      <div className="flex justify-between items-center pt-2 border-t">
        <button
          onClick={() => onEdit(project)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(project.id)}
          className="text-xs text-red-600 hover:text-red-800"
        >
          Delete
        </button>
      </div>
    </div>
  );
};
