import React from 'react';
import { X, Terminal, GitBranch, Activity, Trash2 } from 'lucide-react';

export default function SuperToolsModal({
  superToolsOpen, setSuperToolsOpen,
  execCommand, setExecCommand, execOutput, handleExecCommand,
  gitStatus, _gitDiff, fetchGitStatus, fetchGitDiff,
  memories, newMemory, setNewMemory, handleAddMemory, handleDeleteMemory
}) {
  if (!superToolsOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSuperToolsOpen(false)}>
      <div className="bg-[#1a1b24] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="text-amber-400">⚡</span> Super Tools (Terminal Exec, Git & Memory)
          </h2>
          <button onClick={() => setSuperToolsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><X size={16} /></button>
        </div>

        {/* Terminal Exec */}
        <div className="mb-4 p-3 bg-[#0d0e11] rounded-xl border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Terminal size={14} className="text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400">Terminal Exec</span>
          </div>
          <div className="flex gap-2">
            <input type="text" value={execCommand} onChange={e => setExecCommand(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleExecCommand()}
              placeholder="Nhập lệnh terminal..." className="flex-1 px-3 py-2 bg-[#1e1f20] border border-white/5 rounded-lg text-xs text-slate-200 placeholder-slate-500 outline-none font-mono" />
            <button onClick={handleExecCommand} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium">Chạy</button>
          </div>
          {execOutput && <pre className="mt-2 p-2 bg-black/40 rounded-lg text-[11px] text-slate-300 font-mono max-h-32 overflow-auto">{execOutput}</pre>}
        </div>

        {/* Git Status */}
        <div className="mb-4 p-3 bg-[#0d0e11] rounded-xl border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5"><GitBranch size={14} /> Git Status</span>
            <button onClick={() => { fetchGitStatus(); fetchGitDiff(); }} className="text-[10px] text-slate-400 hover:text-white">Refresh</button>
          </div>
          {gitStatus ? (
            <div className="text-xs text-slate-300">
              <p>Branch: <span className="text-cyan-300 font-mono">{gitStatus.branch || 'N/A'}</span></p>
              {gitStatus.changes?.length > 0 && <p className="text-amber-300 mt-1">{gitStatus.changes.length} files changed</p>}
            </div>
          ) : <p className="text-xs text-slate-500">Không có Git repo</p>}
        </div>

        {/* Memory */}
        <div className="p-3 bg-[#0d0e11] rounded-xl border border-white/5">
          <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5 mb-2"><Activity size={14} /> Long-term Memory</span>
          <div className="flex gap-2 mb-2">
            <input type="text" value={newMemory} onChange={e => setNewMemory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddMemory()}
              placeholder="Thêm ghi chú..." className="flex-1 px-3 py-2 bg-[#1e1f20] border border-white/5 rounded-lg text-xs text-slate-200 placeholder-slate-500 outline-none" />
            <button onClick={handleAddMemory} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium">+ Lưu</button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {memories.length === 0 ? <p className="text-[11px] text-slate-500">Chưa có memory</p> : memories.map(m => (
              <div key={m.ma_bo_nho} className="flex items-center justify-between p-2 bg-[#1e1f20] rounded-lg text-[11px] text-slate-300">
                <span className="truncate flex-1">{m.noi_dung}</span>
                <button onClick={() => { if (confirm('Xoá memory này?')) handleDeleteMemory(m.ma_bo_nho) } } className="ml-2 text-slate-500 hover:text-rose-400"><Trash2 size={11} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
