import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, MessageSquare, Key, Layers, Settings, Home,
  Activity, Trash2, Search, RefreshCw, ChevronLeft, ChevronRight,
  Crown, User as UserIcon, Lock, Unlock, CheckCircle, XCircle,
  AlertTriangle, BarChart3, Database, Zap, Send, Eye, EyeOff,
  Server, GitBranch, Terminal, LogOut, X, Clock, Wifi, Tv, Globe, Radar, PlayCircle
} from 'lucide-react';

// const API_BASE = "http://localhost:5000/api";  // REMOVED — vite proxy handles /api/*
const API_BASE = "/api";

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
  { id: 'users', icon: Users, label: 'Người Dùng', color: 'text-indigo-400' },
  { id: 'conversations', icon: MessageSquare, label: 'Hội Thoại', color: 'text-emerald-400' },
  { id: 'apikeys', icon: Key, label: 'API Keys', color: 'text-amber-400' },
  { id: 'skills', icon: Layers, label: 'Kỹ Năng', color: 'text-purple-400' },
  { id: 'chat', icon: Send, label: 'Chat với Users', color: 'text-rose-400' },
  { id: 'iptv', icon: Tv, label: 'IPTV Monitor', color: 'text-sky-400' },
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
          <div className="flex items-center gap-2"><Wifi size={12} className="text-emerald-400" /> Backend: {window.location.host || 'localhost:5000'}</div>
          <div className="flex items-center gap-2"><Database size={12} className="text-cyan-400" /> Database: SQLite (tro_ly_ai.db)</div>
          <div className="flex items-center gap-2"><Server size={12} className="text-amber-400" /> Frontend: {window.location.host || 'localhost:5173'}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB: USER MANAGEMENT
