import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, Square, Clock, Users, LogOut, BarChart3, Timer, FolderKanban, 
  Trash2, CalendarPlus, Mail, Lock, User, Shield, ShieldAlert, ArrowRight, Activity, Edit2, X, Save
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, LabelList, Cell 
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// --- UTILS ---
const authFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('timeapp_token');
  const headers = { ...options.headers, 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('timeapp_token');
    window.location.reload();
    return null;
  }
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) return res;
  return { ok: res.ok, status: res.status, json: async () => ({}) };
};

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e'];

// --- GLOBAL STYLES ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    body { background-color: #f3f4f6; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; color: #1e293b; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .glass-panel { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.5); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .glass-input { background: #f8fafc; border: 1px solid #e2e8f0; transition: all 0.2s; }
    .glass-input:focus { background: #fff; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
  `}</style>
);

// --- MODAL ---
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors"><X size={20}/></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('tracker'); 
  const [loading, setLoading] = useState(true);
  
  // Changed: Store the full timer object, not just boolean
  const [activeTimer, setActiveTimer] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('timeapp_user');
    const token = localStorage.getItem('timeapp_token');
    if (savedUser && token) setUser(JSON.parse(savedUser));
    setLoading(false);
  }, []);

  // Timer Heartbeat (Global)
  useEffect(() => {
    if (!user) return;
    const checkTimer = async () => {
      const res = await authFetch('/entries/active');
      if (res && res.ok) {
        const data = await res.json();
        // Set full object if ID exists, else null
        setActiveTimer((data && data.id) ? data : null);
      }
    };
    checkTimer();
    const interval = setInterval(checkTimer, 5000); // Check sync every 5s
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('timeapp_user');
    localStorage.removeItem('timeapp_token');
    setUser(null);
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-slate-400 animate-pulse">Loading TimeApp...</div>;

  if (!user) return (
    <>
      <GlobalStyles />
      <AuthScreen onLogin={(u, t) => { 
        localStorage.setItem('timeapp_user', JSON.stringify(u)); 
        localStorage.setItem('timeapp_token', t);
        setUser(u); 
      }} />
    </>
  );

  return (
    <div className="flex h-screen w-screen bg-slate-100 text-slate-800 overflow-hidden">
      <GlobalStyles />
      <Sidebar user={user} activeView={currentView} onChangeView={setCurrentView} onLogout={handleLogout} activeTimer={activeTimer} />
      <MainContent user={user} view={currentView} activeTimer={activeTimer} onTimerUpdate={setActiveTimer} />
    </div>
  );
}

// --- AUTH SCREEN ---
function AuthScreen({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    try {
      const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      let data; const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) data = await res.json(); else data = await res.text();
      if (!res.ok) throw new Error(typeof data === 'string' ? data : 'Authentication failed');
      if (isRegister) { setIsRegister(false); setError('Account created! Please log in.'); } else onLogin(data.user, data.token);
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 p-4">
      <div className="glass-panel p-10 rounded-3xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-10"><div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-300 transform rotate-3"><Clock className="text-white" size={32} /></div><h1 className="text-3xl font-extrabold text-slate-800">{isRegister ? 'Join TimeApp' : 'Welcome Back'}</h1></div>
        {error && <div className={`p-4 mb-6 text-sm rounded-xl font-medium ${error.includes('created') ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && <div className="relative"><User className="absolute left-4 top-3.5 text-slate-400" size={20} /><input type="text" placeholder="Full Name" className="glass-input w-full pl-12 p-3.5 rounded-xl text-sm font-medium outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>}
          <div className="relative"><Mail className="absolute left-4 top-3.5 text-slate-400" size={20} /><input type="email" placeholder="Email" className="glass-input w-full pl-12 p-3.5 rounded-xl text-sm font-medium outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required /></div>
          <div className="relative"><Lock className="absolute left-4 top-3.5 text-slate-400" size={20} /><input type="password" placeholder="Password" className="glass-input w-full pl-12 p-3.5 rounded-xl text-sm font-medium outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required /></div>
          <button className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg text-sm">{isRegister ? 'Create Account' : 'Sign In'}</button>
        </form>
        <div className="mt-8 text-center text-sm font-medium text-slate-500"><button onClick={() => setIsRegister(!isRegister)} className="text-indigo-600 hover:underline">{isRegister ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}</button></div>
      </div>
    </div>
  );
}

