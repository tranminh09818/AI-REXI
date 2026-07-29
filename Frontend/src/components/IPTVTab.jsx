import React, { useState, useEffect, useRef } from 'react';
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

  // Sidebar width state
  const [sidebarWidth, setSidebarWidth] = useState(210);

  // Subtitle state
  const [subtitleText, setSubtitleText] = useState('');
  const [subtitleInterim, setSubtitleInterim] = useState('');
  const [subtitleStatus, setSubtitleStatus] = useState('idle'); // idle | listening | error | unsupported
  const recognitionRef = useRef(null);

  const iptvSubtitleOnRef = useRef(iptvSubtitleOn);

  // Sync ref with state
  useEffect(() => {
    iptvSubtitleOnRef.current = iptvSubtitleOn;
  }, [iptvSubtitleOn]);

  // ===== SPEECH RECOGNITION =====
  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (iptvSubtitleOn) setSubtitleStatus('unsupported');
      return;
    }

    if (!iptvSubtitleOn) {
      // Stop recognition
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
        recognitionRef.current = null;
      }
      setSubtitleText('');
      setSubtitleInterim('');
      setSubtitleStatus('idle');
      return;
    }

    // Start recognition when subtitle is ON
    const video = iptvVideoRef?.current;
    if (!video) return;

    let recognition;
    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      // Auto-detect language, or set to Vietnamese
      recognition.lang = 'vi-VN';

      recognition.onstart = () => {
        setSubtitleStatus('listening');
      };

      recognition.onresult = (event) => {
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }
        if (finalText) {
          setSubtitleText(prev => {
            const newText = (prev + ' ' + finalText).trim();
            // Reset if too long (indicating accumulated text without silence break)
            return newText.length > 300 ? finalText.trim() : newText.slice(-300);
          });
        }
        if (interimText) {
          setSubtitleInterim(interimText);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // No speech detected, restart
          try { recognition.start(); } catch(e) {}
        } else if (event.error === 'not-allowed') {
          setSubtitleStatus('error');
        } else {
          // Auto-restart on other errors
          setTimeout(() => {
            try { recognition.start(); } catch(e) {}
          }, 1000);
        }
      };

      recognition.onend = () => {
        // Auto-restart if still ON
        if (iptvSubtitleOnRef.current && recognitionRef.current) {
          try { recognition.start(); } catch(e) {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch(e) {
      console.error('Failed to start speech recognition:', e);
      setSubtitleStatus('error');
    }

    return () => {
      if (recognition) {
        try { recognition.stop(); } catch(e) {}
      }
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
            <button onClick={() => { setIptvTab?.('category'); fetchIPTV?.(iptvCategory); }} className={`flex-1 py-1 rounded text-[10px] font-medium transition-all ${iptvTab === 'category' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-500 hover:text-white'}`}>
              <Globe size={10} className="inline mr-1" />Thể Loại
            </button>
            <button onClick={() => { setIptvTab?.('country'); fetchIPTV?.(iptvCountry); }} className={`flex-1 py-1 rounded text-[10px] font-medium transition-all ${iptvTab === 'country' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-500 hover:text-white'}`}>
              🌍 Quốc Gia
            </button>
          </div>
          <input
            type="text"
            value={iptvSearch || ''}
            onChange={e => setIptvSearch?.(e.target.value)}
            placeholder="Tìm kênh..."
            className="w-full mt-2 px-2 py-1.5 bg-[#1a1b24] border border-white/5 rounded-lg text-[10px] text-white placeholder-slate-600 outline-none focus:border-rose-500/30"
          />
          {/* Compact filter dropdown */}
          {iptvTab === 'category' && (
            <div className="mt-2 flex items-center gap-1.5">
              <select
                value={iptvCategory || ''}
                onChange={e => { setIptvCategory?.(e.target.value); fetchIPTV?.(e.target.value); }}
                className="flex-1 px-2 py-1.5 bg-[#1a1b24] border border-white/5 rounded-lg text-[10px] text-white outline-none focus:border-rose-500/30 cursor-pointer appearance-none"
              >
                <option value="">🌟 Tất cả thể loại</option>
                {IPTV_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {iptvCategory && (
                <button onClick={() => { setIptvCategory?.(''); fetchIPTV?.(''); }}
                  className="px-1.5 py-1 text-[9px] text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                  title="Xoá bộ lọc">
                  ✕
                </button>
              )}
            </div>
          )}
          {iptvTab === 'country' && (
            <div className="mt-2 flex items-center gap-1.5">
              <select
                value={iptvCountry || ''}
                onChange={e => { setIptvCountry?.(e.target.value); fetchIPTV?.(e.target.value); }}
                className="flex-1 px-2 py-1.5 bg-[#1a1b24] border border-white/5 rounded-lg text-[10px] text-white outline-none focus:border-rose-500/30 cursor-pointer appearance-none"
              >
                <option value="">🌍 Tất cả quốc gia</option>
                {IPTV_COUNTRIES.map(co => (
                  <option key={co.id} value={co.id}>{co.name}</option>
                ))}
              </select>
              {iptvCountry && (
                <button onClick={() => { setIptvCountry?.(''); fetchIPTV?.(''); }}
                  className="px-1.5 py-1 text-[9px] text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                  title="Xoá bộ lọc">
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {safeChannels.map((ch, i) => (
            <button
              key={i}
              onClick={() => setSelectedChannel?.(ch)}
              className={`w-full text-left px-3 py-2 text-[10px] flex items-center gap-2 hover:bg-white/5 transition-colors ${
                selectedChannel?.url === ch.url ? 'bg-rose-500/10 border-r-2 border-rose-400' : ''
              }`}
            >
              <Play size={11} className={selectedChannel?.url === ch.url ? 'text-rose-400 fill-rose-400 shrink-0' : 'text-slate-500 shrink-0'} />
              <span className="truncate flex-1">{ch.name}</span>
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
