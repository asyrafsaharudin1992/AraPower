import React from 'react';
import { motion } from 'motion/react';
import { Service } from '../types';

interface PromotionsCarouselProps {
  items: Service[];
  onClick: (item: Service) => void;
  size?: 'large' | 'small';
}

export const PromotionsCarousel = ({ items, onClick, size = 'large' }: PromotionsCarouselProps) => {
  const displayItems = items.length > 0 ? items : [
    { id: -1, name: 'Coming Soon', base_price: 0, image_url: 'mockup' } as any,
    { id: -2, name: 'Coming Soon', base_price: 0, image_url: 'mockup' } as any,
    { id: -3, name: 'Coming Soon', base_price: 0, image_url: 'mockup' } as any,
  ];

  return (
    <div className={`category-scroll-wrapper ${size === 'small' ? 'gap-2' : 'gap-4'}`}>
      {displayItems.map((item, index) => {
        const isMockup = item.id < 0;
        const mockupColors = ['bg-zinc-200', 'bg-zinc-100', 'bg-zinc-50'];
        const mockupColor = mockupColors[index % mockupColors.length];

        return (
          <div 
            key={item.id} 
            className={`${size === 'small' ? 'w-[45vw]' : 'w-[70vw]'} flex-shrink-0 snap-start bg-eggshell ${isMockup ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
            onClick={() => !isMockup && onClick(item)}
          >
            <div className={`${size === 'small' ? 'aspect-[1/1]' : 'aspect-[3/4]'} rounded-xl overflow-hidden shadow-md ${isMockup ? mockupColor : ''}`}>
              {!isMockup && (
                <img 
                  src={item.image_url || 'https://picsum.photos/seed/promo/300/400'} 
                  alt={item.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              )}
            </div>
            <div className={`mt-3 text-left px-1 ${size === 'small' ? 'mt-1' : 'mt-3'}`}>
              <h3 className={`${size === 'small' ? 'text-[12px]' : 'text-[16px]'} font-bold text-twilight-indigo uppercase leading-[1.2]`}>
                {item.name}
              </h3>
              <p className={`${size === 'small' ? 'text-[10px]' : 'text-[14px]'} text-twilight-indigo/80 font-medium uppercase leading-[1.2] mt-1`}>
                {isMockup ? 'Stay Tuned' : `${item.promo_price ? `RM${item.promo_price}` : `RM${item.base_price || 0}`} Incentive`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
