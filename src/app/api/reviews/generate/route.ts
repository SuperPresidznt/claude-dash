import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { apiHandler } from '@/lib/api-handler';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type } = body; // 'weekly' or 'monthly'

    let startDate: Date;
    let endDate: Date;

    if (type === 'weekly') {
      const now = new Date();
      startDate = startOfWeek(now);
      endDate = endOfWeek(now);
    } else if (type === 'monthly') {
      const now = new Date();
      startDate = startOfMonth(subMonths(now, 1)); // Last month
      endDate = endOfMonth(subMonths(now, 1));
    } else {
      return NextResponse.json({ error: 'Invalid review type' }, { status: 400 });
    }

    // Call the regular POST endpoint to create the review
    const createResponse = await fetch(`${req.nextUrl.origin}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        type,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }),
    });

    const review = await createResponse.json();
    return NextResponse.json(review, { status: createResponse.status });
  });
}
