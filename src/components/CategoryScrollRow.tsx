import React from 'react';
import { Zap } from 'lucide-react';
import { Service } from '../types';

export const CategoryScrollRow = ({ title, services, onClick }: { title: string, services: Service[], onClick: (s: Service) => void }) => {
  return (
    <div className="mb-8">
      <h3 className="text-twilight-indigo font-bold text-lg mb-4 px-4">{title}</h3>
      <div className="category-scroll-wrapper">
        {services.map(service => (
          <div key={service.id} className="service-card-small" onClick={() => onClick(service)}>
            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-zinc-200 mb-2">
              {service.image_url ? (
                <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400">
                  <Zap size={24} />
                </div>
              )}
            </div>
            <h4 className="text-[14px] font-bold text-twilight-indigo leading-tight uppercase truncate">{service.name}</h4>
            <p className="text-[12px] font-bold text-twilight-indigo leading-tight uppercase">
              {service.promo_price ? `RM${service.promo_price}` : `RM${service.base_price || 0}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};