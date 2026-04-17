import React from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';

export const getServiceStatus = (service: any) => {
  if (!service.start_date && !service.end_date) return 'active';
  const now = new Date();
  const start = service.start_date ? new Date(service.start_date) : null;
  const end = service.end_date ? new Date(service.end_date) : null;
  
  if (start && now < start) return 'upcoming';
  if (end && now > end) return 'expired';
  return 'active';
};

export const ModernPromotionCard = ({ item, onClick }: { item: any, onClick: () => void }) => {
  const status = getServiceStatus(item);

  // Generate a consistent gradient based on the item ID
  const gradients = [
    'from-brand-primary to-violet-500',
    'from-emerald-500 to-white',
    'from-violet-500 to-brand-primary',
    'from-brand-primary to-violet-500',
    'from-white to-emerald-500'
  ];
  const idHash = item.id?.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) || 0;
  const gradient = gradients[idHash % gradients.length];

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative flex-shrink-0 w-64 h-80 rounded-[20px] bg-gradient-to-br ${gradient} p-6 flex flex-col justify-between shadow-2xl cursor-pointer overflow-hidden border border-violet-500`}
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-2">
          <span className="px-2 py-1 rounded-full bg-violet-500/20 backdrop-blur-md text-[8px] font-black text-zinc-900 uppercase tracking-widest border border-violet-500">
            {item.type || 'SERVICE'}
          </span>
          <span className={`px-2 py-1 rounded-full backdrop-blur-md text-[8px] font-black uppercase tracking-widest border border-violet-500 ${
            status === 'active' ? 'bg-emerald-500 text-white' : 
            status === 'upcoming' ? 'bg-white text-zinc-900' : 
            'bg-rose-50 text-rose-700'
          }`}>
            {status}
          </span>
        </div>
        {item.is_featured && <Star size={14} className="text-zinc-900" fill="currentColor" />}
      </div>
      
      {/* Subtle background glow */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white rounded-full blur-3xl" />
    </motion.div>
  );
};