import React, { useState, useEffect } from 'react';
import { Play, Volume2, Wifi, ExternalLink, Copy, Search } from 'lucide-react';

const VIDEO_TOOLS = [
  {
    category: 'TTS - Chuyển Đổi Chữ Thành Giọng Nói',
    icon: <Volume2 size={16} className="text-emerald-400" />,
    tools: [
      { id: 'web-speech', name: 'Web Speech API', desc: 'Chạy trong trình duyệt, không cần server', status: 'ready', badge: 'Miễn phí' },
      { id: 'edge-tts', name: 'Server edge-tts', desc: '10 giọng Việt (Nam/Nữ), chất lượng cao', status: 'ready', badge: '10 voices' },
      { id: 'valtec', name: 'Valtec TTS', desc: '74.8M params, chạy CPU, zero-shot cloning', status: 'setup', badge: '360⭐' },
      { id: 'vietvoice', name: 'VietVoice-TTS', desc: 'Voice cloning chuyên nghiệp', status: 'setup', badge: '105⭐' },
      { id: 'viettts', name: 'VietTTS', desc: '8 giọng nổi tiếng', status: 'setup', badge: '8 voices' },
      { id: 'ngthitts', name: 'NghiTTS', desc: 'Chạy trong browser', status: 'setup', badge: '139⭐' },
      { id: 'omnivoice', name: 'OmniVoice', desc: '600+ ngôn ngữ, voice cloning', status: 'setup', badge: '8k⭐' }
    ]
  },
  {
    category: 'Video - Tạo & Chỉnh Sửa Video',
    icon: <Play size={16} className="text-purple-400" />,
    tools: [
      { id: 'claude-video', name: 'claude-video', desc: 'Tạo video từ text/image, chỉnh sửa, avatar', status: 'ready', badge: 'Integrated' },
      { id: 'opencut', name: 'OpenCut', desc: 'Open-source CapCut alternative', status: 'repo', badge: '30k⭐', repo: 'floomhq/opencut' },
      { id: 'opencut-ai', name: 'OpenCut-AI', desc: 'AI video editor: transcribe, edit by text', status: 'repo', badge: '160⭐', repo: 'floomhq/opencut-ai' },
      { id: 'hyperframes', name: 'HyperFrames', desc: 'HTML to MP4 video renderer cho agents', status: 'repo', badge: '37k⭐', repo: 'floomhq/hyperframes' },
      { id: 'hf-tailwind', name: 'HyperFrames @tailwind', desc: 'Tailwind CSS integration', status: 'repo', badge: '71K⭐', repo: 'floomhq/hyperframes-tailwind' },
      { id: 'hf-figma', name: 'HyperFrames @figma', desc: 'Figma integration', status: 'repo', badge: '51K⭐', repo: 'floomhq/hyperframes-figma' }
    ]
  },
  {
    category: 'IPTV - Stream Tools',
    icon: <Wifi size={16} className="text-cyan-400" />,
    tools: [
      { id: 'iptv-core', name: 'iptv (core)', desc: 'Core IPTV streaming library', status: 'repo', badge: 'Core', repo: 'iptv-org/iptv' },
      { id: 'iptv-channels', name: 'iptv-channels', desc: '200+ quốc gia, M3U playlists, EPG', status: 'ready', badge: 'Integrated' },
      { id: 'iptv-global', name: 'iptv-global', desc: 'Quản lý IPTV toàn cầu, catch-up TV', status: 'ready', badge: 'Integrated' }
    ]
  }
];

