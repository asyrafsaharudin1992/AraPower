import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Download, Copy, MessageCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getServiceStatus } from './ModernPromotionCard';

export const PromotionDetailModal = ({ item, isOpen, onClose, clinicProfile, darkMode, currentUser }: { item: any | null, isOpen: boolean, onClose: () => void, clinicProfile: any, darkMode: boolean, currentUser: any | null }) => {
  if (!item) return null;

  const linkCode = currentUser?.id || currentUser?.referral_code || currentUser?.promo_code;

  const generateAffiliateLink = () => {
    if (!linkCode) return '';
    
    // 1. Get the custom target URL entered during Service Setup. 
    let baseUrl = (item as any).target_url || window.location.origin;
    
    // Strip trailing slash if it exists
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    // Ensure the URL has 'http' if the admin forgot to add it, unless it's a localhost URL
    if (!baseUrl.startsWith('http') && !baseUrl.includes('localhost')) {
      baseUrl = `https://${baseUrl}`;
    }

    // 2. Append the required parameters: Service Name, Service Code, and Affiliate Code
    // Use '?' if the base URL doesn't have parameters yet, otherwise use '&'
    const separator = baseUrl.includes('?') ? '&' : '?';
    
    const shareUrl = `${baseUrl}${separator}serviceName=${encodeURIComponent(item.name)}&serviceCode=${item.id}&ref=${linkCode}`;
    return shareUrl;
  };

  const shareLink = generateAffiliateLink();

  const handleCopyLink = async () => {
    if (!shareLink) {
      toast.error('Code not generated yet');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Pautan disalin!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };



  const handleDownloadPoster = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: fileName,
            text: `Poster for ${item.name}`,
          });
          return;
        } catch (shareError) {
          if ((shareError as Error).name !== 'AbortError') {
            console.error('Share failed:', shareError);
          }
        }
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'poster.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[101] max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 flex flex-col items-center">
              <div className="w-12 h-1.5 bg-violet-500/40 rounded-full my-4" />
              <button 
                onClick={onClose}
                className="absolute top-2 right-6 w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors active:scale-90"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="px-6 pb-36 space-y-8">
              {/* Poster */}
              {item.image_url ? (
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  <img src={item.image_url} alt={item.name} className="w-full aspect-[4/5] object-cover" />
                </div>
              ) : (
                <div className="w-full aspect-[4/5] bg-gradient-to-br from-brand-primary to-violet-500 rounded-2xl flex items-center justify-center">
                  <Zap size={48} className="text-zinc-900" />
                </div>
              )}

              {/* Info */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="px-2 py-1 rounded-md bg-violet-500/20 text-[10px] font-black text-zinc-900 uppercase tracking-widest border border-violet-500">
                      {item.type || 'SERVICE'}
                    </span>
                    {(() => {
                      const status = getServiceStatus(item);
                      return (
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-violet-500 ${
                          status === 'active' ? 'bg-emerald-500 text-white' : 
                          status === 'upcoming' ? 'bg-brand-surface text-zinc-900' : 
                          'bg-rose-500 text-white'
                        }`}>
                          {status}
                        </span>
                      );
                    })()}
                  </div>
                  <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">{item.name}</h2>
                  <p className="text-zinc-500 text-sm leading-relaxed">{item.description || 'No description provided'}</p>
                </div>

                {/* Pricing */}
                <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-transparent border-violet-500/20'} rounded-3xl p-6 border space-y-4`}>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Base Price</span>
                    <span className="text-zinc-500 text-lg line-through font-medium">
                      {clinicProfile.currency}{(item.base_price || 0).toFixed(0)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Promo Price</span>
                    <span className="text-zinc-900 text-3xl font-black">
                      {clinicProfile.currency}{(item.promo_price || item.base_price || 0).toFixed(0)}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-violet-500 flex justify-between items-center">
                    <span className="text-brand-accent text-xs font-bold uppercase tracking-widest">Agent Incentive</span>
                    <span className="text-brand-accent text-xl font-black">
                      {clinicProfile.currency}{(item.commission_rate || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => item.image_url && handleDownloadPoster(item.image_url, `${item.name}-poster.jpg`)}
                  disabled={!item.image_url}
                  className="w-full py-5 bg-white text-zinc-900 rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Download size={20} />
                  Download Poster to Share
                </button>

                {/* Share Buttons */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <button
                    onClick={handleCopyLink}
                    className="py-4 bg-zinc-100 text-zinc-900 rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Copy size={16} />
                    Copy Link
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Check out this promotion at our clinic: ${shareLink}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-4 bg-emerald-500 text-white rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </a>
                </div>

                <div className="pt-4">
                  <button
                    onClick={onClose}
                    className="w-full py-4 bg-zinc-100 text-zinc-900 rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <ArrowLeft size={16} />
                    Back to Promotions
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
