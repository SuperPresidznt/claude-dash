import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleCalendarSync } from '@/lib/calendar/google-sync';
import { z } from 'zod';

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  calendarId: z.string().optional(),
  linkedTaskId: z.string().optional(),
  linkedHabitId: z.string().optional()
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const events = await prisma.calendarEvent.findMany({
      where: {
        userId: session.user.id,
        ...(startDate && endDate
          ? {
              startTime: {
                gte: new Date(startDate),
                lte: new Date(endDate)
              }
            }
          : {})
      },
      orderBy: { startTime: 'asc' },
      include: {
        calendarSync: true
      }
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createEventSchema.parse(body);

    // Get Google access token
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'google'
      }
    });

    if (!account?.access_token) {
      return NextResponse.json(
        { error: 'Google account not connected' },
        { status: 400 }
      );
    }

    // Push event to Google Calendar
    const sync = new GoogleCalendarSync(session.user.id, account.access_token);
    const externalId = await sync.pushEventToGoogle(
      data.title,
      data.description || '',
      new Date(data.startTime),
      new Date(data.endTime),
      data.calendarId
    );

    // Get or create calendar sync
    let calendarSync = await prisma.calendarSync.findUnique({
      where: {
        userId_provider_calendarId: {
          userId: session.user.id,
          provider: 'google',
          calendarId: data.calendarId || 'primary'
        }
      }
    });

    if (!calendarSync) {
      calendarSync = await prisma.calendarSync.create({
        data: {
          userId: session.user.id,
          provider: 'google',
          calendarId: data.calendarId || 'primary',
          syncEnabled: true
        }
      });
    }

    // Save to local database
    const event = await prisma.calendarEvent.create({
      data: {
        calendarSyncId: calendarSync.id,
        userId: session.user.id,
        externalId,
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        isAllDay: false,
        linkedTaskId: data.linkedTaskId,
        linkedHabitId: data.linkedHabitId
      }
    });

    return NextResponse.json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