// ═══════════════════════════════════════════════════════════
function UsersTab({ token, currentUser, showToast, stats, statsLoading }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.append('search', search);
      const data = await apiFetch(`/auth/users?${params}`, token);
      setUsers(Array.isArray(data.users) ? data.users : []);
      setTotalPages(data.totalPages || 1);
      setTotalUsers(data.totalUsers || 0);
    } catch (e) {
      showToast(e.message, 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const changeRole = async (userId, newRole) => {
    setActionLoading(prev => ({ ...prev, [`role_${userId}`]: true }));
    try {
      await apiFetch(`/auth/users/${userId}/role`, token, { method: 'PUT', body: JSON.stringify({ phan_quyen: newRole }) });
      showToast('Đã cập nhật quyền');
      fetchUsers();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setActionLoading(prev => ({ ...prev, [`role_${userId}`]: false })); }
  };

  const changeStatus = async (userId, newStatus) => {
    setActionLoading(prev => ({ ...prev, [`status_${userId}`]: true }));
    try {
      await apiFetch(`/auth/users/${userId}/status`, token, { method: 'PUT', body: JSON.stringify({ trang_thai: newStatus }) });
      showToast('Đã cập nhật trạng thái');
      fetchUsers();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setActionLoading(prev => ({ ...prev, [`status_${userId}`]: false })); }
  };

  const statCards = [
    { icon: Users, label: 'Tổng User', value: stats?.tong_user, bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/20' },
    { icon: Crown, label: 'Admin', value: stats?.tong_admin, bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/20' },
    { icon: Lock, label: 'Bị Khoá', value: stats?.tong_bi_khoa, bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/20' },
    { icon: MessageSquare, label: 'Hội Thoại', value: stats?.tong_hoi_thoai, bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/20' },
    { icon: Activity, label: 'Tin Nhắn', value: stats?.tong_tin_nhan, bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/20' },
    { icon: Trash2, label: 'Thùng Rác', value: stats?.tong_xoa_mem, bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/20' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((c, i) => (
          <div key={i} className="p-4 bg-[#181920] rounded-2xl border border-white/8 shadow flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${c.bg} ${c.text} border ${c.border}`}><c.icon size={20} /></div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">{c.label}</p>
              <p className={`text-xl font-bold ${c.text}`}>{statsLoading ? '...' : c.value ?? 0}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Users Table */}
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
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [verifiedModels, setVerifiedModels] = useState([]);
  const [scanSummary, setScanSummary] = useState(null);
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

  // Quét & Kiểm Tra Sức Khỏe Từng Model (Live Health Test qua Groq AI Bot Analyzer)
  const verifyAndScanModels = async () => {
    setScanning(true);
    setVerifiedModels([]);
    setScanSummary(null);
    try {
      const keyEntry = keys.find(k => k.ten_nha_cung_cap === scanProvider);
      const data = await apiFetch('/admin/models/verify-and-scan', token, {
        method: 'POST',
        body: JSON.stringify({
          provider: scanProvider,
          api_key: newKey || keyEntry?.gia_tri_khoa,
          base_url: baseUrlInput
        })
      });
      if (data.success && data.models) {
        setVerifiedModels(data.models);
        setScanSummary({
          totalScanned: data.totalScanned,
          verifiedCount: data.verifiedCount,
          workingCount: data.workingCount,
          analysis: data.analysis,
          resolvedProvider: data.provider
        });
        const aiName = data.providerName || data.provider;
        showToast(`Groq AI phân tích '${scanProvider}' ➔ ${aiName}: ${data.workingCount}/${data.verifiedCount} models HOẠT ĐỘNG 🟢`);
      } else {
        showToast(data.error || 'Không tìm thấy model nào', 'error');
      }
    } catch (e) { showToast('Lỗi kiểm tra model: ' + e.message, 'error'); }
    finally { setScanning(false); }
  };

  // Đẩy các Model đang hoạt động Lên Menu Trang Chủ
  const publishActiveModelsToHomepage = async () => {
    const workingModels = verifiedModels.filter(m => m.status === 'working');
    if (workingModels.length === 0) {
      showToast('Không có model nào đang hoạt động để cập nhật lên trang chủ!', 'error');
      return;
    }

    setPublishing(true);
    try {
      const resolvedProv = scanSummary?.resolvedProvider || scanProvider;
      const keyEntry = keys.find(k => k.ten_nha_cung_cap === resolvedProv);
      const data = await apiFetch('/admin/models/publish-active', token, {
        method: 'POST',
        body: JSON.stringify({
          provider: resolvedProv,
          api_key: newKey || keyEntry?.gia_tri_khoa,
          models: workingModels
        })
      });

      if (data.success) {
        showToast(data.message || `🎉 Đã cập nhật ${workingModels.length} models lên trang chủ!`);
        // Bắn custom event để App.jsx ở trang chủ tự động load lại danh sách model ở header menu
        window.dispatchEvent(new CustomEvent('rexi_models_published', { detail: { provider: resolvedProv } }));
        fetchKeys();
      } else {
        showToast(data.error || 'Lỗi cập nhật trang chủ', 'error');
      }
    } catch (e) {
      showToast('Lỗi đăng tải: ' + e.message, 'error');
    } finally {
      setPublishing(false);
    }
  };

  const setDefaultModel = (modelId) => {
    setSelectedModel(modelId);
    localStorage.setItem('rexi_model', modelId);
    showToast(`Đã chọn ${modelId} làm model mặc định`);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2"><Key size={20} className="text-amber-400" /> Quản Lý API Keys & Auto Model Scanner (Powered by Groq AI Engine)</h2>

      {/* Box Thêm / Lưu Key */}
      <div className="bg-[#181920] rounded-2xl border border-white/8 p-4">
        <h3 className="text-xs font-bold text-amber-400 mb-3">Thêm API Key Mới</h3>
        <div className="flex flex-wrap gap-2">
          <select value={newProvider} onChange={e => setNewProvider(e.target.value)} className="px-3 py-2 bg-[#0d0e11] border border-white/10 rounded-xl text-xs text-white outline-none">
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="claude">Anthropic Claude</option>
            <option value="deepseek">DeepSeek AI</option>
            <option value="groq">Groq Cloud</option>
            <option value="grok">xAI Grok</option>
            <option value="github">GitHub Models</option>
            <option value="ollama">Ollama (Local)</option>
            <option value="opencode">OpenCode Agent</option>
            <option value="freellmapi">Free LLM API</option>
            <option value="custom">Custom / OpenRouter</option>
          </select>
          <input type="password" value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Nhập API Key (sk-..., AIzaSy..., gsk_...)" className="flex-1 min-w-[200px] px-3 py-2 bg-[#0d0e11] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-mono" />
          <button onClick={saveKey} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold">Lưu Key</button>
        </div>
      </div>

      {/* Model Health Scanner & Direct Publish */}
      <div className="bg-[#181920] rounded-2xl border border-white/8 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5"><Zap size={14} /> Tự Động Quét & Kiểm Tra Sức Khỏe Model (Groq AI Analyzer)</h3>
          <span className="text-[10px] text-slate-400">🤖 Groq AI Engine tự phân tích từ khóa (`gg`, `grop`, `grok`, `xai`...) và tự tìm API link</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <input
              type="text"
              value={scanProvider}
              onChange={e => setScanProvider(e.target.value)}
              placeholder="Nhập tên nhà cung cấp (vd: gg, grop, grok, xai, anthropic, openai)..."
              className="w-full px-3 py-2 bg-[#0d0e11] border border-cyan-500/30 focus:border-cyan-400 rounded-xl text-xs text-cyan-300 placeholder-slate-500 outline-none font-medium"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded pointer-events-none">AI Smart Input</span>
          </div>

          <input type="password" value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="API Key (từ ô trên hoặc đã lưu)" className="flex-1 min-w-[180px] px-3 py-2 bg-[#0d0e11] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-mono" />

          <input type="text" value={baseUrlInput} onChange={e => setBaseUrlInput(e.target.value)} placeholder="Base URL Endpoint (tùy chọn)" className="w-48 px-3 py-2 bg-[#0d0e11] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-mono" />

          <button onClick={verifyAndScanModels} disabled={scanning} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg">
            {scanning ? <><RefreshCw size={13} className="animate-spin" /> Groq AI Đang Phân Tích & Quét...</> : <><Search size={13} /> 🤖 AI Quét & Test Health Models</>}
          </button>
        </div>

        {/* Scan Results & Groq AI Analysis Banner */}
        {scanSummary && (
          <div className="p-3 bg-[#131417] rounded-xl border border-white/5 space-y-3">
            {scanSummary.analysis && (
              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs text-cyan-300 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bot size={16} className="text-cyan-400 animate-pulse shrink-0" />
                  <span>
                    🤖 <b>Groq AI Engine đã phân tích:</b> Từ khóa <i>&ldquo;{scanProvider}&rdquo;</i> ➔ <b>{scanSummary.analysis.providerName}</b> (<code className="text-amber-300">{scanSummary.analysis.providerId}</code>)
                  </span>
                </div>
                <span className="font-mono text-[10px] text-slate-400 bg-black/40 px-2 py-1 rounded truncate max-w-[300px]" title={scanSummary.analysis.modelsEndpoint}>
                  🔗 Link API: {scanSummary.analysis.modelsEndpoint}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">
                Kết quả kiểm tra health: <span className="text-emerald-400 font-bold">{scanSummary.workingCount}</span> / {scanSummary.verifiedCount} models ĐANG HOẠT ĐỘNG 🟢
              </span>
              {verifiedModels.filter(m => m.status === 'working').length > 0 && (
                <button
                  onClick={publishActiveModelsToHomepage}
                  disabled={publishing}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl shadow-xl flex items-center gap-2 transition-all transform active:scale-95"
                >
                  {publishing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  🚀 Cập Nhật {verifiedModels.filter(m => m.status === 'working').length} Models Đang Hoạt Động Lên Trang Chủ
                </button>
              )}
            </div>

            {/* Models Table List */}
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {verifiedModels.map(m => (
                <div
                  key={m.id}
                  onClick={() => m.status === 'working' && setDefaultModel(m.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all border ${
                    m.status === 'working'
                      ? selectedModel === m.id
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                        : 'bg-[#181920] hover:bg-emerald-500/10 text-slate-200 border-white/5'
                      : 'bg-rose-950/20 border-rose-500/20 text-rose-300 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${m.status === 'working' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'}`}></span>
                    <span className="font-mono truncate">{m.id}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-[10px]">
                    {m.status === 'working' ? (
                      <>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">⚡ {m.latency_ms}ms</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">ĐANG HOẠT ĐỘNG</span>
                      </>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 truncate max-w-[200px]" title={m.error}>
                        ❌ {m.error || 'Lỗi kết nối'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Saved Keys Table */}
      <div className="bg-[#181920] rounded-2xl border border-white/8 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5"><h3 className="text-xs font-bold text-slate-300">API Keys đã lưu trong CSDL</h3></div>
        {loading ? <div className="text-center py-8 text-slate-400 text-xs"><RefreshCw size={16} className="animate-spin mx-auto mb-1" /> Đang tải...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-[#13151a] border-b border-white/10">
              <tr><th className="px-4 py-3 text-left text-[10px] text-slate-400 uppercase">Provider</th><th className="px-4 py-3 text-left text-[10px] text-slate-400 uppercase">Key</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {keys.map(k => (
                <tr key={k.ma_khoa} className="hover:bg-white/3">
                  <td className="px-4 py-3 text-xs font-medium text-amber-300 uppercase">{k.ten_nha_cung_cap}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">{k.gia_tri_khoa}</td>
                </tr>
              ))}
              {keys.length === 0 && <tr><td colSpan={2} className="text-center py-6 text-slate-500 text-xs">Chưa có API Key nào trong CSDL</td></tr>}
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
// TAB: IPTV MONITOR
// ═══════════════════════════════════════════════════════════
function IptvTab({ token, showToast }) {
  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [countries, setCountries] = useState([]);
  const [history, setHistory] = useState([]);
  const [channels, setChannels] = useState([]);
  const [chanTotal, setChanTotal] = useState(0);
  const [filters, setFilters] = useState({ status: '', country: '', search: '', page: 1 });
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);

  const load = useCallback(async (all = false) => {
    try {
      if (all) {
        const [st, sa, co, hi] = await Promise.all([
          apiFetch('/admin/status', token),
          apiFetch('/admin/stats', token),
          apiFetch('/admin/countries', token),
          apiFetch('/admin/scan-history', token),
        ]);
        setStatus(st); setStats(sa); setCountries(co.countries || []); setHistory(hi.history || []);
      }
    } catch (e) { showToast(e.message, 'error'); }
  }, [token, showToast]);

  useEffect(() => { load(true); }, [load]);

  const loadChannels = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: filters.page, limit });
      if (filters.status) q.set('status', filters.status);
      if (filters.country) q.set('country', filters.country);
      if (filters.search) q.set('search', filters.search);
      const data = await apiFetch(`/admin/channels?${q}`, token);
      setChannels(data.channels || []);
      setChanTotal(data.total || 0);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [token, filters, limit, showToast]);

  useEffect(() => { loadChannels(); }, [loadChannels]);

  const runScan = async () => {
    setScanning(true);
    try {
      const data = await apiFetch('/admin/scan-now', token, { method: 'POST' });
      showToast(data.message || 'Đã kích hoạt scan');
      setTimeout(() => { load(true); setScanning(false); }, 15000);
    } catch (e) { showToast(e.message, 'error'); setScanning(false); }
  };

  const total = status?.total_channels || stats?.summary?.total_all || 0;
  const online = status?.total_online || stats?.summary?.total_online || 0;
  const onlinePct = stats?.summary?.online_pct || (total ? ((online / total) * 100).toFixed(1) : '0');

  const cards = [
    { label: 'Tổng kênh', value: total, color: 'text-white', icon: Tv },
    { label: 'Đang hoạt động', value: online, color: 'text-emerald-400', icon: Wifi },
    { label: 'Kênh lỗi', value: total - online, color: 'text-rose-400', icon: XCircle },
    { label: 'Online (%)', value: `${onlinePct}%`, color: 'text-cyan-400', icon: Activity },
    { label: 'Quốc gia', value: stats?.summary?.countries_scanned ?? countries.length, color: 'text-amber-400', icon: Globe },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Tv size={20} className="text-sky-400" /> IPTV Monitor</h2>
        <div className="flex items-center gap-2">
          {status?.is_running && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <Radar size={12} className="animate-pulse" /> Đang scan...
            </span>
          )}
          <button onClick={runScan} disabled={scanning}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold">
            <PlayCircle size={13} /> {scanning ? 'Đang quét...' : 'Quét kênh'}
          </button>
          <button onClick={() => load(true)} className="p-2 rounded-xl hover:bg-white/10 text-slate-400"><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-[#181920] rounded-2xl border border-white/8 p-4">
            <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-semibold mb-2"><c.icon size={13} /> {c.label}</div>
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Countries table */}
        <div className="bg-[#181920] rounded-2xl border border-white/8 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-xs font-bold text-sky-400 flex items-center gap-1.5"><Globe size={14} /> Quốc gia theo số kênh</h3>
            <span className="text-[10px] text-slate-500">Top {Math.min(countries.length, 15)} / {countries.length}</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {countries.slice(0, 15).map(c => (
              <div key={c.code} className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 text-xs">
                <div className="flex items-center gap-2 text-slate-300"><span>{c.flag}</span> {c.name} <span className="text-slate-500">({c.code})</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">{c.online}✓</span>
                  <span className="text-rose-400">{c.offline}✗</span>
                  <span className="text-slate-400 font-semibold w-10 text-right">{c.total}</span>
                </div>
              </div>
            ))}
            {countries.length === 0 && <div className="p-6 text-center text-xs text-slate-500">Chưa có dữ liệu quét</div>}
          </div>
        </div>

        {/* Channels table */}
        <div className="xl:col-span-2 bg-[#181920] rounded-2xl border border-white/8 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-bold text-sky-400 flex items-center gap-1.5 mr-auto"><Tv size={14} /> Kênh {filters.status === 'online' ? '(hoạt động)' : filters.status === 'offline' ? '(lỗi)' : '(tất cả)'}</h3>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
              className="px-2 py-1.5 bg-[#0d0e11] border border-white/10 rounded-lg text-[11px] text-slate-300 outline-none">
              <option value="">Tất cả trạng thái</option>
              <option value="online">Hoạt động</option>
              <option value="offline">Lỗi</option>
            </select>
            <select value={filters.country} onChange={e => setFilters(f => ({ ...f, country: e.target.value, page: 1 }))}
              className="px-2 py-1.5 bg-[#0d0e11] border border-white/10 rounded-lg text-[11px] text-slate-300 outline-none">
              <option value="">Mọi quốc gia</option>
              {countries.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
            </select>
            <div className="flex items-center gap-1.5 bg-[#0d0e11] border border-white/10 rounded-lg px-2 py-1">
              <Search size={12} className="text-slate-500" />
              <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
                placeholder="Tìm kênh..." className="bg-transparent text-[11px] text-slate-200 placeholder-slate-500 outline-none w-28" />
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#181920]">
                <tr className="text-left text-[10px] text-slate-500 uppercase border-b border-white/5">
                  <th className="px-4 py-2">Trạng thái</th>
                  <th className="px-2 py-2">Kênh</th>
                  <th className="px-2 py-2">Quốc gia</th>
                  <th className="px-2 py-2">Nhóm</th>
                  <th className="px-4 py-2 text-right">Ping</th>
                </tr>
              </thead>
              <tbody>
                {channels.map(ch => (
                  <tr key={ch.id} className="border-b border-white/5 hover:bg-white/3">
                    <td className="px-4 py-2">{ch.status === 'online'
                      ? <span className="text-emerald-400"><CheckCircle size={12} /></span>
                      : <span className="text-rose-400"><XCircle size={12} /></span>}</td>
                    <td className="px-2 py-2 text-slate-200 font-medium max-w-[220px] truncate">{ch.channel_name}</td>
                    <td className="px-2 py-2 text-slate-400">{ch.country}</td>
                    <td className="px-2 py-2 text-slate-400 max-w-[120px] truncate">{ch.group_name}</td>
                    <td className="px-4 py-2 text-right text-slate-400">{ch.latency_ms > 0 ? `${ch.latency_ms}ms` : '—'}</td>
                  </tr>
                ))}
                {channels.length === 0 && !loading && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Không có kênh nào</td></tr>}
              </tbody>
            </table>
            {loading && <div className="p-4 text-center text-[11px] text-slate-500">Đang tải...</div>}
          </div>
          <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>{chanTotal} kênh · trang {filters.page}</span>
            <div className="flex items-center gap-1.5">
              <select value={limit} onChange={e => setLimit(parseInt(e.target.value))} className="px-1.5 py-1 bg-[#0d0e11] border border-white/10 rounded-lg text-[11px] outline-none">
                <option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
              </select>
              <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronLeft size={13} /></button>
              <button disabled={filters.page * limit >= chanTotal} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronRight size={13} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Scan history */}
      <div className="bg-[#181920] rounded-2xl border border-white/8 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-1.5">
          <Clock size={14} className="text-sky-400" />
          <h3 className="text-xs font-bold text-sky-400">Lịch sử quét</h3>
        </div>
        <div className="max-h-56 overflow-y-auto">
          {history.map(h => (
            <div key={h.id} className="flex items-center justify-between px-4 py-2 border-b border-white/5 text-xs">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${h.status === 'done' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'}`}>
                  {h.status === 'done' ? <CheckCircle size={9} /> : <AlertTriangle size={9} />} {h.status}
                </span>
                <span className="text-slate-300">{new Date(h.started_at).toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <span>{h.total_channels} kênh</span>
                <span className="text-emerald-400">{h.online_channels}✓</span>
                <span className="text-rose-400">{h.offline_channels}✗</span>
                {h.new_channels > 0 && <span className="text-sky-400">+{h.new_channels} mới</span>}
                {h.lost_channels > 0 && <span className="text-orange-400">-{h.lost_channels} mất</span>}
              </div>
            </div>
          ))}
          {history.length === 0 && <div className="p-6 text-center text-xs text-slate-500">Chưa có lịch sử quét</div>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN ADMIN PANEL
// ═══════════════════════════════════════════════════════════
export default function AdminPanel({ token, currentUser, onClose }) {
  // token and currentUser passed as props from App.jsx
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!token || !currentUser || currentUser.phan_quyen !== 'admin') { if (onClose) onClose(); else window.location.href = '/'; }
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
      case 'users': return <UsersTab token={token} currentUser={currentUser} showToast={showToast} stats={stats} statsLoading={statsLoading} />;
      case 'conversations': return <ConversationsTab token={token} showToast={showToast} />;
      case 'apikeys': return <ApiKeysTab token={token} showToast={showToast} />;
      case 'skills': return <SkillsTab token={token} showToast={showToast} />;
      case 'chat': return <AdminChatTab token={token} currentUser={currentUser} showToast={showToast} />;
      case 'iptv': return <IptvTab token={token} showToast={showToast} />;
      case 'settings': return <SettingsTab token={token} showToast={showToast} />;
      default: return <UsersTab token={token} currentUser={currentUser} showToast={showToast} stats={stats} statsLoading={statsLoading} />;
    }
  };

  return (
    <div className="flex h-full bg-[#0f1014] text-white font-sans">
      {/* Sidebar */}
      <aside className="flex flex-col bg-[#131417] border-r border-white/5 w-56 shrink-0">
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
          <button onClick={() => onClose && onClose()} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <Home size={14} /> Về trang chủ
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 px-4 border-b border-white/5 flex items-center justify-between bg-[#131417]">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-300">{MENU_ITEMS.find(m => m.id === activeTab)?.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-400 flex items-center gap-1"><Crown size={10} /> {currentUser.ten_day_du}</span>
            <button onClick={() => { fetchStats(); }} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"><RefreshCw size={14} /></button>
            {onClose && <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"><X size={14} /></button>}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{renderTab()}</main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