export default function StudioTab({ API_BASE, authToken, showToast }) {
  const [copiedLink, setCopiedLink] = useState(null);
  const [ttsStatus, setTtsStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTTSStatus();
  }, []);

  const fetchTTSStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/services/tts/status`, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      const data = await res.json();
      setTtsStatus(data);
    } catch (err) {
      setTtsStatus({ success: false });
    }
  };

  const handleTTSTest = async () => {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    try {
      const res = await fetch(`${API_BASE}/services/tts`, {
        method: 'POST', headers, credentials: 'include',
        body: JSON.stringify({ text: 'Xin chào, đây là giọng nói thử nghiệm từ AI Rexi.', voice: 'vi-VN-HoaiMyNeural' })
      });
      const data = await res.json();
      if (data.success && data.audio) {
        new Audio('data:audio/mp3;base64,' + data.audio).play();
        showToast('Đang phát giọng nói thử nghiệm!', 'success');
      } else {
        showToast(data.error || 'TTS server không khả dụng', 'error');
      }
    } catch (err) {
      showToast('Lỗi TTS: ' + err.message, 'error');
    }
  };

  const handleCopyRepo = (repoName, fullName) => {
    const repoUrl = `https://github.com/${repoName}`;
    navigator.clipboard.writeText(repoUrl).then(() => {
      setCopiedLink(fullName);
      setTimeout(() => setCopiedLink(null), 2000);
      showToast(`Link repo ${fullName} đã được sao chép!`, 'success');
    });
  };

  const filteredTools = searchQuery
    ? VIDEO_TOOLS.map(group => ({
        ...group,
        tools: group.tools.filter(t =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.desc.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(group => group.tools.length > 0)
    : VIDEO_TOOLS;

  return (
    <div className="flex flex-col h-full w-full p-4 overflow-y-auto space-y-4 bg-[#0c0d11]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play size={20} className="text-purple-400" />
          <h1 className="text-sm font-bold text-white">Video & Audio Studio</h1>
          <span className="text-xs text-slate-500">TTS • Video Creation • IPTV Tools</span>
        </div>
        <button
          onClick={handleTTSTest}
          disabled={!ttsStatus?.edge_tts}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-50 text-xs font-medium flex items-center gap-1 transition-all"
          title="Test server TTS (giọng Hoài Mỹ)"
        >
          <Play size={12} /> Test TTS
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#181920] border border-white/5">
        <Search size={14} className="text-slate-500 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Tìm công cụ (vd: edge-tts, opencut, web speech)..."
          className="flex-1 bg-transparent text-xs text-slate-300 placeholder-slate-500 outline-none"
        />
      </div>

      {/* TTS Status */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#181920] border border-white/5">
        <span className={`w-2 h-2 rounded-full ${ttsStatus?.edge_tts ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`}></span>
        <span className="text-xs text-slate-300">
          Server TTS: <span className="text-emerald-300 font-medium">{ttsStatus?.edge_tts ? 'edge-tts (10 giọng VN) đã sẵn sàng' : 'không khả dụng'}</span>
        </span>
      </div>

      {/* Tools Grid */}
      {filteredTools.map((group, gi) => (
        <div key={gi} className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-white/5">
            {group.icon}
            <h3 className="text-xs font-bold text-slate-300">{group.category}</h3>
          </div>

          <div className="grid gap-2.5">
            {group.tools.map((tool, ti) => (
              <div
                key={ti}
                className="p-3 bg-[#131417] rounded-xl border border-white/5 hover:border-cyan-500/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200 truncate">{tool.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        tool.status === 'ready'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : tool.status === 'setup'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {tool.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{tool.desc}</p>
                  </div>

                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {tool.status === 'ready' && (
                      <button
                        onClick={() => {
                          if (tool.id === 'edge-tts') {
                            handleTTSTest();
                          } else {
                            showToast(`${tool.name}: sử dụng trong phần mềm`, 'success');
                          }
                        }}
                        className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/30 transition-all"
                        title={tool.id === 'edge-tts' ? 'Thử giọng nói' : 'Sử dụng'}
                      >
                        <Play size={12} />
                      </button>
                    )}
                    {tool.status === 'repo' && tool.repo && (
                      <button
                        onClick={() => handleCopyRepo(tool.repo, tool.name)}
                        className="p-1 rounded-lg bg-slate-500/20 text-slate-400 hover:text-white hover:bg-slate-500/30 transition-all"
                        title="Sao chép repo link"
                      >
                        {copiedLink === tool.name ? <Copy size={11} className="text-emerald-400" /> : <ExternalLink size={11} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
