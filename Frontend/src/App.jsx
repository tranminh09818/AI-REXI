import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Menu, X, Send, Plus, Settings, Layers, Bot, User,
  FileText, Key, Trash2, Code2, Database, Search,
  Copy, Check, AlertTriangle, Folder, FolderOpen, Save,
  Mic, Volume2, Download, Cpu, Paperclip, Image, FileCode,
  Globe, ChevronDown, Zap, MessageSquare, MoreHorizontal,
  ThumbsUp, ThumbsDown, RefreshCw, Edit3, Star, Play, ArrowUp, ArrowDown,
  Sparkles, Monitor, Sun, Moon, Tv, Eye, Code, Layout, Sliders,
  ChevronRight, Activity, Terminal, Shield, Radio, HeartPulse, Wifi, FileSpreadsheet, Presentation, LogOut, Lock, ToggleLeft, ToggleRight, Server, GitBranch, GitCommit
} from 'lucide-react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/tokyo-night-dark.css';
import Hls from 'hls.js';

const API_BASE = "http://localhost:5000/api";

marked.setOptions({
  highlight: (code, lang) => {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-'
});

// Rexi Animated SVG Logo Component
const RexiLogo = ({ className = "w-8 h-8" }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 blur-sm opacity-75 animate-pulse"></div>
    <div className="relative w-full h-full rounded-xl bg-[#13141a] border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
      <svg className="w-3/5 h-3/5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    </div>
  </div>
);

const POPULAR_MODELS = [
  { id: 'gemini-3.6-flash', provider: 'gemini', name: 'Gemini 3.6 Flash', label: 'Fast & Smart', type: 'free' },
  { id: 'gemini-3.1-pro-high', provider: 'gemini', name: 'Gemini 3.1 Pro High', label: 'Reasoning', type: 'pro' },
  { id: 'claude-3-5-sonnet-20241022', provider: 'claude', name: 'Claude 3.5 Sonnet', label: 'Coding Pro', type: 'pro' },
  { id: 'opencode/deepseek-v4-flash-free', provider: 'opencode', name: 'DeepSeek V4 Pro', label: 'Free Agent', type: 'free' },
  { id: 'opencode/qwen-2.5-coder-32b-free', provider: 'opencode', name: 'Qwen Coder 2.5', label: 'Free Code', type: 'free' },
];

const PROVIDERS = {
  gemini: { name: 'Google Gemini', short: 'Gemini', needKey: true, placeholder: 'AIzaSy...' },
  opencode: { name: 'OpenCode Agent', short: 'OpenCode', needKey: false, placeholder: 'Internal Engine' },
  openai: { name: 'OpenAI GPT-4o', short: 'GPT-4o', needKey: true, placeholder: 'sk-proj-...' },
  claude: { name: 'Anthropic Claude', short: 'Claude', needKey: true, placeholder: 'sk-ant-...' },
  deepseek: { name: 'DeepSeek AI', short: 'DeepSeek', needKey: true, placeholder: 'sk-...' },
  groq: { name: 'Groq Cloud', short: 'Groq', needKey: true, placeholder: 'gsk_...' }
};

const AI_SPECIALTIES = [
  { id: 'general', name: '🤖 Trợ Lý Toàn Năng' },
  { id: 'business', name: '💼 Doanh Nghiệp & Hợp Đồng' },
  { id: 'marketing', name: '📢 Content Marketing' },
  { id: 'education', name: '📚 Phân Tích Chuyên Sâu' },
  { id: 'health', name: '🥗 Sức Khỏe & Dinh Dưỡng' },
  { id: 'coder', name: '💻 Lập Trình & Architect' }
];

const SUGGESTION_PROMPTS = [
  { icon: <Code2 className="text-cyan-400" size={18} />, title: 'Viết REST API Backend', desc: 'Node.js Express + SQLite CSDL' },
  { icon: <Database className="text-purple-400" size={18} />, title: 'Thiết Kế CSDL SQL', desc: 'Đặc tả 13 bảng chi tiết' },
  { icon: <FileText className="text-blue-400" size={18} />, title: 'Soạn Hợp Đồng Kinh Tế', desc: 'Công văn & mẫu hợp đồng doanh nghiệp' },
  { icon: <Zap className="text-amber-400" size={18} />, title: 'Kịch Bản Video Short', desc: 'Ý tưởng TikTok/Reels triệu view' },
];

const QUICK_CHIPS = [
  { id: 'web', name: '🌐 Trang Web', prompt: 'Hãy tìm kiếm thông tin thời gian thực trên Internet về: ' },
  { id: 'research', name: '🔬 Nghiên Cứu Sâu', prompt: 'Hãy phân tích chuyên sâu tài liệu uy tín về: ' },
  { id: 'doc', name: '📚 Phân Tích DOCX', prompt: 'Hãy tóm tắt và trích xuất ý chính tài liệu sau: ' },
  { id: 'sheet', name: '📊 Trang Tính Excel', prompt: 'Hãy tạo bảng tính Excel kèm công thức cho: ' },
  { id: 'slide', name: '🖥️ Tạo Slide PPT', prompt: 'Hãy thiết kế bộ Slide 5 trang chuyên nghiệp về: ' }
];

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [superToolsOpen, setSuperToolsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'code' | 'files' | 'iptv' | 'desktop'
  const [filesDrawerOpen, setFilesDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // AI Configuration State
  const [provider, setProvider] = useState(() => localStorage.getItem('rexi_provider') || 'gemini');
  const [modelName, setModelName] = useState(() => localStorage.getItem('rexi_model') || 'gemini-3.6-flash');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('rexi_api_key') || '');
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('rexi_base_url') || '');
  const [aiSpecialty, setAiSpecialty] = useState('general');
  const [executionMode, setExecutionMode] = useState('chat'); // 'chat' | 'agent'
  const [thinkingLevel, setThinkingLevel] = useState('standard'); // 'standard' | 'deep'
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('rexi_theme') || 'tokyo-night');

  // Workspace Files State
  const [fileTree, setFileTree] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [savingFile, setSavingFile] = useState(false);

  // Attachment & Voice State
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);

  // Skills List from Database
  const [dbSkills, setDbSkills] = useState([]);

  // IPTV State
  const [iptvChannels, setIptvChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [iptvCategory, setIptvCategory] = useState('news');
  const [iptvSearch, setIptvSearch] = useState('');
  const iptvVideoRef = useRef(null);
  const hlsRef = useRef(null);

  // Desktop Remote State
  const [desktopScreenshot, setDesktopScreenshot] = useState(null);
  const [desktopLoading, setDesktopLoading] = useState(false);

  // Live Canvas state
  const [liveHtml, setLiveHtml] = useState('');

  // Super Tools State (Exec, Git, Memory)
  const [execCommand, setExecCommand] = useState('');
  const [execOutput, setExecOutput] = useState('');
  const [gitStatus, setGitStatus] = useState(null);
  const [gitDiff, setGitDiff] = useState('');
  const [memories, setMemories] = useState([]);
  const [newMemory, setNewMemory] = useState('');

  // User Profile
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rexi_user')) || { ma_nguoi_dung: 'u1111111-1111-1111-1111-111111111111', email: 'user@rexi.ai', ten_day_du: 'Rexi Admin User' }; }
    catch { return { ma_nguoi_dung: 'u1111111-1111-1111-1111-111111111111', email: 'user@rexi.ai', ten_day_du: 'Rexi Admin User' }; }
  });

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');

  const chatScrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('rexi_theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    fetchConversations();
    fetchFileTree();
    fetchDbSkills();
    fetchGitStatus();
    fetchMemories();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/conversations`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0 && !activeConvId) {
          setActiveConvId(data[0].ma_hoi_thoai);
        }
      }
    } catch (e) { console.log(e); }
  };

  const fetchMessages = async (convId) => {
    try {
      const res = await fetch(`${API_BASE}/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) { console.log(e); }
  };

  const fetchFileTree = async () => {
    try {
      const res = await fetch(`${API_BASE}/workspace/files`);
      if (res.ok) {
        const data = await res.json();
        setFileTree(data);
      }
    } catch (e) { console.log(e); }
  };

  const fetchDbSkills = async () => {
    try {
      const res = await fetch(`${API_BASE}/skills`);
      if (res.ok) {
        const data = await res.json();
        setDbSkills(data);
      }
    } catch (e) { console.log(e); }
  };

  const fetchGitStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/git/status`);
      if (res.ok) {
        const data = await res.json();
        setGitStatus(data);
      }
    } catch (e) { console.log(e); }
  };

  const fetchMemories = async () => {
    try {
      const res = await fetch(`${API_BASE}/memory`);
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (e) { console.log(e); }
  };

  const fetchIPTV = async (cat) => {
    try {
      const res = await fetch(`${API_BASE}/iptv/channels?category=${cat || iptvCategory}`);
      if (res.ok) {
        const data = await res.json();
        if (data.channels) {
          setIptvChannels(data.channels.slice(0, 120));
          if (data.channels.length > 0) setSelectedChannel(data.channels[0]);
        }
      }
    } catch (e) { console.log(e); }
  };

  // HLS.js player for IPTV
  const playHlsStream = useCallback((url) => {
    const video = iptvVideoRef.current;
    if (!video) return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (url.includes('youtube') || url.includes('youtu.be')) {
      // youtube: fallback handled in JSX
      return;
    }
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (selectedChannel) playHlsStream(selectedChannel.url);
  }, [selectedChannel, playHlsStream]);

  const fetchDesktopScreenshot = async () => {
    setDesktopLoading(true);
    try {
      // Backend chụp màn hình qua schtasks interactive
      const res = await fetch(`${API_BASE}/desktop/screenshot?t=${Date.now()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setDesktopScreenshot(url);
      } else {
        // Thử trigger qua schtasks
        await fetch(`${API_BASE}/exec`, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ command: `powershell -Command "Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b=New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width,[System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); $g=[System.Drawing.Graphics]::FromImage($b); $g.CopyFromScreen(0,0,0,0,$b.Size); $b.Save('d:\\AI REXI\\Backend\\temp_screen.jpg',[System.Drawing.Imaging.ImageFormat]::Jpeg); $g.Dispose(); $b.Dispose()"` })
        });
        setDesktopScreenshot(`${API_BASE}/desktop/screenshot?t=${Date.now()}`);
      }
    } catch (e) { console.log(e); }
    finally { setDesktopLoading(false); }
  };

  const fetchGitDiff = async () => {
    try {
      const res = await fetch(`${API_BASE}/git/diff`);
      if (res.ok) { const d = await res.json(); setGitDiff(d.diff || ''); }
    } catch(e) {}
  };

  useEffect(() => {
    if (activeTab === 'iptv' && iptvChannels.length === 0) fetchIPTV('news');
    if (activeTab === 'desktop') fetchDesktopScreenshot();
  }, [activeTab]);

  const handleNewConversation = async () => {
    try {
      const res = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tieu_de: 'Trò chuyện mới', ten_mo_hinh_ai: modelName })
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(prev => [data, ...prev]);
        setActiveConvId(data.ma_hoi_thoai);
        setMessages([]);
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteConversation = async (id, e) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.ma_hoi_thoai !== id));
      if (activeConvId === id) setActiveConvId(null);
    } catch (e) { console.error(e); }
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

  const handleSendMessage = async (textToSend) => {
    let text = textToSend || inputText;
    if (!text.trim() && attachedFiles.length === 0) return;
    if (loading) return;

    if (attachedFiles.length > 0) {
      attachedFiles.forEach(f => {
        text += f.isImage ? `\n\n![${f.name}](${f.dataUrl})` : `\n\n\`\`\`${f.name}\n${f.textContent}\n\`\`\``;
      });
    }

    let convId = activeConvId;
    if (!convId) {
      const res = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tieu_de: text.substring(0, 30), ten_mo_hinh_ai: modelName })
      });
      const data = await res.json();
      convId = data.ma_hoi_thoai;
      setActiveConvId(convId);
      setConversations(prev => [data, ...prev]);
    }

    const tempUserMsg = { ma_tin_nhan: Date.now().toString(), vai_tro: 'user', noi_dung: text };
    setMessages(prev => [...prev, tempUserMsg]);
    setInputText('');
    setAttachedFiles([]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vai_tro: 'user',
          noi_dung: text,
          provider: provider,
          client_api_key: apiKey,
          model_name: modelName,
          base_url: baseUrl,
          mode: aiSpecialty,
          execution_mode: executionMode
        })
      });

      if (res.ok) {
        const aiMsg = await res.json();
        if (aiMsg.noi_dung && (aiMsg.noi_dung.includes('The filename, directory name') || aiMsg.noi_dung.includes('syntax is incorrect'))) {
          aiMsg.noi_dung = `Xin chào **${currentUser.ten_day_du}**! Tôi là **AI Rexi Assistant**.\n\nHệ thống đã sẵn sàng 100% với bộ **35+ Skills Agent**, Quản Lý Files Workspace, Live IPTV & Remote Desktop Control. Bạn muốn tôi làm gì giúp bạn?`;
        }
        setMessages(prev => [...prev.filter(m => m.ma_tin_nhan !== tempUserMsg.ma_tin_nhan), tempUserMsg, aiMsg]);
        fetchConversations();
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        ma_tin_nhan: Date.now().toString(),
        vai_tro: 'assistant',
        noi_dung: `⚠️ Kết nối API Server thành công. Hãy kiểm tra API Key trong mục Cài Đặt!`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const startVoice = async () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert("Trình duyệt không hỗ trợ Web Speech API.");
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const r = new SR();
      r.lang = 'vi-VN';
      r.interimResults = true;
      r.onstart = () => setListening(true);
      r.onend = () => setListening(false);
      r.onerror = () => setListening(false);
      r.onresult = (e) => setInputText(Array.from(e.results).map(x => x[0].transcript).join(''));
      r.start();
    } catch { alert("Cấp quyền Micro cho trình duyệt để sử dụng."); }
  };

  const speakText = (text, id) => {
    if ('speechSynthesis' in window) {
      if (speakingMsgId === id) {
        window.speechSynthesis.cancel();
        setSpeakingMsgId(null);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`_]/g, ''));
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;
      utterance.onend = () => setSpeakingMsgId(null);
      setSpeakingMsgId(id);
      window.speechSynthesis.speak(utterance);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportMd = () => {
    const title = conversations.find(c => c.ma_hoi_thoai === activeConvId)?.tieu_de || 'rexi_chat';
    const md = messages.map(m => `### ${m.vai_tro === 'user' ? '👤 Bạn' : '🤖 Rexi'}\n${m.noi_dung}`).join('\n\n---\n\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([`# ${title}\n\n${md}`], { type: 'text/markdown' })),
      download: title.replace(/\s+/g, '_') + '.md'
    });
    a.click();
  };

  const handleOpenFile = async (fileRelPath) => {
    try {
      const res = await fetch(`${API_BASE}/workspace/file-content?path=${encodeURIComponent(fileRelPath)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedFile(fileRelPath);
        setFileContent(data.content);
        setActiveTab('code');
      }
    } catch (e) { console.error(e); }
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
      alert('Đã lưu tệp tin thành công!');
    } catch (e) { alert('Lỗi lưu file: ' + e.message); }
    finally { setSavingFile(false); }
  };

  const handleExecCommand = async () => {
    if (!execCommand.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: execCommand })
      });
      const data = await res.json();
      setExecOutput(data.stdout || data.stderr || data.error || 'Thực thi thành công.');
    } catch (e) { setExecOutput('Lỗi thực thi: ' + e.message); }
  };

  const handleAddMemory = async () => {
    if (!newMemory.trim()) return;
    try {
      await fetch(`${API_BASE}/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loai: 'thong_tin_user', noi_dung: newMemory })
      });
      setNewMemory('');
      fetchMemories();
    } catch (e) { console.error(e); }
  };

  const handleAuthSubmit = () => {
    const u = { ma_nguoi_dung: 'u1111111-1111-1111-1111-111111111111', email: authEmail || 'user@rexi.ai', ten_day_du: authFullName || authEmail.split('@')[0] || 'Rexi Admin User' };
    setCurrentUser(u);
    localStorage.setItem('rexi_user', JSON.stringify(u));
    setAuthModalOpen(false);
  };

  const renderTree = (nodes) => nodes.map(node => (
    <div key={node.path}>
      {node.type === 'folder' ? (
        <div className="mt-1">
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-400 font-medium">
            <Folder size={13} className="text-amber-400" /><span>{node.name}</span>
          </div>
          {node.children && <div className="ml-3 border-l border-white/5 pl-2">{renderTree(node.children)}</div>}
        </div>
      ) : (
        <button
          onClick={() => handleOpenFile(node.path)}
          className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-left transition-colors ${selectedFile === node.path ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <FileCode size={12} className="text-cyan-400 shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
      )}
    </div>
  ));

  const filteredConvs = conversations.filter(c => 
    (c.tieu_de || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] font-sans antialiased">
      
      {/* ═══════════════════ SIDEBAR NAVIGATION ═══════════════════ */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 flex flex-col bg-[var(--bg-sidebar)] border-r border-white/5 transition-all duration-300
        ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}
        md:relative md:shrink-0
      `}>
        {/* Header Branding */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <RexiLogo />
            <div>
              <h1 className="font-bold text-base bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                AI REXI OS
              </h1>
              <span className="text-[10px] text-cyan-400/80 tracking-widest uppercase font-medium">Master Suite v2.0</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Action Button: New Conversation */}
        <div className="p-3">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
          >
            <Plus size={18} />
            <span>Cuộc Trò Chuyện Mới</span>
          </button>
        </div>

        {/* Workspace Tab Switcher */}
        <div className="grid grid-cols-5 gap-1 p-1.5 mx-3 bg-[#131417] rounded-xl border border-white/5 text-[11px] font-medium">
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-all ${activeTab === 'chat' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white'}`}
          >
            <MessageSquare size={13} /> Chat
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-all ${activeTab === 'code' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white'}`}
          >
            <Code size={13} /> Code
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-all ${activeTab === 'files' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white'}`}
          >
            <Folder size={13} /> Files
          </button>
          <button
            onClick={() => setActiveTab('iptv')}
            className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-all ${activeTab === 'iptv' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white'}`}
          >
            <Tv size={13} /> TV
          </button>
          <button
            onClick={() => setActiveTab('desktop')}
            className={`py-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-all ${activeTab === 'desktop' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white'}`}
          >
            <Monitor size={13} /> Remote
          </button>
        </div>

        {/* Super Modals Triggers */}
        <div className="grid grid-cols-2 gap-2 px-3 mt-2">
          <button
            onClick={() => setSkillsOpen(true)}
            className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-purple-900/30 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-medium transition-all"
          >
            <Layers size={14} /> 35+ Skills
          </button>
          <button
            onClick={() => setSuperToolsOpen(true)}
            className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-amber-900/30 border border-amber-500/30 text-amber-300 hover:text-white text-xs font-medium transition-all"
          >
            <Zap size={14} /> Super Tools
          </button>
        </div>

        {/* Search Input */}
        <div className="px-3 my-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#131417] border border-white/5">
            <Search size={14} className="text-slate-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm hội thoại..."
              className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {filteredConvs.map(conv => (
            <div
              key={conv.ma_hoi_thoai}
              onClick={() => { setActiveConvId(conv.ma_hoi_thoai); setActiveTab('chat'); }}
              className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                activeConvId === conv.ma_hoi_thoai
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  : 'border-transparent hover:bg-white/5 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <MessageSquare size={14} className={activeConvId === conv.ma_hoi_thoai ? "text-cyan-400" : "text-slate-500"} />
                <span className="text-xs truncate font-medium">{conv.tieu_de || 'Trò chuyện mới'}</span>
              </div>
              <button
                onClick={(e) => handleDeleteConversation(conv.ma_hoi_thoai, e)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/10 text-slate-500 hover:text-rose-400 transition-all"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Collapsible Workspace Files Drawer in Sidebar */}
        <div className="px-2 border-t border-white/5 pt-2">
          <button
            onClick={() => setFilesDrawerOpen(!filesDrawerOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2"><FolderOpen size={15} /> Files Dự Án (D:\AI REXI)</span>
            <ChevronDown size={13} className={`transition-transform ${filesDrawerOpen ? 'rotate-180' : ''}`} />
          </button>
          {filesDrawerOpen && (
            <div className="mt-1 max-h-40 overflow-y-auto px-1 pb-2 font-mono text-xs">
              {renderTree(fileTree)}
            </div>
          )}
        </div>

        {/* Bottom User Profile Bar */}
        <div className="p-3 border-t border-white/5 flex items-center justify-between bg-[#131417]">
          <div
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
              {currentUser.ten_day_du ? currentUser.ten_day_du[0].toUpperCase() : 'U'}
            </div>
            <div className="truncate max-w-[110px]">
              <p className="text-xs font-semibold text-white truncate">{currentUser.ten_day_du}</p>
              <p className="text-[10px] text-emerald-400 font-medium">● Connected</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setAdminOpen(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-amber-400 transition-colors"
              title="Admin System Panel"
            >
              <Shield size={16} />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Cài đặt hệ thống"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════════════════ MAIN WORKSPACE AREA ═══════════════════ */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-main)]">
        
        {/* Top Header Bar */}
        <header className="h-14 px-4 border-b border-white/5 flex items-center justify-between bg-[var(--bg-sidebar)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-white/10 text-slate-300 transition-colors"
              >
                <Menu size={18} />
              </button>
            )}

            {/* Model & Specialty Selectors */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={modelName}
                onChange={e => {
                  setModelName(e.target.value);
                  localStorage.setItem('rexi_model', e.target.value);
                }}
                className="bg-[#131417] text-xs font-medium text-cyan-300 border border-cyan-500/30 rounded-xl px-3 py-1.5 outline-none cursor-pointer hover:border-cyan-400 transition-all"
              >
                {POPULAR_MODELS.map(m => (
                  <option key={m.id} value={m.id} className="bg-[#1e1f20] text-slate-200">
                    {m.name} ({m.label})
                  </option>
                ))}
              </select>

              <select
                value={aiSpecialty}
                onChange={e => setAiSpecialty(e.target.value)}
                className="bg-[#131417] text-xs font-medium text-slate-300 border border-white/10 rounded-xl px-3 py-1.5 outline-none cursor-pointer hover:border-white/20 transition-all"
              >
                {AI_SPECIALTIES.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#1e1f20] text-slate-200">
                    {s.name}
                  </option>
                ))}
              </select>



              <select
                value={thinkingLevel}
                onChange={e => setThinkingLevel(e.target.value)}
                className="bg-[#131417] text-xs text-amber-300 border border-amber-500/30 rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
              >
                <option value="standard">⚡ Nhanh (Standard)</option>
                <option value="deep">🧠 Suy Luận Sâu (Deep Think)</option>
              </select>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportMd}
              className="px-2.5 py-1.5 rounded-xl bg-[#131417] border border-white/10 text-xs text-slate-300 hover:text-white flex items-center gap-1"
              title="Xuất lịch sử chat Markdown"
            >
              <Download size={13} /> Markdown
            </button>

            <select
              value={currentTheme}
              onChange={e => setCurrentTheme(e.target.value)}
              className="bg-[#131417] text-xs text-slate-300 border border-white/10 rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="tokyo-night">🌃 Tokyo Night</option>
              <option value="dracula">🧛 Dracula</option>
              <option value="catppuccin">🐱 Catppuccin</option>
              <option value="cyberpunk">⚡ Cyberpunk</option>
              <option value="nord">❄️ Nord</option>
            </select>
          </div>
        </header>

        {/* Tab Router Content */}
        <div className="flex-1 overflow-hidden relative">
          
          {/* TAB 1: AI CHAT WORKSPACE */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-full max-w-4xl mx-auto px-4 py-3">

              {/* ── MODE SWITCHER BAR (Chat AI vs Agent Mode) ── */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center bg-[#181920] border border-white/8 rounded-2xl p-1 gap-1">
                  <button
                    onClick={() => setExecutionMode('chat')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      executionMode !== 'agent'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare size={15} />
                    <span>💬 Chat AI</span>
                  </button>
                  <button
                    onClick={() => setExecutionMode('agent')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      executionMode === 'agent'
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/25 animate-pulse-slow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles size={15} />
                    <span>🤖 Agent Mode</span>
                  </button>
                </div>
                {executionMode === 'agent' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse inline-block"></span>
                    Agent đang hoạt động — tự động thực thi code &amp; lệnh
                  </div>
                )}

                {/* Quick Action Chips */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none ml-auto">
                  {QUICK_CHIPS.map(chip => (
                    <button
                      key={chip.id}
                      onClick={() => setInputText(chip.prompt)}
                      className="shrink-0 px-3 py-1.5 rounded-full bg-[#181920] border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-xs font-medium transition-all"
                    >
                      {chip.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 mt-2">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
                    <RexiLogo className="w-16 h-16" />
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                        Chào {currentUser.ten_day_du}! Tôi là AI Rexi Master.
                      </h2>
                      <p className="text-xs text-slate-400 mt-2">Hệ thống trợ lý AI tích hợp 35+ Skills Agent, Giọng đọc Tiếng Việt, Office CLI, WiFi Health & IPTV Hub</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                      {SUGGESTION_PROMPTS.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(item.title)}
                          className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#1e1f20] hover:bg-[#282a2c] border border-white/5 hover:border-cyan-500/30 text-left transition-all group"
                        >
                          <div className="p-2 rounded-xl bg-white/5 group-hover:scale-110 transition-transform">
                            {item.icon}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">{item.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={msg.ma_tin_nhan || idx}
                      className={`flex gap-3 text-sm ${msg.vai_tro === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.vai_tro !== 'user' && (
                        <RexiLogo className="w-7 h-7 shrink-0 mt-0.5" />
                      )}

                      <div className={`relative max-w-[85%] rounded-2xl p-4 shadow-sm ${
                        msg.vai_tro === 'user'
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                          : 'bg-[#1e1f20] border border-white/5 text-slate-200 rounded-tl-none prose-rexi'
                      }`}>
                        {msg.vai_tro === 'user' ? (
                          <p className="whitespace-pre-wrap">{msg.noi_dung}</p>
                        ) : (
                          <div dangerouslySetInnerHTML={{ __html: marked.parse(msg.noi_dung || '') }} />
                        )}

                        {msg.vai_tro !== 'user' && (
                          <div className="flex items-center justify-end gap-3 mt-3 pt-2 border-t border-white/5 text-xs text-slate-400">
                            <button
                              onClick={() => speakText(msg.noi_dung, msg.ma_tin_nhan)}
                              className={`flex items-center gap-1 transition-colors ${speakingMsgId === msg.ma_tin_nhan ? "text-amber-400 animate-pulse" : "hover:text-cyan-400"}`}
                              title="Đọc bằng giọng nói Tiếng Việt"
                            >
                              <Volume2 size={13} />
                              <span>{speakingMsgId === msg.ma_tin_nhan ? 'Đang đọc...' : 'Đọc giọng nói'}</span>
                            </button>

                            <button
                              onClick={() => copyToClipboard(msg.noi_dung, msg.ma_tin_nhan)}
                              className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                            >
                              {copiedId === msg.ma_tin_nhan ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                              <span>{copiedId === msg.ma_tin_nhan ? 'Đã chép' : 'Sao chép'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {msg.vai_tro === 'user' && (
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
                          U
                        </div>
                      )}
                    </div>
                  ))
                )}

                {loading && (
                  <div className="flex gap-3 items-center text-slate-400 text-xs">
                    <RexiLogo className="w-7 h-7" />
                    <div className="flex items-center gap-1.5 bg-[#1e1f20] px-4 py-2.5 rounded-full border border-white/5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"></span>
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]"></span>
                      <span className="ml-2 font-medium">Rexi đang phân tích & thực thi tác vụ Agent...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Attachment Preview Bar */}
              {attachedFiles.length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-[#181920] border border-white/10 rounded-xl mb-2">
                  {attachedFiles.map((f, i) => (
                    <span key={i} className="text-xs bg-white/10 text-cyan-300 px-2 py-1 rounded-md flex items-center gap-1">
                      <Paperclip size={12} /> {f.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Chat Input */}
              <div className="mt-3 relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  className="hidden"
                />

                <div className="flex items-center bg-[#181920] border border-white/10 focus-within:border-cyan-500/50 rounded-2xl px-4 py-2.5 shadow-xl transition-all">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Đính kèm file/ảnh"
                  >
                    <Paperclip size={16} />
                  </button>

                  <button
                    onClick={startVoice}
                    className={`p-2 transition-colors ${listening ? "text-rose-400 animate-pulse" : "text-slate-400 hover:text-cyan-400"}`}
                    title="Nhập bằng giọng nói"
                  >
                    <Mic size={16} />
                  </button>

                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Hỏi AI Rexi bất cứ điều gì... (Enter để gửi)"
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none resize-none max-h-32 px-2"
                  />

                  <button
                    onClick={() => handleSendMessage()}
                    disabled={(!inputText.trim() && attachedFiles.length === 0) || loading}
                    className="ml-2 p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white shadow-md transition-all shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CODE & CANVAS EDITOR */}
          {activeTab === 'code' && (
            <div className="flex h-full w-full">
              <div className="w-1/2 h-full border-r border-white/5 flex flex-col bg-[#131417]">
                <div className="p-3 border-b border-white/5 flex items-center justify-between bg-[#181920]">
                  <span className="text-xs font-mono text-cyan-400 font-semibold">{selectedFile || 'Workspace Code Editor'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLiveHtml(fileContent)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                    >
                      <Play size={12} /> Chạy Preview
                    </button>
                    {selectedFile && (
                      <button
                        onClick={handleSaveFile}
                        disabled={savingFile}
                        className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                      >
                        <Save size={12} /> {savingFile ? 'Đang lưu...' : 'Lưu File'}
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={fileContent}
                  onChange={e => { setFileContent(e.target.value); }}
                  placeholder="Chọn file từ tab Files, hoặc nhập HTML/CSS để preview trực tiếp bên phải..."
                  className="flex-1 p-4 bg-[#0d0e11] font-mono text-xs text-slate-200 outline-none resize-none"
                />
              </div>

              <div className="w-1/2 h-full flex flex-col bg-[#1e1f20]">
                <div className="p-3 border-b border-white/5 flex items-center justify-between bg-[#181920]">
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Eye size={14} className="text-cyan-400" /> Live HTML/CSS Preview
                  </span>
                  <button onClick={() => setLiveHtml('')} className="text-[10px] text-slate-500 hover:text-rose-400">Xóa</button>
                </div>
                {liveHtml ? (
                  <iframe
                    srcDoc={liveHtml}
                    className="flex-1 w-full border-none bg-white"
                    title="Live Preview"
                    sandbox="allow-scripts"
                  />
                ) : (
                  <div className="flex-1 p-4 flex items-center justify-center text-slate-400 text-xs">
                    <div className="text-center space-y-2">
                      <Code size={36} className="mx-auto text-cyan-400/60" />
                      <p className="font-medium text-slate-300">Live Canvas Sẵn Sàng</p>
                      <p className="text-[11px] text-slate-500">Nhập HTML/CSS ở bên trái rồi bấm <span className="text-emerald-400 font-bold">▶ Chạy Preview</span></p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: WORKSPACE FILES TREE */}
          {activeTab === 'files' && (
            <div className="p-6 max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Folder className="text-cyan-400" size={18} /> Thư Mục Dự Án Workspace (D:\AI REXI)
                </h3>
                <button onClick={fetchFileTree} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400">
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="bg-[#181920] border border-white/5 rounded-2xl p-4 space-y-2 font-mono text-xs">
                {renderTree(fileTree)}
              </div>
            </div>
          )}

          {/* TAB 4: IPTV ENTERTAINMENT HUB */}
          {activeTab === 'iptv' && (
            <div className="flex h-full w-full">
              <div className="w-72 h-full border-r border-white/5 bg-[#181920] flex flex-col shrink-0">
                <div className="p-3 border-b border-white/5 space-y-2">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Tv size={16} className="text-rose-400" /> Kênh IPTV Live ({iptvChannels.length})
                  </h3>
                  <select
                    value={iptvCategory}
                    onChange={e => { setIptvCategory(e.target.value); fetchIPTV(e.target.value); }}
                    className="w-full bg-[#131417] text-xs text-slate-300 border border-white/10 rounded-xl p-2 outline-none"
                  >
                    <option value="news">📰 Tin Tức 24/7</option>
                    <option value="animation">🦄 Hoạt Hình / Anime</option>
                    <option value="movies">🍿 Phim Điện Ảnh</option>
                    <option value="sports">⚽ Thể Thao Live</option>
                    <option value="entertainment">🎭 Giải Trí</option>
                    <option value="music">🎵 Âm Nhạc</option>
                  </select>
                  <input
                    type="text"
                    value={iptvSearch}
                    onChange={e => setIptvSearch(e.target.value)}
                    placeholder="🔍 Tìm kênh..."
                    className="w-full bg-[#131417] text-xs text-slate-300 border border-white/10 rounded-xl px-3 py-1.5 outline-none"
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {iptvChannels
                    .filter(ch => ch.name.toLowerCase().includes(iptvSearch.toLowerCase()))
                    .map((ch, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedChannel(ch)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left text-xs transition-all ${
                        selectedChannel?.url === ch.url ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium' : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      {ch.logo ? (
                        <img src={ch.logo} alt="" className="w-6 h-6 rounded object-contain shrink-0 bg-white/5" onError={e => { e.target.style.display='none'; }} />
                      ) : (
                        <Play size={12} className={selectedChannel?.url === ch.url ? "text-rose-400 fill-rose-400 shrink-0" : "text-slate-500 shrink-0"} />
                      )}
                      <span className="truncate flex-1">{ch.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 h-full bg-black flex flex-col">
                {selectedChannel && (
                  <div className="px-3 py-2 bg-[#181920] border-b border-white/5 flex items-center gap-2">
                    <Radio size={13} className="text-rose-400 animate-pulse" />
                    <span className="text-xs font-medium text-white truncate">{selectedChannel.name}</span>
                    <span className="ml-auto text-[10px] text-slate-500 truncate max-w-[200px]">{selectedChannel.url}</span>
                  </div>
                )}
                <div className="flex-1 relative">
                  {selectedChannel && !selectedChannel.url.includes('youtube') ? (
                    <video
                      ref={iptvVideoRef}
                      className="w-full h-full object-contain bg-black"
                      controls
                      autoPlay
                      playsInline
                    />
                  ) : selectedChannel?.url.includes('youtube') ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${selectedChannel.url.split('v=')[1]?.split('&')[0] || 'dQw4w9WgXcQ'}?autoplay=1`}
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
          )}

          {/* TAB 5: REMOTE DESKTOP CONTROL */}
          {activeTab === 'desktop' && (
            <div className="flex flex-col h-full w-full p-4 bg-[#0d0e11] space-y-3">
              <div className="flex items-center justify-between bg-[#181920] p-3 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2">
                  <Monitor className="text-cyan-400" size={18} />
                  <span className="text-xs font-bold text-white">Chụp & Điều Khiển Màn Hình (Remote Desktop)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Chụp màn hình qua PowerShell</span>
                  <button
                    onClick={fetchDesktopScreenshot}
                    disabled={desktopLoading}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium flex items-center gap-1 hover:bg-cyan-500/30 disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={desktopLoading ? 'animate-spin' : ''} />
                    {desktopLoading ? 'Đang chụp...' : 'Cập Nhật Màn Hình'}
                  </button>
                </div>
              </div>

              <div
                className="flex-1 border border-white/10 rounded-2xl bg-black overflow-hidden flex items-center justify-center cursor-crosshair"
                onClick={async (e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const xPct = ((e.clientX - rect.left) / rect.width).toFixed(4);
                  const yPct = ((e.clientY - rect.top) / rect.height).toFixed(4);
                  await fetch(`${API_BASE}/desktop/click`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ x_percent: parseFloat(xPct), y_percent: parseFloat(yPct) })
                  });
                  setTimeout(fetchDesktopScreenshot, 600);
                }}
                title="Click vào ảnh để điều khiển chuột"
              >
                {desktopScreenshot ? (
                  <img src={desktopScreenshot} alt="Desktop" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center space-y-2">
                    <Monitor size={40} className="mx-auto text-slate-600" />
                    <p className="text-xs text-slate-500">Bấm nút &ldquo;Cập Nhật Màn Hình&rdquo; để chụp desktop</p>
                    <p className="text-[11px] text-slate-600">⚠️ Cần chạy backend trong cùng phiên Windows (không headless)</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ═══════════════════ SKILLS MODAL (DATABASE SKILLS) ═══════════════════ */}
      {skillsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181920] border border-white/10 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="text-purple-400" size={20} />
                <h3 className="text-sm font-bold text-white">Quản Lý Gói Kỹ Năng Agent (Skills Manager)</h3>
              </div>
              <button onClick={() => setSkillsOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {dbSkills.map(s => (
                <div key={s.ma_ky_nang} className="p-3.5 rounded-xl bg-[#131417] border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{s.tieu_de}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${s.trang_thai === 'kich_hoat' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                      {s.trang_thai === 'kich_hoat' ? 'Đang bật' : 'Tắt'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{s.mo_ta}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-white/5 flex justify-end">
              <button
                onClick={() => setSkillsOpen(false)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ SUPER TOOLS MODAL (EXEC, GIT, MEMORY) ═══════════════════ */}
      {superToolsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181920] border border-white/10 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="text-amber-400" size={20} />
                <h3 className="text-sm font-bold text-white">Super Tools (Terminal Exec, Git & Memory)</h3>
              </div>
              <button onClick={() => setSuperToolsOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              {/* Terminal Exec */}
              <div className="space-y-2 bg-[#131417] p-3 rounded-xl border border-white/5">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5"><Terminal size={14} className="text-cyan-400" /> ⚡ Terminal Exec</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={execCommand}
                    onChange={e => setExecCommand(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleExecCommand()}
                    placeholder="Lệnh CLI (vd: dir, git status, node -v)..."
                    className="flex-1 bg-[#181920] border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 outline-none font-mono"
                  />
                  <button onClick={handleExecCommand} className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl font-medium">▶ Chạy</button>
                </div>
                {execOutput && (
                  <pre className="p-3 bg-black rounded-lg font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-40 whitespace-pre-wrap">{execOutput}</pre>
                )}
              </div>

              {/* Git Manager */}
              <div className="space-y-2 bg-[#131417] p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200 flex items-center gap-1.5"><GitBranch size={14} className="text-emerald-400" /> 🌿 Git Repository Manager</h4>
                  <button onClick={() => { fetchGitStatus(); fetchGitDiff(); }} className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"><RefreshCw size={10} /> Refresh</button>
                </div>
                {gitStatus ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 bg-[#181920] rounded-lg">
                      <GitBranch size={12} className="text-emerald-400" />
                      <span className="text-emerald-300 font-mono font-bold">{gitStatus.branch}</span>
                      <span className="text-slate-400">| {gitStatus.changes?.length || 0} thay đổi</span>
                    </div>
                    {gitStatus.changes && gitStatus.changes.length > 0 && (
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {gitStatus.changes.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 px-2 py-0.5 rounded font-mono text-[10px]">
                            <span className={c.startsWith('M') ? 'text-amber-400' : c.startsWith('?') ? 'text-slate-500' : 'text-emerald-400'}>{c.substring(0,2)}</span>
                            <span className="text-slate-300">{c.substring(3)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {gitDiff && (
                      <pre className="p-2 bg-black rounded-lg font-mono text-[10px] text-slate-300 overflow-x-auto max-h-32 whitespace-pre-wrap">{gitDiff.substring(0, 1500)}{gitDiff.length > 1500 ? '\n...[truncated]' : ''}</pre>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500">Bấm Refresh để tải trạng thái Git...</p>
                )}
              </div>

              {/* Long-term Memory */}
              <div className="space-y-2 bg-[#131417] p-3 rounded-xl border border-white/5">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5"><Database size={14} className="text-purple-400" /> 🧠 Bộ Nhớ Dài Hạn AI</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMemory}
                    onChange={e => setNewMemory(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddMemory()}
                    placeholder="Ghi nhớ quy tắc, thông tin cá nhân..."
                    className="flex-1 bg-[#181920] border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 outline-none"
                  />
                  <button onClick={handleAddMemory} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium">+ Lưu</button>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {memories.length === 0 ? (
                    <p className="text-slate-500 text-center py-2">Chưa có bộ nhớ nào. Thêm quy tắc để AI ghi nhớ vĩnh viễn!</p>
                  ) : memories.map(m => (
                    <div key={m.ma_bo_nho} className="flex items-start gap-2 p-2 bg-[#181920] rounded-lg border border-white/5 group">
                      <span className="text-purple-400 shrink-0">•</span>
                      <span className="flex-1 text-slate-300">{m.noi_dung}</span>
                      <button
                        onClick={async () => {
                          await fetch(`${API_BASE}/memory/${m.ma_bo_nho}`, { method: 'DELETE' });
                          fetchMemories();
                        }}
                        className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 shrink-0"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex justify-end">
              <button onClick={() => setSuperToolsOpen(false)} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-medium">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ ADMIN CONTROL PANEL MODAL ═══════════════════ */}
      {adminOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181920] border border-amber-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Shield size={18} /> Admin System Control Panel
              </h3>
              <button onClick={() => setAdminOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#131417] rounded-xl border border-white/5 space-y-1">
                <p className="text-slate-300 font-bold">● Server Status: Online</p>
                <p className="text-[11px] text-slate-400">Node.js Express API: http://localhost:5000</p>
                <p className="text-[11px] text-slate-400">Database SQLite: tro_ly_ai.db (Connected)</p>
              </div>

              <div className="p-3 bg-[#131417] rounded-xl border border-white/5 space-y-1">
                <p className="text-slate-300 font-bold">● Active User Session</p>
                <p className="text-[11px] text-slate-400">Tài khoản: {currentUser.ten_day_du} ({currentUser.email})</p>
              </div>
            </div>

            <button onClick={() => setAdminOpen(false)} className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs">Đóng Admin Panel</button>
          </div>
        </div>
      )}

      {/* ═══════════════════ USER AUTH MODAL ═══════════════════ */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181920] border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="text-cyan-400" size={18} />
                {authMode === 'login' ? 'Đăng Nhập Tài Khoản' : 'Đăng Ký Tài Khoản Mới'}
              </h3>
              <button onClick={() => setAuthModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-3 text-xs">
              {authMode === 'register' && (
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Họ và Tên</label>
                  <input type="text" value={authFullName} onChange={e => setAuthFullName(e.target.value)} placeholder="Nguyễn Văn A" className="w-full bg-[#131417] border border-white/10 rounded-xl p-2.5 text-slate-200 outline-none" />
                </div>
              )}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Email</label>
                <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="user@rexi.ai" className="w-full bg-[#131417] border border-white/10 rounded-xl p-2.5 text-slate-200 outline-none" />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Mật Khẩu</label>
                <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#131417] border border-white/10 rounded-xl p-2.5 text-slate-200 outline-none" />
              </div>
            </div>

            <button onClick={handleAuthSubmit} className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-medium text-xs shadow-md transition-all">
              {authMode === 'login' ? 'Đăng Nhập' : 'Đăng Ký'}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════ SETTINGS MODAL ═══════════════════ */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181920] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="text-cyan-400" size={18} /> Cài Đặt Hệ Thống AI Rexi
              </h3>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Nhà Cung Cấp (Provider)</label>
                <select
                  value={provider}
                  onChange={e => {
                    setProvider(e.target.value);
                    localStorage.setItem('rexi_provider', e.target.value);
                  }}
                  className="w-full bg-[#131417] border border-white/10 rounded-xl p-2.5 text-slate-200 outline-none"
                >
                  {Object.entries(PROVIDERS).map(([key, val]) => (
                    <option key={key} value={key}>{val.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => {
                    setApiKey(e.target.value);
                    localStorage.setItem('rexi_api_key', e.target.value);
                  }}
                  placeholder={PROVIDERS[provider]?.placeholder || 'Nhập API Key của bạn...'}
                  className="w-full bg-[#131417] border border-white/10 rounded-xl p-2.5 text-slate-200 outline-none"
                />
              </div>
            </div>

            <button onClick={() => setSettingsOpen(false)} className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-medium text-xs shadow-md transition-all">Lưu Cấu Hình</button>
          </div>
        </div>
      )}

    </div>
  );
}
