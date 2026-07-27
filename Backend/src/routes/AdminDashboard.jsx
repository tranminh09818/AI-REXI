import React, { useState, useEffect } from 'react';
import { Users, Shield, X, UserCheck, UserX } from 'lucide-react';

const API_BASE = "http://localhost:5000/api";

const AdminDashboard = ({ onClose, token }) => {
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
    <div className="bg-[#181920] border border-amber-500/30 rounded-2xl w-full max-w-4xl p-6 space-y-4 shadow-2xl flex flex-col max-h-[90vh]">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
          <Shield size={18} /> Admin Dashboard - Quản Lý Người Dùng
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {loading && <div className="text-center py-10 text-slate-400">Đang tải danh sách người dùng...</div>}
      {error && <div className="text-center py-10 text-rose-400">{error}</div>}

      {!loading && !error && (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 bg-[#181920]">
              <tr>
                <th className="p-2.5 text-slate-300 font-bold">Email</th>
                <th className="p-2.5 text-slate-300 font-bold">Tên đầy đủ</th>
                <th className="p-2.5 text-slate-300 font-bold">Vai trò</th>
                <th className="p-2.5 text-slate-300 font-bold">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(user => (
                <tr key={user.ma_nguoi_dung} className="hover:bg-white/5">
                  <td className="p-2.5 text-slate-300">{user.email}</td>
                  <td className="p-2.5 text-slate-400">{user.ten_day_du}</td>
                  <td className="p-2.5">
                    <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full font-medium ${
                      user.phan_quyen === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {user.phan_quyen === 'admin' ? <UserCheck size={12} /> : <UserX size={12} />}
                      {user.phan_quyen}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-500 font-mono">{new Date(user.ngay_tao).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;