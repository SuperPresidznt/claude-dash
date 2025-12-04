import { Session } from 'next-auth';
import { vi } from 'vitest';

// Mock authenticated session
export const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  user: {
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

// Helper to mock useSession hook
export const mockUseSession = (session: Session | null = null, status: 'authenticated' | 'unauthenticated' | 'loading' = 'unauthenticated') => {
  const useSession = vi.fn(() => ({
    data: session,
    status,
    update: vi.fn(),
  }));

  vi.doMock('next-auth/react', () => ({
    useSession,
    signIn: vi.fn(),
    signOut: vi.fn(),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  }));

  return useSession;
};

// Helper to mock server-side auth
export const mockServerAuth = (session: Session | null = null) => {
  vi.doMock('@/lib/server-session', () => ({
    getServerSession: vi.fn(() => Promise.resolve(session)),
  }));
};
