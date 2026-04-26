import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  MousePointerClick, 
  Users, 
  TrendingUp, 
  Megaphone,
  BarChart3,
  ArrowUpRight,
  Target
} from 'lucide-react';
import { supabase } from '../supabase';

interface PerformanceUIProps {
  currentUser: any;
  referrals: any[];
}

export const PerformanceUI: React.FC<PerformanceUIProps> = ({ currentUser, referrals }) => {
  const [performanceStats, setPerformanceStats] = useState({ clicks: 0, referrals: 0, conversionRate: 0 });
  const [linkStats, setLinkStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      if (!currentUser.referral_code) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('booking_analytics')
          .select('*')
          .eq('referral_code', currentUser.referral_code);

        if (!error && data) {
          const clicks = data.filter(e => e.event_type === 'clicked_tempah').length;
          const successfulRefs = referrals.filter(r => r.status === 'payment_made').length;
          const rate = clicks > 0 ? (successfulRefs / clicks) * 100 : 0;
          
          setPerformanceStats({
            clicks,
            referrals: successfulRefs,
            conversionRate: rate
          });

          // Grouping logic for breakdown
          const serviceGroup: Record<string, any> = {};
          
          referrals.forEach(ref => {
            const name = ref.service_name || 'General Referral';
            if (!serviceGroup[name]) {
              serviceGroup[name] = { serviceName: name, clicks: 0, referrals: 0 };
            }
            if (ref.status === 'payment_made') {
              serviceGroup[name].referrals++;
            }
          });

          data.forEach(event => {
            if (event.event_type === 'clicked_tempah') {
              const name = event.service_name || 'General Link';
              if (!serviceGroup[name]) {
                serviceGroup[name] = { serviceName: name, clicks: 0, referrals: 0 };
              }
              serviceGroup[name].clicks++;
            }
          });

          const finalStats = Object.values(serviceGroup)
            .map(s => ({
              ...s,
              conversionRate: s.clicks > 0 ? (s.referrals / s.clicks) * 100 : 0
            }))
            .sort((a, b) => b.clicks - a.clicks);
          
          setLinkStats(finalStats);
        }
      } catch (err) {
        console.error("Performance Loading Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerformanceData();
  }, [currentUser.referral_code, referrals]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">Performance Analytics</h2>
          <p className="text-sm text-zinc-500 font-medium">Track your reach and conversion across all campaigns</p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Syncing Live Data</span>
          </div>
        )}
      </div>

      {/* Main Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-black/5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <MousePointerClick size={80} />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <MousePointerClick size={24} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Clicks</p>
          </div>
          <p className="text-5xl font-black text-zinc-900 mb-2">{performanceStats.clicks}</p>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
            <ArrowUpRight size={14} />
            <span>Across all links</span>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-black/5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <Users size={80} />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <Users size={24} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Successful Referrals</p>
          </div>
          <p className="text-5xl font-black text-zinc-900 mb-2">{performanceStats.referrals}</p>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
            <Target size={14} />
            <span>Target achieved</span>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-black/5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <TrendingUp size={80} />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600">
              <TrendingUp size={24} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Avg. Conversion</p>
          </div>
          <p className="text-5xl font-black text-zinc-900 mb-2">{performanceStats.conversionRate.toFixed(1)}%</p>
          <div className="flex items-center gap-2 text-violet-600 font-bold text-xs">
            <BarChart3 size={14} />
            <span>Efficiency score</span>
          </div>
        </div>
      </div>

      {/* Breakdown List */}
      <div className="bg-white p-8 rounded-[3rem] border border-black/5 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black tracking-tighter text-zinc-900">Campaign Breakdown</h3>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Performance per Service</p>
          </div>
          <div className="px-4 py-2 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Real-time Sync</span>
          </div>
        </div>

        <div className="space-y-4">
          {linkStats.length > 0 ? (
            linkStats.map((link, idx) => (
              <div key={idx} className="group flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-zinc-50 rounded-[2rem] border border-transparent hover:border-blue-500/20 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
                <div className="flex items-center gap-5 mb-4 sm:mb-0">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 font-black text-lg shadow-sm ring-1 ring-zinc-100 group-hover:scale-110 transition-transform">
                    {idx + 1}
                  </div>
                  <div>
                    <span className="text-base font-black text-zinc-900 block mb-1 group-hover:text-blue-600 transition-colors">{link.serviceName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                        <MousePointerClick size={10} /> {link.clicks} Clicks
                      </span>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                        <Users size={10} /> {link.referrals} Goals
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Conversion</p>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-zinc-200 rounded-full overflow-hidden hidden sm:block">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{ width: `${Math.min(link.conversionRate * 5, 100)}%` }} 
                        />
                      </div>
                      <span className={`text-lg font-black ${link.conversionRate > 5 ? 'text-emerald-600' : 'text-zinc-900'}`}>
                        {link.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-zinc-50 rounded-[3rem] border border-zinc-200 border-dashed">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ring-1 ring-zinc-100">
                <Megaphone size={32} className="text-zinc-300" />
              </div>
              <h4 className="text-lg font-black text-zinc-900 mb-2">No campaign data recorded</h4>
              <p className="text-xs font-medium text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
                You haven't shared any specific campaigns yet. Head to the Awareness Campaigns tab to start sharing your referral links!
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
