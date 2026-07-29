import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, MessageSquare, Key, Layers, Settings, Home,
  Activity, Trash2, Search, RefreshCw, ChevronLeft, ChevronRight,
  Crown, User as UserIcon, Lock, Unlock, CheckCircle, XCircle,
  AlertTriangle, BarChart3, Database, Zap, Send, Eye, EyeOff,
  Server, GitBranch, Terminal, LogOut, Menu, X, Clock, Wifi
} from 'lucide-react';

const API_BASE = "http://localhost:5000/api";

async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ─── Sidebar Menu Items ────────────────────────────────────
const MENU_ITEMS = [
  { id: 'dashboard', icon: BarChart3, label: 'Dashboard', color: 'text-cyan-400' },
  { id: 'users', icon: Users, label: 'Người Dùng', color: 'text-indigo-400' },
  { id: 'conversations', icon: MessageSquare, label: 'Hội Thoại', color: 'text-emerald-400' },
  { id: 'apikeys', icon: Key, label: 'API Keys', color: 'text-amber-400' },
  { id: 'skills', icon: Layers, label: 'Kỹ Năng', color: 'text-purple-400' },
  { id: 'chat', icon: Send, label: 'Chat với Users', color: 'text-rose-400' },
  { id: 'settings', icon: Settings, label: 'Hệ Thống', color: 'text-slate-400' },
];

// ─── Badge Components ──────────────────────────────────────
function RoleBadge({ role }) {
  return role === 'admin'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30"><Crown size={9} /> Admin</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"><UserIcon size={9} /> User</span>;
}