// --- SIDEBAR (Updated with Live Timer) ---
function Sidebar({ user, activeView, onChangeView, onLogout, activeTimer }) {
  const isAdmin = user.role === 'admin';
  const [elapsed, setElapsed] = useState(0);

  // Live Timer Logic
  useEffect(() => {
    if (!activeTimer) { setElapsed(0); return; }
    const tick = () => {
      const seconds = Math.floor((new Date() - new Date(activeTimer.start_time)) / 1000);
      setElapsed(seconds > 0 ? seconds : 0);
    };
    tick(); // run immediately
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  return (
    <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col hidden md:flex h-full shadow-2xl z-20 shrink-0">
      <div className="p-8 flex items-center gap-3"><div className="bg-indigo-500 text-white p-2 rounded-lg"><Clock size={24} /></div><span className="font-extrabold text-2xl text-white">TimeApp</span></div>
      <nav className="flex-1 px-4 space-y-2 mt-2">
        <div className="px-4 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 mt-4">Workspace</div>
        <NavItem icon={<Timer />} label="Tracker" isActive={activeView === 'tracker'} onClick={() => onChangeView('tracker')} />
        {isAdmin && <>
          <div className="px-4 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 mt-8">Admin Console</div>
          <NavItem icon={<BarChart3 />} label="Analytics" isActive={activeView === 'analytics'} onClick={() => onChangeView('analytics')} />
          <NavItem icon={<FolderKanban />} label="Projects" isActive={activeView === 'projects'} onClick={() => onChangeView('projects')} />
          <NavItem icon={<Users />} label="Team" isActive={activeView === 'team'} onClick={() => onChangeView('team')} />
        </>}
      </nav>
      
      {/* Live Timer Display in Sidebar */}
      {activeTimer && (
        <div className="mx-6 mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-2 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
            <span className="text-xs font-bold text-red-400 uppercase tracking-wide">Tracking Time</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white pl-4">
             {formatDuration(elapsed)}
          </div>
        </div>
      )}
      
      <div className="p-6 border-t border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-lg text-white font-bold">{user.avatar}</div><div className="overflow-hidden"><div className="text-sm font-bold text-white truncate">{user.name} {isAdmin && <Shield size={12} className="inline text-indigo-400" />}</div><div className="text-xs text-slate-500 truncate">{user.email}</div></div></div>
        <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800 px-4 py-3 rounded-xl transition-all text-sm font-bold"><LogOut size={16}/> Log Out</button>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, isActive, onClick }) {
  return <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 hover:text-white'}`}>{React.cloneElement(icon, { size: 18, strokeWidth: 2.5 })} {label}</button>;
}

// --- MAIN CONTENT ---
function MainContent({ user, view, activeTimer, onTimerUpdate }) {
  const [trigger, setTrigger] = useState(0);
  const update = () => { setTrigger(t => t + 1); }; // Refresh data lists

  return (
    <main className="flex-1 p-8 md:p-12 overflow-y-auto bg-slate-100/50">
      <header className="mb-10"><h2 className="text-3xl font-extrabold text-slate-900 tracking-tight capitalize">{view === 'analytics' ? 'Dashboard' : view}</h2></header>
      
      {view === 'tracker' && (
        <div className="max-w-6xl space-y-8">
          <TimeTrackerCard activeTimer={activeTimer} onTimerUpdate={onTimerUpdate} onDataRefresh={update}/>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2"><HistoryList trigger={trigger} onUpdate={update}/></div>
            <div><ManualEntryCard onUpdate={update}/></div>
          </div>
        </div>
      )}

      {view === 'analytics' && user.role === 'admin' && <AnalyticsView trigger={trigger}/>}
      {view === 'projects' && user.role === 'admin' && <ProjectsManager/>}
      {view === 'team' && user.role === 'admin' && <TeamView/>}
      
      {(view !== 'tracker' && user.role !== 'admin') && <div className="flex flex-col items-center justify-center h-96 text-slate-400 glass-panel rounded-3xl"><ShieldAlert size={64} className="mb-4 text-slate-300"/><h3 className="text-xl font-bold text-slate-600">Access Restricted</h3></div>}
    </main>
  );
}

// --- ANALYTICS (Fixed Stacked Bars & Spacing) ---
function AnalyticsView({ trigger }) {
  const [data, setData] = useState([]);
  useEffect(() => { authFetch('/analytics').then(r => r.json()).then(d => Array.isArray(d) ? setData(d) : setData([])) }, [trigger]);

  const projectData = useMemo(() => {
    if (!data.length) return { chartData: [], users: [] };
    const map = {}; const usersSet = new Set();
    
    data.forEach(item => { 
      const pName = item.project_name || 'Unknown'; 
      if (!map[pName]) map[pName] = { name: pName, total: 0 }; // Init total
      
      const hours = Number(item.hours);
      map[pName][item.user_name] = hours;
      map[pName].total += hours; // Calculate total for the ghost bar
      usersSet.add(item.user_name);
    });

    // Sort by total hours descending for better visuals
    const sortedData = Object.values(map).sort((a,b) => b.total - a.total);
    return { chartData: sortedData, users: Array.from(usersSet) };
  }, [data]);

  const userData = useMemo(() => {
    if (!data.length) return {};
    const map = {};
    data.forEach(item => { if (!map[item.user_name]) map[item.user_name] = []; map[item.user_name].push({ project: item.project_name, hours: Number(item.hours), fill: item.color }); });
    return map;
  }, [data]);

  if (data.length === 0) return <div className="p-10 text-center text-slate-400 glass-panel rounded-2xl">No data available yet. Start tracking time!</div>;

  // Calculate dynamic height based on number of projects (approx 60px per project)
  const chartHeight = Math.max(450, projectData.chartData.length * 60);

  return (
    <div className="space-y-10 max-w-7xl pb-20">
      <div className="glass-panel p-8 rounded-3xl">
        <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2"><Activity className="text-indigo-600"/> Team Project Distribution</h3>
        
        <div style={{ height: chartHeight, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            {/* Increased barSize for thicker bars */}
            <BarChart layout="vertical" data={projectData.chartData} margin={{right: 50}} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#e2e8f0"/>
              <XAxis type="number" stroke="#94a3b8"/>
              
              {/* Increased YAxis width to fix squished labels */}
              <YAxis dataKey="name" type="category" stroke="#64748b" width={180} tick={{fontWeight: 'bold'}} />
              
              <Tooltip cursor={{fill: '#f1f5f9'}}/>
              <Legend wrapperStyle={{paddingTop: '20px'}}/>
              
              {/* User Segments */}
              {projectData.users.map((userName, i) => (
                <Bar key={userName} dataKey={userName} stackId="a" fill={COLORS[i % COLORS.length]}>
                   <LabelList dataKey={userName} position="center" style={{ fill: '#fff', fontSize: '11px', fontWeight: 'bold' }} formatter={(val) => val > 0.5 ? val : ''} />
                </Bar>
              ))}

              {/* Ghost Bar for Totals (Invisible but carries the label) */}
              <Bar dataKey="total" stackId="b" fill="transparent" isAnimationActive={false}>
                 <LabelList dataKey="total" position="right" style={{ fill: '#1e293b', fontSize: '13px', fontWeight: '800' }} formatter={(val) => `${val.toFixed(1)}h`} />
              </Bar>

            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(userData).map(([userName, entries]) => (
          <div key={userName} className="glass-panel p-6 rounded-3xl"><h4 className="font-bold text-slate-700 mb-4 flex gap-2"><User size={20}/> {userName}</h4><div className="h-[200px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={entries} margin={{right: 40}} barSize={12}><CartesianGrid horizontal={false} stroke="#f1f5f9"/><XAxis type="number" hide/><YAxis dataKey="project" type="category" width={80} tick={{fontSize: 11}}/><Tooltip cursor={{fill: 'transparent'}}/><Bar dataKey="hours" radius={[0, 4, 4, 0]}>{entries.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill || COLORS[0]} />)}<LabelList dataKey="hours" position="right" style={{ fill: '#64748b', fontSize: '12px', fontWeight: '800' }} formatter={(val) => `${val}h`} /></Bar></BarChart></ResponsiveContainer></div></div>
        ))}
      </div>
    </div>
  );
}

// --- TRACKER CARD (Fixed Timer Display) ---
function TimeTrackerCard({ activeTimer, onTimerUpdate, onDataRefresh }) {
  const [projects, setProjects] = useState([]);
  const [proj, setProj] = useState('');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => { authFetch('/projects').then(r=>r.json()).then(setProjects) }, []);
  
  // Set selected project if timer is running
  useEffect(() => {
    if (activeTimer) setProj(activeTimer.project_id);
    else setElapsed(0);
  }, [activeTimer]);

  // Local Timer Ticker
  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((new Date() - new Date(activeTimer.start_time)) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const toggle = async () => {
    if (activeTimer) { 
      await authFetch('/entries/stop', { method: 'POST' }); 
      onTimerUpdate(null); // Clear global timer
      onDataRefresh(); 
    } else { 
      if(!proj) return alert('Select project'); 
      const res = await authFetch('/entries/start', { method: 'POST', body: JSON.stringify({ projectId: proj }) }); 
      if(res.ok) { 
        const newTimer = await res.json();
        onTimerUpdate(newTimer); // Set global timer
      } 
    }
  };

  return (
    <div className="glass-panel p-8 rounded-3xl flex flex-col md:flex-row items-end gap-6 relative overflow-hidden">
      {activeTimer && <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse"></div>}
      
      <div className="flex-1 w-full space-y-2">
        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-widest ml-1">Current Task Project</label>
        <div className="relative">
          <FolderKanban className="absolute left-4 top-4 text-slate-400" size={20}/>
          <select className="glass-input w-full pl-12 p-4 rounded-xl text-slate-700 font-bold outline-none appearance-none" value={proj} onChange={e=>setProj(e.target.value)} disabled={!!activeTimer}>
            <option value="">Select a Project...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      
      {/* Elapsed Time Display next to button */}
      <div className="font-mono text-3xl font-bold text-slate-700 w-32 text-center tabular-nums hidden md:block">
        {formatDuration(elapsed)}
      </div>

      <button onClick={toggle} className={`w-full md:w-auto p-4 px-10 rounded-xl text-white font-extrabold shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 ${activeTimer ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'}`}>
        {activeTimer ? <><Square fill="currentColor" size={20}/> STOP</> : <><Play fill="currentColor" size={20}/> START</>}
      </button>
    </div>
  );
}

// --- HISTORY & ENTRY MANAGER (With Edit/Delete) ---
function HistoryList({ trigger, onUpdate }) {
  const [entries, setEntries] = useState([]); const [editingEntry, setEditingEntry] = useState(null); const [projects, setProjects] = useState([]);
  useEffect(() => { authFetch('/entries').then(r=>r.json()).then(setEntries) }, [trigger]);
  useEffect(() => { if(editingEntry) authFetch('/projects').then(r=>r.json()).then(setProjects) }, [editingEntry]);
  const handleDelete = async (id) => { if(window.confirm('Delete entry?')) { await authFetch(`/entries/${id}`, { method: 'DELETE' }); onUpdate(); } };
  const handleSave = async (e) => { e.preventDefault(); const start = `${editingEntry.date}T${editingEntry.startTime}`; const end = `${editingEntry.date}T${editingEntry.endTime}`; await authFetch(`/entries/${editingEntry.id}`, { method: 'PUT', body: JSON.stringify({ projectId: editingEntry.project_id, start, end }) }); setEditingEntry(null); onUpdate(); };
  const openEdit = (e) => { const d = new Date(e.start_time); const endD = new Date(e.end_time); setEditingEntry({ id: e.id, project_id: e.project_id, date: d.toISOString().split('T')[0], startTime: d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}), endTime: endD.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}) }); };

  return (
    <>
      <div className="glass-panel rounded-3xl overflow-hidden h-full flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-white/50 flex justify-between items-center"><h3 className="font-bold text-slate-700">Recent Activity</h3><ArrowRight size={18} className="text-slate-400"/></div>
        <div className="overflow-y-auto flex-1 p-2">
          {entries.map(e=><div key={e.id} className="p-4 mb-2 rounded-2xl flex justify-between items-center hover:bg-white hover:shadow-md transition-all group">
            <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md" style={{backgroundColor: e.color || '#cbd5e1'}}><Clock size={18}/></div><div><div className="font-bold text-slate-700">{e.project_name}</div><div className="text-xs text-slate-400 font-medium">{new Date(e.start_time).toLocaleDateString()} • {new Date(e.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div></div></div>
            <div className="flex items-center gap-3"><span className="font-mono text-sm font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">{Math.round(e.duration_seconds/60)}m</span><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => openEdit(e)} className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg"><Edit2 size={16}/></button><button onClick={() => handleDelete(e.id)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={16}/></button></div></div>
          </div>)}
          {entries.length === 0 && <div className="p-10 text-center text-slate-400">No recent entries.</div>}
        </div>
      </div>
      <Modal isOpen={!!editingEntry} onClose={() => setEditingEntry(null)} title="Edit Entry">
        {editingEntry && (<form onSubmit={handleSave} className="space-y-4"><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Project</label><select className="glass-input w-full p-3 rounded-xl" value={editingEntry.project_id} onChange={e => setEditingEntry({...editingEntry, project_id: e.target.value})}>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Date</label><input type="date" className="glass-input w-full p-3 rounded-xl" value={editingEntry.date} onChange={e => setEditingEntry({...editingEntry, date: e.target.value})}/></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Start</label><input type="time" className="glass-input w-full p-3 rounded-xl" value={editingEntry.startTime} onChange={e => setEditingEntry({...editingEntry, startTime: e.target.value})}/></div><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">End</label><input type="time" className="glass-input w-full p-3 rounded-xl" value={editingEntry.endTime} onChange={e => setEditingEntry({...editingEntry, endTime: e.target.value})}/></div></div><button className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold mt-4 flex justify-center gap-2"><Save size={18}/> Save Changes</button></form>)}
      </Modal>
    </>
  );
}

