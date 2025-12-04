import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getObjectives, POST as createObjective } from '../okrs/objectives/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/server-session', () => ({
  getServerSession: vi.fn(() => Promise.resolve({ user: { id: 'test-user-id', email: 'test@example.com' } })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    objective: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('OKRs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/okrs/objectives', () => {
    it('should return objectives for authenticated user', async () => {
      const mockObjectives = [
        {
          id: '1',
          userId: 'test-user-id',
          title: 'Increase revenue',
          quarter: 'Q1 2025',
          status: 'active',
          keyResults: [],
        },
      ];

      (prisma.objective.findMany as any).mockResolvedValue(mockObjectives);

      const req = new NextRequest('http://localhost:3000/api/okrs/objectives');
      const response = await getObjectives(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockObjectives);
    });
  });

  describe('POST /api/okrs/objectives', () => {
    it('should create a new objective', async () => {
      const newObjective = {
        title: 'Launch product',
        quarter: 'Q1 2025',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 3600000).toISOString(),
        confidenceRating: 75,
      };

      const mockCreatedObjective = {
        id: '2',
        userId: 'test-user-id',
        ...newObjective,
        startDate: new Date(newObjective.startDate),
        endDate: new Date(newObjective.endDate),
        status: 'active',
        keyResults: [],
      };

      (prisma.objective.create as any).mockResolvedValue(mockCreatedObjective);

      const req = new NextRequest('http://localhost:3000/api/okrs/objectives', {
        method: 'POST',
        body: JSON.stringify(newObjective),
      });

      const response = await createObjective(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe(newObjective.title);
    });
  });
});