function StatusBadge({ status }) {
  return status === 'banned'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30"><XCircle size={9} /> Bị khoá</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><CheckCircle size={9} /> Active</span>;
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const c = type === 'success' ? 'bg-emerald-900/90 border-emerald-500/40 text-emerald-200' : 'bg-rose-900/90 border-rose-500/40 text-rose-200';
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium backdrop-blur ${c}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
      {message}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: DASHBOARD
// ═══════════════════════════════════════════════════════════
function DashboardTab({ stats, statsLoading }) {
  const cards = [
    { icon: Users, label: 'Tổng User', value: stats?.tong_user, bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/20' },
    { icon: Crown, label: 'Admin', value: stats?.tong_admin, bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/20' },
    { icon: Lock, label: 'Bị Khoá', value: stats?.tong_bi_khoa, bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/20' },
    { icon: MessageSquare, label: 'Hội Thoại', value: stats?.tong_hoi_thoai, bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/20' },
    { icon: Activity, label: 'Tin Nhắn', value: stats?.tong_tin_nhan, bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/20' },
    { icon: Trash2, label: 'Thùng Rác', value: stats?.tong_xoa_mem, bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/20' },
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white flex items-center gap-2"><BarChart3 size={20} className="text-cyan-400" /> Dashboard Tổng Quan</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c, i) => (
          <div key={i} className="p-4 bg-[#181920] rounded-2xl border border-white/8 shadow flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${c.bg} ${c.text} border ${c.border}`}><c.icon size={20} /></div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">{c.label}</p>
              <p className={`text-xl font-bold ${c.text}`}>{statsLoading ? '...' : c.value ?? 0}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 bg-[#181920] rounded-2xl border border-white/8">
        <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2"><Activity size={14} className="text-emerald-400" /> Hoạt Động Gần Đây</h3>
        <div className="space-y-2 text-xs text-slate-400">
          <div className="flex items-center gap-2"><Clock size={12} className="text-slate-500" /> Hệ thống đang hoạt động bình thường</div>
          <div className="flex items-center gap-2"><Wifi size={12} className="text-emerald-400" /> Backend: localhost:5000</div>
          <div className="flex items-center gap-2"><Database size={12} className="text-cyan-400" /> Database: SQLite (tro_ly_ai.db)</div>
          <div className="flex items-center gap-2"><Server size={12} className="text-amber-400" /> Frontend: localhost:5173</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: USER MANAGEMENT
// ═══════════════════════════════════════════════════════════
function UsersTab({ token, currentUser, showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const fetchUsers = useCallback(async (p = page, s = search) => {
    setLoading(true);
    try {
      const data = await apiFetch(`/auth/users?page=${p}&limit=10&search=${encodeURIComponent(s)}`, token);
      if (Array.isArray(data)) { setUsers(data); setTotalPages(1); setTotalUsers(data.length); }
      else { setUsers(data.users || []); setTotalPages(data.totalPages || 1); setTotalUsers(data.totalUsers || 0); }
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [token, page, search]);

  useEffect(() => { fetchUsers(); }, [page, search]);

  const changeRole = async (userId, newRole) => {
    setActionLoading(p => ({ ...p, [`role_${userId}`]: true }));
    try {
      await apiFetch(`/auth/users/${userId}/role`, token, { method: 'PUT', body: JSON.stringify({ phan_quyen: newRole }) });
      showToast(`Đã đổi quyền thành ${newRole === 'admin' ? 'Admin' : 'User'}`);
      fetchUsers(); 
    } catch (e) { showToast(e.message, 'error'); }
    finally { setActionLoading(p => ({ ...p, [`role_${userId}`]: false })); }
  };

  const changeStatus = async (userId, newStatus) => {
    setActionLoading(p => ({ ...p, [`status_${userId}`]: true }));
    try {
      await apiFetch(`/auth/users/${userId}/status`, token, { method: 'PUT', body: JSON.stringify({ trang_thai: newStatus }) });
      showToast(newStatus === 'banned' ? 'Đã khoá tài khoản' : 'Đã mở khoá');
      fetchUsers();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setActionLoading(p => ({ ...p, [`status_${userId}`]: false })); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Users size={20} className="text-indigo-400" /> Quản Lý Người Dùng <span className="text-xs text-slate-400 font-normal">({totalUsers})</span></h2>
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }} className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Tìm email, tên..." className="pl-8 pr-3 py-1.5 bg-[#1e1f20] border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500/50 w-48" />
          </div>
          <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg font-semibold">Tìm</button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm"><RefreshCw size={20} className="animate-spin mx-auto mb-2 text-indigo-400" /> Đang tải...</div>
      ) : (
        <div className="bg-[#181920] rounded-2xl border border-white/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#13151a] border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] text-slate-400 uppercase font-semibold">User</th>
                <th className="px-4 py-3 text-left text-[10px] text-slate-400 uppercase font-semibold">Quyền</th>
                <th className="px-4 py-3 text-left text-[10px] text-slate-400 uppercase font-semibold">Trạng Thái</th>
                <th className="px-4 py-3 text-left text-[10px] text-slate-400 uppercase font-semibold">Ngày Tạo</th>
                <th className="px-4 py-3 text-center text-[10px] text-slate-400 uppercase font-semibold">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(user => {
                const isSelf = user.ma_nguoi_dung === currentUser?.ma_nguoi_dung;
                const isBanned = user.trang_thai === 'banned';
                const isAdmin = user.phan_quyen === 'admin';
                return (
                  <tr key={user.ma_nguoi_dung} className={`hover:bg-white/3 transition-colors ${isBanned ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/40 to-indigo-500/40 flex items-center justify-center text-xs font-bold text-white">
                          {(user.ten_day_du || user.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                            {user.ten_day_du || 'N/A'} {isSelf && <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-400">Bạn</span>}
                          </div>
                          <div className="text-[11px] text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={user.phan_quyen} /></td>
                    <td className="px-4 py-3"><StatusBadge status={user.trang_thai || 'active'} /></td>
                    <td className="px-4 py-3 text-[11px] text-slate-400 font-mono">{new Date(user.ngay_tao).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3">
                      {!isSelf && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => changeRole(user.ma_nguoi_dung, isAdmin ? 'user' : 'admin')} disabled={actionLoading[`role_${user.ma_nguoi_dung}`]}
                            className={`px-2 py-1 rounded text-[10px] font-semibold ${isAdmin ? 'bg-slate-500/20 text-slate-300 hover:bg-slate-500/30' : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'}`}>
                            {isAdmin ? 'Hạ quyền' : 'Nâng quyền'}
                          </button>
                          <button onClick={() => changeStatus(user.ma_nguoi_dung, isBanned ? 'active' : 'banned')} disabled={actionLoading[`status_${user.ma_nguoi_dung}`]}
                            className={`px-2 py-1 rounded text-[10px] font-semibold ${isBanned ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'}`}>
                            {isBanned ? 'Mở khoá' : 'Khoá'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
              <span>Trang {page}/{totalPages}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"><ChevronLeft size={14} /></button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: CONVERSATIONS
// ═══════════════════════════════════════════════════════════
function ConversationsTab({ token, showToast }) {
  const [convs, setConvs] = useState([]);
  const [trashConvs, setTrashConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [convTab, setConvTab] = useState('all'); // 'all' | 'trash'

  const fetchConvs = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/chat/conversations/all', token);
      setConvs(Array.isArray(data) ? data : []);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/chat/admin/conversations/trash', token);
      setTrashConvs(Array.isArray(data) ? data : []);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchConvs(); fetchTrash(); }, []);

  const viewMessages = async (convId) => {
    try {
      const data = await apiFetch(`/chat/conversations/${convId}/messages`, token);
      setMessages(Array.isArray(data) ? data : []);
      setSelectedConv(convId);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const deleteConv = async (convId) => {
    if (!window.confirm('Bạn có chắc muốn xoá mềm cuộc hội thoại này?')) return;
    try {
      await apiFetch(`/chat/admin/conversations/${convId}`, token, { method: 'DELETE' });
      showToast('Đã xoá mềm cuộc hội thoại');
      fetchConvs(); fetchTrash();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const restoreConv = async (convId) => {
    try {
      await apiFetch(`/chat/admin/conversations/${convId}/restore`, token, { method: 'POST' });
      showToast('Đã khôi phục cuộc hội thoại');
      fetchConvs(); fetchTrash();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const permanentDelete = async (convId) => {
    if (!window.confirm('⚠️ XÓA VĨNH VIỄN! Cuộc hội thoại sẽ không thể khôi phục. Tiếp tục?')) return;
    try {
      await apiFetch(`/chat/admin/conversations/${convId}/permanent`, token, { method: 'DELETE' });
      showToast('Đã xoá vĩnh viễn');
      fetchTrash();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const displayConvs = convTab === 'all' ? convs : trashConvs;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2"><MessageSquare size={20} className="text-emerald-400" /> Quản Lý Hội Thoại</h2>
        <div className="flex gap-1 bg-[#1e1f20] rounded-xl p-1">
          <button onClick={() => setConvTab('all')} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${convTab === 'all' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'}`}>
            Tất cả ({convs.length})
          </button>
          <button onClick={() => setConvTab('trash')} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${convTab === 'trash' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-white'}`}>
            🗑️ Thùng rác ({trashConvs.length})
          </button>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm"><RefreshCw size={20} className="animate-spin mx-auto mb-2 text-emerald-400" /> Đang tải...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#181920] rounded-2xl border border-white/8 overflow-hidden max-h-[60vh] overflow-y-auto">
            {displayConvs.map(c => (
              <div key={c.ma_hoi_thoai} onClick={() => viewMessages(c.ma_hoi_thoai)}
                className={`px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/3 transition-colors ${selectedConv === c.ma_hoi_thoai ? 'bg-emerald-500/10' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-200 truncate max-w-[250px]">{c.tieu_de || 'Trò chuyện mới'}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{c.email || 'guest'} · {c.ten_mo_hinh_ai || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {convTab === 'all' ? (
                      <button onClick={(e) => { e.stopPropagation(); deleteConv(c.ma_hoi_thoai); }} className="text-slate-500 hover:text-rose-400 p-1" title="Xoá mềm"><Trash2 size={12} /></button>
                    ) : (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); restoreConv(c.ma_hoi_thoai); }} className="text-slate-500 hover:text-emerald-400 p-1" title="Khôi phục"><RefreshCw size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); permanentDelete(c.ma_hoi_thoai); }} className="text-slate-500 hover:text-rose-400 p-1" title="Xoá vĩnh viễn"><XCircle size={12} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {displayConvs.length === 0 && <p className="text-center text-slate-500 text-xs py-8">{convTab === 'all' ? 'Không có cuộc hội thoại nào' : 'Thùng rác trống'}</p>}
          </div>
          <div className="bg-[#181920] rounded-2xl border border-white/8 p-4 max-h-[60vh] overflow-y-auto">
            {selectedConv ? (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-emerald-400">Tin Nhắn</h3>
                {messages.map(m => (
                  <div key={m.ma_tin_nhan} className={`p-2.5 rounded-lg text-xs ${m.vai_tro === 'user' ? 'bg-cyan-500/10 text-cyan-200 ml-4' : m.vai_tro === 'admin' ? 'bg-amber-500/10 text-amber-200 ml-4' : 'bg-white/5 text-slate-300 mr-4'}`}>
                    <span className="text-[10px] font-bold text-slate-500">{m.vai_tro === 'user' ? '👤 User' : m.vai_tro === 'admin' ? '🛡️ Admin' : '🤖 AI'}:</span>
                    <p className="mt-1 whitespace-pre-wrap">{m.noi_dung?.substring(0, 300)}{m.noi_dung?.length > 300 ? '...' : ''}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">Chọn cuộc hội thoại để xem tin nhắn</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: API KEYS
// ═══════════════════════════════════════════════════════════
function ApiKeysTab({ token, showToast }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProvider, setNewProvider] = useState('gemini');
  const [newKey, setNewKey] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedModels, setScannedModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem('rexi_model') || '');
  const [scanProvider, setScanProvider] = useState('gemini');

  const fetchKeys = async () => {
    setLoading(true);
    try { const data = await apiFetch('/chat/keys', token); setKeys(Array.isArray(data) ? data : []); }
    catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchKeys(); }, []);

  const saveKey = async () => {
    if (!newKey.trim()) return;
    try {
      await apiFetch('/chat/keys', token, { method: 'POST', body: JSON.stringify({ provider: newProvider, api_key: newKey }) });
      showToast('Đã lưu API Key');
      setNewKey(''); fetchKeys();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const scanModels = async () => {
    setScanning(true);
    setScannedModels([]);
    try {
      const keyEntry = keys.find(k => k.ten_nha_cung_cap === scanProvider);
      const data = await apiFetch('/chat/fetch-models', token, {
        method: 'POST',
        body: JSON.stringify({ provider: scanProvider, api_key: newKey || keyEntry?.gia_tri_khoa })
      });
      if (data.success && data.models) {
        setScannedModels(data.models);
        showToast(`Đã quét ${data.models.length} models ${data.fromCache ? '(từ cache)' : ''}`);
      } else {
        showToast(data.error || 'Không tìm thấy model nào', 'error');
      }
    } catch (e) { showToast('Lỗi quét: ' + e.message, 'error'); }
    finally { setScanning(false); }
  };

  const setDefaultModel = (modelId) => {
    setSelectedModel(modelId);
    localStorage.setItem('rexi_model', modelId);
    showToast(`Đã chọn ${modelId} làm model mặc định`);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2"><Key size={20} className="text-amber-400" /> Quản Lý API Keys</h2>
      <div className="bg-[#181920] rounded-2xl border border-white/8 p-4">
        <h3 className="text-xs font-bold text-amber-400 mb-3">Thêm API Key Mới</h3>
        <div className="flex gap-2">
          <select value={newProvider} onChange={e => setNewProvider(e.target.value)} className="px-3 py-2 bg-[#0d0e11] border border-white/10 rounded-xl text-xs text-white outline-none">
            <option value="gemini">Google Gemini</option><option value="openai">OpenAI</option><option value="claude">Claude</option><option value="deepseek">DeepSeek</option><option value="groq">Groq</option>
          </select>
          <input type="password" value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Nhập API Key..." className="flex-1 px-3 py-2 bg-[#0d0e11] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none" />
          <button onClick={saveKey} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold">Lưu</button>
        </div>
      </div>
      {/* Model Scanner */}
      <div className="bg-[#181920] rounded-2xl border border-white/8 p-4">
        <h3 className="text-xs font-bold text-amber-400 mb-3 flex items-center gap-1.5"><Zap size={14} /> Quét Models từ API</h3>
        <div className="flex gap-2 mb-3">
          <select value={scanProvider} onChange={e => setScanProvider(e.target.value)} className="px-3 py-2 bg-[#0d0e11] border border-white/10 rounded-xl text-xs text-white outline-none">
            <option value="gemini">Google Gemini</option><option value="openai">OpenAI</option><option value="claude">Claude</option><option value="deepseek">DeepSeek</option><option value="groq">Groq</option><option value="opencode">OpenCode</option>
          </select>
          <input type="password" value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="API Key (từ ô trên)" className="flex-1 px-3 py-2 bg-[#0d0e11] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none" />
          <button onClick={scanModels} disabled={scanning} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1">
            {scanning ? <><RefreshCw size={12} className="animate-spin" /> Đang quét...</> : <><Zap size={12} /> Quét Models</>}
          </button>
        </div>
        {scannedModels.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Tìm thấy {scannedModels.length} models:</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {scannedModels.map(m => (
                <div key={m} onClick={() => setDefaultModel(m)} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-all ${selectedModel === m ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300' : 'bg-[#0d0e11] hover:bg-white/5 text-slate-300 border border-white/5'}`}>
                  <span className="font-mono truncate">{m}</span>
                  {selectedModel === m && <span className="text-[10px] text-amber-400 font-bold">MẶC ĐỊNH</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Keys Table */}
      <div className="bg-[#181920] rounded-2xl border border-white/8 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5"><h3 className="text-xs font-bold text-slate-300">API Keys đã lưu</h3></div>
        {loading ? <div className="text-center py-8 text-slate-400 text-xs"><RefreshCw size={16} className="animate-spin mx-auto mb-1" /> Đang tải...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-[#13151a] border-b border-white/10">
              <tr><th className="px-4 py-3 text-left text-[10px] text-slate-400 uppercase">Provider</th><th className="px-4 py-3 text-left text-[10px] text-slate-400 uppercase">Key</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {keys.map(k => (
                <tr key={k.ma_khoa} className="hover:bg-white/3">
                  <td className="px-4 py-3 text-xs font-medium text-amber-300">{k.ten_nha_cung_cap}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">{k.gia_tri_khoa}</td>
                </tr>
              ))}
              {keys.length === 0 && <tr><td colSpan={2} className="text-center py-6 text-slate-500 text-xs">Chưa có API Key nào</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: SKILLS
// ═══════════════════════════════════════════════════════════
function SkillsTab({ token, showToast }) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const data = await apiFetch('/services/skills', token); setSkills(Array.isArray(data) ? data : []); }
      catch (e) { showToast(e.message, 'error'); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2"><Layers size={20} className="text-purple-400" /> Kỹ Năng Agent <span className="text-xs text-slate-400 font-normal">({skills.length})</span></h2>
      {loading ? <div className="text-center py-8 text-slate-400 text-xs"><RefreshCw size={16} className="animate-spin mx-auto mb-1" /> Đang tải...</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {skills.map(s => (
            <div key={s.ma_ky_nang} className="p-3 bg-[#181920] rounded-xl border border-white/8 hover:border-purple-500/30 transition-all">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">{s.ten_ky_nang}</span>
              <p className="text-xs font-semibold text-slate-200 mt-1.5">{s.tieu_de}</p>
              <p className="text-[11px] text-slate-400 mt-1">{s.mo_ta}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: ADMIN CHAT
// ═══════════════════════════════════════════════════════════
function AdminChatTab({ token, currentUser, showToast }) {
  const [convs, setConvs] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchConvs = async () => {
    setLoading(true);
    try { const data = await apiFetch('/chat/conversations/all', token); setConvs(Array.isArray(data) ? data : []); }
    catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchConvs(); }, []);

  const selectConv = async (convId) => {
    setSelectedConv(convId);
    try { const data = await apiFetch(`/chat/conversations/${convId}/messages`, token); setMessages(Array.isArray(data) ? data : []); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedConv) return;
    try {
      await apiFetch(`/chat/admin/conversations/${selectedConv}/reply`, token, {
        method: 'POST',
        body: JSON.stringify({ noi_dung: reply })
      });
      setReply('');
      selectConv(selectedConv);
      showToast('Đã gửi phản hồi');
    } catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2"><Send size={20} className="text-rose-400" /> Chat với Users</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#181920] rounded-2xl border border-white/8 overflow-hidden max-h-[60vh] overflow-y-auto">
          <div className="px-3 py-2 border-b border-white/5 text-[10px] text-slate-400 uppercase font-semibold">Danh sách hội thoại</div>
          {convs.map(c => (
            <div key={c.ma_hoi_thoai} onClick={() => selectConv(c.ma_hoi_thoai)}
              className={`px-3 py-2.5 border-b border-white/5 cursor-pointer hover:bg-white/3 transition-colors ${selectedConv === c.ma_hoi_thoai ? 'bg-rose-500/10' : ''}`}>
              <p className="text-xs font-medium text-slate-200 truncate">{c.tieu_de || 'Trò chuyện mới'}</p>
              <p className="text-[10px] text-slate-500">{c.email || 'guest'}</p>
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 bg-[#181920] rounded-2xl border border-white/8 flex flex-col max-h-[60vh]">
          {selectedConv ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(m => (
                  <div key={m.ma_tin_nhan} className={`flex ${m.vai_tro === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl text-xs ${m.vai_tro === 'user' ? 'bg-cyan-500/10 text-cyan-200' : 'bg-rose-500/10 text-rose-200'}`}>
                      <span className="text-[10px] font-bold opacity-60">{m.vai_tro === 'user' ? '👤 User' : '🤖 Admin'}</span>
                      <p className="mt-1 whitespace-pre-wrap">{m.noi_dung}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-white/5 flex gap-2">
                <input type="text" value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendReply()}
                  placeholder="Nhập phản hồi..." className="flex-1 px-3 py-2 bg-[#0d0e11] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none" />
                <button onClick={sendReply} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1"><Send size={12} /> Gửi</button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">Chọn hội thoại để phản hồi</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: SYSTEM SETTINGS
// ═══════════════════════════════════════════════════════════
function SettingsTab({ token, showToast }) {
  const [gitStatus, setGitStatus] = useState(null);
  const [execCmd, setExecCmd] = useState('');
  const [execOutput, setExecOutput] = useState('');
  const [cacheMsg, setCacheMsg] = useState('');

  const fetchGit = async () => {
    try { const data = await apiFetch('/chat/git/status', token); setGitStatus(data); }
    catch (e) { showToast(e.message, 'error'); }
  };

  useEffect(() => { fetchGit(); }, []);

  const runExec = async () => {
    if (!execCmd.trim()) return;
    try {
      const data = await apiFetch('/chat/exec', token, { method: 'POST', body: JSON.stringify({ command: execCmd }), headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Exec-Confirm': 'yes' } });
      setExecOutput(data.stdout || data.stderr || data.error || 'Done');
    } catch (e) { setExecOutput('Error: ' + e.message); }
  };

  const clearModelCache = async () => {
    try {
      const data = await apiFetch('/chat/admin/cache/clear-models', token, { method: 'POST' });
      setCacheMsg(data.message || 'Đã xóa cache');
      showToast('Đã xóa cache models');
      setTimeout(() => setCacheMsg(''), 3000);
    } catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings size={20} className="text-slate-400" /> Hệ Thống</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#181920] rounded-2xl border border-white/8 p-4">
          <h3 className="text-xs font-bold text-cyan-400 mb-3 flex items-center gap-1.5"><GitBranch size={14} /> Git Status</h3>
          {gitStatus?.isGit ? (
            <div className="space-y-2 text-xs text-slate-300">
              <p>Branch: <span className="text-cyan-300 font-mono">{gitStatus.branch}</span></p>
              {gitStatus.changes?.length > 0 && <p className="text-amber-300">{gitStatus.changes.length} files changed</p>}
            </div>
          ) : <p className="text-xs text-slate-500">Không có Git repo</p>}
        </div>
        <div className="bg-[#181920] rounded-2xl border border-white/8 p-4">
          <h3 className="text-xs font-bold text-amber-400 mb-3 flex items-center gap-1.5"><Database size={14} /> Cache Management</h3>
          <p className="text-xs text-slate-400 mb-3">Xóa cache models đã lưu để fetch lại danh sách mới.</p>
          <button onClick={clearModelCache} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5">
            <Trash2 size={13} /> Xóa Cache Models
          </button>
          {cacheMsg && <p className="mt-2 text-[11px] text-emerald-400">✅ {cacheMsg}</p>}
        </div>
        <div className="bg-[#181920] rounded-2xl border border-white/8 p-4">
          <h3 className="text-xs font-bold text-emerald-400 mb-3 flex items-center gap-1.5"><Terminal size={14} /> Terminal Exec</h3>
          <div className="flex gap-2">
            <input type="text" value={execCmd} onChange={e => setExecCmd(e.target.value)} onKeyDown={e => e.key === 'Enter' && runExec()}
              placeholder="Nhập lệnh..." className="flex-1 px-3 py-2 bg-[#0d0e11] border border-white/5 rounded-lg text-xs text-slate-200 placeholder-slate-500 outline-none font-mono" />
            <button onClick={runExec} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold">Chạy</button>
          </div>
          {execOutput && <pre className="mt-2 p-2 bg-black/40 rounded-lg text-[11px] text-slate-300 font-mono max-h-32 overflow-auto">{execOutput}</pre>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN ADMIN PANEL
// ═══════════════════════════════════════════════════════════
export default function AdminPanel() {
  const token = localStorage.getItem('rexi_token') || '';
  const storedUser = localStorage.getItem('rexi_user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!token || !currentUser || currentUser.phan_quyen !== 'admin') window.location.href = '/';
  }, []);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try { const data = await apiFetch('/auth/stats', token); setStats(data); }
    catch { setStats(null); }
    finally { setStatsLoading(false); }
  }, [token]);

  useEffect(() => { fetchStats(); }, []);

  if (!token || !currentUser || currentUser.phan_quyen !== 'admin') return null;

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab stats={stats} statsLoading={statsLoading} />;
      case 'users': return <UsersTab token={token} currentUser={currentUser} showToast={showToast} />;
      case 'conversations': return <ConversationsTab token={token} showToast={showToast} />;
      case 'apikeys': return <ApiKeysTab token={token} showToast={showToast} />;
      case 'skills': return <SkillsTab token={token} showToast={showToast} />;
      case 'chat': return <AdminChatTab token={token} currentUser={currentUser} showToast={showToast} />;
      case 'settings': return <SettingsTab token={token} showToast={showToast} />;
      default: return <DashboardTab stats={stats} statsLoading={statsLoading} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0f1014] text-white font-sans">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-[#131417] border-r border-white/5 transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'}`}>
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-amber-400" />
            <div><h1 className="text-sm font-bold text-amber-400">Admin Panel</h1><p className="text-[9px] text-slate-500">AI REXI Management</p></div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {MENU_ITEMS.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${activeTab === item.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <item.icon size={16} className={item.color} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/5">
          <a href="/" className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <Home size={14} /> Về trang chủ
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 px-4 border-b border-white/5 flex items-center justify-between bg-[#131417]">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"><Menu size={16} /></button>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-300">{MENU_ITEMS.find(m => m.id === activeTab)?.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-400 flex items-center gap-1"><Crown size={10} /> {currentUser.ten_day_du}</span>
            <button onClick={() => { fetchStats(); }} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"><RefreshCw size={14} /></button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{renderTab()}</main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
