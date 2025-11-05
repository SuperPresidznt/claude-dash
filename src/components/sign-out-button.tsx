'use client';

import { signOut } from 'next-auth/react';

export const SignOutButton = () => {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/signin' })}
      className="w-full rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-primary hover:text-white"
    >
      Sign out
    </button>
  );
};
