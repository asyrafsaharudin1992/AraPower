import { useState, useEffect, useCallback } from 'react';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

interface UsePushNotificationsProps {
  staffId: string | number;
  role: string;
  apiBaseUrl: string;
  safeFetch: (url: string, options?: RequestInit) => Promise<{ res: Response; data: any }>;
}

export const usePushNotifications = ({
  staffId, role, apiBaseUrl, safeFetch
}: UsePushNotificationsProps) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Only relevant for admin and receptionist
  const isEligible = ['admin', 'receptionist', 'manager'].includes(role);

  useEffect(() => {
    if (!isEligible) return;
    setPermission(Notification.permission);
    checkExistingSubscription();
  }, [staffId]);

  const checkExistingSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch {}
  };

  const subscribe = useCallback(async () => {
    if (!isEligible || !VAPID_PUBLIC_KEY) return;
    setIsLoading(true);
    try {
      // 1. Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // 2. Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setIsLoading(false); return; }

      // 3. Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 4. Save subscription to server
      const { res } = await safeFetch(`${apiBaseUrl}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId, subscription: sub.toJSON() }),
      });

      if (res.ok) setIsSubscribed(true);
    } catch (err) {
      console.error('[Push] Subscribe failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [staffId, apiBaseUrl, safeFetch]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      await safeFetch(`${apiBaseUrl}/api/push/unsubscribe`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId }),
      });

      setIsSubscribed(false);
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [staffId, apiBaseUrl, safeFetch]);

  return { permission, isSubscribed, isLoading, isEligible, subscribe, unsubscribe };
};