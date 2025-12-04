import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../habits/route';
import { PATCH, DELETE } from '../habits/[id]/route';
import { POST as POST_COMPLETION } from '../habits/[id]/completions/route';
import { GET as GET_STREAK } from '../habits/[id]/streak/route';
import { prisma } from '@/lib/prisma';

// Mock dependencies
vi.mock('@/lib/server-session', () => ({
  requireUser: vi.fn(() => Promise.resolve({ id: 'test-user-id' })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    habit: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    habitCompletion: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('Habits API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/habits', () => {
    it('should create a new habit', async () => {
      const mockHabit = {
        id: 'habit-1',
        userId: 'test-user-id',
        name: 'Morning Exercise',
        description: 'Exercise for 30 minutes',
        cadence: 'daily',
        targetCount: 1,
        color: '#3B82F6',
        icon: '🏃',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.habit.create).mockResolvedValue(mockHabit as any);

      const request = new Request('http://localhost/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Morning Exercise',
          description: 'Exercise for 30 minutes',
          cadence: 'daily',
          targetCount: 1,
          color: '#3B82F6',
          icon: '🏃',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Morning Exercise');
      expect(data.cadence).toBe('daily');
    });
  });

  describe('GET /api/habits', () => {
    it('should return all habits for user', async () => {
      const mockHabits = [
        {
          id: 'habit-1',
          userId: 'test-user-id',
          name: 'Habit 1',
          cadence: 'daily',
          targetCount: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.habit.findMany).mockResolvedValue(mockHabits as any);

      const request = new Request('http://localhost/api/habits');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(prisma.habit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id' },
        })
      );
    });
  });

  describe('POST /api/habits/[id]/completions', () => {
    it('should toggle habit completion', async () => {
      const mockCompletion = {
        id: 'completion-1',
        habitId: 'habit-1',
        userId: 'test-user-id',
        date: new Date('2025-12-03'),
        note: null,
        createdAt: new Date(),
      };

      vi.mocked(prisma.habit.findUnique).mockResolvedValue({ userId: 'test-user-id' } as any);
      vi.mocked(prisma.habitCompletion.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.habitCompletion.create).mockResolvedValue(mockCompletion as any);

      const request = new Request('http://localhost/api/habits/habit-1/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: '2025-12-03',
        }),
      });

      const response = await POST_COMPLETION(request, { params: { id: 'habit-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.habitId).toBe('habit-1');
    });

    it('should delete existing completion when toggled off', async () => {
      const existingCompletion = {
        id: 'completion-1',
        habitId: 'habit-1',
        userId: 'test-user-id',
        date: new Date('2025-12-03'),
      };

      vi.mocked(prisma.habit.findUnique).mockResolvedValue({ userId: 'test-user-id' } as any);
      vi.mocked(prisma.habitCompletion.findUnique).mockResolvedValue(existingCompletion as any);
      vi.mocked(prisma.habitCompletion.delete).mockResolvedValue(existingCompletion as any);

      const request = new Request('http://localhost/api/habits/habit-1/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: '2025-12-03',
        }),
      });

      const response = await POST_COMPLETION(request, { params: { id: 'habit-1' } });
      expect(response.status).toBe(200);
      expect(prisma.habitCompletion.delete).toHaveBeenCalled();
    });
  });

  describe('GET /api/habits/[id]/streak', () => {
    it('should calculate current and longest streak', async () => {
      const completions = [
        { date: new Date('2025-12-03') },
        { date: new Date('2025-12-02') },
        { date: new Date('2025-12-01') },
        { date: new Date('2025-11-28') },
        { date: new Date('2025-11-27') },
      ];

      vi.mocked(prisma.habit.findUnique).mockResolvedValue({ userId: 'test-user-id' } as any);
      vi.mocked(prisma.habitCompletion.findMany).mockResolvedValue(completions as any);

      const request = new Request('http://localhost/api/habits/habit-1/streak');
      const response = await GET_STREAK(request, { params: { id: 'habit-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('currentStreak');
      expect(data).toHaveProperty('longestStreak');
    });
  });
});
