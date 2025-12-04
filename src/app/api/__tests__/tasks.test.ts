import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../tasks/route';
import { PATCH, DELETE } from '../tasks/[id]/route';
import { prisma } from '@/lib/prisma';

// Mock dependencies
vi.mock('@/lib/server-session', () => ({
  requireUser: vi.fn(() => Promise.resolve({ id: 'test-user-id' })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('Tasks API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const mockTask = {
        id: 'task-1',
        userId: 'test-user-id',
        title: 'Test Task',
        description: 'Test description',
        status: 'todo',
        priority: 'high',
        effort: 3,
        impact: 4,
        dueDate: new Date('2025-12-31'),
        projectId: null,
        tags: ['test'],
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      };

      vi.mocked(prisma.task.create).mockResolvedValue(mockTask as any);

      const request = new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Task',
          description: 'Test description',
          status: 'todo',
          priority: 'high',
          effort: 3,
          impact: 4,
          dueDate: '2025-12-31T00:00:00.000Z',
          tags: ['test'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Test Task');
      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'test-user-id',
            title: 'Test Task',
            status: 'todo',
            priority: 'high',
            effort: 3,
            impact: 4,
          }),
        })
      );
    });

    it('should reject task without title', async () => {
      const request = new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Test description',
        }),
      });

      await expect(POST(request)).rejects.toThrow();
    });
  });

  describe('GET /api/tasks', () => {
    it('should return all tasks for user', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          userId: 'test-user-id',
          title: 'Task 1',
          status: 'todo',
          createdAt: new Date(),
          updatedAt: new Date(),
          project: null,
        },
        {
          id: 'task-2',
          userId: 'test-user-id',
          title: 'Task 2',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
          project: null,
        },
      ];

      vi.mocked(prisma.task.findMany).mockResolvedValue(mockTasks as any);

      const request = new Request('http://localhost/api/tasks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id' },
        })
      );
    });

    it('should filter tasks by status', async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/tasks?status=completed');
      await GET(request);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'test-user-id',
            status: 'completed',
          }),
        })
      );
    });

    it('should filter tasks by priority', async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/tasks?priority=urgent');
      await GET(request);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'test-user-id',
            priority: 'urgent',
          }),
        })
      );
    });
  });

  describe('PATCH /api/tasks/[id]', () => {
    it('should update a task', async () => {
      const mockTask = {
        id: 'task-1',
        userId: 'test-user-id',
        title: 'Updated Task',
        status: 'in_progress',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.task.findUnique).mockResolvedValue({ userId: 'test-user-id' } as any);
      vi.mocked(prisma.task.update).mockResolvedValue(mockTask as any);

      const request = new Request('http://localhost/api/tasks/task-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated Task',
          status: 'in_progress',
        }),
      });

      const response = await PATCH(request, { params: { id: 'task-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Task');
      expect(data.status).toBe('in_progress');
    });

    it('should reject unauthorized update', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue({ userId: 'different-user' } as any);

      const request = new Request('http://localhost/api/tasks/task-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });

      const response = await PATCH(request, { params: { id: 'task-1' } });
      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/tasks/[id]', () => {
    it('should delete a task', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue({ userId: 'test-user-id' } as any);
      vi.mocked(prisma.task.delete).mockResolvedValue({} as any);

      const request = new Request('http://localhost/api/tasks/task-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'task-1' } });
      expect(response.status).toBe(204);
      expect(prisma.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-1' },
      });
    });

    it('should reject unauthorized delete', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue({ userId: 'different-user' } as any);

      const request = new Request('http://localhost/api/tasks/task-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'task-1' } });
      expect(response.status).toBe(403);
    });
  });
});
