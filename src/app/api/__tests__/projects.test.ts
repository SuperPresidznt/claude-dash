import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../projects/route';
import { PATCH, DELETE } from '../projects/[id]/route';
import { prisma } from '@/lib/prisma';

// Mock dependencies
vi.mock('@/lib/server-session', () => ({
  requireUser: vi.fn(() => Promise.resolve({ id: 'test-user-id' })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('Projects API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const mockProject = {
        id: 'project-1',
        userId: 'test-user-id',
        name: 'Test Project',
        description: 'Test description',
        status: 'active',
        macroGoalId: null,
        targetDate: new Date('2025-12-31'),
        createdAt: new Date(),
        updatedAt: new Date(),
        macroGoal: null,
        tasks: [],
      };

      vi.mocked(prisma.project.create).mockResolvedValue(mockProject as any);

      const request = new Request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Project',
          description: 'Test description',
          status: 'active',
          targetDate: '2025-12-31T00:00:00.000Z',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Test Project');
      expect(prisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'test-user-id',
            name: 'Test Project',
            status: 'active',
          }),
        })
      );
    });
  });

  describe('GET /api/projects', () => {
    it('should return all projects with stats', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          userId: 'test-user-id',
          name: 'Project 1',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          macroGoal: null,
          tasks: [
            { id: 'task-1', status: 'completed' },
            { id: 'task-2', status: 'todo' },
          ],
        },
      ];

      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as any);

      const request = new Request('http://localhost/api/projects');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].stats.totalTasks).toBe(2);
      expect(data[0].stats.completedTasks).toBe(1);
      expect(data[0].stats.progressPercent).toBe(50);
    });
  });

  describe('PATCH /api/projects/[id]', () => {
    it('should update a project', async () => {
      const mockProject = {
        id: 'project-1',
        userId: 'test-user-id',
        name: 'Updated Project',
        status: 'paused',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.project.findUnique).mockResolvedValue({ userId: 'test-user-id' } as any);
      vi.mocked(prisma.project.update).mockResolvedValue(mockProject as any);

      const request = new Request('http://localhost/api/projects/project-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Project',
          status: 'paused',
        }),
      });

      const response = await PATCH(request, { params: { id: 'project-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Updated Project');
      expect(data.status).toBe('paused');
    });
  });

  describe('DELETE /api/projects/[id]', () => {
    it('should delete a project', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({ userId: 'test-user-id' } as any);
      vi.mocked(prisma.project.delete).mockResolvedValue({} as any);

      const request = new Request('http://localhost/api/projects/project-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'project-1' } });
      expect(response.status).toBe(204);
    });
  });
});
