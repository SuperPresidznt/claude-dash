import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createResourceSchema = z.object({
  title: z.string().min(1).max(500),
  url: z.string().url().optional(),
  type: z.enum(['article', 'video', 'book', 'podcast', 'course', 'other']),
  category: z.string().optional(),
  description: z.string().optional(),
  macroGoalId: z.string().optional(),
  projectId: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const macroGoalId = searchParams.get('macroGoalId');
    const projectId = searchParams.get('projectId');
    const isFavorite = searchParams.get('isFavorite');

    const where: any = { userId: user.id };
    if (type) where.type = type;
    if (category) where.category = category;
    if (macroGoalId) where.macroGoalId = macroGoalId;
    if (projectId) where.projectId = projectId;
    if (isFavorite === 'true') where.isFavorite = true;

    const resources = await prisma.resource.findMany({
      where,
      include: {
        readingSessions: {
          orderBy: { startTime: 'desc' },
          take: 5,
        },
        flashCards: {
          where: { status: { notIn: ['mastered'] } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(resources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = createResourceSchema.parse(body);

    const resource = await prisma.resource.create({
      data: {
        ...data,
        userId: user.id,
      },
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating resource:', error);
    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    );
  }
}
