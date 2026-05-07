import React from 'react';
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { usePushNotifications } from './usePushNotifications';
import { toast } from 'react-hot-toast';

interface NotificationBellProps {
  currentUser: any;
  apiBaseUrl: string;
  safeFetch: (url: string, options?: RequestInit) => Promise<{ res: Response; data: any }>;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  currentUser, apiBaseUrl, safeFetch,
}) => {
  const { permission, isSubscribed, isLoading, isEligible, subscribe, unsubscribe } =
    usePushNotifications({
      staffId: currentUser.id,
      role: currentUser.role,
      apiBaseUrl,
      safeFetch,
    });

  if (!isEligible) return null;
  if (!('Notification' in window)) return null;

  const handleClick = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast.success('Notifications turned off');
    } else {
      await subscribe();
      if (Notification.permission === 'granted') {
        toast.success('Notifications enabled! You\'ll be alerted for new referrals and registrations.');
      } else if (Notification.permission === 'denied') {
        toast.error('Notifications blocked. Enable in Chrome Settings → Site Settings.');
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      title={isSubscribed ? 'Notifications ON — click to turn off' : 'Enable notifications'}
      style={{
        width: 36, height: 36,
        borderRadius: '50%',
        border: 'none',
        cursor: isLoading ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isSubscribed ? '#1580c2' : 'rgba(21,128,194,0.08)',
        color: isSubscribed ? '#fff' : '#1580c2',
        transition: 'all 0.2s',
        flexShrink: 0,
      }}
    >
      {isLoading
        ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        : isSubscribed
          ? <BellRing size={16} />
          : permission === 'denied'
            ? <BellOff size={16} />
            : <Bell size={16} />
      }
    </button>
  );
};