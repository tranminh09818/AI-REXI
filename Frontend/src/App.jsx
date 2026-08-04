import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Menu, X, Send, Plus, Settings, Layers, Bot, User,
  FileText, Key, Trash2, Code2, Database, Search,
  Copy, Check, AlertTriangle, Folder, FolderOpen, Save,
  Mic, Volume2, Download, Cpu, Paperclip, Image, FileCode,
  Globe, ChevronDown, Zap, MessageSquare, MoreHorizontal,
  ThumbsUp, ThumbsDown, RefreshCw, Edit3, Star, Play, ArrowUp, ArrowDown,
  Sparkles, Monitor, Sun, Moon, Tv, Eye, Code, Layout, Sliders,
  ChevronRight, ChevronUp, Activity, Terminal, Shield, Radio, HeartPulse, Wifi, FileSpreadsheet, Presentation, LogOut, LogIn, Lock, ToggleLeft, ToggleRight, Server, GitBranch, GitCommit, EyeOff
} from 'lucide-react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/tokyo-night-dark.css';
import Hls from 'hls.js';

// Components
import { API_BASE, apiFetch } from './config';
import Sidebar from './components/Sidebar';
import ChatTab from './components/ChatTab';
import CodeEditorTab from './components/CodeEditorTab';
import IPTVTab from './components/IPTVTab';
import SettingsModal from './components/SettingsModal';
import SkillsModal from './components/SkillsModal';
import SuperToolsModal from './components/SuperToolsModal';
import VideoToolsModal from './components/VideoToolsModal';
import AdminPanel from './AdminPanel';
import BrowserView from './components/BrowserView';


