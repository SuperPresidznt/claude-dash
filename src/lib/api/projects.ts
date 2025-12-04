import { ProjectStatus } from '@prisma/client';

export type Project = {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  macroGoalId?: string | null;
  targetDate?: string | null;
  createdAt: string;
  updatedAt: string;
  macroGoal?: {
    id: string;
    title: string;
  } | null;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    dueDate?: string | null;
  }>;
  stats: {
    totalTasks: number;
    completedTasks: number;
    progressPercent: number;
  };
};

export type CreateProjectInput = {
  name: string;
  description?: string;
  status?: ProjectStatus;
  macroGoalId?: string;
  targetDate?: string;
};

export type UpdateProjectInput = Partial<CreateProjectInput>;

export const fetchProjects = async (): Promise<Project[]> => {
  const response = await fetch('/api/projects', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

export const createProject = async (input: CreateProjectInput): Promise<Project> => {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

export const updateProject = async (id: string, input: UpdateProjectInput): Promise<Project> => {
  const response = await fetch(`/api/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

export const deleteProject = async (id: string): Promise<void> => {
  const response = await fetch(`/api/projects/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
};
