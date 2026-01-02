import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, Square, Clock, Users, LogOut, BarChart3, Timer, FolderKanban, 
  Trash2, CalendarPlus, Mail, Lock, User, Shield, ShieldAlert, ArrowRight, 
  Activity, Edit2, X, Save, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, 
  Check, AlertTriangle, Settings, Eye, EyeOff, AlertCircle, CheckCircle2, Plus, CornerDownRight, Briefcase
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, LabelList, Cell 
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Uncaught error:", error, errorInfo); }
  render() { if (this.state.hasError) return <div className="h-screen flex items-center justify-center font-bold text-slate-400">Something went wrong. Reload page.</div>; return this.props.children; }
}

const authFetch = async (endpoint, options = {}) => {
  try {
    const token = localStorage.getItem('timeapp_token');
    const headers = { ...options.headers, 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (res.status === 401 || res.status === 403) { localStorage.removeItem('timeapp_token'); return { ok: false, status: res.status, json: async () => ({}) }; }
    return { ok: res.ok, status: res.status, json: async () => await res.json().catch(()=>({})) };
  } catch (err) { return { ok: false, status: 500, json: async () => ({}) }; }
};

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00:00";
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const toLocalISOString = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

const stringToColor = (str) => {
  if (!str) return '#94a3b8';
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#84cc16', '#14b8a6', '#f43f5e', '#d946ef', '#e11d48', '#22c55e'];
  return colors[Math.abs(hash) % colors.length];
};

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    body { background-color: #f8fafc; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; color: #1e293b; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .glass-panel { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border: 1px solid rgba(226, 232, 240, 0.8); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .glass-input { background: #f8fafc; border: 1px solid #e2e8f0; transition: all 0.2s; }
    .glass-input:focus { background: #fff; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
    .chart-grid-row { display: grid; grid-template-columns: 40px 200px 1fr 80px; align-items: center; gap: 16px; margin-bottom: 12px; min-width: 0; }
    .chart-sub-row { display: grid; grid-template-columns: 40px 200px 1fr 80px; align-items: center; gap: 16px; margin-bottom: 8px; opacity: 0.8; font-size: 0.85rem; }
    .truncate-grid { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .toast-anim { animation: slideIn 0.3s ease-out forwards; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  `}</style>
);

function Modal({ isOpen, onClose, title, children }) { if (!isOpen) return null; return ( <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"> <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"> <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"><h3 className="font-bold text-lg text-slate-800">{title}</h3><button onClick={onClose}><X size={20}/></button></div> <div className="p-6">{children}</div> </div> </div> ); }
function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) { if (!isOpen) return null; return ( <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"> <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in"> <AlertTriangle size={40} className="text-red-500 mx-auto mb-4"/> <h3 className="text-lg font-bold mb-2">{title}</h3> <p className="text-slate-500 text-sm mb-6">{message}</p> <div className="flex gap-3"><button onClick={onClose} className="flex-1 py-2 rounded-xl font-bold bg-slate-100">Cancel</button><button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-2 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600">Delete</button></div> </div> </div> ); }
function Toast({ message, type, onClose }) { useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]); return <div className={`fixed top-6 right-6 z-[300] toast-anim px-6 py-4 rounded-xl shadow-xl border flex gap-3 ${type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-green-50 border-green-100 text-green-800'}`}>{type==='error'?<AlertCircle size={20}/>:<CheckCircle2 size={20}/>}<span className="font-bold text-sm">{message}</span></div>; }
const PasswordInput = ({ placeholder, value, onChange }) => { const [show, setShow] = useState(false); return <div className="relative group"> <Lock className="absolute left-4 top-3.5 text-slate-400" size={20} /> <input type={show ? 'text' : 'password'} placeholder={placeholder} className="glass-input w-full pl-12 pr-12 p-3.5 rounded-xl text-sm" value={value} onChange={onChange} required /> <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button> </div>; };

export default function App() { return <ErrorBoundary><AppContent /></ErrorBoundary>; }

function AppContent() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('tracker'); 
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState(null);
  const [toast, setToast] = useState(null);
  const [projectsData, setProjectsData] = useState({ projects: [], tasks: [] });

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  const refreshProjects = async () => {
    const res = await authFetch('/projects');
    if (res.ok) {
      const data = await res.json();
      setProjectsData({ projects: Array.isArray(data.projects) ? data.projects : [], tasks: Array.isArray(data.tasks) ? data.tasks : [] });
    }
  };

  useEffect(() => { try { const u = localStorage.getItem('timeapp_user'); const t = localStorage.getItem('timeapp_token'); if (u && t) setUser(JSON.parse(u)); } catch (e) {} setLoading(false); }, []);
  useEffect(() => { if(user) refreshProjects(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const checkTimer = async () => {
      const res = await authFetch('/entries/active');
      if (res && res.ok) {
        const data = await res.json();
        setActiveTimer((data && data.id) ? data : null);
      }
    };
    checkTimer(); const i = setInterval(checkTimer, 5000); return () => clearInterval(i);
  }, [user]);

  const handleQuickToggle = async () => {
    if (activeTimer) { await authFetch('/entries/stop', { method: 'POST' }); setActiveTimer(null); showToast("Timer Stopped"); }
    else { showToast("Use tracker to start.", "error"); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-slate-400">Loading...</div>;
  if (!user) return <><GlobalStyles /><AuthScreen onLogin={(u, t) => { localStorage.setItem('timeapp_user', JSON.stringify(u)); localStorage.setItem('timeapp_token', t); setUser(u); }} /></>;

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-800 overflow-hidden">
      <GlobalStyles />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <Sidebar user={user} activeView={currentView} onChangeView={setCurrentView} onLogout={()=>{localStorage.clear(); setUser(null);}} activeTimer={activeTimer} onQuickToggle={handleQuickToggle} />
      <MainContent user={user} setUser={setUser} view={currentView} activeTimer={activeTimer} onTimerUpdate={setActiveTimer} showToast={showToast} projectsData={projectsData} refreshProjects={refreshProjects} />
    </div>
  );
}

function AuthScreen({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
    const data = await res.json();
    if (!res.ok) return setError(data.message || 'Error');
    if (isRegister) { setIsRegister(false); setError('Account created! Please log in.'); } else onLogin(data.user, data.token);
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="glass-panel p-10 rounded-3xl shadow-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">{isRegister ? 'Create Account' : 'Welcome Back'}</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && <input type="text" placeholder="Name" className="glass-input w-full p-3 rounded-xl" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />}
          <input type="email" placeholder="Email" className="glass-input w-full p-3 rounded-xl" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
          <PasswordInput placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          <button className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">{isRegister ? 'Sign Up' : 'Log In'}</button>
        </form>
        <button onClick={() => setIsRegister(!isRegister)} className="w-full text-center mt-4 text-sm text-indigo-600 font-bold">{isRegister ? 'Switch to Login' : 'Create Account'}</button>
      </div>
    </div>
  );
}

function Sidebar({ user, activeView, onChangeView, onLogout, activeTimer, onQuickToggle }) {
  const isAdmin = user.role === 'admin';
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { if (!activeTimer) { setElapsed(0); return; } const i = setInterval(() => { setElapsed(Math.floor((new Date() - new Date(activeTimer.start_time)) / 1000)); }, 1000); return () => clearInterval(i); }, [activeTimer]);
  return (
    <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col hidden md:flex h-full p-4">
      <div className="p-4 flex items-center gap-3 mb-4"><Clock className="text-indigo-500"/><span className="font-bold text-xl text-white">TimeApp</span></div>
      <div className="mb-6 p-4 rounded-xl bg-slate-800 border border-slate-700">
         <div className="flex justify-between text-xs font-bold uppercase text-slate-400 mb-2"><span>{activeTimer ? 'Active' : 'Idle'}</span>{activeTimer && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/>}</div>
         <div className="text-xl font-mono font-bold text-white mb-2">{formatDuration(elapsed)}</div>
         <button onClick={onQuickToggle} className={`w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 ${activeTimer ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'}`}>{activeTimer ? 'STOP' : 'RESUME'}</button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
        <button onClick={() => onChangeView('tracker')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${activeView==='tracker'?'bg-indigo-600 text-white':'hover:bg-slate-800'}`}><Timer size={18}/> Tracker</button>
        <button onClick={() => onChangeView('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${activeView==='settings'?'bg-indigo-600 text-white':'hover:bg-slate-800'}`}><Settings size={18}/> Settings</button>
        {isAdmin && <><div className="pt-6 pb-2 px-3 text-xs font-bold text-slate-500 uppercase">Admin</div><button onClick={() => onChangeView('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${activeView==='analytics'?'bg-indigo-600 text-white':'hover:bg-slate-800'}`}><BarChart3 size={18}/> Analytics</button><button onClick={() => onChangeView('projects')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${activeView==='projects'?'bg-indigo-600 text-white':'hover:bg-slate-800'}`}><FolderKanban size={18}/> Projects</button><button onClick={() => onChangeView('team')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${activeView==='team'?'bg-indigo-600 text-white':'hover:bg-slate-800'}`}><Users size={18}/> Team</button></>}
      </nav>
      <button onClick={onLogout} className="mt-4 w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white p-3 rounded-xl hover:bg-slate-800"><LogOut size={16}/> Log Out</button>
    </aside>
  );
}

function MainContent({ user, setUser, view, activeTimer, onTimerUpdate, showToast, projectsData, refreshProjects }) {
  const [trigger, setTrigger] = useState(0); const update = () => setTrigger(t => t + 1);
  return (
    <main className="flex-1 p-8 overflow-y-auto bg-slate-100">
      <h2 className="text-3xl font-bold text-slate-900 mb-8 capitalize">{view}</h2>
      
      {view === 'tracker' && (
        <div className="max-w-6xl space-y-8">
          <AssignedTasksList onUpdate={update} showToast={showToast} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="mb-8"><TimeTrackerCard activeTimer={activeTimer} onTimerUpdate={onTimerUpdate} onDataRefresh={update} showToast={showToast} projectsData={projectsData} /></div>
              <HistoryList trigger={trigger} onUpdate={update} showToast={showToast} projectsData={projectsData} />
            </div>
            <div><ManualEntryCard onUpdate={update} showToast={showToast} projectsData={projectsData} /></div>
          </div>
        </div>
      )}
      
      {view === 'settings' && <SettingsView user={user} showToast={showToast} onUpdate={(u) => { setUser({...user, ...u}); localStorage.setItem('timeapp_user', JSON.stringify({...user, ...u})); }} />}
      {view === 'analytics' && user.role === 'admin' && <AnalyticsView trigger={trigger} projectsData={projectsData} />}
      {view === 'projects' && user.role === 'admin' && <ProjectsManager showToast={showToast} projectsData={projectsData} refreshProjects={refreshProjects} />}
      {view === 'team' && user.role === 'admin' && <TeamView currentUser={user} showToast={showToast} projectsData={projectsData} />}
      
      {(view !== 'tracker' && view !== 'settings' && user.role !== 'admin') && <div className="flex flex-col items-center justify-center h-96 text-slate-400 glass-panel rounded-3xl"><ShieldAlert size={64} className="mb-4 text-slate-300"/><h3 className="text-xl font-bold text-slate-600">Access Restricted</h3></div>}
    </main>
  );
}

// --- NEW COMPONENT: ASSIGNED TASKS (USER) ---
function AssignedTasksList({ onUpdate, showToast }) {
  const [assignments, setAssignments] = useState([]);
  
  useEffect(() => { authFetch('/assignments').then(r => r.json()).then(d => setAssignments(Array.isArray(d) ? d : [])); }, [onUpdate]);

  const quickLog = async (assignment, minutes) => {
    if (!minutes) return;
    const res = await authFetch('/entries/manual', {
      method: 'POST',
      body: JSON.stringify({ projectId: assignment.project_id, taskId: assignment.task_id, minutes: minutes, date: toLocalISOString(new Date()) })
    });
    if (res.ok) { onUpdate(); showToast("Time logged successfully!"); }
  };

  if (assignments.length === 0) return null;

  return (
    <div className="glass-panel p-6 rounded-3xl mb-8">
      <h3 className="font-bold text-slate-700 mb-4 flex gap-2"><Briefcase className="text-indigo-600"/> Assigned This Week</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignments.map(a => (
          <div key={a.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
            <div>
              <div className="font-bold text-slate-700 text-sm">{a.project_name}</div>
              <div className="text-xs text-slate-500">{a.task_name || '(General)'}</div>
            </div>
            <div className="flex gap-2">
              <input type="number" placeholder="Mins" className="glass-input w-full p-2 rounded-lg text-sm" id={`mins-${a.id}`} />
              <button 
                onClick={() => { const inp = document.getElementById(`mins-${a.id}`); quickLog(a, inp.value); inp.value = ''; }}
                className="bg-indigo-600 text-white px-4 rounded-lg font-bold text-xs"
              >
                Log
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- NEW COMPONENT: ASSIGNMENT MANAGER (ADMIN) ---
function AssignmentManager({ showToast, projectsData }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [assignments, setAssignments] = useState([]);

  const loadData = () => {
    authFetch('/users').then(r=>r.json()).then(d => setUsers(Array.isArray(d) ? d : []));
    authFetch('/assignments/all').then(r=>r.json()).then(d => setAssignments(Array.isArray(d) ? d : []));
  };

  useEffect(() => { loadData(); }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    const res = await authFetch('/assignments', { method: 'POST', body: JSON.stringify({ userId: selectedUser, projectId: selectedProject, taskId: selectedTask || null }) });
    if(res.ok) { loadData(); showToast("Task assigned"); } else { showToast("Failed to assign (duplicate?)", "error"); }
  };

  const handleDelete = async (id) => {
    const res = await authFetch(`/assignments/${id}`, { method: 'DELETE' });
    if(res.ok) { loadData(); showToast("Assignment removed"); }
  };

  const tasks = projectsData.tasks.filter(t => t.project_id === parseInt(selectedProject));

  return (
    <div className="mt-8">
      <h3 className="font-bold text-slate-700 mb-4">Assign Weekly Tasks</h3>
      <div className="glass-panel p-6 rounded-3xl mb-6">
        <form onSubmit={handleAssign} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-1"><label className="text-xs font-bold text-slate-400">User</label><select className="glass-input w-full p-2 rounded-xl" onChange={e=>setSelectedUser(e.target.value)} required><option value="">Select User...</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <div className="flex-1 w-full space-y-1"><label className="text-xs font-bold text-slate-400">Project</label><select className="glass-input w-full p-2 rounded-xl" onChange={e=>setSelectedProject(e.target.value)} required><option value="">Select Project...</option>{projectsData.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="flex-1 w-full space-y-1"><label className="text-xs font-bold text-slate-400">Task</label><select className="glass-input w-full p-2 rounded-xl" onChange={e=>setSelectedTask(e.target.value)} disabled={!selectedProject}><option value="">-- General --</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold">Assign</button>
        </form>
      </div>
      <div className="space-y-2">
        {assignments.map(a => (
          <div key={a.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-sm"><span className="font-bold text-slate-700">{a.user_name}</span> is assigned to <span className="font-bold text-indigo-600">{a.project_name}</span> {a.task_name && <span className="text-slate-500">({a.task_name})</span>}</div>
            <button onClick={() => handleDelete(a.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- SETTINGS ---
function SettingsView({ user, onUpdate, showToast }) {
  const [profile, setProfile] = useState({ name: user.name, email: user.email });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  
  const handleProfileUpdate = async (e) => { e.preventDefault(); const res = await authFetch('/users/profile', { method: 'PUT', body: JSON.stringify(profile) }); if(res.ok) { onUpdate(await res.json()); showToast('Profile updated!'); } };
  const handlePasswordUpdate = async (e) => { e.preventDefault(); if (passwords.new !== passwords.confirm) return showToast('Passwords mismatch', 'error'); const res = await authFetch('/users/password', { method: 'PUT', body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new }) }); if(res.ok) { showToast('Password changed!'); setPasswords({ current: '', new: '', confirm: '' }); } else showToast('Incorrect password', 'error'); };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="glass-panel p-8 rounded-3xl"><h3 className="font-bold mb-4">Profile</h3><form onSubmit={handleProfileUpdate} className="space-y-4"><input className="glass-input w-full p-3 rounded-xl" value={profile.name} onChange={e=>setProfile({...profile, name: e.target.value})} /><input className="glass-input w-full p-3 rounded-xl" value={profile.email} onChange={e=>setProfile({...profile, email: e.target.value})} /><button className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">Save</button></form></div>
      <div className="glass-panel p-8 rounded-3xl"><h3 className="font-bold mb-4">Security</h3><form onSubmit={handlePasswordUpdate} className="space-y-4"><PasswordInput placeholder="Current" value={passwords.current} onChange={e=>setPasswords({...passwords, current: e.target.value})} /><div className="flex gap-4"><PasswordInput placeholder="New" value={passwords.new} onChange={e=>setPasswords({...passwords, new: e.target.value})} /><PasswordInput placeholder="Confirm" value={passwords.confirm} onChange={e=>setPasswords({...passwords, confirm: e.target.value})} /></div><button className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold">Update Password</button></form></div>
    </div>
  );
}

function TeamView({ currentUser, showToast, projectsData }) {
  const [users, setUsers] = useState([]); const [deleteTarget, setDeleteTarget] = useState(null);
  const loadUsers = () => authFetch('/users').then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []));
  useEffect(() => { loadUsers(); }, []);
  const changeRole = async (userId, newRole) => { const res = await authFetch(`/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) }); if(res.ok) { loadUsers(); showToast("Role updated"); } };
  const confirmDelete = async () => { const res = await authFetch(`/users/${deleteTarget}`, { method: 'DELETE' }); if(res.ok) { loadUsers(); showToast("User deleted"); } setDeleteTarget(null); };

  return (
    <>
      <div className="glass-panel rounded-3xl overflow-hidden max-w-5xl"><div className="p-6 border-b border-slate-100 bg-white/50"><h3 className="font-bold text-slate-700">Team</h3></div><table className="w-full text-left text-sm"><thead className="bg-slate-50/50 text-slate-500 font-bold uppercase"><tr><th className="p-5">Member</th><th className="p-5">Contact</th><th className="p-5">Role</th><th className="p-5 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map(u => (<tr key={u.id}><td className="p-5 font-bold flex gap-3"><span className="text-2xl">{u.avatar}</span> {u.name}</td><td className="p-5">{u.email}</td><td className="p-5"><span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold uppercase text-xs">{u.role}</span></td><td className="p-5 text-right flex justify-end gap-2">{u.id !== currentUser.id && <><select className="bg-white border rounded-lg p-2 font-bold" value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}><option value="employee">Employee</option><option value="admin">Admin</option></select><button onClick={() => setDeleteTarget(u.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><Trash2 size={16}/></button></>}</td></tr>))}</tbody></table></div>
      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} title="Delete User" message="Are you sure?" />
      
      {/* NEW: Assignment Manager integrated into Team View */}
      <AssignmentManager showToast={showToast} projectsData={projectsData} />
    </>
  );
}

function AnalyticsView({ trigger, projectsData }) {
  const [data, setData] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [viewMode, setViewMode] = useState('month'); 
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const filterRef = useRef(null);

  useEffect(() => {
    let query = '?';
    const y = currentDate.getFullYear();
    if (viewMode === 'month') { const m = currentDate.getMonth(); query += `start=${toLocalISOString(new Date(y, m, 1))}&end=${toLocalISOString(new Date(y, m + 1, 0))}&`; }
    else { query += `start=${toLocalISOString(new Date(y, 0, 1))}&end=${toLocalISOString(new Date(y, 11, 31))}&`; }
    authFetch(`/analytics${query}`).then(r => r.json()).then(d => Array.isArray(d) ? setData(d) : setData([]));
  }, [trigger, viewMode, currentDate]);

  const shiftDate = (amount) => { const newDate = new Date(currentDate); if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + amount); else newDate.setFullYear(newDate.getFullYear() + amount); setCurrentDate(newDate); };

  const processedData = useMemo(() => {
    const map = {};
    data.forEach(item => {
      const pName = item.project_name || 'Unknown';
      if (!map[pName]) map[pName] = { name: pName, total: 0, users: {}, tasks: {} };
      const hours = Number(item.hours) || 0;
      map[pName].total += hours;
      map[pName].users[item.user_name] = (map[pName].users[item.user_name] || 0) + hours;
      const tName = item.task_name || '(No Task)';
      if (!map[pName].tasks[tName]) map[pName].tasks[tName] = { total: 0, users: {} };
      map[pName].tasks[tName].total += hours;
      map[pName].tasks[tName].users[item.user_name] = (map[pName].tasks[tName].users[item.user_name] || 0) + hours;
    });
    const chartData = Object.values(map).sort((a,b) => b.total - a.total);
    const globalMax = Math.max(...chartData.map(d => d.total), 1);
    return { chartData, globalMax };
  }, [data]);

  return (
    <div className="space-y-8 max-w-7xl pb-20">
      <div className="glass-panel p-3 rounded-2xl flex flex-wrap gap-4 items-center justify-between sticky top-0 z-[50] bg-white/90 backdrop-blur-md shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-xl">{['all', 'year', 'month'].map(mode => <button key={mode} onClick={() => setViewMode(mode)} className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize ${viewMode === mode ? 'bg-white shadow-sm' : ''}`}>{mode === 'all' ? 'All Time' : mode}</button>)}</div>
        {viewMode !== 'all' && <div className="flex items-center gap-4 bg-white border px-2 py-1.5 rounded-xl"><button onClick={() => shiftDate(-1)}><ChevronLeft/></button><span className="font-bold min-w-[140px] text-center">{viewMode === 'month' ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : currentDate.getFullYear()}</span><button onClick={() => shiftDate(1)}><ChevronRight/></button></div>}
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border bg-white opacity-50 cursor-not-allowed"><Filter size={16}/> Filter</button>
      </div>

      <div className="glass-panel p-8 rounded-3xl">
        <h3 className="font-bold text-xl mb-6">Team Project Distribution</h3>
        {processedData.chartData.length === 0 ? <div className="text-center text-slate-400">No data.</div> : (
          <div className="w-full">
            <div className="chart-grid-row text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2"><div></div><div>Project</div><div>Distribution</div><div className="text-right">Total</div></div>
            {processedData.chartData.map((p) => (
              <div key={p.name}>
                <div className="chart-grid-row group cursor-pointer hover:bg-slate-50 rounded-lg p-1" onClick={() => setExpandedRow(expandedRow === p.name ? null : p.name)}>
                  <div className="flex justify-center text-slate-400">{expandedRow === p.name ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
                  <div className="text-sm font-bold text-slate-700 truncate-grid" title={p.name}>{p.name}</div>
                  <div className="h-8 bg-slate-100 rounded-lg overflow-hidden flex relative w-full">
                    <div className="h-full flex" style={{ width: `${(p.total / processedData.globalMax) * 100}%` }}>
                       {Object.entries(p.users).map(([u, h]) => (<div key={u} style={{width: `${(h/p.total)*100}%`, backgroundColor: stringToColor(u)}} className="h-full" title={`${u}: ${h.toFixed(1)}h`}></div>))}
                    </div>
                  </div>
                  <div className="text-right font-bold text-slate-800 text-sm">{p.total.toFixed(1)}h</div>
                </div>
                {expandedRow === p.name && (
                  <div className="mb-4 bg-slate-50/50 p-2 rounded-xl border border-slate-100 animate-in slide-in-from-top-2">
                    {Object.entries(p.tasks).map(([tName, tData]) => (
                      <div key={tName} className="chart-sub-row">
                        <div className="flex justify-end pr-2"><CornerDownRight size={14} className="text-slate-300"/></div>
                        <div className="text-xs font-medium text-slate-500 truncate-grid">{tName}</div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden w-full">
                          <div className="h-full flex" style={{ width: `${(tData.total / p.total) * 100}%` }}>
                             {Object.entries(tData.users).map(([u, h]) => (<div key={u} style={{width: `${(h/tData.total)*100}%`, backgroundColor: stringToColor(u)}} className="h-full"></div>))}
                          </div>
                        </div>
                        <div className="text-right text-xs font-mono text-slate-400">{tData.total.toFixed(1)}h</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TimeTrackerCard({ activeTimer, onTimerUpdate, onDataRefresh, showToast, projectsData }) {
  const [proj, setProj] = useState(''); const [task, setTask] = useState(''); const [elapsed, setElapsed] = useState(0);
  const availableTasks = projectsData.tasks.filter(t => t.project_id === parseInt(proj));
  useEffect(() => { if (activeTimer) { setProj(activeTimer.project_id); setTask(activeTimer.task_id || ''); } else setElapsed(0); }, [activeTimer]);
  useEffect(() => { if (!activeTimer) return; const i = setInterval(() => { setElapsed(Math.floor((new Date() - new Date(activeTimer.start_time)) / 1000)); }, 1000); return () => clearInterval(i); }, [activeTimer]);
  const toggle = async () => { if (activeTimer) { await authFetch('/entries/stop', { method: 'POST' }); onTimerUpdate(null); onDataRefresh(); showToast("Timer Stopped"); } else { if(!proj) return alert('Select project'); const res = await authFetch('/entries/start', { method: 'POST', body: JSON.stringify({ projectId: proj, taskId: task }) }); if(res.ok) { onTimerUpdate(await res.json()); showToast("Timer Started"); } } };
  return (
    <div className="glass-panel p-8 rounded-3xl flex flex-col md:flex-row items-end gap-6 relative overflow-hidden">
      {activeTimer && <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse"></div>}
      <div className="flex-1 w-full flex gap-4">
        <div className="flex-1 space-y-2"><label className="text-xs font-extrabold text-slate-400 uppercase">Project</label><select className="glass-input w-full p-4 rounded-xl font-bold" value={proj} onChange={e=>{setProj(e.target.value); setTask('');}} disabled={!!activeTimer}><option value="">Select Project...</option>{projectsData.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="flex-1 space-y-2"><label className="text-xs font-extrabold text-slate-400 uppercase">Task</label><select className="glass-input w-full p-4 rounded-xl font-bold" value={task} onChange={e=>setTask(e.target.value)} disabled={!!activeTimer || !proj}><option value="">-- No Task --</option>{availableTasks.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
      </div>
      <div className="font-mono text-3xl font-bold text-slate-700 w-32 text-center">{formatDuration(elapsed)}</div>
      <button onClick={toggle} className={`w-full md:w-auto p-4 px-10 rounded-xl text-white font-extrabold shadow-xl ${activeTimer ? 'bg-red-500' : 'bg-indigo-600'}`}>{activeTimer ? 'STOP' : 'START'}</button>
    </div>
  );
}

function HistoryList({ trigger, onUpdate, showToast, projectsData }) {
  const [entries, setEntries] = useState([]); const [editingEntry, setEditingEntry] = useState(null); const [deleteId, setDeleteId] = useState(null);
  useEffect(() => { authFetch('/entries').then(r=>r.json()).then(d => setEntries(Array.isArray(d) ? d : [])); }, [trigger]);
  const confirmDelete = async () => { const res = await authFetch(`/entries/${deleteId}`, { method: 'DELETE' }); if(res.ok) { onUpdate(); showToast("Entry deleted"); } setDeleteId(null); };
  const handleSave = async (e) => { e.preventDefault(); await authFetch(`/entries/${editingEntry.id}`, { method: 'PUT', body: JSON.stringify({ projectId: editingEntry.project_id, taskId: editingEntry.task_id, start: `${editingEntry.date}T${editingEntry.startTime}`, end: `${editingEntry.date}T${editingEntry.endTime}` }) }); setEditingEntry(null); onUpdate(); showToast("Entry updated"); };
  const openEdit = (e) => { const d = new Date(e.start_time); const endD = new Date(e.end_time); setEditingEntry({ ...e, date: toLocalISOString(d), startTime: d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}), endTime: endD.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}) }); };
  return (
    <>
      <div className="glass-panel rounded-3xl h-96 overflow-y-auto p-4 custom-scrollbar">
        <h3 className="font-bold text-slate-700 mb-4 sticky top-0 bg-white/90 p-2">Recent Activity</h3>
        {entries.map(e => (<div key={e.id} className="flex justify-between items-center p-3 mb-2 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all"><div><div className="font-bold text-slate-700 text-sm flex items-center gap-2">{e.project_name}</div><div className="text-xs text-slate-500">{e.task_name ? `${e.task_name} • ` : ''}{new Date(e.start_time).toLocaleDateString()}</div></div><div className="flex items-center gap-2"><span className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded">{Math.round(e.duration_seconds/60)}m</span><button onClick={() => openEdit(e)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={14}/></button><button onClick={() => setDeleteId(e.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button></div></div>))}
      </div>
      <Modal isOpen={!!editingEntry} onClose={() => setEditingEntry(null)} title="Edit Entry">{editingEntry && (<form onSubmit={handleSave} className="space-y-4"><select className="glass-input w-full p-3 rounded-xl" value={editingEntry.project_id} onChange={e => setEditingEntry({...editingEntry, project_id: e.target.value, task_id: ''})}>{projectsData.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><select className="glass-input w-full p-3 rounded-xl" value={editingEntry.task_id || ''} onChange={e => setEditingEntry({...editingEntry, task_id: e.target.value})}><option value="">-- No Task --</option>{projectsData.tasks.filter(t => t.project_id === parseInt(editingEntry.project_id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select><div className="grid grid-cols-2 gap-3"><input type="time" className="glass-input w-full p-3 rounded-xl" value={editingEntry.startTime} onChange={e => setEditingEntry({...editingEntry, startTime: e.target.value})}/><input type="time" className="glass-input w-full p-3 rounded-xl" value={editingEntry.endTime} onChange={e => setEditingEntry({...editingEntry, endTime: e.target.value})}/></div><button className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold">Save</button></form>)}</Modal>
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} title="Delete Entry" message="Are you sure?" />
    </>
  );
}

// --- UPDATED MANUAL ENTRY (MINUTES) ---
function ManualEntryCard({ onUpdate, showToast, projectsData }) {
  const [formData, setFormData] = useState({ projectId: '', taskId: '', minutes: '', date: toLocalISOString(new Date()) });
  const availableTasks = projectsData.tasks.filter(t => t.project_id === parseInt(formData.projectId));
  const handleSubmit = async (e) => { e.preventDefault(); const res = await authFetch('/entries/manual', { method: 'POST', body: JSON.stringify(formData) }); if(res.ok) { onUpdate(); showToast("Entry added"); } };
  return (
    <div className="glass-panel rounded-3xl p-6 h-full"><h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><CalendarPlus size={20} className="text-indigo-500"/> Manual Entry</h3><form onSubmit={handleSubmit} className="space-y-4"><select className="glass-input w-full p-3 rounded-xl text-sm" onChange={e => setFormData({...formData, projectId: e.target.value, taskId: ''})} required><option value="">Select Project...</option>{projectsData.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><select className="glass-input w-full p-3 rounded-xl text-sm" disabled={!formData.projectId} onChange={e => setFormData({...formData, taskId: e.target.value})}><option value="">-- No Task --</option>{availableTasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select><input type="date" className="glass-input w-full p-3 rounded-xl text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}/><input type="number" placeholder="Minutes (e.g. 60)" className="glass-input w-full p-3 rounded-xl text-sm" value={formData.minutes} onChange={e => setFormData({...formData, minutes: e.target.value})} required /><button className="w-full bg-slate-800 text-white p-3.5 rounded-xl font-bold text-sm">Add Entry</button></form></div>
  );
}

function ProjectsManager({ showToast, projectsData, refreshProjects }) {
  const [name, setName] = useState(''); const [taskName, setTaskName] = useState(''); const [editingProject, setEditingProject] = useState(null); const [deleteId, setDeleteId] = useState(null); const [expandedProject, setExpandedProject] = useState(null);
  const addProject = async (e) => { e.preventDefault(); const res = await authFetch('/projects', { method:'POST', body:JSON.stringify({name, color:'#333'}) }); if(res.ok) { setName(''); refreshProjects(); showToast("Project created"); } };
  const addTask = async (projectId) => { const res = await authFetch('/tasks', { method:'POST', body:JSON.stringify({name: taskName, projectId}) }); if(res.ok) { setTaskName(''); refreshProjects(); showToast("Task created"); } };
  const confirmDelete = async () => { const res = await authFetch(`/projects/${deleteId}`, { method: 'DELETE' }); if(res.ok) { refreshProjects(); showToast("Project deleted"); } setDeleteId(null); };
  const handleSave = async (e) => { e.preventDefault(); const res = await authFetch(`/projects/${editingProject.id}`, { method: 'PUT', body: JSON.stringify({ name: editingProject.name, color: editingProject.color }) }); if(res.ok) { setEditingProject(null); refreshProjects(); showToast("Project updated"); } };
  const delTask = async (id) => { if(window.confirm('Delete task?')) { await authFetch(`/tasks/${id}`, { method: 'DELETE' }); refreshProjects(); } };

  return (
    <>
      <div className="glass-panel p-8 rounded-3xl max-w-4xl mb-6"><h3 className="font-bold text-slate-700 mb-6 text-xl">Create Project</h3><form onSubmit={addProject} className="flex gap-4"><input value={name} onChange={e=>setName(e.target.value)} className="glass-input p-4 rounded-xl w-full font-bold" placeholder="New project name..." /><button className="bg-indigo-600 text-white px-8 rounded-xl font-bold">Create</button></form></div>
      <div className="grid gap-4 max-w-4xl">
        {projectsData.projects.map(p => {
          const tasks = projectsData.tasks.filter(t => t.project_id === p.id);
          const isExpanded = expandedProject === p.id;
          return (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => setExpandedProject(isExpanded ? null : p.id)}><div className="flex items-center gap-3"><span className="font-bold text-slate-700">{p.name}</span><span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold">{tasks.length} tasks</span></div><div className="flex items-center gap-2"><button onClick={(e) => { e.stopPropagation(); setEditingProject(p); }} className="p-2 text-slate-300 hover:text-indigo-600"><Edit2 size={18}/></button><button onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>{isExpanded ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}</div></div>
              {isExpanded && (<div className="p-4 bg-slate-50 border-t border-slate-100 animate-in slide-in-from-top-2"><div className="mb-4 flex gap-2"><input value={taskName} onChange={e=>setTaskName(e.target.value)} className="glass-input p-2 rounded-lg w-full text-sm font-medium" placeholder="New sub-task..." /><button onClick={() => addTask(p.id)} className="bg-slate-800 text-white px-4 rounded-lg font-bold text-sm"><Plus size={16}/></button></div><div className="space-y-2">{tasks.map(t => (<div key={t.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200 text-sm shadow-sm"><span className="text-slate-600 font-medium">{t.name}</span><button onClick={() => delTask(t.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button></div>))}</div></div>)}
            </div>
          );
        })}
      </div>
      <Modal isOpen={!!editingProject} onClose={() => setEditingProject(null)} title="Edit Project">{editingProject && (<form onSubmit={handleSave} className="space-y-4"><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Project Name</label><input className="glass-input w-full p-3 rounded-xl" value={editingProject.name} onChange={e => setEditingProject({...editingProject, name: e.target.value})}/></div><button className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold mt-4">Update Project</button></form>)}</Modal>
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} title="Delete Project" message="Are you sure?" />
    </>
  );
}