import React, { useRef, useEffect } from 'react';
import { Search, Play, Radio, Globe } from 'lucide-react';

const IPTV_CATEGORIES = [
  { id: 'news', name: '📰 Tin Tức' }, { id: 'entertainment', name: '🎭 Giải Trí' },
  { id: 'sports', name: '⚽ Thể Thao' }, { id: 'kids', name: '👶 Thiếu Nhi' },
  { id: 'music', name: '🎵 Âm Nhạc' }, { id: 'education', name: '📚 Giáo Dục' }
];
const IPTV_COUNTRIES = [
  { id: 'VN', name: '🇻🇳 Việt Nam' }, { id: 'US', name: '🇺🇸 Mỹ' },
  { id: 'KR', name: '🇰🇷 Hàn Quốc' }, { id: 'JP', name: '🇯🇵 Nhật Bản' },
  { id: 'TH', name: '🇹🇭 Thái Lan' }, { id: 'CN', name: '🇨🇳 Trung Quốc' }
];

export default function IPTVTab({
  iptvTab, setIptvTab, iptvCategory, setIptvCategory, iptvCountry, setIptvCountry,
  iptvSearch, setIptvSearch, iptvChannels, selectedChannel, setSelectedChannel,
  fetchIPTV, iptvVideoRef
}) {
  const safeChannels = iptvChannels || [];

  useEffect(() => {
    if (!selectedChannel && iptvVideoRef.current) {
      iptvVideoRef.current.pause();
      iptvVideoRef.current.removeAttribute('src');
      iptvVideoRef.current.load();
    }
  }, [selectedChannel]);

  useEffect(() => {
    return () => {
      if (iptvVideoRef.current) {
        iptvVideoRef.current.pause();
        iptvVideoRef.current.removeAttribute('src');
      }
    };
  }, []);

  const handleStop = () => {
    if (iptvVideoRef.current) {
      iptvVideoRef.current.pause();
      iptvVideoRef.current.removeAttribute('src');
      iptvVideoRef.current.load();
    }
    setSelectedChannel(null);
  };

  const handleSelectChannel = (ch) => {
    setSelectedChannel(ch);
    if (iptvVideoRef.current && ch.url) {
      iptvVideoRef.current.src = ch.url;
      iptvVideoRef.current.load();
      iptvVideoRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="flex h-full">
      {/* Channel List */}
      <div className="w-1/3 border-r border-white/5 bg-[#131417] flex flex-col">
        <div className="p-3 border-b border-white/5">
          <div className="flex gap-1 mb-2">
            <button onClick={() => { setIptvTab('category'); fetchIPTV(iptvCategory); }}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${iptvTab === 'category' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-white'}`}>
              <Radio size={11} className="inline mr-1" /> Danh mục
            </button>
            <button onClick={() => { setIptvTab('country'); fetchIPTV(null, iptvCountry); }}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${iptvTab === 'country' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'text-slate-400 hover:text-white'}`}>
              <Globe size={11} className="inline mr-1" /> Quốc gia
            </button>
          </div>
          {iptvTab === 'category' ? (
            <select value={iptvCategory} onChange={e => { setIptvCategory(e.target.value); fetchIPTV(e.target.value); }}
              className="w-full bg-[#1e1f20] text-xs text-slate-200 border border-white/10 rounded-lg px-2 py-1.5 outline-none">
              {IPTV_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <select value={iptvCountry} onChange={e => { setIptvCountry(e.target.value); fetchIPTV(null, e.target.value); }}
              className="w-full bg-[#1e1f20] text-xs text-slate-200 border border-white/10 rounded-lg px-2 py-1.5 outline-none">
              {IPTV_COUNTRIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <div className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded-lg bg-[#1e1f20] border border-white/5">
            <Search size={12} className="text-slate-500" />
            <input type="text" value={iptvSearch} onChange={e => setIptvSearch(e.target.value)}
              placeholder="Tìm kênh..." className="w-full bg-transparent text-[11px] text-slate-200 placeholder-slate-500 outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {safeChannels.filter(ch => ch.name && ch.name.toLowerCase().includes(iptvSearch.toLowerCase())).map(ch => (
            <button key={ch.name} onClick={() => handleSelectChannel(ch)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${selectedChannel?.name === ch.name ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-300 hover:bg-white/5'}`}>
              <span className="font-medium">{ch.name}</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">{ch.category || ch.country || ''}</span>
            </button>
          ))}
          {safeChannels.length === 0 && <p className="text-center text-slate-500 text-xs mt-8">Không có kênh nào</p>}
        </div>
      </div>
      {/* Video Player */}
      <div className="flex-1 bg-black flex flex-col">
        <div className="p-3 border-b border-white/5 bg-[#131417] flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">{selectedChannel?.name || 'Chọn kênh'}</span>
          <button onClick={handleStop} className="text-[10px] text-slate-500 hover:text-rose-400">Dừng</button>
        </div>
        <div className="flex-1 flex items-center justify-center bg-black">
          <video ref={iptvVideoRef} controls className="w-full h-full max-h-[80vh]" />
        </div>
      </div>
    </div>
  );
}
