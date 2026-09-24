'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/register-sw';

export function PWASetup() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
