'use client';

import { FormEvent, useState } from 'react';
import { getCsrfToken, signIn } from 'next-auth/react';
import { useEffect } from 'react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [csrfToken, setCsrfToken] = useState<string | undefined>();

  useEffect(() => {
    getCsrfToken().then(setCsrfToken);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    await signIn('email', {
      email,
      redirect: false
    });
    setStatus('sent');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-2xl bg-surface/80 p-10 shadow-xl"
      >
        <div>
          <h1 className="text-2xl font-semibold">Structure Is Grace</h1>
          <p className="mt-2 text-sm text-slate-400">Sign in with a magic link sent to your email.</p>
        </div>
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            className="w-full rounded-lg border border-slate-700 bg-background px-4 py-3 text-slate-100 focus:border-primary focus:outline-none"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed"
        >
          {status === 'sent' ? 'Magic link sent' : status === 'loading' ? 'Sending...' : 'Send magic link'}
        </button>
      </form>
    </div>
  );
}