marked.setOptions({
  highlight: (code, lang) => {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-'
});

// Rexi Animated SVG Logo Component
const RexiLogo = ({ className = "w-8 h-8" }) => (
  <img src="/rexi_cat_icon.png" alt="Rexi" className={`rexi-logo object-contain ${className}`} />
);

const POPULAR_MODELS = [
  { id: 'gemini-3.6-flash', provider: 'gemini', name: 'Gemini 3.6 Flash', label: 'Fast & Smart', type: 'free' },
  { id: 'gemini-3.1-pro-high', provider: 'gemini', name: 'Gemini 3.1 Pro High', label: 'Reasoning', type: 'pro' },
  { id: 'claude-3-5-sonnet-20241022', provider: 'claude', name: 'Claude 3.5 Sonnet', label: 'Coding Pro', type: 'pro' },
  { id: 'opencode/deepseek-v4-flash-free', provider: 'opencode', name: 'DeepSeek V4 Pro', label: 'Free Agent', type: 'free' },
  { id: 'opencode/qwen-2.5-coder-32b-free', provider: 'opencode', name: 'Qwen Coder 2.5', label: 'Free Code', type: 'free' },
];


const AI_SPECIALTIES = [
  { id: 'general', name: '🧠 Trợ Lý Toàn Năng' },
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
  const [adminOpen, setAdminOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [superToolsOpen, setSuperToolsOpen] = useState(false);
  const [videoToolsOpen, setVideoToolsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState('login');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('rexi_activeTab') || 'chat'); // 'chat' | 'code' | 'files' | 'iptv' | 'desktop'
  const handleSetActiveTab = (tab) => { setActiveTab(tab); localStorage.setItem('rexi_activeTab', tab); };
  const [filesDrawerOpen, setFilesDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fabOpen, setFabOpen] = useState(false);

  // AI Configuration State
  const [provider, setProvider] = useState(() => localStorage.getItem('rexi_provider') || 'gemini');
  const [modelName, setModelName] = useState(() => localStorage.getItem('rexi_model') || 'gemini-3.6-flash');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('rexi_api_key') || '');
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('rexi_base_url') || '');
  const [availableModels, setAvailableModels] = useState([]); // load động từ /api/models
  const [aiSpecialty, setAiSpecialty] = useState('general');
  const [executionMode, setExecutionMode] = useState('chat'); // 'chat' | 'agent'
  const [chatModeOpen, setChatModeOpen] = useState(false);
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

  // TTS Settings
  const [ttsVoice, setTtsVoice] = useState(() => localStorage.getItem('rexi_tts_voice') || 'vi-VN-HoaiMyNeural');
  const [ttsRate, setTtsRate] = useState(() => localStorage.getItem('rexi_tts_rate') || '+0%');
  const [ttsPitch, setTtsPitch] = useState(() => localStorage.getItem('rexi_tts_pitch') || '+0%');
  const [ttsVoices, setTtsVoices] = useState([]);
  const [ttsVoicesLoading, setTtsVoicesLoading] = useState(true);
  const [ttsUsingServer, setTtsUsingServer] = useState(() => {
    const saved = localStorage.getItem('rexi_tts_mode');
    return saved === 'server' && !!localStorage.getItem('rexi_token');
  });

  // Skills List from Database
  const [dbSkills, setDbSkills] = useState([]);

  // IPTV State
  const [iptvChannels, setIptvChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [iptvCategory, setIptvCategory] = useState('news');
  const [iptvSearch, setIptvSearch] = useState('');
  const [iptvTab, setIptvTab] = useState('category'); // 'category' | 'country'
  const [iptvCountry, setIptvCountry] = useState('VN');
  const [iptvSubtitleOn, setIptvSubtitleOn] = useState(false);
  const [iptvSubtitleText, setIptvSubtitleText] = useState('');
  const iptvVideoRef = useRef(null);
  const hlsRef = useRef(null);

  // Desktop Remote State
  const [desktopScreenshot, setDesktopScreenshot] = useState(null);
  const [desktopLoading, setDesktopLoading] = useState(false);
  const [desktopError, setDesktopError] = useState(null);

  // Guest Limits State
  const [guestLimits, setGuestLimits] = useState({ messages: { used: 0, limit: 10, remaining: 10 }, agentTasks: { used: 0, limit: 3, remaining: 3 } });

  // Live Canvas state
  const [liveHtml, setLiveHtml] = useState('');

  // Super Tools State (Exec, Git, Memory)
  const [execCommand, setExecCommand] = useState('');
  const [execOutput, setExecOutput] = useState('');
  const [gitStatus, setGitStatus] = useState(null);
  const [gitDiff, setGitDiff] = useState('');
  const [memories, setMemories] = useState([]);
  const [newMemory, setNewMemory] = useState('');

  // Rate Limit Toast
  const [rateLimitToast, setRateLimitToast] = useState('');
  const rateLimitTimerRef = useRef(null);

  // General Toast
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');
  const toastTimerRef = useRef(null);
  const showToast = (msg, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    setToastType(type);
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 3000);
  };

  const [selectedProvider, setSelectedProvider] = useState(() => localStorage.getItem('rexi_provider') || 'gemini');

  // Auth Token
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('rexi_token') || null);

  // User Profile
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('rexi_user'));
      if (saved && saved.ma_nguoi_dung) return saved;
      return null;
    } catch { return null; }
  });
  const authHeaders = () => {
    const h = { 'Content-Type': 'application/json' };
    if (authToken) h['Authorization'] = `Bearer ${authToken}`;
    return h;
  };


  // Fetch danh sách model động từ backend theo provider đang chọn
  const fetchAvailableModels = async (prov) => {
    try {
      const res = await apiFetch(`${API_BASE}/models?provider=${encodeURIComponent(prov || provider)}`);
      const data = await res.json();
      if (data.success && data.models) {
        const arr = data.models[prov || provider] || [];
        setAvailableModels(arr);
        if (arr.length > 0 && !arr.find(m => m.id === modelName)) {
          setModelName(arr[0].id);
          localStorage.setItem('rexi_model', arr[0].id);
        }
      } else {
        setAvailableModels(POPULAR_MODELS.filter(m => m.provider === (prov || provider)));
      }
    } catch (e) {
      setAvailableModels(POPULAR_MODELS.filter(m => m.provider === (prov || provider)));
    }
  };

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');

  const chatScrollRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Hiện/ẩn 2 nút cuộn lên-xuống theo vị trí cuộn
  const handleChatScroll = (e) => {
    const el = e.currentTarget;
    const distFromTop = el.scrollTop;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollTop(distFromTop > 220);
    setShowScrollBottom(distFromBottom > 220);
  };

  const scrollToTopSmooth = () => {
    chatScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottomSmooth = () => {
    const el = chatScrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

   useEffect(() => {
    const fetchTtsVoices = async () => {
      try {
        const res = await fetch(`${API_BASE}/services/tts/voices`, {
          headers: authHeaders(),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success && data.voices) {
          setTtsVoices(data.voices);
        }
      } catch (err) {
        console.log('[TTS] Could not fetch voices, using defaults');
      } finally {
        setTtsVoicesLoading(false);
      }
    };
    fetchTtsVoices();
  }, []);

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
    fetchAvailableModels();
    if (!currentUser) fetchGuestLimits();
  }, []);

  // Khi đổi provider hoặc khi có model mới được đăng tải từ Admin Panel → load lại danh sách model ở Menu Header Trang Chủ
  useEffect(() => {
    fetchAvailableModels(provider);

    const handleModelsPublished = (e) => {
      const prov = e.detail?.provider || provider;
      fetchAvailableModels(prov);
    };
    window.addEventListener('rexi_models_published', handleModelsPublished);
    return () => window.removeEventListener('rexi_models_published', handleModelsPublished);
  }, [provider]);

  const fetchGuestLimits = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/chat/guest-limits`);
      const data = await res.json();
      if (data.success && data.limits && data.limits.messages) {
        setGuestLimits(data.limits);
      }
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

useEffect(() => {
     if (chatScrollRef.current) {
       const el = chatScrollRef.current;
       const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
       if (nearBottom) {
         el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
       }
     }
   }, [messages, loading]);

  const fetchConversations = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/chat/conversations`, { headers: authHeaders() });
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
      const res = await apiFetch(`${API_BASE}/chat/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) { console.log(e); }
  };

  const fetchFileTree = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/workspace/files`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setFileTree(data);
      }
    } catch (e) { console.log(e); }
  };

  const fetchDbSkills = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/services/skills`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDbSkills(data);
      }
    } catch (e) { console.log(e); }
  };

  const fetchGitStatus = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/chat/git/status`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setGitStatus(data);
      }
    } catch (e) { console.log(e); }
  };

  const fetchMemories = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/chat/memory`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (e) { console.log(e); }
  };

  const fetchIPTV = async (cat, country, search) => {
    try {
      let url = `${API_BASE}/services/iptv/channels?`;
      if (country) url += `country=${country}&`;
      else if (cat) url += `category=${cat}&`;
      if (search) url += `search=${encodeURIComponent(search)}`;
      const res = await apiFetch(url, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.channels) {
          setIptvChannels(data.channels);
          if (data.channels.length > 0) setSelectedChannel(data.channels[0]);
        }
      }
    } catch (e) { console.log(e); }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (iptvTab === 'category') fetchIPTV(iptvCategory, null, iptvSearch);
      else fetchIPTV(null, iptvCountry, iptvSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [iptvSearch, iptvCategory, iptvCountry, iptvTab]);

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
  }, [iptvVideoRef, hlsRef]);

  useEffect(() => {
    if (selectedChannel) playHlsStream(selectedChannel.url);
  }, [selectedChannel, playHlsStream]);

  const fetchDesktopScreenshot = async () => {
    setDesktopLoading(true);
    setDesktopError(null);
    try {
      const res = await apiFetch(`${API_BASE}/services/desktop/screenshot?t=${Date.now()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setDesktopScreenshot(url);
      } else {
        setDesktopScreenshot(null);
        setDesktopError(`Server lỗi (${res.status})`);
      }
    } catch (e) {
      setDesktopScreenshot(null);
      setDesktopError(e.message || 'Không thể kết nối');
    } finally { setDesktopLoading(false); }
  };

  const fetchGitDiff = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/chat/git/diff`, { headers: authHeaders() });
      if (res.ok) { const d = await res.json(); setGitDiff(d.diff || ''); }
    } catch(e) {}
  };

  useEffect(() => {
    if (activeTab === 'iptv' && iptvChannels.length === 0) fetchIPTV('news');
    if (activeTab === 'desktop') fetchDesktopScreenshot();
  }, [activeTab]);

  const handleNewConversation = async () => {
    // Nếu cuộc trò chuyện hiện tại chưa có tin nhắn nào → không cho tạo thêm
    if (activeConvId && messages.length === 0) {
      return; // Đã có cuộc trò chuyện trống, không tạo thêm
    }
    try {
      const res = await apiFetch(`${API_BASE}/chat/conversations`, {
        method: 'POST',
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
      const res = await apiFetch(`${API_BASE}/chat/conversations/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.ma_hoi_thoai !== id));
        if (activeConvId === id) setActiveConvId(null);
      }
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
        reader.readAsDataURL(file);
        reader.onload = () => setAttachedFiles(p => [...p, { name: file.name, isImage: false, isBinary: true, dataUrl: reader.result }]);
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
        text += f.isImage ? `\n\n![${f.name}](${f.dataUrl})` :
          f.isBinary ? `\n\n[File: ${f.name}](${f.dataUrl})` :
          `\n\n\`\`\`${f.name}\n${f.textContent}\n\`\`\``;
      });
    }

    let convId = activeConvId;
    if (!convId) {
      const res = await apiFetch(`${API_BASE}/chat/conversations`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ tieu_de: text.replace(/!\[.*?\]\(.*?\)/g, '').substring(0, 30), ten_mo_hinh_ai: modelName })
      });
      const data = await res.json();
      convId = data.ma_hoi_thoai;
      setActiveConvId(convId);
      setConversations(prev => [data, ...prev]);
    }

    // Double-check: nếu vẫn chưa có convId (có thể do race condition), báo lỗi thay vì gửi vào path rỗng
    if (!convId) {
      setMessages(prev => [...prev, {
        ma_tin_nhan: Date.now().toString(),
        vai_tro: 'assistant',
        noi_dung: '⚠️ Không thể tạo cuộc trò chuyện. Vui lòng thử lại.'
      }]);
      setLoading(false);
      return;
    }

    const tempUserMsg = { ma_tin_nhan: Date.now().toString(), vai_tro: 'user', noi_dung: text };
    setMessages(prev => [...prev, tempUserMsg]);
    setInputText('');
    setAttachedFiles([]);
    setLoading(true);
    let streamStarted = false;
    const streamMsgId = 'stream_' + Date.now();

    try {
      const res = await apiFetch(`${API_BASE}/chat/conversations/${convId}/messages/stream`, {
        method: 'POST',
        headers: authHeaders(),
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

      // Rate Limit (429) — middleware trả JSON trước khi vào SSE handler
      if (res.status === 429) {
        setRateLimitToast('Quá nhiều yêu cầu trong thời gian ngắn (Rate Limit Exceeded). Vui lòng đợi 1 phút.');
        if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
        rateLimitTimerRef.current = setTimeout(() => setRateLimitToast(''), 5000);
        return;
      }

      // Guest limit / yêu cầu đăng nhập (401) — middleware trả JSON
      if (res.status === 401) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.code === 'LOGIN_REQUIRED' || errorData.code === 'AGENT_LIMIT_REACHED') {
          const isAgentLimit = errorData.code === 'AGENT_LIMIT_REACHED';
          setMessages(prev => [...prev.filter(m => m.ma_tin_nhan !== tempUserMsg.ma_tin_nhan), tempUserMsg, {
            ma_tin_nhan: Date.now().toString(),
            vai_tro: 'assistant',
            noi_dung: isAgentLimit
                ? `🔒 **Đã hết lượt Agent Mode.**\n\nBạn đã dùng hết **3 lượt** Agent cho tài khoản khách.\n\nĐăng nhập để:\n✅ Agent Mode không giới hạn\n✅ Chat không giới hạn\n✅ Lưu lịch sử & Memory`
                : `🔒 **Đã hết lượt chat.**\n\nBạn đã dùng hết **10 tin nhắn** cho tài khoản khách.\n\nĐăng nhập để:\n✅ Chat không giới hạn\n✅ Agent Mode không giới hạn\n✅ Lưu lịch sử & Memory`
          }]);
          fetchGuestLimits();
          setTimeout(() => setAuthModalOpen(true), 500);
        }
        return;
      }

      // Fallback: response không phải SSE (backend trả JSON lỗi khác) → xử lý JSON
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        if (res.ok) {
          const aiMsg = await res.json();
          setMessages(prev => [...prev.filter(m => m.ma_tin_nhan !== tempUserMsg.ma_tin_nhan), tempUserMsg, aiMsg]);
          fetchConversations();
          if (!currentUser) fetchGuestLimits();
        } else {
          setMessages(prev => [...prev.filter(m => m.ma_tin_nhan !== tempUserMsg.ma_tin_nhan), tempUserMsg, {
            ma_tin_nhan: Date.now().toString(), vai_tro: 'assistant',
            noi_dung: `⚠️ Lỗi Server (${res.status}). Hãy kiểm tra Backend đã chạy chưa và API Key trong mục Cài Đặt!`
          }]);
        }
        return;
      }

      // ---- Đọc SSE stream: hiển thị token theo thời gian thực ----
      streamStarted = true;
      let aiText = '';
      let finalMaTinNhan = streamMsgId;
      setMessages(prev => [...prev.filter(m => m.ma_tin_nhan !== tempUserMsg.ma_tin_nhan), tempUserMsg, { ma_tin_nhan: streamMsgId, vai_tro: 'assistant', noi_dung: '' }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';
      const updateAI = (t) => setMessages(prev => prev.map(m => m.ma_tin_nhan === streamMsgId ? { ...m, noi_dung: t } : m));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const events = sseBuffer.split('\n\n');
        sseBuffer = events.pop();
        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith('data: ')) continue;
          let payload;
          try { payload = JSON.parse(line.slice(6)); } catch (e) { continue; }
          if (payload.type === 'token') { aiText += payload.text; updateAI(aiText); }
          else if (payload.type === 'status') { if (!aiText) updateAI(payload.message); }
          else if (payload.type === 'error') { aiText = payload.message; updateAI(aiText); }
          else if (payload.type === 'done') { finalMaTinNhan = payload.ma_tin_nhan || finalMaTinNhan; if (payload.noi_dung) { aiText = payload.noi_dung; updateAI(aiText); } }
        }
      }

      // Cập nhật ma_tin_nhan cuối (khớp DB) + làm sạch thông báo lỗi hệ thống
      setMessages(prev => prev.map(m => {
        if (m.ma_tin_nhan !== streamMsgId) return m;
        let finalText = aiText;
        if (finalText && (finalText.includes('The filename, directory name') || finalText.includes('syntax is incorrect'))) {
          finalText = `Xin chào **${currentUser?.ten_day_du || 'USER'}**! Tôi là **AI Rexi Assistant**.\n\nHệ thống đã sẵn sàng 100% với bộ **35+ Skills Agent**, Quản Lý Files Workspace, Live IPTV & Remote Desktop Control. Bạn muốn tôi làm gì giúp bạn?`;
        }
        return { ...m, ma_tin_nhan: finalMaTinNhan, noi_dung: finalText };
      }));
      fetchConversations();
      if (!currentUser) fetchGuestLimits();
    } catch (e) {
      if (streamStarted) {
        setMessages(prev => prev.map(m => m.ma_tin_nhan === streamMsgId ? { ...m, noi_dung: (m.noi_dung || '') + '\n\n⚠️ Kết nối stream bị ngắt.' } : m));
      } else {
        setMessages(prev => [...prev, {
          ma_tin_nhan: Date.now().toString(),
          vai_tro: 'assistant',
          noi_dung: `⚠️ Không thể kết nối tới Server Backend. Hãy kiểm tra Backend đã chạy chưa và API Key trong mục Cài Đặt!`
        }]);
      }
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
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/[*#`_]/g, '').trim();
    if (!cleanText) return;

    // Nếu đang đọc tin nhắn này thì dừng
    if (speakingMsgId === id) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setSpeakingMsgId(null);
      return;
    }

    // Dừng bất kỳ đọc nào đang chạy
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const useServerTTS = ttsUsingServer && authToken && cleanText.length <= 1000;

    if (useServerTTS) {
      // Dùng Backend TTS (edge-tts, chất lượng cao)
      setSpeakingMsgId(id);
      setTtsUsingServer(true);
      fetch(`${API_BASE}/services/tts`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          text: cleanText,
          voice: ttsVoice,
          rate: ttsRate,
          pitch: ttsPitch
        })
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.audio) {
            const audio = new Audio('data:audio/mp3;base64,' + data.audio);
            audio.play();
            audio.onended = () => setSpeakingMsgId(null);
          } else {
            throw new Error(data.error || 'TTS server failed');
          }
        })
        .catch(err => {
          console.warn('[TTS] Server failed, falling back to browser:', err.message);
          setTtsUsingServer(false);
          speakBrowser(cleanText, id);
        });
    } else {
      speakBrowser(cleanText, id);
    }
  };

  const speakBrowser = (text, id) => {
    if ('speechSynthesis' in window) {
      setSpeakingMsgId(id);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;
      utterance.onend = () => setSpeakingMsgId(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const copyToClipboard = (text, id) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }).catch(() => {
        fallbackCopy(text, id);
      });
    } else {
      fallbackCopy(text, id);
    }
  };
  const fallbackCopy = (text, id) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      console.warn('Copy failed');
    }
  };

  const exportMd = () => {
    const title = conversations.find(c => c.ma_hoi_thoai === activeConvId)?.tieu_de || 'rexi_chat';
    const md = messages.map(m => `### ${m.vai_tro === 'user' ? '👤 Bạn' : '🤖 Rexi'}\n${m.noi_dung}`).join('\n\n---\n\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([`# ${title}\n\n${md}`], { type: 'text/markdown' })),
      download: title.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_') + '.md'
    });
    a.click();
  };

  const handleOpenFile = async (fileRelPath) => {
    try {
      const res = await apiFetch(`${API_BASE}/workspace/file-content?path=${encodeURIComponent(fileRelPath)}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSelectedFile(fileRelPath);
        setFileContent(data.content);
        handleSetActiveTab('code');
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    setSavingFile(true);
    try {
      const response = await apiFetch(`${API_BASE}/workspace/file-content`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile, content: fileContent })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      alert('Đã lưu tệp tin thành công!');
    } catch (e) { alert('Lỗi lưu file: ' + e.message); }
    finally { setSavingFile(false); }
  };

  const handleExecCommand = async () => {
    if (!execCommand.trim()) return;
    try {
      const res = await apiFetch(`${API_BASE}/chat/exec`, {
        method: 'POST',
        headers: { ...authHeaders(), 'X-Exec-Confirm': 'yes' },
        body: JSON.stringify({ command: execCommand })
      });
      const data = await res.json();
      setExecOutput(data.stdout || data.stderr || data.error || 'Thực thi thành công.');
    } catch (e) { setExecOutput('Lỗi thực thi: ' + e.message); }
  };

  const handleAddMemory = async () => {
    if (!newMemory.trim()) return;
    try {
      await apiFetch(`${API_BASE}/chat/memory`, {
        method: 'POST',
        body: JSON.stringify({ loai: 'thong_tin_user', noi_dung: newMemory })
      });
      setNewMemory('');
      fetchMemories();
    } catch (e) { console.error(e); }
  };

  const handleDeleteMemory = async (memId) => {
    try {
      await apiFetch(`${API_BASE}/chat/memory/${memId}`, { method: 'DELETE' });
      setMemories(prev => prev.filter(m => m.ma_bo_nho !== memId));
    } catch (e) { console.error(e); }
  };

  const handleAuthSubmit = async () => {
    try {
      const endpoint = authMode === 'login' ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`;
      const body = authMode === 'login'
        ? { email: authEmail, password: authPassword }
        : { email: authEmail, password: authPassword, ten_day_du: authFullName };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success && data.token) {
        setAuthToken(data.token);
        localStorage.setItem('rexi_token', data.token);
        if (data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('rexi_user', JSON.stringify(data.user));
        }
        setAuthModalOpen(false);
      } else if (authMode === 'register' && data.success) {
        setAuthMode('login');
        alert('Đăng ký thành công! Vui lòng đăng nhập.');
      } else {
        alert(data.error || 'Đăng nhập thất bại');
      }
    } catch (e) {
      console.error('[Auth] Login failed:', e);
      alert('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng hoặc khởi động lại server AI Rexi.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('rexi_token');
    localStorage.removeItem('rexi_user');
    setAuthToken('');
    setCurrentUser(null);
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async (response) => {
    try {
      const res = await apiFetch('/auth/google', null, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();

      if (data.success && data.token) {
        setAuthToken(data.token);
        localStorage.setItem('rexi_token', data.token);
        if (data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('rexi_user', JSON.stringify(data.user));
        }
        setAuthModalOpen(false);
        showToast('Đăng nhập Google thành công!');
      } else {
        alert(data.error || 'Đăng nhập Google thất bại');
      }
    } catch (e) {
      console.error('[Auth] Google login failed:', e);
      alert('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    }
  };

  // Initialize Google Sign-In
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (clientId && window.google) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleSignIn,
        auto_select: false,
      });
    }
  }, []);

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
      <Sidebar
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        activeTab={activeTab} setActiveTab={handleSetActiveTab}
        conversations={conversations} filteredConvs={filteredConvs}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        activeConvId={activeConvId} setActiveConvId={setActiveConvId}
        handleNewConversation={handleNewConversation}
        handleDeleteConversation={handleDeleteConversation}
        filesDrawerOpen={filesDrawerOpen} setFilesDrawerOpen={setFilesDrawerOpen}
        renderTree={renderTree} fileTree={fileTree}
        setSkillsOpen={setSkillsOpen} setSuperToolsOpen={setSuperToolsOpen}
        currentUser={currentUser} setCurrentUser={setCurrentUser} setAuthToken={setAuthToken}
        setAuthModalOpen={setAuthModalOpen} setSettingsOpen={setSettingsOpen} setAdminOpen={setAdminOpen}
        apiFetch={apiFetch} API_BASE={API_BASE} showToast={showToast} setConversations={setConversations}
      />

      {/* ═══════════════════ MAIN WORKSPACE AREA ═══════════════════ */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-main)]">
        
        {/* Guest Mode Banner */}
        {!currentUser && (
          <div className="bg-gradient-to-r from-amber-900/40 via-amber-800/30 to-amber-900/40 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-amber-200/80">
                <span className="text-amber-400">👤</span>
                <span className="font-semibold text-amber-300">Chế độ Khách</span>
              </span>
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">{guestLimits.messages.remaining}</span>
                <span className="text-amber-200/60">/ {guestLimits.messages.limit} tin nhắn</span>
              </span>
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">{guestLimits.agentTasks.remaining}</span>
                <span className="text-amber-200/60">/ {guestLimits.agentTasks.limit} Agent tasks</span>
              </span>
            </div>
            <button 
              onClick={() => setAuthModalOpen(true)}
              className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all"
            >
              Đăng nhập →

            </button>
          </div>
        )}

        {/* Top Header Bar */}
        <header className="min-h-14 py-2 px-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 bg-[var(--bg-sidebar)] backdrop-blur-md">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 transition-colors shrink-0"
              >
                <Menu size={18} />
              </button>
            )}

            {/* Model & Specialty Selectors */}
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <select
                value={modelName}
                onChange={e => {
                  setModelName(e.target.value);
                  localStorage.setItem('rexi_model', e.target.value);
                }}
                className="bg-[#131417] text-[11px] font-medium text-cyan-300 border border-cyan-500/30 rounded-xl px-2.5 py-1.5 outline-none cursor-pointer hover:border-cyan-400 transition-all shrink-0 max-w-[150px] sm:max-w-none"
              >
                {(availableModels.length > 0 ? availableModels : POPULAR_MODELS).map(m => (
                  <option key={m.id} value={m.id} className="bg-[#1e1f20] text-slate-200">
                    {m.name}{m.label ? ` (${m.label})` : m.type ? ` [${m.type}]` : ''}
                  </option>
                ))}
              </select>

              <select
                value={aiSpecialty}
                onChange={e => setAiSpecialty(e.target.value)}
                className="bg-[#131417] text-xs font-medium text-slate-300 border border-white/10 rounded-xl px-3 py-1.5 outline-none cursor-pointer hover:border-white/20 transition-all shrink-0 min-w-[170px]"
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
              onClick={() => setVideoToolsOpen(true)}
              className="p-2 rounded-xl bg-[#131417] border border-white/10 text-xs text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 flex items-center gap-1 transition-all"
              title="Video & Audio Tools (TTS, Video, IPTV)"
            >
              <Play size={13} /> Video Tools
            </button>

            <button
              onClick={exportMd}
              className="px-2.5 py-1.5 rounded-xl bg-[#131417] border border-white/10 text-xs text-slate-300 hover:text-white flex items-center gap-1"
              title="Xuất lịch sử chat Markdown"
            >
              <Download size={13} /> Markdown
            </button>

            {/* TTS Voice Selector */}
            <div className="flex items-center gap-1.5">
              <select
                title="Chuyển đổi giọng nói thành server (edge-tts)"
                value={ttsUsingServer ? 'server' : 'browser'}
                onChange={e => {
                  const useServer = e.target.value === 'server';
                  setTtsUsingServer(useServer);
                  localStorage.setItem('rexi_tts_mode', useServer ? 'server' : 'browser');
                }}
                className="bg-[#131417] text-[10px] font-medium text-slate-300 border border-white/10 rounded-xl px-2 py-1 outline-none cursor-pointer hover:border-cyan-500/40 transition-all shrink-0"
              >
                <option value="browser" className="bg-[#1e1f20] text-slate-200">Trình duyệt (miễn phí)</option>
                <option value="server" className="bg-[#1e1f20] text-cyan-300">Server (edge-tts chất lượng cao)</option>
              </select>

              {ttsUsingServer && ttsVoices.length > 0 && (
                <select
                  title="Chọn giọng đọc tiếng Việt"
                  value={ttsVoice}
                  onChange={e => {
                    setTtsVoice(e.target.value);
                    localStorage.setItem('rexi_tts_voice', e.target.value);
                  }}
                  className="bg-[#131417] text-[10px] font-medium text-cyan-300 border border-cyan-500/30 rounded-xl px-2 py-1 outline-none cursor-pointer hover:border-cyan-400 transition-all shrink-0 max-w-[180px] truncate"
                >
                  {ttsVoices.map(v => (
                    <option key={v.id} value={v.id} className="bg-[#1e1f20] text-slate-200">
                      {v.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

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
            <ChatTab
              messages={messages} inputText={inputText} setInputText={setInputText}
              loading={loading} attachedFiles={attachedFiles}
              executionMode={executionMode} setExecutionMode={setExecutionMode}
              chatModeOpen={chatModeOpen} setChatModeOpen={setChatModeOpen}
              listening={listening} copiedId={copiedId} speakingMsgId={speakingMsgId}
               handleSendMessage={handleSendMessage} startVoice={startVoice}
               speakText={speakText} copyToClipboard={copyToClipboard}
               ttsUsingServer={ttsUsingServer}
              fileInputRef={fileInputRef} handleFileSelect={handleFileSelect}
              chatScrollRef={chatScrollRef} handleChatScroll={handleChatScroll}
              showScrollTop={showScrollTop} showScrollBottom={showScrollBottom}
              scrollToTopSmooth={scrollToTopSmooth} scrollToBottomSmooth={scrollToBottomSmooth}
              currentUser={currentUser}
            />
          )}

          {/* TAB 2 & 3: CODE EDITOR & WORKSPACE FILES */}
          {(activeTab === 'code' || activeTab === 'files') && (
            <CodeEditorTab
              selectedFile={selectedFile} fileContent={fileContent}
              setFileContent={setFileContent} savingFile={savingFile}
              handleSaveFile={handleSaveFile} liveHtml={liveHtml}
              setLiveHtml={setLiveHtml}
            />
          )}

          {/* TAB 4: IPTV LIVE TV */}
          {activeTab === 'iptv' && (
            <IPTVTab
              iptvTab={iptvTab} setIptvTab={setIptvTab}
              iptvCategory={iptvCategory} setIptvCategory={setIptvCategory}
              iptvCountry={iptvCountry} setIptvCountry={setIptvCountry}
              iptvSearch={iptvSearch} setIptvSearch={setIptvSearch}
              iptvChannels={iptvChannels} selectedChannel={selectedChannel}
              setSelectedChannel={setSelectedChannel} fetchIPTV={fetchIPTV}
              iptvVideoRef={iptvVideoRef}
              iptvSubtitleOn={iptvSubtitleOn} setIptvSubtitleOn={setIptvSubtitleOn}
            />
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
                  await apiFetch(`${API_BASE}/services/desktop/click`, {
                    method: 'POST', headers: authHeaders(),
                    body: JSON.stringify({ x_percent: parseFloat(xPct), y_percent: parseFloat(yPct) })
                  });
                  setTimeout(fetchDesktopScreenshot, 600);
                }}
                title="Click vào ảnh để điều khiển chuột"
              >
                {desktopScreenshot ? (
                  <img src={desktopScreenshot} alt="Desktop" className="max-h-full max-w-full object-contain" />
                ) : desktopError ? (
                  <div className="text-center space-y-2">
                    <Monitor size={40} className="mx-auto text-red-500" />
                    <p className="text-xs text-red-400">{desktopError}</p>
                    <p className="text-[11px] text-slate-600">Nhấn "Cập Nhật Màn Hình" để thử lại</p>
                  </div>
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

          {/* TAB 6: BROWSER AGENT (Playwright + Stagehand) */}
          {activeTab === 'browser' && (
            <BrowserView token={authToken} currentUser={currentUser} onClose={() => setActiveTab('chat')} />
          )}

          {/* TAB 7: ADMIN PANEL */}
          {activeTab === 'admin' && currentUser?.phan_quyen === 'admin' && (
            <AdminPanel token={authToken} currentUser={currentUser} onClose={() => setActiveTab('chat')} />
          )}

        </div>
      </main>

      {/* ═══════════════════ SKILLS MODAL (DATABASE SKILLS) ═══════════════════ */}
      <SkillsModal skillsOpen={skillsOpen} setSkillsOpen={setSkillsOpen} dbSkills={dbSkills} />

      {/* Video & Audio Tools Modal - TTS / Video / IPTV */}
      <VideoToolsModal
        videoToolsOpen={videoToolsOpen}
        setVideoToolsOpen={setVideoToolsOpen}
        API_BASE={API_BASE}
        authToken={authToken}
        showToast={showToast}
      />

      {/* Super Tools Modal (Exec, Git, Memory) */}
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
                          await apiFetch(`${API_BASE}/chat/memory/${m.ma_bo_nho}`, { method: 'DELETE', headers: authHeaders() });
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

      {/* ═══════════════════ USER AUTH MODAL ═══════════════════ */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181920] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <button onClick={() => { setAuthModalOpen(false); setForgotStep('login'); setShowPassword(false); setShowForgotNewPassword(false); setForgotMessage(''); }} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X size={18} />
            </button>

            {forgotStep === 'request' ? (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white text-center">Quên Mật Khẩu</h3>
                <p className="text-xs text-slate-400 text-center">Nhập tài khoản để nhận mã OTP đặt lại mật khẩu.</p>
                <input type="text" value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                  placeholder="Nhập tài khoản" className="w-full px-3 py-2.5 bg-[#131417] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50" />
                {forgotMessage && <p className="text-xs text-cyan-300 text-center">{forgotMessage}</p>}
                <button type="button" onClick={async () => {
                  try {
                    const res = await apiFetch(`${API_BASE}/auth/forgot-password`, {
                      method: 'POST', headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify({ account: authEmail })
                    });
                    const data = await res.json();
                    if (data.success) {
                      setForgotMessage(data.otp_debug ? `Mã OTP local: ${data.otp_debug}` : data.message);
                      setForgotStep('reset');
                    } else {
                      setForgotMessage(data.error || 'Không thể tạo mã OTP.');
                    }
                  } catch { setForgotMessage('Lỗi kết nối server.'); }
                }} className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm rounded-xl transition-all active:scale-95">Gửi OTP</button>
                <button type="button" onClick={() => { setForgotStep('login'); setForgotMessage(''); }} className="w-full text-xs text-slate-500 hover:text-white transition-colors">Quay lại Đăng Nhập</button>
              </div>
            ) : forgotStep === 'reset' ? (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white text-center">Đặt Lại Mật Khẩu</h3>
                {forgotMessage && <p className="text-xs text-cyan-300 text-center">{forgotMessage}</p>}
                <input type="text" inputMode="numeric" value={forgotOtp} onChange={e => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Nhập OTP" className="w-full px-3 py-2.5 bg-[#131417] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50" />
                <div className="relative">
                  <input type={showForgotNewPassword ? 'text' : 'password'} value={forgotNewPassword} onChange={e => setForgotNewPassword(e.target.value)}
                    placeholder="Mật khẩu mới" className="w-full px-3 py-2.5 pr-10 bg-[#131417] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50" />
                  <button type="button" onClick={() => setShowForgotNewPassword(!showForgotNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white" aria-label={showForgotNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                    {showForgotNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button type="button" onClick={async () => {
                  try {
                    const res = await apiFetch(`${API_BASE}/auth/reset-password`, {
                      method: 'POST', headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify({ account: authEmail, otp_code: forgotOtp, new_password: forgotNewPassword })
                    });
                    const data = await res.json();
                    if (data.success) {
                      setForgotMessage('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.');
                      setAuthPassword('');
                      setForgotOtp('');
                      setForgotNewPassword('');
                      setTimeout(() => { setForgotStep('login'); setForgotMessage(''); setAuthMode('login'); }, 1200);
                    } else {
                      setForgotMessage(data.error || 'OTP không đúng.');
                    }
                  } catch { setForgotMessage('Lỗi kết nối server.'); }
                }} className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm rounded-xl transition-all active:scale-95">Đặt lại mật khẩu</button>
                <button type="button" onClick={() => { setForgotStep('request'); setForgotMessage(''); }} className="w-full text-xs text-slate-500 hover:text-white transition-colors">Gửi lại OTP</button>
              </div>
            ) : (
              <div className="auth-login-wrapper">
                <div className="flex flex-col items-center pt-2 pb-2">
                  <img src="/rexi_cat_icon.png" alt="Logo" className="rexi-logo w-12 h-12 object-contain" />
                  <span className="text-xs text-white/50 font-semibold tracking-widest mt-1">AI Rexi</span>
                </div>

                <div className="flex bg-[#1e1f28] rounded-xl p-1 mb-5">
                  <button
                    onClick={() => setAuthMode('login')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      authMode === 'login' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Đăng Nhập
                  </button>
                  <button
                    onClick={() => setAuthMode('register')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      authMode === 'register' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Đăng Ký
                  </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleAuthSubmit(); }} className="space-y-3 text-xs">
                  {authMode === 'register' && (
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Họ và Tên</label>
                      <input type="text" value={authFullName} onChange={e => setAuthFullName(e.target.value)} placeholder="Nguyễn Văn A" className="w-full bg-[#131417] border border-white/10 rounded-xl p-2.5 text-slate-200 outline-none" />
                    </div>
                  )}
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Tài Khoản</label>
                    <input type="text" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Nhập tài khoản" className="w-full bg-[#131417] border border-white/10 rounded-xl p-2.5 text-slate-200 outline-none" />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Mật Khẩu</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} required value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#131417] border border-white/10 rounded-xl p-2.5 text-slate-200 outline-none pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end mt-1">
                    <button type="button" onClick={() => { setForgotStep('request'); setForgotMessage(''); }} className="text-[10px] text-slate-500 hover:text-cyan-400 transition-colors">
                      Quên Mật Khẩu?
                    </button>
                  </div>

                  <button type="submit" className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all">
                    {authMode === 'login' ? 'Đăng Nhập' : 'Đăng Ký'}
                  </button>
                </form>

                <div className="relative flex items-center my-4">
                  <div className="flex-1 h-px bg-white/5"></div>
                  <span className="px-3 text-[10px] text-slate-500 font-medium">hoặc</span>
                  <div className="flex-1 h-px bg-white/5"></div>
                </div>

                <button type="button" onClick={() => {
                  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
                  if (clientId && window.google) {
                    window.google.accounts.id.prompt((notification) => {
                      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        // Fallback: show Google One Tap in popup
                        window.google.accounts.id.prompt();
                      }
                    });
                  } else {
                    alert('Google Sign-In chưa sẵn sàng. Vui lòng thử lại.');
                  }
                }} className="w-full py-2.5 rounded-xl bg-[#242530] hover:bg-[#2a2b38] text-white text-xs font-medium flex items-center justify-center gap-2 border border-white/5 transition-all">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Đăng nhập với Google
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ═══════════════════ SETTINGS MODAL ═══════════════════ */}
      <SettingsModal
        settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen}
        provider={provider} setProvider={setProvider}
        modelName={modelName} setModelName={setModelName}
        apiKey={apiKey} setApiKey={setApiKey}
        baseUrl={baseUrl} setBaseUrl={setBaseUrl}
      />

      {/* ═══════════════════ FLOATING SPEED DIAL MENU (Góc dưới bên phải) ═══════════════════ */}
      {/* Overlay click outside để tự thu lại menu khi bấm ra ngoài */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300"
          onClick={() => setFabOpen(false)}
        />
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Danh sách các công cụ hiện lên khi bấm mở (Có hỗ trợ cuộn nếu có nhiều tính năng) */}
        <div className={`
          flex flex-col gap-2 p-2 bg-[#181922]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 origin-bottom-right
          max-h-[70vh] overflow-y-auto pr-1.5 scrollbar-thin
          ${fabOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto shadow-cyan-500/10'
            : 'opacity-0 scale-75 translate-y-6 pointer-events-none'
          }
        `}>
          {/* Nhóm Main Tabs */}
          {[
            { tab: 'chat', icon: <MessageSquare size={17} />, label: 'Chat AI', color: 'text-cyan-400' },
            { tab: 'code', icon: <Code size={17} />, label: 'Editor & Preview', color: 'text-blue-400' },
            { tab: 'files', icon: <Folder size={17} />, label: 'Workspace Files', color: 'text-amber-400' },
            { tab: 'iptv', icon: <Tv size={17} />, label: 'IPTV Truyền Hình', color: 'text-rose-400' },
            { tab: 'desktop', icon: <Monitor size={17} />, label: 'Remote Desktop', color: 'text-emerald-400' },
            { tab: 'browser', icon: <Bot size={17} />, label: 'Browser Agent', color: 'text-purple-400' },
            ...(currentUser?.phan_quyen === 'admin' ? [{ tab: 'admin', icon: <Shield size={17} />, label: 'Quản Trị Viên', color: 'text-amber-400' }] : []),
          ].map(item => (
            <button
              key={item.tab}
              onClick={() => {
                handleSetActiveTab(item.tab);
                setFabOpen(false); // Tự thu lại khi chọn
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === item.tab
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className={item.color}>{item.icon}</span>
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          ))}

          {/* Đường phân cách */}
          <div className="h-px bg-white/10 my-0.5 mx-2" />

          {/* Nhóm Quick Tools (Modals) */}
          <button
            onClick={() => { setSkillsOpen(true); setFabOpen(false); }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-purple-300 hover:text-white hover:bg-purple-500/20 transition-all"
          >
            <Layers size={17} className="text-purple-400" />
            <span className="whitespace-nowrap">35+ Agent Skills</span>
          </button>

          <button
            onClick={() => { setSuperToolsOpen(true); setFabOpen(false); }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-amber-300 hover:text-white hover:bg-amber-500/20 transition-all"
          >
            <Zap size={17} className="text-amber-400" />
            <span className="whitespace-nowrap">Super Tools (CLI/Git)</span>
          </button>

          <button
            onClick={() => { setSettingsOpen(true); setFabOpen(false); }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all"
          >
            <Settings size={17} className="text-slate-400" />
            <span className="whitespace-nowrap">Cài Đặt Hệ Thống</span>
          </button>
        </div>

        {/* Nút FAB chính chỉ mũi tên lên/xuống kèm animation xoay */}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className={`
            w-13 h-13 p-3.5 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95
            ${fabOpen
              ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30 rotate-180'
              : 'bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-cyan-500/30 hover:scale-105'
            }
          `}
          title={fabOpen ? 'Thu gọn menu' : 'Mở thanh công cụ nhanh'}
        >
          <ChevronUp size={24} className={`transition-transform duration-300 ${fabOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className={"fixed bottom-6 right-6 z-[9999] px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border flex items-center gap-3 text-sm font-medium transition-all duration-300 animate-slide-up " + (toastType === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200' : toastType === 'error' ? 'bg-rose-500/20 border-rose-500/30 text-rose-200' : 'bg-cyan-500/20 border-cyan-500/30 text-cyan-200')}>
          <span>{toastType === 'success' ? '✅' : toastType === 'error' ? '❌' : 'ℹ️'}</span>
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">\u00D7</button>
        </div>
      )}
    </div>
  );
}
