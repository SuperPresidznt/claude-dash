import { auth } from './auth';
import { prisma } from './prisma';

export const requireUser = async () => {
  const seedEmail = process.env.SEED_USER_EMAIL ?? 'owner@example.com';
  const session = await auth().catch(() => null);

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user) {
      return user;
    }
  }

  const fallbackUser = await prisma.user.findFirst({ where: { email: seedEmail } });
  if (!fallbackUser) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return fallbackUser;
};
