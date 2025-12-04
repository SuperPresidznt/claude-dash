import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sessions = await prisma.session.findMany({
      where: { userId: session.user.id },
      orderBy: { expires: 'desc' }
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const allSessions = searchParams.get('all') === 'true';

    if (allSessions) {
      // Delete all sessions except current one
      await prisma.session.deleteMany({
        where: {
          userId: session.user.id,
          sessionToken: { not: session.user.id } // Keep current session
        }
      });
      return NextResponse.json({ success: true, message: 'All other sessions signed out' });
    } else if (sessionId) {
      // Delete specific session
      await prisma.session.delete({
        where: { id: sessionId, userId: session.user.id }
      });
      return NextResponse.json({ success: true, message: 'Session deleted' });
    } else {
      return NextResponse.json(
        { error: 'Session ID or all flag required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error deleting sessions:', error);
    return NextResponse.json(
      { error: 'Failed to delete sessions' },
      { status: 500 }
    );
  }
}
