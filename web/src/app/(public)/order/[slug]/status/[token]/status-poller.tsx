'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Refresh the server component every `seconds` so the status stays live without a full reload. */
export function StatusPoller({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
