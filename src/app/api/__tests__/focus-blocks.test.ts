import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../focus-blocks/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/server-session', () => ({
  getServerSession: vi.fn(() => Promise.resolve({ user: { id: 'test-user-id', email: 'test@example.com' } })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    focusBlock: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Focus Blocks API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/focus-blocks', () => {
    it('should return focus blocks for authenticated user', async () => {
      const mockBlocks = [
        {
          id: '1',
          userId: 'test-user-id',
          title: 'Deep work',
          startTime: new Date(),
          endTime: new Date(),
          completed: false,
        },
      ];

      (prisma.focusBlock.findMany as any).mockResolvedValue(mockBlocks);

      const req = new NextRequest('http://localhost:3000/api/focus-blocks');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockBlocks);
    });
  });

  describe('POST /api/focus-blocks', () => {
    it('should create a new focus block', async () => {
      const newBlock = {
        title: 'New focus block',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      };

      const mockCreatedBlock = {
        id: '2',
        userId: 'test-user-id',
        ...newBlock,
        startTime: new Date(newBlock.startTime),
        endTime: new Date(newBlock.endTime),
        completed: false,
      };

      (prisma.focusBlock.create as any).mockResolvedValue(mockCreatedBlock);

      const req = new NextRequest('http://localhost:3000/api/focus-blocks', {
        method: 'POST',
        body: JSON.stringify(newBlock),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe(newBlock.title);
    });
  });
});