function ManualEntryCard({ onUpdate }) {
  const [projects, setProjects] = useState([]); const [formData, setFormData] = useState({ projectId: '', date: '', start: '', end: '' });
  useEffect(() => { authFetch('/projects').then(r => r.json()).then(setProjects); }, []);
  const handleSubmit = async (e) => { e.preventDefault(); await authFetch('/entries/manual', { method: 'POST', body: JSON.stringify({ projectId: formData.projectId, start: new Date(`${formData.date}T${formData.start}`).toISOString(), end: new Date(`${formData.date}T${formData.end}`).toISOString() }) }); onUpdate(); };
  return (
    <div className="glass-panel rounded-3xl p-6 h-full"><h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><CalendarPlus size={20} className="text-indigo-500"/> Manual Entry</h3><form onSubmit={handleSubmit} className="space-y-4"><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Project</label><select className="glass-input w-full p-3 rounded-xl text-sm font-bold text-slate-700 outline-none" onChange={e => setFormData({...formData, projectId: e.target.value})}><option>Select...</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Date</label><input type="date" className="glass-input w-full p-3 rounded-xl text-sm font-bold text-slate-700 outline-none" onChange={e => setFormData({...formData, date: e.target.value})}/></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Start</label><input type="time" className="glass-input w-full p-3 rounded-xl text-sm font-bold text-slate-700 outline-none" onChange={e => setFormData({...formData, start: e.target.value})}/></div><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">End</label><input type="time" className="glass-input w-full p-3 rounded-xl text-sm font-bold text-slate-700 outline-none" onChange={e => setFormData({...formData, end: e.target.value})}/></div></div><button className="w-full bg-slate-800 text-white p-3.5 rounded-xl font-bold text-sm hover:bg-slate-900 transition-all shadow-lg mt-2">Add Entry</button></form></div>
  );
}

