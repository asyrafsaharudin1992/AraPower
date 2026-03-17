import React from 'react';
import { motion } from 'motion/react';
import { Service } from '../types';

interface PromotionsCarouselProps {
  items: Service[];
  onClick: (item: Service) => void;
}

export const PromotionsCarousel = ({ items, onClick }: PromotionsCarouselProps) => {
  return (
    <div className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory custom-scrollbar pb-4">
      {items.map((item) => (
        <div 
          key={item.id} 
          className="w-[70vw] flex-shrink-0 snap-start bg-eggshell cursor-pointer"
          onClick={() => onClick(item)}
        >
          <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-md">
            <img 
              src={item.image_url || 'https://picsum.photos/seed/promo/300/400'} 
              alt={item.name} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer" 
            />
          </div>
          <div className="mt-3 text-left px-1">
            <h3 className="text-[16px] font-bold text-twilight-indigo uppercase leading-[1.2]">
              {item.name}
            </h3>
            <p className="text-[14px] text-twilight-indigo/80 font-medium uppercase leading-[1.2] mt-1">
              {item.promo_price ? `RM${item.promo_price}` : `RM${item.base_price || 0}`} Incentive
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
