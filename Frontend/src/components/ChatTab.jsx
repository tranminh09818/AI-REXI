import React, { useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, Volume2, Copy, Check, ArrowUp, ArrowDown, MessageSquare, Sparkles, ChevronDown, Layers, Zap } from 'lucide-react';

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
  listening, copiedId, speakingMsgId,
  handleSendMessage, startVoice, speakText, copyToClipboard,
  fileInputRef, handleFileSelect, chatScrollRef, handleChatScroll,
  showScrollTop, showScrollBottom, scrollToTopSmooth, scrollToBottomSmooth,
  currentUser
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
                <p className="text-xs text-slate-400 mt-2">Hệ thống trợ lý AI tích hợp 35+ Skills Agent, Giọng đọc Tiếng Việt, Office CLI, WiFi Health & IPTV Hub</p>
              </div>
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
                        <span>{speakingMsgId === msg.ma_tin_nhan ? 'Đang đọc...' : 'Đọc giọng nói'}</span>
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

      {/* Input Area */}
      <div className="mt-3 relative">
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
        <div className="flex items-center bg-[#181920] border border-white/10 focus-within:border-cyan-500/50 rounded-2xl px-4 py-2.5 shadow-xl transition-all">
          
          {/* Mode Selector */}
          <div className="relative mr-2" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setChatModeOpen(!chatModeOpen)}
              className="flex items-center gap-1.5 bg-[#13141c] border border-white/20 hover:border-cyan-500/40 rounded-xl px-3 py-1.5 cursor-pointer text-xs font-semibold transition-all min-w-[125px] justify-between text-cyan-300 shadow-md"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-cyan-400">{executionMode === 'agent' ? '⚡' : '💬'}</span>
                <span>{executionMode === 'agent' ? 'Agent Mode' : 'Chat AI'}</span>
              </div>
              <span className="text-slate-400 text-[10px] ml-1">^</span>
            </button>

            {chatModeOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#141522] border border-white/10 rounded-2xl shadow-2xl p-2 z-50">
                {/* Option 1: Chat AI */}
                <button
                  type="button"
                  onClick={() => { setExecutionMode('chat'); setChatModeOpen(false); }}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left cursor-pointer ${
                    executionMode !== 'agent' ? 'bg-[#1b1c2e] border border-white/10' : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className="text-base shrink-0 mt-0.5">💬</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-100">Chat AI</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">Trò chuyện AI thông thường</div>
                  </div>
                </button>

                {/* Option 2: Agent Mode */}
                <button
                  type="button"
                  onClick={() => { setExecutionMode('agent'); setChatModeOpen(false); }}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left mt-1.5 cursor-pointer ${
                    executionMode === 'agent' ? 'bg-[#2b1845] border border-purple-500/40 shadow-sm' : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className="text-base shrink-0 mt-0.5 text-purple-300">⚡</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-purple-200">Agent Mode</div>
                    <div className="text-[11px] text-purple-300/80 mt-0.5 leading-tight">Tự động thực thi code & tác vụ</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-cyan-400 transition-colors" title="Đính kèm file">
            <Paperclip size={16} />
          </button>
          <button onClick={startVoice} className={`p-2 transition-colors ${listening ? "text-rose-400 animate-pulse" : "text-slate-400 hover:text-cyan-400"}`} title="Nhập bằng giọng nói">
            <Mic size={16} />
          </button>

          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder="Hỏi AI Rexi bất cứ điều gì... (Enter để gửi)"
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