function ProjectsManager() {
  const [projects, setProjects] = useState([]); const [name, setName] = useState(''); const [editingProject, setEditingProject] = useState(null);
  useEffect(() => { authFetch('/projects').then(r=>r.json()).then(setProjects) }, []);
  const refresh = () => authFetch('/projects').then(r=>r.json()).then(setProjects);
  const add = async (e) => { e.preventDefault(); await authFetch('/projects', { method:'POST', body:JSON.stringify({name, color:'#333'}) }); setName(''); refresh(); };
  const del = async (id) => { if(window.confirm('Delete project?')) { await authFetch(`/projects/${id}`, { method: 'DELETE' }); refresh(); } };
  const handleSave = async (e) => { e.preventDefault(); await authFetch(`/projects/${editingProject.id}`, { method: 'PUT', body: JSON.stringify({ name: editingProject.name, color: editingProject.color }) }); setEditingProject(null); refresh(); };

  return (
    <>
      <div className="glass-panel p-8 rounded-3xl max-w-4xl"><h3 className="font-bold text-slate-700 mb-6 text-xl">Projects</h3><form onSubmit={add} className="flex gap-4 mb-8"><input value={name} onChange={e=>setName(e.target.value)} className="glass-input p-4 rounded-xl w-full font-bold outline-none" placeholder="New project name..." /><button className="bg-indigo-600 text-white px-8 rounded-xl font-bold shadow-lg shadow-indigo-200">Create</button></form><div className="grid gap-3">{projects.map(p=><div key={p.id} className="p-4 rounded-xl bg-white border border-slate-100 flex justify-between items-center group hover:shadow-md transition-all"><span className="font-bold text-slate-700">{p.name}</span><div className="flex gap-2"><button onClick={() => setEditingProject(p)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit2 size={18}/></button><button onClick={() => del(p.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button></div></div>)}</div></div>
      <Modal isOpen={!!editingProject} onClose={() => setEditingProject(null)} title="Edit Project">{editingProject && (<form onSubmit={handleSave} className="space-y-4"><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Project Name</label><input className="glass-input w-full p-3 rounded-xl" value={editingProject.name} onChange={e => setEditingProject({...editingProject, name: e.target.value})}/></div><button className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold mt-4 flex justify-center gap-2"><Save size={18}/> Update Project</button></form>)}</Modal>
    </>
  );
}

function TeamView() {
  const [users, setUsers] = useState([]);
  const loadUsers = () => authFetch('/users').then(r => r.json()).then(setUsers);
  useEffect(() => { loadUsers(); }, []);
  const changeRole = async (userId, newRole) => { const res = await authFetch(`/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) }); if (res && res.ok) loadUsers(); else alert('Failed to update role'); };
  return (
    <div className="glass-panel rounded-3xl overflow-hidden max-w-5xl"><div className="p-6 border-b border-slate-100 bg-white/50"><h3 className="font-bold text-slate-700">Team Members</h3></div><table className="w-full text-left text-sm"><thead className="bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider text-xs"><tr><th className="p-5">Member</th><th className="p-5">Contact</th><th className="p-5">Access Level</th><th className="p-5 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map(u => (<tr key={u.id} className="hover:bg-indigo-50/30 transition-colors"><td className="p-5 font-bold text-slate-700 flex items-center gap-3"><span className="text-2xl">{u.avatar}</span> {u.name}</td><td className="p-5 text-slate-500 font-medium">{u.email}</td><td className="p-5"><span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>{u.role}</span></td><td className="p-5 text-right"><select className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}><option value="employee">Employee</option><option value="admin">Admin</option></select></td></tr>))}</tbody></table></div>
  );
}