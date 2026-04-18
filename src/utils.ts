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

