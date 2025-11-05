'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const blockedTags = new Set(['INPUT', 'TEXTAREA']);

export const KeyboardShortcuts = () => {
  const router = useRouter();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (blockedTags.has((event.target as HTMLElement)?.tagName ?? '')) return;

      switch (event.key.toLowerCase()) {
        case 's':
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('sig:start-10'));
          break;
        case 'm':
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('sig:start-60'));
          break;
        case 'n':
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('sig:new-idea'));
          break;
        case 'j':
          event.preventDefault();
          router.push('/journal');
          break;
        case 'd':
          event.preventDefault();
          router.push('/dashboard');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  return null;
};
