import { API_BASE } from '../config';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Tv, Globe, Play, Radio, Search } from 'lucide-react';
import { ALL_IPTV_COUNTRIES } from '../data/iptvCountries.js';

const IPTV_CATEGORIES = [
  { id: 'news', name: '📰 Tin Tức 24/7' },
  { id: 'animation', name: '🦄 Hoạt Hình / Anime' },
  { id: 'movies', name: '🍿 Phim Điện Ảnh' },
  { id: 'sports', name: '⚽ Thể Thao Live' },
  { id: 'entertainment', name: '🎭 Giải Trí' },
  { id: 'music', name: '🎵 Âm Nhạc' },
  { id: 'documentary', name: '🎬 Tài Liệu' },
  { id: 'kids', name: '🧸 Thiếu Nhi' },
  { id: 'general', name: '📡 Tổng Hợp' },
  { id: 'education', name: '📚 Giáo Dục' },
  { id: 'religion', name: '🕌 Tôn Giáo' },
  { id: 'science', name: '🔬 Khoa Học' },
  { id: 'business', name: '💼 Kinh Doanh' },
  { id: 'shop', name: '🛒 Mua Sắm' },
];

const POPULAR_COUNTRIES = ['VN', 'US', 'GB', 'KR', 'JP', 'CN', 'TH', 'FR', 'DE', 'IN', 'RU', 'BR', 'AU', 'CA', 'HK', 'TW'];

const getFlagUrl = (code) => {
  if (!code || code.length !== 2) return null;
  return `https://flagcdn.com/24x18/${code.toLowerCase()}.png`;
};

