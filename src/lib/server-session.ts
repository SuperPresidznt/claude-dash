import { auth } from 'next-auth';
import { prisma } from './prisma';

export const requireUser = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return user;
};
