import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

const createJournalEntrySchema = z.object({
  type: z.enum(['reflection', 'am', 'pm', 'custom']).default('reflection'),
  date: z.string().datetime(),
  content: z.string().min(1),
  promptQuestion: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Simple sentiment analysis function (keyword-based)
function analyzeSentiment(text: string): { score: number; label: string } {
  const positiveWords = ['happy', 'great', 'good', 'excellent', 'amazing', 'wonderful', 'love', 'fantastic', 'awesome', 'joy', 'grateful', 'proud', 'excited', 'accomplished', 'productive', 'success', 'win', 'progress'];
  const negativeWords = ['sad', 'bad', 'terrible', 'awful', 'hate', 'frustrated', 'angry', 'difficult', 'struggle', 'fail', 'stress', 'worried', 'anxious', 'tired', 'exhausted', 'overwhelmed', 'stuck'];

  const lowerText = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });

  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });

  const total = positiveCount + negativeCount;
  if (total === 0) {
    return { score: 0, label: 'neutral' };
  }

  const score = (positiveCount - negativeCount) / total;
  let label = 'neutral';
  if (score > 0.2) label = 'positive';
  if (score < -0.2) label = 'negative';

  return { score: Math.max(-1, Math.min(1, score)), label };
}

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period'); // 'week' or 'month'

    let where: any = { userId: session.user.id };

    if (type) {
      where.type = type;
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (period) {
      const now = new Date();
      if (period === 'week') {
        where.date = {
          gte: startOfWeek(now),
          lte: endOfWeek(now),
        };
      } else if (period === 'month') {
        where.date = {
          gte: startOfMonth(now),
          lte: endOfMonth(now),
        };
      }
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 100,
    });

    return NextResponse.json(entries);
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = createJournalEntrySchema.parse(body);

    // Analyze sentiment
    const sentiment = analyzeSentiment(validated.content);

    const entry = await prisma.journalEntry.create({
      data: {
        userId: session.user.id,
        type: validated.type,
        date: new Date(validated.date),
        content: validated.content,
        promptQuestion: validated.promptQuestion,
        tags: validated.tags || [],
        sentimentScore: sentiment.score,
        sentimentLabel: sentiment.label,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  });
}
