import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Download, ArrowLeft, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getServiceStatus } from './ModernPromotionCard';
import { handleDownloadPoster } from '../utils';

export const PromotionDetailModal = ({ item, isOpen, onClose, clinicProfile, darkMode, currentUser }: { item: any | null, isOpen: boolean, onClose: () => void, clinicProfile: any, darkMode: boolean, currentUser: any | null }) => {
  if (!item) return null;

  const linkCode = currentUser?.id || currentUser?.referral_code || currentUser?.promo_code;

  const generateAffiliateLink = () => {
    if (!linkCode) return '';

    let baseUrl = (item as any).target_url || window.location.origin;

    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    if (!baseUrl.startsWith('http') && !baseUrl.includes('localhost')) {
      baseUrl = `https://${baseUrl}`;
    }

    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}serviceName=${encodeURIComponent(item.name)}&serviceCode=${item.id}&ref=${linkCode}`;
  };

  const [showPosterGallery, setShowPosterGallery] = React.useState(false);
  // poster_images may be stored as JSON string from server — parse it
  const parsePosterImages = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; }
      catch { return []; }
    }
    return [];
  };
  const allPosters: string[] = parsePosterImages(item?.poster_images).length > 0
    ? parsePosterImages(item?.poster_images)
    : (item?.image_url ? [item.image_url] : []);

  const handleShareLink = async () => {
    const shareLink = generateAffiliateLink();

    if (!shareLink) {
      toast.error('Link not ready yet');
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: item.name,
          text: `Check out this promotion: ${item.name}`,
          url: shareLink,
        });
        return;
      }

      await navigator.clipboard.writeText(shareLink);
      toast.success('Link copied');
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Share failed:', error);
        toast.error('Unable to share link');
      }
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
                          status === 'upcoming' ? 'bg-white text-zinc-900' : 
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

                <div className="grid grid-cols-2 gap-4">
                  {/* Action Button */}
                  <button
                    onClick={() => {
                      if (allPosters.length === 0) {
                        toast.error('No poster available for this service');
                        return;
                      }
                      if (allPosters.length === 1) {
                        handleDownloadPoster(allPosters[0], `${item.name}-poster.jpg`);
                      } else {
                        setShowPosterGallery(true);
                      }
                    }}
                    disabled={allPosters.length === 0}
                    className="w-full py-4 bg-zinc-100 text-zinc-900 rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Download size={16} />
                    {allPosters.length > 1 ? `Poster (${allPosters.length})` : 'Poster'}
                  </button>

                  <button
                    onClick={handleShareLink}
                    className="w-full py-4 bg-zinc-100 text-zinc-900 rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Share2 size={16} />
                    Share Link
                  </button>
                </div>

                {/* Poster Gallery Modal */}
                {showPosterGallery && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowPosterGallery(false)}
                  >
                    <motion.div
                      initial={{ y: 60, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 60, opacity: 0 }}
                      onClick={e => e.stopPropagation()}
                      className="bg-white rounded-[2rem] p-6 w-full max-w-md"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-zinc-900 text-lg">Choose Poster</h3>
                        <button onClick={() => setShowPosterGallery(false)}
                          className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {allPosters.map((url, idx) => (
                          <div key={url}
                            onClick={() => { handleDownloadPoster(url, `${item.name}-poster-${idx + 1}.jpg`); setShowPosterGallery(false); }}
                            className="aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer border-2 border-zinc-100 hover:border-[#1580c2] transition-all active:scale-95 relative group"
                          >
                            <img src={url} alt={`Poster ${idx + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <div className="bg-white text-zinc-900 text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1">
                                <Download size={12} /> Download
                              </div>
                            </div>
                            {idx === 0 && (
                              <div className="absolute top-2 left-2 bg-[#1580c2] text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide">Primary</div>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-400 text-center">Tap a poster to download it</p>
                    </motion.div>
                  </motion.div>
                )}

                <div className="pt-4">
                  <button
                    onClick={onClose}
                    className="w-full py-4 bg-white text-zinc-900 rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all border border-zinc-200"
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