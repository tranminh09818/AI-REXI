import React, { useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, Volume2, Copy, Check, ArrowUp, ArrowDown, MessageSquare, Sparkles, ChevronDown, Layers, Zap, Square } from 'lucide-react';

function sanitizeHtml(html) {
  if (!html) return '';
  let s = html;
  s = s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  s = s.replace(/<(\w+)\s+[^>]*on\w+\s*=\s*["'][^"']*["'][^>]*>/gi, '<$1>');
  s = s.replace(/<(\w+)\s+[^>]*on\w+\s*=\s*[^>]*>/gi, '<$1>');
  s = s.replace(/javascript\s*:/gi, '');
  s = s.replace(/<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');
  return s;
}

export default function ChatTab({
  messages, inputText, setInputText, loading, attachedFiles,
  executionMode, setExecutionMode, chatModeOpen, setChatModeOpen,
  listening, voiceTranscript, copiedId, speakingMsgId,
  handleSendMessage, startVoice, speakText, copyToClipboard,
  fileInputRef, handleFileSelect, chatScrollRef, handleChatScroll,
  showScrollTop, showScrollBottom, scrollToTopSmooth, scrollToBottomSmooth,
  currentUser, onOpenFeature
}) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setChatModeOpen?.(false);
      }
    }
    if (chatModeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [chatModeOpen, setChatModeOpen]);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-4 py-3">
      {/* Chat Messages */}
      <div className="relative flex-1 min-h-0">
        <div ref={chatScrollRef} onScroll={handleChatScroll} className="h-full overflow-y-auto space-y-4 pr-1 mt-2">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
              <img src="/rexi_cat_icon.png" alt="Rexi" className="rexi-logo w-16 h-16 object-contain" />
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                  Chào {currentUser?.ten_day_du || 'bạn'}! Tôi là AI Rexi Master.
                </h2>
                <p className="text-xs text-slate-400 mt-2">Bạn muốn làm gì hôm nay?</p>
              </div>

              {/* ═══ BẮT ĐẦU TỪ ĐÂU — 3 việc phổ biến nhất ═══ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full max-w-2xl">
                <button
                  onClick={() => onOpenFeature?.('video')}
                  className="group p-4 rounded-2xl bg-[#1e1f20] border border-white/5 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all text-left"
                >
                  <div className="text-2xl mb-2">🎬</div>
                  <div className="text-xs font-bold text-slate-100 group-hover:text-purple-300">Tạo Video</div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-relaxed">Chọn mẫu → điền chữ → render MP4. Có hướng dẫn 4 bước sẵn, không cần biết code.</div>
                </button>
                <button
                  onClick={() => onOpenFeature?.('tts')}
                  className="group p-4 rounded-2xl bg-[#1e1f20] border border-white/5 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all text-left"
                >
                  <div className="text-2xl mb-2">🎙️</div>
                  <div className="text-xs font-bold text-slate-100 group-hover:text-cyan-300">Tạo Giọng Đọc</div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-relaxed">Chữ → file MP3 giọng Việt. Dùng để lồng tiếng video, làm bài giảng, đọc truyện.</div>
                </button>
                <button
                  onClick={() => onOpenFeature?.('iptv')}
                  className="group p-4 rounded-2xl bg-[#1e1f20] border border-white/5 hover:border-rose-500/40 hover:bg-rose-500/5 transition-all text-left"
                >
                  <div className="text-2xl mb-2">📺</div>
                  <div className="text-xs font-bold text-slate-100 group-hover:text-rose-300">Xem TV</div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-relaxed">Xem kênh truyền hình trực tuyến từ khắp nơi trên thế giới.</div>
                </button>
              </div>

              <p className="text-[10px] text-slate-500 max-w-md leading-relaxed">
                👇 Hoặc <b>gõ câu hỏi vào ô chat bên dưới</b> — ví dụ: "Soạn giúp tôi một bài văn" — và bấm Enter. AI Rexi sẽ trả lời ngay.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={msg.ma_tin_nhan || idx}
                className={`flex gap-3 text-sm ${msg.vai_tro === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.vai_tro !== 'user' && (
                  <img src="/rexi_cat_icon.png" alt="Rexi" className="rexi-logo rexi-logo-no-glow w-7 h-7 shrink-0 mt-0.5 object-contain" />
                )}
                <div className={`relative max-w-[85%] rounded-2xl p-4 shadow-sm ${
                  msg.vai_tro === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                    : 'bg-[#1e1f20] border border-white/5 text-slate-200 rounded-tl-none prose-rexi'
                }`}>
                  {msg.vai_tro === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.noi_dung}</p>
                  ) : msg.vai_tro === 'admin' ? (
                    <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-2 text-[11px] text-amber-400 font-semibold">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
                        Phản hồi từ Admin
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.noi_dung || '') }} />
                    </div>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.noi_dung || '') }} />
                  )}
                  {msg.vai_tro !== 'user' && (
                    <div className="flex items-center justify-end gap-3 mt-3 pt-2 border-t border-white/5 text-xs text-slate-400">
                      <button onClick={() => speakText(msg.noi_dung, msg.ma_tin_nhan)}
                        className={`flex items-center gap-1 transition-colors ${speakingMsgId === msg.ma_tin_nhan ? "text-amber-400 animate-pulse" : "hover:text-cyan-400"}`}>
                        <Volume2 size={13} />
                        <span>{speakingMsgId === msg.ma_tin_nhan ? "Dừng" : "Đọc"}</span>
                      </button>
                      <button onClick={() => copyToClipboard(msg.noi_dung, msg.ma_tin_nhan)}
                        className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                        {copiedId === msg.ma_tin_nhan ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span>{copiedId === msg.ma_tin_nhan ? 'Đã chép' : 'Sao chép'}</span>
                      </button>
                    </div>
                  )}
                </div>
                {msg.vai_tro === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">U</div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-3 items-center text-slate-400 text-xs">
              <img src="/rexi_cat_icon.png" alt="Rexi" className="rexi-logo rexi-logo-no-glow w-7 h-7 object-contain" />
              <div className="flex items-center gap-1.5 bg-[#1e1f20] px-4 py-2.5 rounded-full border border-white/5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]"></span>
                <span className="ml-2 font-medium">Rexi đang phân tích...</span>
              </div>
            </div>
          )}

          {/* Scroll buttons */}
          <div className="absolute right-1 bottom-2 flex flex-col gap-2 z-30">
            {showScrollTop && (
              <button onClick={scrollToTopSmooth} className="w-9 h-9 rounded-full bg-[#1e1f20]/90 backdrop-blur border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 flex items-center justify-center shadow-lg transition-all">
                <ArrowUp size={16} />
              </button>
            )}
            {showScrollBottom && (
              <button onClick={scrollToBottomSmooth} className="w-9 h-9 rounded-full bg-[#1e1f20]/90 backdrop-blur border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 flex items-center justify-center shadow-lg transition-all">
                <ArrowDown size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Attachment Preview */}
      {attachedFiles.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-[#181920] border border-white/10 rounded-xl mb-2">
          {attachedFiles.map((f, i) => (
            <span key={i} className="text-xs bg-white/10 text-cyan-300 px-2 py-1 rounded-md flex items-center gap-1">
              <Paperclip size={12} /> {f.name}
            </span>
          ))}
        </div>
      )}

      {/* Voice Recording Indicator */}
      {listening && (
        <div className="mt-2 mb-2 flex items-center gap-3 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 animate-slide-up">
          <span className="relative flex w-3 h-3 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-rose-300">🎙️ Đang nghe... Hãy nói tiếng Việt</p>
            <p className="text-[11px] text-rose-200/70 truncate">
              {voiceTranscript || 'Lời nói của bạn sẽ hiện ra ở đây...'}
            </p>
          </div>
          <button
            onClick={startVoice}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-semibold hover:bg-rose-500/30 transition-all shrink-0"
          >
            <Square size={11} /> Dừng
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="mt-3 relative z-10">
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
        <div className="flex items-center bg-[#181920] border border-white/10 focus-within:border-cyan-500/50 rounded-2xl px-4 py-2.5 shadow-xl transition-colors">
          
          {/* Mode Selector - Fixed width, dropdown positioned absolutely */}
          <div className="relative mr-1.5 shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setChatModeOpen(!chatModeOpen)}
              className="flex items-center gap-1 bg-[#13141c] border border-white/20 hover:border-cyan-500/40 rounded-lg px-2.5 py-1 cursor-pointer text-[11px] font-semibold justify-between text-cyan-300 shadow-sm w-[110px] shrink-0 select-none transition-colors"
            >
              <div className="flex items-center gap-1 overflow-hidden">
                <span className="text-cyan-400 text-xs shrink-0">{executionMode === 'agent' ? '⚡' : '💬'}</span>
                <span className="truncate">{executionMode === 'agent' ? 'Agent Mode' : 'Chat AI'}</span>
              </div>
              <span className="text-slate-400 text-[9px] ml-1 shrink-0">▾</span>
            </button>

            {/* Dropdown - absolute, không đẩy elements khác */}
            {chatModeOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setChatModeOpen(false)} />
                <div className="absolute bottom-full left-0 mb-1 w-52 bg-[#141522] border border-white/10 rounded-xl shadow-2xl p-1 z-50">
                  <button
                    type="button"
                    onClick={() => { setExecutionMode('chat'); setChatModeOpen(false); }}
                    className={`w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      executionMode !== 'agent' ? 'bg-[#1b1c2e] border border-white/10' : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className="text-xs shrink-0 mt-0.5">💬</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-slate-100">Chat AI</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">Trò chuyện AI thông thường</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setExecutionMode('agent'); setChatModeOpen(false); }}
                    className={`w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left mt-1 cursor-pointer transition-colors ${
                      executionMode === 'agent' ? 'bg-[#2b1845] border border-purple-500/40 shadow-sm' : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className="text-xs shrink-0 mt-0.5 text-purple-300">⚡</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-purple-200">Agent Mode</div>
                      <div className="text-[10px] text-purple-300/80 mt-0.5 leading-tight">Tự động thực thi code & tác vụ</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-cyan-400 transition-colors" title="Đính kèm file">
            <Paperclip size={16} />
          </button>
          <button
            onClick={startVoice}
            className={`relative p-2 rounded-lg transition-all ${listening ? "text-rose-400 bg-rose-500/15 animate-pulse" : "text-slate-400 hover:text-cyan-400 hover:bg-white/5"}`}
            title="Nhập bằng giọng nói: bấm 🎤 → nói tiếng Việt → chữ tự điền vào ô chat (bấm lại để dừng)"
          >
            <Mic size={16} />
          </button>

          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder="Gõ câu hỏi ở đây rồi bấm Enter — VD: 'Soạn giúp tôi kịch bản video...'"
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none resize-none max-h-32 px-2"
          />

          <button onClick={() => handleSendMessage()}
            disabled={(!inputText.trim() && attachedFiles.length === 0) || loading}
            className="ml-2 p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white shadow-md transition-all shrink-0">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

