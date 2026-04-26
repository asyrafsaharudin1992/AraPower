import { toast } from 'react-hot-toast';

export const handleDownloadPoster = async (url: string, fileName: string) => {
  if (!url) {
    toast.error('No poster available for this service');
    return;
  }
  
  const toastId = toast.loading('Readying poster...');
  
  try {
    // Try fetch first (works for same-origin / CORS-enabled URLs)
    const response = await fetch(url, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type });

      // On mobile — use native share sheet if available
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          toast.dismiss(toastId);
          await navigator.share({ files: [file], title: fileName });
          return;
        } catch (shareError: any) {
          if (shareError.name === 'AbortError') {
             toast.dismiss(toastId);
             return; 
          }
          console.warn('Native share failed:', shareError);
        }
      }

      // Desktop / fallback — blob download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'poster.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.dismiss(toastId);
      toast.success('Download started');
      return;
    }
    console.warn(`Fetch returned ${response.status} ${response.statusText}`);
  } catch (e) {
    console.warn('CORS blocked or fetch failed:', e);
  }

  // Fallback: open in new tab so user can long-press save (mobile) or right-click save (desktop)
  toast.dismiss(toastId);
  toast.success('Poster opened in new tab — long press / right-click to save', { duration: 4000 });
  window.open(url, '_blank', 'noopener,noreferrer');
};

// ── Malaysia Timezone Utilities (UTC+8) ───────────────────────────────────
const MY_TIMEZONE = 'Asia/Kuala_Lumpur';

/**
 * Format a date/timestamp to Malaysia local time
 * e.g. "26 Apr 2026, 8:45 PM"
 */
export const formatMyDate = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleString('en-MY', {
      timeZone: MY_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch { return '—'; }
};

/**
 * Date only — no time
 * e.g. "26 Apr 2026"
 */
export const formatMyDateOnly = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleString('en-MY', {
      timeZone: MY_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch { return '—'; }
};

/**
 * Time only
 * e.g. "8:45 PM"
 */
export const formatMyTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleString('en-MY', {
      timeZone: MY_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch { return '—'; }
};

/**
 * Relative time — "2 hours ago", "just now", "3 days ago"
 * Always calculated relative to Malaysia local time
 */
export const formatMyTimeAgo = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  try {
    const diff = Date.now() - new Date(date).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7)   return `${days}d ago`;
    return formatMyDateOnly(date);
  } catch { return '—'; }
};

/**
 * Short format for tables
 * e.g. "26/04/26, 8:45 PM"
 */
export const formatMyShort = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleString('en-MY', {
      timeZone: MY_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch { return '—'; }
};