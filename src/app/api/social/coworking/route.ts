import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSessionSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  participantEmails: z.array(z.string().email()).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const data = createSessionSchema.parse(await request.json());
  const { participantEmails, ...sessionData } = data;

  const coWorkingSession = await prisma.coWorkingSession.create({
    data: {
      ...sessionData,
      scheduledStart: new Date(data.scheduledStart),
      scheduledEnd: new Date(data.scheduledEnd),
      hostUserId: user.id,
      inviteLink: `https://meet.google.com/${Math.random().toString(36).substr(2, 9)}`,
    },
  });

  // Add participants
  if (participantEmails?.length) {
    await prisma.coWorkingSessionParticipant.createMany({
      data: participantEmails.map(email => ({
        coWorkingSessionId: coWorkingSession.id,
        email,
      })),
    });
  }

  // TODO: Create Google Calendar event and send invites

  return NextResponse.json(coWorkingSession, { status: 201 });
}