const FlagImg = ({ code, size = 18, className = '' }) => {
  const url = getFlagUrl(code);
  if (!url) return <span className={className}>🌍</span>;
  return (
    <img
      src={url}
      alt={code}
      width={size}
      height={Math.round(size * 0.75)}
      className={`inline-block shrink-0 ${className}`}
      style={{ imageRendering: 'auto' }}
      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'inline'); }}
    />
  );
};

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

  // Filter states
  const [countrySearch, setCountrySearch] = useState('');

  // Sidebar width state
  const [sidebarWidth, setSidebarWidth] = useState(210);

  // Subtitle state
  const [subtitleText, setSubtitleText] = useState('');
  const [subtitleInterim, setSubtitleInterim] = useState('');
  const [subtitleStatus, setSubtitleStatus] = useState('idle'); // idle | listening | error | unsupported
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const sendingRef = useRef(false);

  const iptvSubtitleOnRef = useRef(iptvSubtitleOn);

  // Filtered countries
  const filteredCountries = useMemo(() => {
    if (!countrySearch) return ALL_IPTV_COUNTRIES;
    const q = countrySearch.toLowerCase().trim();
    return ALL_IPTV_COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  // Sync ref with state
  useEffect(() => {
    iptvSubtitleOnRef.current = iptvSubtitleOn;
  }, [iptvSubtitleOn]);

  // ===== LIVE CAPTION: Groq Whisper (backend) + dịch sang tiếng Việt =====
  useEffect(() => {
    if (!iptvSubtitleOn) {
      // Stop capture
      if (mediaRecorderRef.current) {
        try { mediaRecorderRef.current.stop(); } catch(e) {}
        mediaRecorderRef.current = null;
      }
      if (audioStreamRef.current) {
        try { audioStreamRef.current.getTracks().forEach(t => t.stop()); } catch(e) {}
        audioStreamRef.current = null;
      }
      setSubtitleText('');
      setSubtitleInterim('');
      setSubtitleStatus('idle');
      return;
    }

    // Lấy audio trực tiếp từ video element (không cần mic, nghe tiếng đang phát)
    const video = iptvVideoRef?.current;
    if (!video) return;

    let cancelled = false;
    let stream = null;
    let recorder = null;

    const startRecorder = () => {
      try {
        stream = video.captureStream();
        const audioTracks = stream.getAudioTracks();
        if (!audioTracks.length) {
          setSubtitleStatus('unsupported');
          return;
        }
        audioStreamRef.current = stream;

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '');
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;
        setSubtitleStatus('listening');

        recorder.ondataavailable = (e) => {
          if (cancelled || !e.data || e.data.size < 3000) return;
          if (sendingRef.current) return; // đang gửi chunk trước, bỏ qua để tránh trùng
          sendingRef.current = true;

          const formData = new FormData();
          formData.append('audio', e.data, 'chunk.webm');
          formData.append('lang', 'auto');

          fetch(`${API_BASE}/services/transcribe`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('rexi_token') || ''}` },
            body: formData,
            credentials: 'include',
          })
            .then(r => r.json())
            .then(data => {
              sendingRef.current = false;
              if (data?.success && data.text) {
                setSubtitleText(prev => {
                  const newText = (prev + ' ' + data.text).trim();
                  return newText.length > 300 ? data.text.trim() : newText.slice(-300);
                });
              }
            })
            .catch(err => {
              sendingRef.current = false;
              console.warn('[Caption] fetch error:', err);
            });
        };

        recorder.onerror = () => setSubtitleStatus('error');
        recorder.onstop = () => {
          if (cancelled) return;
          if (iptvSubtitleOnRef.current) {
            try { startRecorder(); } catch(e) {}
          }
        };
        // Ghi liên tục, cứ ~5s phát chunk
        recorder.start(5000);

      } catch (e) {
        console.error('[Caption] Failed to start:', e);
        setSubtitleStatus('error');
      }
    };

    startRecorder();

    return () => {
      cancelled = true;
      if (recorder) { try { recorder.stop(); } catch(e) {} }
      if (stream) { try { stream.getTracks().forEach(t => t.stop()); } catch(e) {} }
      mediaRecorderRef.current = null;
      audioStreamRef.current = null;
    };
  }, [iptvSubtitleOn, iptvVideoRef]);

  const handleMouseDown = (e) => {
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMouseMove = (e) => {
      const newWidth = Math.max(150, Math.min(480, startWidth + (e.clientX - startX)));
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
      {/* Danh sách kênh */}
      <div
        style={{ width: sidebarWidth, minWidth: 150, maxWidth: 480 }}
        className="flex flex-col border-r border-white/5 bg-[#131417] overflow-hidden"
      >
        <div className="p-3 border-b border-white/5">
          <h3 className="text-xs font-bold text-white flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Tv size={14} className="text-rose-400" /> IPTV ({safeChannels.length})
            </span>
          </h3>
          <div className="flex gap-1 bg-[#131417] rounded-lg p-0.5 mt-2">
            <button onClick={() => { setIptvTab?.('category'); setIptvSearch?.(''); fetchIPTV?.(iptvCategory); }} className={`flex-1 py-1 rounded text-[10px] font-medium transition-all ${iptvTab === 'category' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-500 hover:text-white'}`}>
              <Globe size={10} className="inline mr-1" />Thể Loại
            </button>
            <button onClick={() => { setIptvTab?.('country'); setIptvSearch?.(''); fetchIPTV?.(iptvCountry); }} className={`flex-1 py-1 rounded text-[10px] font-medium transition-all ${iptvTab === 'country' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-500 hover:text-white'}`}>
              🌍 Quốc Gia
            </button>
          </div>

          {/* Category filter buttons */}
          {iptvTab === 'category' && (
            <div className="mt-2 max-h-[160px] overflow-y-auto space-y-0.5 scrollbar-thin">
              {IPTV_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setIptvCategory?.(cat.id); fetchIPTV?.(cat.id); }}
                  className={`w-full text-left px-2 py-1 rounded text-[10px] font-medium transition-all ${
                    iptvCategory === cat.id ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Country filter */}
          {iptvTab === 'country' && (
            <div className="mt-2">
              <div className="relative">
                <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={countrySearch}
                  onChange={e => setCountrySearch(e.target.value)}
                  placeholder="Tìm quốc gia..."
                  className="w-full pl-6 pr-2 py-1 bg-[#1a1b24] border border-white/5 rounded text-[10px] text-white placeholder-slate-600 outline-none focus:border-rose-500/30"
                />
              </div>
              {/* Popular quick picks */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {POPULAR_COUNTRIES.map(code => {
                  const c = ALL_IPTV_COUNTRIES.find(x => x.code === code);
                  if (!c) return null;
                  return (
                    <button
                      key={code}
                      onClick={() => { setIptvCountry?.(code); setCountrySearch(''); fetchIPTV?.(null, code); }}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all flex items-center gap-1 ${
                        iptvCountry === code ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-white bg-white/5'
                      }`}
                      title={c.name}
                    >
                      <FlagImg code={code} size={14} />
                      <span>{code}</span>
                    </button>
                  );
                })}
              </div>
              {/* Country list */}
              <div className="mt-1 max-h-[200px] overflow-y-auto space-y-0.5 scrollbar-thin">
                {/* Reset / All button */}
                <button
                  onClick={() => { setIptvCountry?.(null); setCountrySearch(''); fetchIPTV?.(iptvCategory || 'news'); }}
                  className={`w-full text-left px-2 py-0.5 rounded text-[9px] font-medium transition-all ${
                    !iptvCountry ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  🌍 Tất cả ({ALL_IPTV_COUNTRIES.length} quốc gia)
                </button>
                <div className="border-t border-white/5 my-0.5" />
                {filteredCountries.map(c => (
                  <button
                    key={c.code}
                    onClick={() => { setIptvCountry?.(c.code); setCountrySearch(''); fetchIPTV?.(null, c.code); }}
                    className={`w-full text-left px-2 py-0.5 rounded text-[9px] font-medium transition-all flex items-center gap-1.5 ${
                      iptvCountry === c.code ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <FlagImg code={c.code} size={14} />
                    <span className="truncate">{c.name}</span>
                    <span className="text-[8px] text-slate-600 ml-auto shrink-0">{c.code}</span>
                  </button>
                ))}
                {filteredCountries.length === 0 && (
                  <div className="text-[9px] text-slate-600 text-center py-2">Không tìm thấy quốc gia</div>
                )}
              </div>
            </div>
          )}

          <input
            type="text"
            value={iptvSearch || ''}
            onChange={e => setIptvSearch?.(e.target.value)}
            placeholder="Tìm kênh..."
            className="w-full mt-2 px-2 py-1.5 bg-[#1a1b24] border border-white/5 rounded-lg text-[10px] text-white placeholder-slate-600 outline-none focus:border-rose-500/30"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {safeChannels.length === 0 && (
            <div className="text-[10px] text-slate-600 text-center py-8">
              Chọn thể loại hoặc quốc gia để xem kênh
            </div>
          )}
          {safeChannels.map((ch, i) => (
            <button
              key={ch.url || i}
              onClick={() => setSelectedChannel?.(ch)}
              className={`w-full text-left px-3 py-2 text-[10px] flex items-center gap-2 hover:bg-white/5 transition-colors ${
                selectedChannel?.url === ch.url ? 'bg-rose-500/10 border-r-2 border-rose-400' : ''
              }`}
            >
              {ch.logo ? (
                <img src={ch.logo} alt="" className="w-4 h-4 rounded object-contain shrink-0" onError={e => { e.target.style.display = 'none' }} />
              ) : (
                <Play size={11} className={`shrink-0 ${selectedChannel?.url === ch.url ? 'text-rose-400 fill-rose-400' : 'text-slate-500'}`} />
              )}
              <span className="truncate flex-1">{ch.name}</span>
              {ch.status && (
                <span className={`text-[8px] px-1 py-0.5 rounded-full shrink-0 ${
                  ch.status === 'online' ? 'bg-emerald-500/20 text-emerald-400' :
                  ch.status === 'offline' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'
                }`}>
                  {ch.status === 'online' ? '●' : ch.status === 'offline' ? '○' : '?'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Resizer */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1.5 h-full cursor-col-resize hover:bg-rose-500/30 active:bg-rose-500 transition-colors shrink-0 z-10 flex items-center justify-center group"
        title="Kéo để co dãn"
      >
        <div className="w-0.5 h-8 bg-white/10 group-hover:bg-rose-300 rounded-full" />
      </div>

      {/* Video player */}
      <div className="flex-1 h-full bg-black flex flex-col min-w-0">
        {selectedChannel && (
          <div className="px-3 py-2 bg-[#181920] border-b border-white/5 flex items-center gap-2">
            <Radio size={13} className="text-rose-400 animate-pulse shrink-0" />
            <span className="text-xs font-medium text-white truncate">{selectedChannel.name}</span>
            <button
              onClick={() => setIptvSubtitleOn?.(!iptvSubtitleOn)}
              className={`ml-auto px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1.5 transition-all shrink-0 min-w-[80px] justify-center ${
                iptvSubtitleOn ? 'bg-rose-500/80 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
              }`}
              title={iptvSubtitleOn ? 'Tắt phụ đề AI' : 'Bật phụ đề AI'}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${iptvSubtitleOn ? 'bg-white animate-pulse' : 'bg-white/20'}`}></span>
              <span className="truncate">Phụ Đề</span>
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

          {/* ===== SUBTITLE TEXT OVERLAY ===== */}
          {iptvSubtitleOn && (subtitleText || subtitleInterim) && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 max-w-[80%] z-20 pointer-events-none">
              <div className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
                {subtitleText && (
                  <p className="text-sm text-white font-medium text-center leading-relaxed">
                    {subtitleText}
                  </p>
                )}
                {subtitleInterim && (
                  <p className="text-sm text-white/50 text-center leading-relaxed italic">
                    {subtitleInterim}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Subtitle status indicator */}
          {iptvSubtitleOn && (
            <div className="absolute top-3 left-3 z-20">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-medium backdrop-blur-sm ${
                subtitleStatus === 'listening' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                subtitleStatus === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                subtitleStatus === 'unsupported' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                'bg-white/10 text-white/50 border border-white/10'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  subtitleStatus === 'listening' ? 'bg-emerald-400 animate-pulse' :
                  subtitleStatus === 'error' ? 'bg-red-400' :
                  subtitleStatus === 'unsupported' ? 'bg-yellow-400' :
                  'bg-white/30'
                }`}></span>
                {subtitleStatus === 'listening' ? 'Đang nghe...' :
                 subtitleStatus === 'error' ? 'Lỗi microphone' :
                 subtitleStatus === 'unsupported' ? 'Trình duyệt không hỗ trợ' :
                 'Đang khởi động...'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
