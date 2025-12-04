import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';

const updateJournalEntrySchema = z.object({
  content: z.string().min(1).optional(),
  promptQuestion: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entry = await prisma.journalEntry.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    return NextResponse.json(entry);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = updateJournalEntrySchema.parse(body);

    const existing = await prisma.journalEntry.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (validated.content !== undefined) {
      updateData.content = validated.content;
      // Reanalyze sentiment if content changes
      const sentiment = analyzeSentiment(validated.content);
      updateData.sentimentScore = sentiment.score;
      updateData.sentimentLabel = sentiment.label;
    }
    if (validated.promptQuestion !== undefined) {
      updateData.promptQuestion = validated.promptQuestion;
    }
    if (validated.tags !== undefined) {
      updateData.tags = validated.tags;
    }

    const entry = await prisma.journalEntry.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(entry);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.journalEntry.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    await prisma.journalEntry.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  });
}
