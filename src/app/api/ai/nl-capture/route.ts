import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const nlCaptureSchema = z.object({
  input: z.string(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { input } = nlCaptureSchema.parse(await request.json());

  // Simple pattern matching for MVP
  const parsed = parseNaturalLanguage(input);

  let entityId;
  let entityType = parsed.type;

  try {
    if (parsed.type === 'cashflow' && parsed.amount) {
      const txn = await prisma.cashflowTxn.create({
        data: {
          userId: user.id,
          description: parsed.description || 'Transaction',
          amountCents: parsed.amount,
          direction: parsed.direction || 'outflow',
          category: parsed.category || 'Other',
          date: parsed.date || new Date(),
        },
      });
      entityId = txn.id;
    } else if (parsed.type === 'task' && parsed.description) {
      const task = await prisma.task.create({
        data: {
          userId: user.id,
          title: parsed.description,
          status: 'todo',
          priority: parsed.priority || 'medium',
        },
      });
      entityId = task.id;
    } else if (parsed.type === 'habit') {
      // Log habit completion
      const habit = await prisma.habit.findFirst({
        where: { userId: user.id, name: { contains: parsed.description || '', mode: 'insensitive' } },
      });
      if (habit) {
        const completion = await prisma.habitCompletion.create({
          data: { userId: user.id, habitId: habit.id, date: parsed.date || new Date() },
        });
        entityId = completion.id;
      }
    }

    await prisma.nLCapture.create({
      data: {
        userId: user.id,
        rawInput: input,
        parsedData: parsed,
        entityType,
        entityId,
        confidence: parsed.confidence,
        isProcessed: !!entityId,
      },
    });

    return NextResponse.json({
      success: !!entityId,
      parsed,
      entityId,
      entityType,
    });
  } catch (error) {
    await prisma.nLCapture.create({
      data: {
        userId: user.id,
        rawInput: input,
        parsedData: parsed,
        isProcessed: false,
        error: String(error),
      },
    });

    return NextResponse.json({ success: false, error: 'Failed to process input' }, { status: 500 });
  }
}

function parseNaturalLanguage(input: string): any {
  const lower = input.toLowerCase();

  // Money patterns
  const moneyMatch = lower.match(/\$?(\d+(?:\.\d{2})?)/);
  const amount = moneyMatch ? Math.round(parseFloat(moneyMatch[1]) * 100) : null;

  // Date patterns
  const yesterday = lower.includes('yesterday');
  const today = lower.includes('today');
  const date = yesterday ? new Date(Date.now() - 86400000) : today ? new Date() : new Date();

  // Type detection
  let type = 'unknown';
  let direction = 'outflow';

  if (amount) {
    type = 'cashflow';
    if (lower.includes('income') || lower.includes('earned') || lower.includes('paid me')) {
      direction = 'inflow';
    }
  } else if (lower.includes('task') || lower.includes('todo') || lower.includes('remind')) {
    type = 'task';
  } else if (lower.includes('habit') || lower.includes('completed')) {
    type = 'habit';
  }

  // Category detection for cashflow
  const categories = ['groceries', 'transport', 'entertainment', 'utilities', 'dining', 'shopping', 'health'];
  const category = categories.find(cat => lower.includes(cat)) || 'Other';

  // Extract description
  const description = input.replace(/\$?\d+(?:\.\d{2})?/, '').replace(/yesterday|today/gi, '').trim();

  return {
    type,
    amount,
    direction,
    category,
    description,
    date,
    confidence: 0.7,
  };
}
