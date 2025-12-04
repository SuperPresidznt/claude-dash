import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { GoogleCalendarSync } from '@/lib/calendar/google-sync';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { calendarId } = await request.json();

    // Get Google access token from account
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

    const sync = new GoogleCalendarSync(session.user.id, account.access_token);
    await sync.syncFromGoogle(calendarId || 'primary');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync calendar' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const calendarSyncs = await prisma.calendarSync.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { events: true }
        }
      }
    });

    return NextResponse.json(calendarSyncs);
  } catch (error) {
    console.error('Error fetching calendar syncs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar syncs' },
      { status: 500 }
    );
  }
}
