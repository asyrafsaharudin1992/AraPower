import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, X, Image as ImageIcon, MessageCircle, ChevronRight, Download, Copy } from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';

interface Campaign {
  id: string;
  title: string;
  description: string;
  caption: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
}

interface AwarenessCarouselProps {
  currentUser?: any;
}

export const AwarenessCarousel: React.FC<AwarenessCarouselProps> = ({ currentUser }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveCampaigns();
  }, []);

  const fetchActiveCampaigns = async () => {
    try {
      const res = await fetch(`${window.location.origin}/api/marketing-awareness`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      
      const activeCampaigns = Array.isArray(data) 
        ? data.filter((c: any) => c.is_active) 
        : [];
      
      setCampaigns(activeCampaigns);
    } catch (error: any) {
      console.error('Error fetching campaigns:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (campaign: Campaign) => {
    try {
      const loadingToast = toast.loading('Preparing to share...');
      
      // 1. Generate referral link if staff info available
      const baseUrl = window.location.origin;
      const refCode = currentUser?.referral_code || '';
      const personalizedLink = refCode ? `${baseUrl}/?ref=${refCode}&cid=${campaign.id}` : baseUrl;
      const finalCaption = `${campaign.caption}\n\nBook here: ${personalizedLink}`;

      // 2. Fetch the image and convert to a File object
      const response = await fetch(campaign.image_url);
      const blob = await response.blob();
      const file = new File([blob], 'campaign-poster.jpg', { type: blob.type });

      // 3. Try native sharing (Mobile)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        toast.dismiss(loadingToast);
        await navigator.share({
          title: campaign.title,
          text: finalCaption,
          files: [file]
        });
      } else {
        // 4. Fallback (Desktop or unsupported browser)
        await navigator.clipboard.writeText(finalCaption);
        toast.success('Caption copied! Image download starting...', { id: loadingToast });
        
        // Trigger manual image download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `campaign-${campaign.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Sharing failed:', error);
        toast.error('Sharing failed. Please try again.');
      } else {
          toast.dismiss();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar-hide">
        {[1, 2, 3].map((i) => (
          <div key={i} className="min-width-[16rem] w-64 h-80 bg-zinc-100 rounded-[2rem] animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#1580c2]/60">Awareness Campaigns</h3>
        <span className="text-[10px] font-bold text-[#1580c2] bg-[#1580c2]/5 px-2 py-1 rounded-full">{campaigns.length} Active</span>
      </div>

      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 custom-scrollbar-hide -mx-2 px-2">
        {campaigns.map((campaign) => (
          <motion.div
            key={campaign.id}
            whileHover={{ y: -4 }}
            className="flex-none w-64 snap-center group"
          >
            <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm overflow-hidden h-full flex flex-col transition-all hover:shadow-xl hover:border-[#1580c2]/20">
              <div className="aspect-[4/5] relative overflow-hidden bg-zinc-100">
                <img 
                  src={campaign.image_url} 
                  alt={campaign.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="p-5 flex flex-col flex-1">
                <h4 className="font-black text-zinc-900 line-clamp-1 mb-2 tracking-tight group-hover:text-[#1580c2] transition-colors">{campaign.title}</h4>
                <p className="text-[10px] text-zinc-500 font-medium mb-4 line-clamp-2 leading-relaxed">
                  {campaign.description}
                </p>
                
                <button
                  onClick={() => setSelectedCampaign(campaign)}
                  className="mt-auto w-full py-3 bg-zinc-50 hover:bg-[#1580c2] hover:text-white text-zinc-400 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 group/btn"
                >
                  View Details
                  <ChevronRight size={14} className="transition-transform group-hover/btn:translate-x-1" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedCampaign && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCampaign(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
              <button 
                onClick={() => setSelectedCampaign(null)}
                className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full z-10 transition-colors backdrop-blur-md md:bg-black/5 md:text-zinc-400"
              >
                <X size={20} />
              </button>

              <div className="w-full md:w-1/2 aspect-[4/5] md:aspect-auto relative bg-zinc-100">
                <img 
                  src={selectedCampaign.image_url} 
                  alt={selectedCampaign.title} 
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="w-full md:w-1/2 p-8 overflow-y-auto flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-[#1580c2]/10 p-2 rounded-xl text-[#1580c2]">
                    <Share2 size={18} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#1580c2]/40">Marketing Tool</span>
                </div>

                <h3 className="text-2xl font-black tracking-tighter text-zinc-900 leading-tight mb-3">
                  {selectedCampaign.title}
                </h3>
                
                <p className="text-sm font-medium text-zinc-500 mb-6 leading-relaxed">
                  {selectedCampaign.description}
                </p>

                <div className="space-y-4 mb-8">
                  <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageCircle size={16} className="text-[#1580c2]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#1580c2]">Copy Caption</span>
                      </div>
                      <button 
                        onClick={() => {
                          const baseUrl = window.location.origin;
                          const refCode = currentUser?.referral_code || '';
                          const personalizedLink = refCode ? `${baseUrl}/?ref=${refCode}&cid=${selectedCampaign.id}` : baseUrl;
                          const finalCaption = `${selectedCampaign.caption}\n\nBook here: ${personalizedLink}`;
                          navigator.clipboard.writeText(finalCaption);
                          toast.success('Caption + Link copied!');
                        }}
                        className="p-1 px-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-zinc-200"
                      >
                        <Copy size={12} className="text-zinc-400" />
                      </button>
                    </div>
                    <p className="text-xs font-medium text-zinc-600 leading-relaxed italic line-clamp-4">
                      "{selectedCampaign.caption}"
                    </p>
                  </div>
                </div>

                <div className="mt-auto grid grid-cols-1 gap-3">
                  <button
                    onClick={() => handleShare(selectedCampaign)}
                    className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-zinc-200 hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    <Share2 size={16} />
                    Magic Share Now
                  </button>
                  <button
                    onClick={async () => {
                      const res = await fetch(selectedCampaign.image_url);
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `campaign-poster.jpg`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full py-4 bg-zinc-50 text-zinc-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    Download Poster
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
