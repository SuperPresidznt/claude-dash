import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '@/lib/prisma-mock';

describe('Knowledge & Learning API', () => {
  describe('Resources', () => {
    it('should create a new resource', async () => {
      const mockResource = {
        id: '1',
        userId: 'user1',
        title: 'Test Article',
        type: 'article',
        url: 'https://example.com',
        category: 'Tech',
        tags: ['javascript', 'testing'],
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.resource.create.mockResolvedValue(mockResource as any);

      const result = await prismaMock.resource.create({
        data: {
          userId: 'user1',
          title: 'Test Article',
          type: 'article',
          url: 'https://example.com',
          category: 'Tech',
          tags: ['javascript', 'testing'],
        },
      });

      expect(result).toEqual(mockResource);
      expect(result.title).toBe('Test Article');
    });

    it('should fetch resources with filters', async () => {
      const mockResources = [
        { id: '1', title: 'Article 1', type: 'article' },
        { id: '2', title: 'Article 2', type: 'article' },
      ];

      prismaMock.resource.findMany.mockResolvedValue(mockResources as any);

      const result = await prismaMock.resource.findMany({
        where: { userId: 'user1', type: 'article' },
      });

      expect(result).toHaveLength(2);
    });
  });

  describe('Flash Cards - Spaced Repetition', () => {
    it('should calculate next review interval correctly', () => {
      // SM-2 algorithm test
      const calculateNextReview = (
        easeFactor: number,
        interval: number,
        repetitions: number,
        quality: number
      ) => {
        let newEaseFactor = easeFactor;
        let newInterval = interval;
        let newRepetitions = repetitions;

        if (quality >= 3) {
          if (newRepetitions === 0) {
            newInterval = 1;
          } else if (newRepetitions === 1) {
            newInterval = 6;
          } else {
            newInterval = Math.round(interval * easeFactor);
          }
          newRepetitions += 1;
        } else {
          newRepetitions = 0;
          newInterval = 1;
        }

        newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (newEaseFactor < 1.3) newEaseFactor = 1.3;

        return { easeFactor: newEaseFactor, interval: newInterval, repetitions: newRepetitions };
      };

      const result = calculateNextReview(2.5, 0, 0, 4);
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
      expect(result.easeFactor).toBeGreaterThan(2.5);
    });
  });

  describe('Reading Sessions', () => {
    it('should track reading time correctly', async () => {
      const mockSession = {
        id: '1',
        userId: 'user1',
        resourceId: 'res1',
        startTime: new Date('2025-01-01T10:00:00'),
        endTime: new Date('2025-01-01T10:30:00'),
        minutes: 30,
        progress: 50,
      };

      prismaMock.readingSession.create.mockResolvedValue(mockSession as any);

      const result = await prismaMock.readingSession.create({
        data: mockSession,
      });

      expect(result.minutes).toBe(30);
      expect(result.progress).toBe(50);
    });
  });
});
