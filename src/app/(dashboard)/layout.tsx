import Link from 'next/link';
import { ReactNode } from 'react';
import { SignOutButton } from '@/components/sign-out-button';
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts';

const navItems = [
  { href: '/dashboard', label: 'Today' },
  { href: '/journal', label: 'Idea → Action' },
  { href: '/experiments', label: 'Experiments' },
  { href: '/dashboard/metrics', label: 'Metrics' },
  { href: '/reminders', label: 'Reminders' },
  { href: '/settings', label: 'Settings' }
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <KeyboardShortcuts />
      <aside className="hidden w-64 flex-col border-r border-slate-800 bg-surface/80 p-6 lg:flex">
        <Link href="/dashboard" className="text-xl font-semibold text-primary">
          Structure Is Grace
        </Link>
        <nav className="mt-8 flex flex-col gap-2 text-sm text-slate-300">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 transition hover:bg-slate-800/60 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 bg-background/90">
        <div className="border-b border-slate-800 bg-surface/80 px-4 py-4 lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="text-lg font-semibold text-primary">
              Structure Is Grace
            </Link>
            <SignOutButton />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-300">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
