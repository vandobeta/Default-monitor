import { useEffect } from 'react';

export const useAnalytics = (authFetch: (url: string, options?: any) => Promise<Response>) => {
  const logEvent = async (eventType: string, screen: string, details?: any) => {
    try {
      await authFetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, screen, details })
      });
    } catch (e) {
      console.error("Failed to log analytics", e);
    }
  };

  return { logEvent };
};
