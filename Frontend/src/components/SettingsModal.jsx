import React, { useState } from 'react';
import { X, Settings, Eye, EyeOff } from 'lucide-react';

const PROVIDERS = {
  gemini: { name: 'Google Gemini', placeholder: 'AIzaSy...' },
  openai: { name: 'OpenAI GPT-4o', placeholder: 'sk-proj-...' },
  claude: { name: 'Anthropic Claude', placeholder: 'sk-ant-...' },
  deepseek: { name: 'DeepSeek AI', placeholder: 'sk-...' },
  groq: { name: 'Groq Cloud', placeholder: 'gsk_...' },
  opencode: { name: 'OpenCode Agent', placeholder: 'Internal Engine' },
};

export default function SettingsModal({
  settingsOpen, setSettingsOpen,
  provider, setProvider, modelName, setModelName,
  apiKey, setApiKey, baseUrl, setBaseUrl
}) {
  const [showApiKey, setShowApiKey] = useState(false);
  if (!settingsOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSettingsOpen(false)}>
      <div className="bg-[#1a1b24] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Settings size={16} className="text-cyan-400" /> Cài Đặt Hệ Thống AI Rexi
          </h2>
          <button onClick={() => setSettingsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Nhà cung cấp AI</label>
            <select value={provider} onChange={e => { setProvider(e.target.value); localStorage.setItem('rexi_provider', e.target.value); }}
              className="w-full px-3 py-2.5 bg-[#0d0e11] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-cyan-500/50">
              {Object.entries(PROVIDERS).map(([key, val]) => <option key={key} value={key}>{val.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Model</label>
            <input type="text" value={modelName} onChange={e => { setModelName(e.target.value); localStorage.setItem('rexi_model', e.target.value); }}
              className="w-full px-3 py-2.5 bg-[#0d0e11] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50" />
          </div>
          {PROVIDERS[provider]?.placeholder !== 'Internal Engine' && (
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">API Key</label>
              <div className="relative">
                <input type={showApiKey ? 'text' : 'password'} value={apiKey} onChange={e => { setApiKey(e.target.value); localStorage.setItem('rexi_api_key', e.target.value); }}
                  placeholder={PROVIDERS[provider]?.placeholder}
                  className="w-full px-3 py-2.5 bg-[#0d0e11] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 pr-10" />
                <button type="button" onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Base URL (tùy chọn)</label>
            <input type="text" value={baseUrl} onChange={e => { setBaseUrl(e.target.value); localStorage.setItem('rexi_base_url', e.target.value); }}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2.5 bg-[#0d0e11] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50" />
          </div>
          <button onClick={() => setSettingsOpen(false)}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm rounded-xl transition-all active:scale-95">
            Lưu Cài Đặt
          </button>
        </div>
      </div>
    </div>
  );
}
