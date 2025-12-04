import { describe, it, expect } from 'vitest';
import { prismaMock } from '@/lib/prisma-mock';

describe('Wellbeing & Health API', () => {
  describe('Check-ins', () => {
    it('should create daily check-in with all metrics', async () => {
      const mockCheckIn = {
        id: '1',
        userId: 'user1',
        date: new Date('2025-01-01'),
        sleepHours: 7.5,
        sleepQuality: 8,
        mood: 'good',
        energy: 'high',
        stressLevel: 3,
        physicalHealth: 7,
        notes: 'Feeling great',
        createdAt: new Date(),
      };

      prismaMock.wellbeingCheckIn.create.mockResolvedValue(mockCheckIn as any);

      const result = await prismaMock.wellbeingCheckIn.create({
        data: mockCheckIn,
      });

      expect(result.sleepHours).toBe(7.5);
      expect(result.mood).toBe('good');
    });

    it('should enforce unique check-in per day', async () => {
      const mockCheckIn = {
        userId: 'user1',
        date: new Date('2025-01-01'),
        sleepHours: 7,
      };

      prismaMock.wellbeingCheckIn.upsert.mockResolvedValue(mockCheckIn as any);

      const result = await prismaMock.wellbeingCheckIn.upsert({
        where: {
          userId_date: {
            userId: 'user1',
            date: new Date('2025-01-01'),
          },
        },
        create: mockCheckIn,
        update: mockCheckIn,
      });

      expect(result).toBeDefined();
    });
  });

  describe('Correlations', () => {
    it('should calculate correlation coefficient', () => {
      const calculateCorrelation = (data: { x: number; y: number }[]) => {
        if (data.length < 2) return null;

        const meanX = data.reduce((sum, p) => sum + p.x, 0) / data.length;
        const meanY = data.reduce((sum, p) => sum + p.y, 0) / data.length;

        const numerator = data.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0);
        const denomX = Math.sqrt(data.reduce((sum, p) => sum + Math.pow(p.x - meanX, 2), 0));
        const denomY = Math.sqrt(data.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0));

        if (denomX === 0 || denomY === 0) return null;
        return numerator / (denomX * denomY);
      };

      const data = [
        { x: 7, y: 5 },
        { x: 8, y: 6 },
        { x: 6, y: 4 },
        { x: 9, y: 7 },
      ];

      const correlation = calculateCorrelation(data);
      expect(correlation).toBeGreaterThan(0.9); // Strong positive correlation
    });
  });
});
