import React, { useState, useEffect } from 'react';
import { Tv, Globe, Play, Radio, GripVertical } from 'lucide-react';

const IPTV_CATEGORIES = [
  { id: 'news', name: '📰 Tin Tức 24/7' },
  { id: 'animation', name: '🦄 Hoạt Hình / Anime' },
  { id: 'movies', name: '🍿 Phim Điện Ảnh' },
  { id: 'sports', name: '⚽ Thể Thao Live' },
  { id: 'entertainment', name: '🎭 Giải Trí' },
  { id: 'music', name: '🎵 Âm Nhạc' },
];

const IPTV_COUNTRIES = [
  { id: 'VN', name: '🇻🇳 Việt Nam' },
  { id: 'US', name: '🇺🇸 United States' },
  { id: 'GB', name: '🇬🇧 United Kingdom' },
  { id: 'KR', name: '🇰🇷 South Korea' },
  { id: 'JP', name: '🇯🇵 Japan' },
  { id: 'CN', name: '🇨🇳 China' },
  { id: 'TH', name: '🇹🇭 Thailand' },
  { id: 'FR', name: '🇫🇷 France' },
  { id: 'DE', name: '🇩🇪 Germany' },
  { id: 'IN', name: '🇮🇳 India' },
];

export default function IPTVTab({
  iptvTab, setIptvTab,
  iptvCategory, setIptvCategory,
  iptvCountry, setIptvCountry,
  iptvSearch, setIptvSearch,
  iptvChannels, selectedChannel, setSelectedChannel,
  iptvSubtitleOn, setIptvSubtitleOn,
  fetchIPTV, iptvVideoRef,
}) {
  const safeChannels = iptvChannels || [];

  // Sidebar width state (mặc định 210px gọn gàng, co dãn từ 150px - 480px)
  const [sidebarWidth, setSidebarWidth] = useState(210);

  const handleMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(150, Math.min(480, startWidth + delta));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    if (!selectedChannel && iptvVideoRef?.current) {
      iptvVideoRef.current.pause();
      iptvVideoRef.current.removeAttribute('src');
      iptvVideoRef.current.load();
    }
  }, [selectedChannel, iptvVideoRef]);

  useEffect(() => {
    return () => {
      if (iptvVideoRef?.current) {
        iptvVideoRef.current.pause();
        iptvVideoRef.current.removeAttribute('src');
      }
    };
  }, [iptvVideoRef]);

  return (
    <div className="flex h-full w-full select-none">
      {/* Danh sách kênh (Gọn gàng + Có thể co dãn bằng cách kéo rê) */}
      <div
        style={{ width: `${sidebarWidth}px` }}
        className="h-full border-r border-white/5 bg-[#181920] flex flex-col shrink-0 relative transition-[width] duration-75"
      >
        <div className="p-2.5 border-b border-white/5 space-y-2">
          <h3 className="text-xs font-bold text-white flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Tv size={14} className="text-rose-400" /> IPTV ({safeChannels.length})
            </span>
            <span className="text-[10px] text-slate-500 font-normal">Kéo mép để co dãn</span>
          </h3>

          {/* Tab Thể Loại / Quốc Gia */}
          <div className="flex gap-1 bg-[#131417] rounded-lg p-0.5">
            <button
              onClick={() => { setIptvTab?.('category'); fetchIPTV?.(iptvCategory); }}
              className={`flex-1 py-1 rounded text-[10px] font-medium transition-all ${
                iptvTab === 'category' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv size={10} className="inline mr-1" />Thể Loại
            </button>
            <button
              onClick={() => { setIptvTab?.('country'); fetchIPTV?.(null, iptvCountry); }}
              className={`flex-1 py-1 rounded text-[10px] font-medium transition-all ${
                iptvTab === 'country' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe size={10} className="inline mr-1" />Quốc Gia
            </button>
          </div>

          {/* Dropdown chọn */}
          {iptvTab === 'category' ? (
            <select
              value={iptvCategory}
              onChange={e => { setIptvCategory?.(e.target.value); fetchIPTV?.(e.target.value); }}
              className="w-full bg-[#131417] text-[11px] text-slate-300 border border-white/10 rounded-lg p-1.5 outline-none cursor-pointer"
            >
              {IPTV_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : (
            <select
              value={iptvCountry}
              onChange={e => { setIptvCountry?.(e.target.value); fetchIPTV?.(null, e.target.value); }}
              className="w-full bg-[#131417] text-[11px] text-slate-300 border border-white/10 rounded-lg p-1.5 outline-none cursor-pointer"
            >
              {IPTV_COUNTRIES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Tìm kênh */}
          <input
            type="text"
            value={iptvSearch}
            onChange={e => setIptvSearch?.(e.target.value)}
            placeholder="🔍 Tìm kênh..."
            className="w-full bg-[#131417] text-[11px] text-slate-300 border border-white/10 rounded-lg px-2.5 py-1 outline-none"
          />
        </div>

        {/* Danh sách kênh */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {safeChannels
            .filter(ch => ch.name?.toLowerCase().includes((iptvSearch || '').toLowerCase()))
            .map((ch, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedChannel?.(ch)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-[11px] transition-all ${
                  selectedChannel?.url === ch.url
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {ch.logo ? (
                  <img src={ch.logo} alt="" className="w-5 h-5 rounded object-contain shrink-0 bg-white/5" onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <Play size={11} className={selectedChannel?.url === ch.url ? 'text-rose-400 fill-rose-400 shrink-0' : 'text-slate-500 shrink-0'} />
                )}
                <span className="truncate flex-1">{ch.name}</span>
              </button>
            ))}
          {safeChannels.length === 0 && (
            <p className="text-center text-slate-500 text-xs mt-8">Không có kênh nào</p>
          )}
        </div>
      </div>

      {/* Resizer Handle Divider - Thanh kéo rê điều chỉnh độ rộng */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1.5 h-full cursor-col-resize hover:bg-cyan-500/50 active:bg-cyan-500 transition-colors shrink-0 z-10 flex items-center justify-center group"
        title="Kéo chuột để co dãn chiều rộng danh sách kênh"
      >
        <div className="w-0.5 h-8 bg-white/20 group-hover:bg-cyan-300 rounded-full" />
      </div>

      {/* Trình phát video */}
      <div className="flex-1 h-full bg-black flex flex-col min-w-0">
        {selectedChannel && (
          <div className="px-3 py-2 bg-[#181920] border-b border-white/5 flex items-center gap-2">
            <Radio size={13} className="text-rose-400 animate-pulse shrink-0" />
            <span className="text-xs font-medium text-white truncate">{selectedChannel.name}</span>
            <span className="ml-auto text-[10px] text-slate-500 truncate max-w-[200px] hidden sm:inline">{selectedChannel.url}</span>

            {/* Nút Bật Phụ Đề AI */}
            <button
              onClick={() => setIptvSubtitleOn?.(!iptvSubtitleOn)}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 transition-all shrink-0 ${
                iptvSubtitleOn ? 'bg-rose-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
              {iptvSubtitleOn ? 'Tắt Phụ Đề' : 'Bật Phụ Đề AI'}
            </button>
          </div>
        )}

        <div className="flex-1 relative bg-black flex items-center justify-center">
          {selectedChannel && !selectedChannel.url?.includes('youtube') ? (
            <video
              ref={iptvVideoRef}
              className="w-full h-full object-contain bg-black"
              controls
              autoPlay
              playsInline
            />
          ) : selectedChannel?.url?.includes('youtube') ? (
            <iframe
              src={`https://www.youtube.com/embed/${selectedChannel.url.split('v=')[1]?.split('&')[0] || ''}?autoplay=1`}
              className="w-full h-full border-none"
              allowFullScreen
              allow="autoplay"
              title="YouTube Stream"
            />
          ) : (
            <div className="flex-1 h-full flex items-center justify-center text-slate-500 text-xs">
              <div className="text-center space-y-2">
                <Tv size={40} className="mx-auto text-slate-600" />
                <p>Chọn kênh để phát trực tiếp</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
