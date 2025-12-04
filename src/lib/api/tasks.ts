import { TaskStatus, TaskPriority } from '@prisma/client';

export type Task = {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority?: TaskPriority | null;
  effort?: number | null;
  impact?: number | null;
  dueDate?: string | null;
  completedAt?: string | null;
  projectId?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
  } | null;
  priorityScore?: number | null;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  effort?: number;
  impact?: number;
  dueDate?: string;
  projectId?: string;
  tags?: string[];
};

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  completedAt?: string;
};

export type TaskFilters = {
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  tag?: string;
};

export const fetchTasks = async (filters?: TaskFilters): Promise<Task[]> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.projectId) params.append('projectId', filters.projectId);
  if (filters?.tag) params.append('tag', filters.tag);

  const url = `/api/tasks${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

export const updateTask = async (id: string, input: UpdateTaskInput): Promise<Task> => {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

export const deleteTask = async (id: string): Promise<void> => {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
};

export const calculatePriorityScore = (effort: number | null | undefined, impact: number | null | undefined): number | null => {
  if (!effort || !impact) return null;
  return impact * effort;
};
