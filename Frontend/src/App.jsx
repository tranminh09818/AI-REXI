import React, { useState, useEffect, useRef } from 'react';
import {
  Menu, X, Send, Plus, Settings, Layers, Bot, User,
  FileText, Key, Trash2, Code2, Database, Search,
  Copy, Check, AlertTriangle, Folder, FolderOpen, Save,
  Mic, Volume2, Download, Cpu, Paperclip, Image, FileCode,
  Globe, ChevronDown, Zap, MessageSquare, MoreHorizontal,
  ThumbsUp, ThumbsDown, RefreshCw, Edit3, Star, StarOff
} from 'lucide-react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/tokyo-night-dark.css';

const API_BASE = "http://localhost:5000/api";

marked.setOptions({
  highlight: (code, lang) => {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-'
});

const PROVIDERS = {
  gemini: { name: 'Google Gemini', short: 'Gemini', models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'], needKey: true, placeholder: 'AIzaSy...' },
  openai: { name: 'OpenAI', short: 'GPT', models: ['gpt-4o', 'gpt-4o-mini', 'o1-preview'], needKey: true, placeholder: 'sk-proj-...' },
  claude: { name: 'Claude', short: 'Claude', models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'], needKey: true, placeholder: 'sk-ant-...' },
  deepseek: { name: 'DeepSeek', short: 'DeepSeek', models: ['deepseek-chat', 'deepseek-reasoner'], needKey: true, placeholder: 'sk-...' },
  groq: { name: 'Groq', short: 'Groq', models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'], needKey: true, placeholder: 'gsk_...' },
  ollama: { name: 'Ollama (Local)', short: 'Local', models: ['llama3', 'mistral', 'qwen2.5-coder', 'codellama'], needKey: false, placeholder: '' }
};

const SUGGESTION_PROMPTS = [
  { icon: <Code2 size={18} />, title: 'Viết API Backend', desc: 'Node.js Express + SQLite REST API' },
  { icon: <Database size={18} />, title: 'Thiết kế CSDL SQL', desc: 'Bảng chuẩn, index, khóa ngoại' },
  { icon: <Cpu size={18} />, title: 'Sửa lỗi Bug', desc: 'Phân tích lỗi và đề xuất fix' },
  { icon: <Globe size={18} />, title: 'Giải thích Code', desc: 'Giải thích rõ từng dòng code' },
];

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [executionMode, setExecutionMode] = useState('agent');
  const [modelDropOpen, setModelDropOpen] = useState(false);

  const [provider, setProvider] = useState(() => localStorage.getItem('rexi_provider') || 'gemini');
  const [modelName, setModelName] = useState(() => localStorage.getItem('rexi_model') || 'gemini-1.5-flash');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('rexi_api_key') || '');
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('rexi_base_url') || '');

  const [fileTree, setFileTree] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [savingFile, setSavingFile] = useState(false);

  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [listening, setListening] = useState(false);
  const [skills, setSkills] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { fetchConversations(); fetchSkills(); fetchWorkspaceFiles(); }, []);
  useEffect(() => { activeConvId ? fetchMessages(activeConvId) : setMessages([]); }, [activeConvId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [inputText]);

  const fetchConversations = async () => {
    try {
      const data = await fetch(`${API_BASE}/conversations`).then(r => r.json());
      setConversations(data);
      if (data.length > 0 && !activeConvId) setActiveConvId(data[0].ma_hoi_thoai);
    } catch { setConversations([]); }
  };

  const fetchMessages = async (id) => {
    try {
      const data = await fetch(`${API_BASE}/conversations/${id}/messages`).then(r => r.json());
      setMessages(data.map(m => ({ id: m.ma_tin_nhan, role: m.vai_tro, content: m.noi_dung })));
    } catch { setMessages([]); }
  };

  const fetchSkills = async () => {
    try {
      const data = await fetch(`${API_BASE}/skills`).then(r => r.json());
      setSkills(data.map(s => ({ id: s.ma_ky_nang, name: s.ten_ky_nang, title: s.tieu_de, desc: s.mo_ta, active: s.trang_thai === 'kich_hoat' })));
    } catch { setSkills([]); }
  };

  const fetchWorkspaceFiles = async () => {
    try {
      const data = await fetch(`${API_BASE}/workspace/files`).then(r => r.json());
      setFileTree(data);
    } catch {}
  };

  const handleOpenFile = async (filePath) => {
    try {
      const data = await fetch(`${API_BASE}/workspace/file-content?path=${encodeURIComponent(filePath)}`).then(r => r.json());
      setSelectedFile(filePath);
      setFileContent(data.content);
    } catch (e) { alert("Không thể đọc file: " + e.message); }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    setSavingFile(true);
    try {
      await fetch(`${API_BASE}/workspace/file-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile, content: fileContent })
      });
    } finally { setSavingFile(false); }
  };

  const handleFileSelect = (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        reader.readAsDataURL(file);
        reader.onload = () => setAttachedFiles(p => [...p, { name: file.name, isImage: true, dataUrl: reader.result }]);
      } else {
        reader.readAsText(file);
        reader.onload = () => setAttachedFiles(p => [...p, { name: file.name, isImage: false, textContent: reader.result }]);
      }
    });
    e.target.value = '';
  };

  const buildSmartTitle = (text) => {
    const clean = text.split('\n')[0].replace(/[#*`!_\[\]()]/g, '').trim();
    return clean.length > 40 ? clean.substring(0, 40) + '…' : (clean || 'Trò chuyện mới');
  };

  const handleNewConversation = async () => {
    try {
      const data = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tieu_de: 'Trò chuyện mới' })
      }).then(r => r.json());
      setConversations(prev => [data, ...prev]);
      setActiveConvId(data.ma_hoi_thoai);
      setMessages([]);
    } catch {
      const id = 'conv_' + Date.now();
      setConversations(prev => [{ ma_hoi_thoai: id, tieu_de: 'Trò chuyện mới' }, ...prev]);
      setActiveConvId(id);
    }
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    try { await fetch(`${API_BASE}/conversations/${convId}`, { method: 'DELETE' }); } catch {}
    const updated = conversations.filter(c => c.ma_hoi_thoai !== convId);
    setConversations(updated);
    if (activeConvId === convId) setActiveConvId(updated[0]?.ma_hoi_thoai || null);
  };

  const handleSend = async (override) => {
    let text = override || inputText;
    if (!text.trim() && attachedFiles.length === 0) return;
    if (loading) return;

    if (attachedFiles.length > 0) {
      attachedFiles.forEach(f => {
        text += f.isImage ? `\n\n![${f.name}](${f.dataUrl})` : `\n\n\`\`\`${f.name}\n${f.textContent}\n\`\`\``;
      });
    }

    let convId = activeConvId;
    if (!convId) {
      await handleNewConversation();
      convId = activeConvId;
    }

    // Cập nhật tiêu đề ngay trên state
    setConversations(prev => prev.map(c =>
      c.ma_hoi_thoai === convId && (c.tieu_de === 'Trò chuyện mới' || !c.tieu_de)
        ? { ...c, tieu_de: buildSmartTitle(text) } : c
    ));

    setMessages(prev => [...prev, { id: 'tmp_' + Date.now(), role: 'user', content: text }]);
    setInputText('');
    setAttachedFiles([]);
    setLoading(true);

    try {
      const data = await fetch(`${API_BASE}/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vai_tro: 'user', noi_dung: text,
          provider, client_api_key: apiKey, model_name: modelName, base_url: baseUrl,
          mode: 'coder', execution_mode: executionMode
        })
      }).then(r => r.json());
      setMessages(prev => [...prev, { id: data.ma_tin_nhan, role: 'assistant', content: data.noi_dung }]);
    } catch {
      setMessages(prev => [...prev, { id: 'err_' + Date.now(), role: 'assistant', content: 'Lỗi kết nối Backend.' }]);
    } finally {
      setLoading(false);
      fetchConversations();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g, ''));
      u.lang = 'vi-VN';
      window.speechSynthesis.speak(u);
    }
  };

  const startVoice = async () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const r = new SR();
      r.lang = 'vi-VN'; r.interimResults = true;
      r.onstart = () => setListening(true);
      r.onend = () => setListening(false);
      r.onerror = () => setListening(false);
      r.onresult = (e) => setInputText(Array.from(e.results).map(x => x[0].transcript).join(''));
      r.start();
    } catch { alert("Cần cấp quyền Micro cho trình duyệt."); }
  };

  const saveSettings = () => {
    localStorage.setItem('rexi_provider', provider);
    localStorage.setItem('rexi_model', modelName);
    localStorage.setItem('rexi_api_key', apiKey);
    localStorage.setItem('rexi_base_url', baseUrl);
    setSettingsOpen(false);
  };

  const changeProvider = (p) => {
    setProvider(p);
    setModelName(PROVIDERS[p]?.models[0] || '');
  };

  const exportMd = () => {
    const title = conversations.find(c => c.ma_hoi_thoai === activeConvId)?.tieu_de || 'chat';
    const md = messages.map(m => `### ${m.role === 'user' ? '👤 Bạn' : '🤖 Rexi'}\n${m.content}`).join('\n\n---\n\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([`# ${title}\n\n${md}`], { type: 'text/markdown' })),
      download: title.replace(/\s+/g, '_') + '.md'
    });
    a.click();
  };

  const filtered = conversations.filter(c =>
    !searchQuery || c.tieu_de?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTree = (nodes) => nodes.map(node => (
    <div key={node.path}>
      {node.type === 'folder' ? (
        <div className="mt-1">
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-400 font-medium">
            <Folder size={13} className="text-sky-400/70" />{node.name}
          </div>
          {node.children && <div className="ml-3">{renderTree(node.children)}</div>}
        </div>
      ) : (
        <button
          onClick={() => handleOpenFile(node.path)}
          className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-left transition-colors ${selectedFile === node.path ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <FileText size={12} className="shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
      )}
    </div>
  ));

  return (
    <div className="flex h-full w-full bg-[#131314] text-gray-200">

      {/* ═══════════════════ SIDEBAR ═══════════════════ */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 flex flex-col bg-[#1e1f20] transition-all duration-300
        ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}
        md:relative md:shrink-0
      `}>
        {/* Logo + Menu toggle */}
        <div className="flex items-center gap-2 px-3 py-3 mt-1">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
            title="Đóng sidebar"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">R</div>
            <span className="font-semibold text-base text-white">AI Rexi</span>
          </div>
        </div>

        {/* Nút Cuộc trò chuyện mới */}
        <div className="px-3 mt-2">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#282a2c] hover:bg-[#323436] text-sm text-slate-200 transition-colors"
          >
            <Plus size={18} className="text-slate-400" />
            <span>Cuộc trò chuyện mới</span>
          </button>
        </div>

        {/* Tìm kiếm */}
        <div className="px-3 mt-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#282a2c] hover:bg-[#323436] transition-colors">
            <Search size={14} className="text-slate-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="flex-1 bg-transparent text-sm text-slate-300 placeholder-slate-500 outline-none"
            />
          </div>
        </div>

        {/* Lịch sử */}
        <div className="flex-1 overflow-y-auto mt-4 px-2 space-y-0.5">
          {filtered.length > 0 && (
            <p className="px-3 pb-1 text-[11px] text-slate-500 font-medium uppercase tracking-wider">Gần đây</p>
          )}
          {filtered.map(conv => (
            <div
              key={conv.ma_hoi_thoai}
              onClick={() => setActiveConvId(conv.ma_hoi_thoai)}
              className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                activeConvId === conv.ma_hoi_thoai ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="text-sm truncate flex-1 text-left">{conv.tieu_de || 'Trò chuyện mới'}</span>
              <button
                onClick={(e) => handleDeleteConversation(conv.ma_hoi_thoai, e)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-red-400 shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Files Dự Án */}
        <div className="px-2 border-t border-white/5 pt-2">
          <button
            onClick={() => setFilesOpen(!filesOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <FolderOpen size={16} />
            <span>Files Dự Án</span>
            <ChevronDown size={14} className={`ml-auto transition-transform ${filesOpen ? 'rotate-180' : ''}`} />
          </button>
          {filesOpen && (
            <div className="mt-1 max-h-48 overflow-y-auto px-1 pb-2">
              {renderTree(fileTree)}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="px-2 pb-4 space-y-0.5">
          <button
            onClick={() => setSkillsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Layers size={16} />
            <span>Kỹ năng ({skills.filter(s => s.active).length})</span>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Settings size={16} />
            <span>Cài đặt</span>
          </button>

          {/* Avatar giả lập */}
          <div className="flex items-center gap-3 px-3 py-2 mt-2 rounded-xl hover:bg-white/5 cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">U</div>
            <span className="text-sm text-slate-300 truncate">{PROVIDERS[provider]?.name} · {modelName}</span>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/50 md:hidden" />}

      {/* ═══════════════════ NỘI DUNG CHÍNH ═══════════════════ */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Topbar mini */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          {/* Nút mở sidebar khi đang đóng */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Mở sidebar"
            >
              <Menu size={18} />
            </button>
          )}
          {sidebarOpen && <div className="w-9" />}

          <div className="flex items-center gap-2">
            {/* Switch Standard / Agent */}
            <div className="flex bg-[#282a2c] rounded-full p-0.5 text-xs">
              <button
                onClick={() => setExecutionMode('standard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all font-medium ${executionMode === 'standard' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <MessageSquare size={12} />
                Chat
              </button>
              <button
                onClick={() => setExecutionMode('agent')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all font-medium ${executionMode === 'agent' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                <Zap size={12} />
                Agent
              </button>
            </div>

            <button onClick={exportMd} className="p-2 rounded-full hover:bg-white/10 text-slate-400 transition-colors" title="Xuất Markdown">
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Vùng chat */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div className="flex flex-col items-center justify-center h-full px-4 pb-8">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold mb-6 shadow-xl shadow-cyan-500/20">
                R
              </div>
              <h1 className="text-3xl font-medium text-white mb-2">Xin chào!</h1>
              <p className="text-slate-400 mb-8 text-center max-w-md">
                Tôi là <b className="text-white">AI Rexi</b>. Tôi có thể giúp bạn lập trình, thiết kế CSDL, sửa bug và nhiều hơn nữa.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {SUGGESTION_PROMPTS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s.title + ': ' + s.desc)}
                    className="flex items-start gap-3 p-4 rounded-2xl bg-[#1e1f20] hover:bg-[#28292a] border border-white/5 hover:border-white/10 text-left transition-all group"
                  >
                    <div className="text-cyan-400 mt-0.5 group-hover:scale-110 transition-transform">{s.icon}</div>
                    <div>
                      <p className="text-sm font-medium text-white">{s.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Danh sách tin nhắn */
            <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'items-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-1">R</div>
                  )}

                  <div className={`group relative max-w-[82%] ${msg.role === 'user' ? '' : 'flex-1'}`}>
                    {msg.role === 'user' ? (
                      <div className="bg-[#282a2c] text-white px-4 py-3 rounded-2xl rounded-br-md text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    ) : (
                      <div>
                        {msg.content.includes('Chưa cài đặt API Key') ? (
                          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-700/50 space-y-3">
                            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                              <AlertTriangle size={16} />
                              Yêu cầu API Key cho {PROVIDERS[provider]?.name}
                            </div>
                            <p className="text-xs text-slate-300">{msg.content}</p>
                            <button
                              onClick={() => setSettingsOpen(true)}
                              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                            >
                              <Key size={13} /> Cài đặt ngay
                            </button>
                          </div>
                        ) : (
                          <div
                            className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }}
                          />
                        )}

                        {/* Action buttons dưới tin AI */}
                        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => copyText(msg.content, msg.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5" title="Sao chép">
                            {copiedId === msg.id ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                          </button>
                          <button onClick={() => speak(msg.content)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5" title="Đọc">
                            <Volume2 size={15} />
                          </button>
                          <button className="p-1.5 rounded-lg text-slate-500 hover:text-green-400 hover:bg-white/5"><ThumbsUp size={15} /></button>
                          <button className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5"><ThumbsDown size={15} /></button>
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-1">U</div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">R</div>
                  <div className="flex items-center gap-1 pt-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ═══ INPUT BAR (giống Gemini) ═══ */}
        <div className="shrink-0 px-4 pb-6">
          <div className="max-w-3xl mx-auto">
            {/* File đính kèm */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#282a2c] border border-white/10 text-xs text-cyan-300">
                    {f.isImage ? <Image size={12} /> : <FileCode size={12} />}
                    <span className="max-w-[100px] truncate">{f.name}</span>
                    <button onClick={() => setAttachedFiles(p => p.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400 ml-0.5"><X size={11} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Box nhập liệu */}
            <div className="relative flex flex-col bg-[#1e1f20] border border-white/10 rounded-3xl hover:border-white/20 focus-within:border-white/25 transition-colors shadow-xl">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={listening ? "🔴 Đang lắng nghe..." : "Hỏi Rexi..."}
                disabled={loading}
                className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-sm text-white placeholder-slate-500 outline-none leading-relaxed max-h-[200px]"
              />

              {/* Toolbar dưới input */}
              <div className="flex items-center justify-between px-3 pb-3 pt-1">
                <div className="flex items-center gap-1">
                  {/* Đính kèm file */}
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Đính kèm file"
                  >
                    <Paperclip size={18} />
                  </button>

                  {/* Micro */}
                  <button
                    onClick={startVoice}
                    className={`p-2 rounded-full transition-colors ${listening ? 'text-red-400 bg-red-950/50 animate-pulse' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`}
                    title="Nhập giọng nói"
                  >
                    <Mic size={18} />
                  </button>

                  {/* Model selector */}
                  <div className="relative">
                    <button
                      onClick={() => setModelDropOpen(!modelDropOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-xs font-medium"
                    >
                      {PROVIDERS[provider]?.short}
                      <ChevronDown size={12} className={`transition-transform ${modelDropOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {modelDropOpen && (
                      <div className="absolute bottom-full left-0 mb-2 w-72 bg-[#2a2b2d] border border-white/10 rounded-2xl shadow-xl overflow-hidden z-50">
                        <div className="p-3 border-b border-white/5">
                          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Nhà cung cấp & Model</p>
                        </div>
                        {Object.entries(PROVIDERS).map(([key, val]) => (
                          <div key={key} className={`p-3 border-b border-white/5 last:border-0 ${provider === key ? 'bg-white/5' : 'hover:bg-white/5'} cursor-pointer transition-colors`}
                            onClick={() => { changeProvider(key); setModelDropOpen(false); setSettingsOpen(true); }}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-white">{val.name}</span>
                              {provider === key && <Check size={14} className="text-cyan-400" />}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{val.models[0]}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Nút gửi */}
                <button
                  onClick={() => handleSend()}
                  disabled={loading || (!inputText.trim() && attachedFiles.length === 0)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    inputText.trim() || attachedFiles.length > 0
                      ? 'bg-white text-[#131314] hover:bg-slate-200 shadow-md'
                      : 'bg-white/10 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>

            <p className="text-center text-[11px] text-slate-600 mt-2">
              AI Rexi có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.
            </p>
          </div>
        </div>
      </main>

      {/* Code Editor Panel */}
      {selectedFile && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[520px] bg-[#0d1322] border-l border-white/10 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#131b2e]">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs truncate">
              <Code2 size={15} /><span className="truncate">{selectedFile}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSaveFile} disabled={savingFile} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg flex items-center gap-1">
                <Save size={12} />{savingFile ? 'Đang lưu...' : 'Lưu'}
              </button>
              <button onClick={() => setSelectedFile(null)} className="p-1.5 hover:bg-white/10 text-slate-400 rounded-lg"><X size={16} /></button>
            </div>
          </div>
          <textarea
            value={fileContent}
            onChange={e => setFileContent(e.target.value)}
            className="flex-1 w-full p-4 bg-[#0a0d16] text-slate-200 font-mono text-xs leading-relaxed focus:outline-none resize-none"
            spellCheck="false"
          />
        </div>
      )}

      {/* ═══ MODAL CÀI ĐẶT ═══ */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#1e1f20] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="font-semibold text-white flex items-center gap-2"><Globe size={16} className="text-cyan-400" />Cấu hình AI Provider & Model</span>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium mb-2 block uppercase tracking-wider">Nhà Cung Cấp</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PROVIDERS).map(([key, val]) => (
                    <button key={key} onClick={() => changeProvider(key)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${provider === key ? 'bg-cyan-950 border-cyan-600 text-cyan-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                      {val.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium mb-2 block uppercase tracking-wider">Model</label>
                <select value={modelName} onChange={e => setModelName(e.target.value)}
                  className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-600">
                  {PROVIDERS[provider]?.models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {PROVIDERS[provider]?.needKey && (
                <div>
                  <label className="text-xs text-slate-400 font-medium mb-2 block uppercase tracking-wider">API Key</label>
                  <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                    placeholder={PROVIDERS[provider]?.placeholder}
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-600 placeholder-slate-600" />
                  {provider === 'gemini' && (
                    <p className="text-[11px] text-slate-500 mt-1">Lấy free tại <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Google AI Studio</a></p>
                  )}
                </div>
              )}
              {provider === 'ollama' && (
                <div>
                  <label className="text-xs text-slate-400 font-medium mb-2 block uppercase tracking-wider">Ollama Base URL</label>
                  <input type="text" value={baseUrl || 'http://localhost:11434'} onChange={e => setBaseUrl(e.target.value)}
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-600" />
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-white/10 flex justify-end">
              <button onClick={saveSettings} className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-semibold hover:from-cyan-500 hover:to-blue-500 active:scale-95 transition-all">
                Lưu cài đặt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL SKILLS ═══ */}
      {skillsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1e1f20] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="font-semibold text-white flex items-center gap-2"><Layers size={16} className="text-cyan-400" />Kỹ Năng (Skills)</span>
              <button onClick={() => setSkillsOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {skills.map(s => (
                <div key={s.id} className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{s.title}</span>
                    <span className="text-[10px] bg-white/10 text-slate-400 font-mono px-1.5 rounded">{s.name}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
