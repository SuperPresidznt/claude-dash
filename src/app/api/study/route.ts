import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const schema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  topic: z.string().min(1)
});

export async function POST(request: Request) {
  const user = await requireUser();
  const json = await request.json();
  const body = schema.parse(json);

  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);
  const minutes = Math.max(1, Math.round((endAt.getTime() - startAt.getTime()) / (1000 * 60)));

  const session = await prisma.studySession.create({
    data: {
      userId: user.id,
      startAt,
      endAt,
      minutes,
      topic: body.topic
    }
  });

  return NextResponse.json(session);
}

export async function GET() {
  const user = await requireUser();
  const sessions = await prisma.studySession.findMany({
    where: { userId: user.id },
    orderBy: { startAt: 'desc' }
  });
  return NextResponse.json(sessions);
}
