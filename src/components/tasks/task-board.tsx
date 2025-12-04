'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { fetchTasks, updateTask, deleteTask, type Task, type TaskFilters } from '@/lib/api/tasks';
import { useToast } from '@/components/ui/toast-provider';
import { trackEvent } from '@/lib/analytics';
import { TaskForm } from './task-form';
import { PriorityMatrix } from './priority-matrix';
import { QuickCapture } from './quick-capture';

type ViewMode = 'kanban' | 'list' | 'matrix';

const STATUS_COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'todo', label: 'To Do', color: 'bg-gray-100' },
  { status: 'in_progress', label: 'In Progress', color: 'bg-blue-100' },
  { status: 'blocked', label: 'Blocked', color: 'bg-red-100' },
  { status: 'completed', label: 'Completed', color: 'bg-green-100' },
  { status: 'cancelled', label: 'Cancelled', color: 'bg-gray-200' },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'text-gray-500',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
};

export const TaskBoard = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [filters, setFilters] = useState<TaskFilters>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => fetchTasks(filters),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => updateTask(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast('Task updated successfully');
      trackEvent('task_updated', {});
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast('Task deleted successfully');
      trackEvent('task_deleted', {});
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, 'error');
    },
  });

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : undefined;
    updateMutation.mutate({ id: taskId, input: { status: newStatus, completedAt } });
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setShowTaskForm(true);
  };

  const handleDelete = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate(taskId);
    }
  };

  const renderKanbanView = () => (
    <div className="grid grid-cols-5 gap-4">
      {STATUS_COLUMNS.map(({ status, label, color }) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div key={status} className="flex flex-col">
            <div className={`${color} rounded-t-lg p-3`}>
              <h3 className="font-semibold text-sm">{label}</h3>
              <span className="text-xs text-gray-600">({columnTasks.length})</span>
            </div>
            <div className="flex-1 bg-gray-50 rounded-b-lg p-2 space-y-2 min-h-[500px]">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
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
  );

  const renderListView = () => (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowQuickCapture(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Quick Add
          </button>
          <button
            onClick={() => {
              setSelectedTask(null);
              setShowTaskForm(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            New Task
          </button>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setViewMode('kanban')}
          className={`px-4 py-2 rounded ${viewMode === 'kanban' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
        >
          Kanban
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
        >
          List
        </button>
        <button
          onClick={() => setViewMode('matrix')}
          className={`px-4 py-2 rounded ${viewMode === 'matrix' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
        >
          Priority Matrix
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={filters.status || ''}
          onChange={(e) => setFilters({ ...filters, status: e.target.value as TaskStatus || undefined })}
          className="px-3 py-2 border rounded"
        >
          <option value="">All Statuses</option>
          {STATUS_COLUMNS.map(({ status, label }) => (
            <option key={status} value={status}>{label}</option>
          ))}
        </select>
        <select
          value={filters.priority || ''}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value as TaskPriority || undefined })}
          className="px-3 py-2 border rounded"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        {(filters.status || filters.priority) && (
          <button
            onClick={() => setFilters({})}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No tasks found. Create your first task to get started!
        </div>
      ) : (
        <>
          {viewMode === 'kanban' && renderKanbanView()}
          {viewMode === 'list' && renderListView()}
          {viewMode === 'matrix' && <PriorityMatrix tasks={tasks} onTaskClick={handleEdit} />}
        </>
      )}

      {/* Modals */}
      {showQuickCapture && (
        <QuickCapture onClose={() => setShowQuickCapture(false)} />
      )}
      {showTaskForm && (
        <TaskForm
          task={selectedTask}
          onClose={() => {
            setShowTaskForm(false);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
};

// TaskCard component for Kanban view
const TaskCard = ({
  task,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-sm flex-1">{task.title}</h4>
        {task.priority && (
          <span className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority.toUpperCase()}
          </span>
        )}
      </div>
      {task.description && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>
      )}
      {task.project && (
        <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded mb-2">
          {task.project.name}
        </span>
      )}
      {task.dueDate && (
        <div className="text-xs text-gray-500 mb-2">
          Due: {new Date(task.dueDate).toLocaleDateString()}
        </div>
      )}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex justify-between items-center mt-2 pt-2 border-t">
        <button
          onClick={() => onEdit(task)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="text-xs text-red-600 hover:text-red-800"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

// TaskRow component for List view
const TaskRow = ({
  task,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="bg-white border rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={task.status === 'completed'}
            onChange={(e) => onStatusChange(task.id, e.target.checked ? 'completed' : 'todo')}
            className="w-5 h-5"
          />
          <div>
            <h4 className="font-medium">{task.title}</h4>
            {task.description && (
              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {task.priority && (
          <span className={`text-sm ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
        )}
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
          className="px-2 py-1 border rounded text-sm"
        >
          {STATUS_COLUMNS.map(({ status, label }) => (
            <option key={status} value={status}>{label}</option>
          ))}
        </select>
        <button
          onClick={() => onEdit(task)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Delete
        </button>
      </div>
    </div>
  );
};
