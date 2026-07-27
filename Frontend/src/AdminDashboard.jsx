import React, { useState, useEffect } from 'react';
import { Users, Shield, X, UserCheck, UserX, Server, Database, Activity } from 'lucide-react';

const API_BASE = "http://localhost:5000/api";

const AdminDashboard = ({ onClose, token, currentUser }) => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) {
        setError('Bạn chưa đăng nhập hoặc không có quyền Admin.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 403) throw new Error('Bạn không có quyền truy cập trang quản trị.');
        if (!res.ok) throw new Error('Lỗi khi tải danh sách người dùng.');

        const data = await res.json();
        setUsers(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#181920] border border-amber-500/30 rounded-2xl w-full max-w-4xl p-6 space-y-5 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-400">Admin Control Panel — Quản Trị Hệ Thống AI REXI</h3>
              <p className="text-xs text-slate-400">Quản lý người dùng, phân quyền và kiểm tra trạng thái máy chủ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* System Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-[#131417] rounded-xl border border-white/5 flex items-center gap-3">
            <Server className="text-emerald-400" size={20} />
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Backend API Server</p>
              <p className="text-xs font-bold text-emerald-400">Online (Port 5000)</p>
            </div>
          </div>
          <div className="p-3 bg-[#131417] rounded-xl border border-white/5 flex items-center gap-3">
            <Database className="text-cyan-400" size={20} />
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Cơ Sở Dữ Liệu</p>
              <p className="text-xs font-bold text-cyan-400">SQLite &amp; SQL Server Ready</p>
            </div>
          </div>
          <div className="p-3 bg-[#131417] rounded-xl border border-white/5 flex items-center gap-3">
            <Activity className="text-amber-400" size={20} />
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Admin Đang Đăng Nhập</p>
              <p className="text-xs font-bold text-amber-400 truncate max-w-[150px]">{currentUser?.ten_day_du || currentUser?.email || 'Quản Trị Viên'}</p>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="flex-1 overflow-hidden flex flex-col border border-white/10 rounded-xl bg-[#131417]">
          <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Users size={14} className="text-amber-400" /> Danh Sách Người Dùng Hàng Thật ({users.length})
            </span>
          </div>

          {loading && <div className="text-center py-10 text-slate-400 text-xs">Đang tải danh sách người dùng từ hệ thống...</div>}
          {error && <div className="text-center py-10 text-rose-400 text-xs px-4">{error}</div>}

          {!loading && !error && (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-[#181920] border-b border-white/10">
                  <tr>
                    <th className="p-3 text-slate-400 font-semibold">Email</th>
                    <th className="p-3 text-slate-400 font-semibold">Họ và Tên</th>
                    <th className="p-3 text-slate-400 font-semibold">Phân Quyền</th>
                    <th className="p-3 text-slate-400 font-semibold">Ngày Đăng Ký</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map(user => (
                    <tr key={user.ma_nguoi_dung} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 text-slate-200 font-medium">{user.email}</td>
                      <td className="p-3 text-slate-300">{user.ten_day_du || 'Chưa cập nhật'}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          user.phan_quyen === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {user.phan_quyen === 'admin' ? <UserCheck size={12} /> : <UserX size={12} />}
                          {user.phan_quyen === 'admin' ? 'Quản Trị Viên (Admin)' : 'Người Dùng (User)'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">{new Date(user.ngay_tao).toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-amber-600/20">
            Đóng Admin Panel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
