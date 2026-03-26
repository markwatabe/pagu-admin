import { useEffect } from 'react';
import { db } from '../lib/db';
import { setAppBadge } from '../lib/badge';

/**
 * Keeps the PWA app-icon badge in sync with the number of unreplied reviews.
 * Uses InstantDB's reactive query so the badge updates in real time.
 */
export function useAppBadge() {
  const { data } = db.useQuery({ reviews: {} });

  const unReplied = data?.reviews
    ? data.reviews.filter((r) => !r.replied).length
    : 0;

  useEffect(() => {
    setAppBadge(unReplied);
  }, [unReplied]);
}
