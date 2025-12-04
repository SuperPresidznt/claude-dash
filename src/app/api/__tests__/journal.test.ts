import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../journal/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/server-session', () => ({
  getServerSession: vi.fn(() => Promise.resolve({ user: { id: 'test-user-id', email: 'test@example.com' } })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    journalEntry: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Journal API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/journal', () => {
    it('should return journal entries for authenticated user', async () => {
      const mockEntries = [
        {
          id: '1',
          userId: 'test-user-id',
          type: 'reflection',
          content: 'Test entry',
          date: new Date(),
          sentimentScore: 0.5,
          sentimentLabel: 'positive',
          tags: [],
        },
      ];

      (prisma.journalEntry.findMany as any).mockResolvedValue(mockEntries);

      const req = new NextRequest('http://localhost:3000/api/journal');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockEntries);
    });
  });

  describe('POST /api/journal', () => {
    it('should create a new journal entry with sentiment analysis', async () => {
      const newEntry = {
        type: 'reflection',
        date: new Date().toISOString(),
        content: 'I feel great today! Very productive and happy.',
      };

      const mockCreatedEntry = {
        id: '2',
        userId: 'test-user-id',
        ...newEntry,
        date: new Date(newEntry.date),
        sentimentScore: 0.8,
        sentimentLabel: 'positive',
        tags: [],
      };

      (prisma.journalEntry.create as any).mockResolvedValue(mockCreatedEntry);

      const req = new NextRequest('http://localhost:3000/api/journal', {
        method: 'POST',
        body: JSON.stringify(newEntry),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.sentimentLabel).toBe('positive');
    });
  });
});
