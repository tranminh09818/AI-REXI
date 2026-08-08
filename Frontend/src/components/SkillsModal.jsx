import React from 'react';
import { X, Layers } from 'lucide-react';

export default function SkillsModal({ skillsOpen, setSkillsOpen, dbSkills }) {
  if (!skillsOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSkillsOpen(false)}>
      <div className="bg-[#1a1b24] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers size={16} className="text-purple-400" /> Quản Lý Gói Kỹ Năng Agent (Skills Manager)
          </h2>
          <button onClick={() => setSkillsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {dbSkills === null && <p className="text-xs text-red-400 col-span-2 text-center py-8">Không thể tải skills</p>}
          {(!dbSkills || dbSkills.length === 0) && <p className="text-xs text-slate-500 col-span-2 text-center py-8">Không có skills nào</p>}
          {(dbSkills || []).map(s => (
            <div key={s.ma_ky_nang} className="p-3 bg-[#0d0e11] rounded-xl border border-white/5 hover:border-purple-500/30 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">{s.ten_ky_nang}</span>
              </div>
              <p className="text-xs font-semibold text-slate-200">{s.tieu_de}</p>
              <p className="text-[11px] text-slate-400 mt-1">{s.mo_ta}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
