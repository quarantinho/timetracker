import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, Square, Clock, Users, LogOut, BarChart3, Timer, FolderKanban, 
  Trash2, CalendarPlus, Mail, Lock, User, Shield, ShieldAlert, ArrowRight, 
  Activity, Edit2, X, Save, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, 
  Check, AlertTriangle, Settings, Eye, EyeOff, AlertCircle, CheckCircle2, Plus, CornerDownRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, LabelList, Cell 
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-8 text-center">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Something went wrong.</h1>
          <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700">Reload Application</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- UTILS ---
const authFetch = async (endpoint, options = {}) => {
  try {
    const token = localStorage.getItem('timeapp_token');
    const headers = { ...options.headers, 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('timeapp_token');
      return { ok: false, status: res.status, json: async () => ({}) };
    }
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) return res;
    return { ok: res.ok, status: res.status, json: async () => ({}) };
  } catch (err) {
    return { ok: false, status: 500, json: async () => ({}) };
  }
};

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00:00";
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const toLocalISOString = (date) => {
  if (!date) return new Date().toISOString().split('T')[0];
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
    .chart-grid-row { display: grid; grid-template-columns: 220px 1fr 80px; align-items: center; gap: 16px; margin-bottom: 12px; }
    .chart-sub-row { display: grid; grid-template-columns: 200px 1fr 80px; align-items: center; gap: 16px; margin-bottom: 8px; margin-left: 20px; opacity: 0.8; font-size: 0.85rem; }
    .toast-anim { animation: slideIn 0.3s ease-out forwards; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  `}</style>
);

// --- SHARED COMPONENTS ---

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in">
        <AlertTriangle size={40} className="text-red-500 mx-auto mb-4"/>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-slate-500 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl font-bold bg-slate-100">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-2 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600">Delete</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-[300] toast-anim px-6 py-4 rounded-xl shadow-xl border flex gap-3 ${type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-green-50 border-green-100 text-green-800'}`}>
      {type === 'error' ? <AlertCircle size={20}/> : <CheckCircle2 size={20}/>}
      <span className="font-bold text-sm">{message}</span>
    </div>
  );
}

const PasswordInput = ({ placeholder, value, onChange }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative group">
      <Lock className="absolute left-4 top-3.5 text-slate-400" size={20} />
      <input type={show ? 'text' : 'password'} placeholder={placeholder} className="glass-input w-full pl-12 pr-12 p-3.5 rounded-xl text-sm" value={value} onChange={onChange} required />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600">
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

// --- MAIN APP ---
export default function App() { return <ErrorBoundary><AppContent /></ErrorBoundary>; }

function AppContent() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('tracker'); 
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState(null);
  const [lastProject, setLastProject] = useState(null); 
  const [toast, setToast] = useState(null);
  const [projectsData, setProjectsData] = useState({ projects: [], tasks: [] });

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  // Fetch Global Data (Projects & Tasks)
  const refreshProjects = async () => {
    const res = await authFetch('/projects');
    if (res.ok) {
      const data = await res.json();
      setProjectsData({ projects: data.projects || [], tasks: data.tasks || [] });
    }
  };

  useEffect(() => {
    try {
      const u = localStorage.getItem('timeapp_user');
      const t = localStorage.getItem('timeapp_token');
      if (u && t) setUser(JSON.parse(u));
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => { if(user) refreshProjects(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const checkTimer = async () => {
      const res = await authFetch('/entries/active');
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.id) { setActiveTimer(data); setLastProject(data.project_id); }
        else {
          setActiveTimer(null);
          const lastRes = await authFetch('/entries?limit=1');
          if (lastRes.ok) { 
            const entries = await lastRes.json(); 
            if (Array.isArray(entries) && entries.length > 0) setLastProject(entries[0].project_id); 
          }
        }
      }
    };
    checkTimer(); const i = setInterval(checkTimer, 5000); return () => clearInterval(i);
  }, [user]);

  const handleQuickToggle = async () => {
    if (activeTimer) {
      await authFetch('/entries/stop', { method: 'POST' });
      setActiveTimer(null);
      showToast("Timer Stopped");
    } else {
      if (!lastProject) return showToast("No recent project.", "error");
      const res = await authFetch('/entries/start', { method: 'POST', body: JSON.stringify({ projectId: lastProject }) });
      if (res.ok) { setActiveTimer(await res.json()); showToast("Timer Resumed"); }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('timeapp_user');
    localStorage.removeItem('timeapp_token');
    setUser(null);
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-slate-400">Loading...</div>;
  if (!user) return <><GlobalStyles /><AuthScreen onLogin={(u, t) => { localStorage.setItem('timeapp_user', JSON.stringify(u)); localStorage.setItem('timeapp_token', t); setUser(u); }} /></>;

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-800 overflow-hidden">
      <GlobalStyles />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <Sidebar user={user} activeView={currentView} onChangeView={setCurrentView} onLogout={handleLogout} activeTimer={activeTimer} onQuickToggle={handleQuickToggle} />
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
    if (!res.ok) return setError(typeof data === 'string' ? data : data.message || 'Error');
    if (isRegister) { setIsRegister(false); setError('Account created! Check email.'); } else onLogin(data.user, data.token);
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
        <NavItem icon={<Timer />} label="Tracker" isActive={activeView === 'tracker'} onClick={() => onChangeView('tracker')} />
        <NavItem icon={<Settings />} label="Settings" isActive={activeView === 'settings'} onClick={() => onChangeView('settings')} />
        {isAdmin && <><div className="pt-6 pb-2 px-3 text-xs font-bold text-slate-500 uppercase">Admin</div><NavItem icon={<BarChart3 />} label="Analytics" isActive={activeView === 'analytics'} onClick={() => onChangeView('analytics')} /><NavItem icon={<FolderKanban />} label="Projects" isActive={activeView === 'projects'} onClick={() => onChangeView('projects')} /><NavItem icon={<Users />} label="Team" isActive={activeView === 'team'} onClick={() => onChangeView('team')} /></>}
      </nav>
      <button onClick={onLogout} className="mt-4 w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white p-3 rounded-xl hover:bg-slate-800"><LogOut size={16}/> Log Out</button>
    </aside>
  );
}

function NavItem({ icon, label, isActive, onClick }) { return <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>{React.cloneElement(icon, { size: 18 })} {label}</button>; }

function MainContent({ user, setUser, view, activeTimer, onTimerUpdate, showToast, projectsData, refreshProjects }) {
  const [trigger, setTrigger] = useState(0); const update = () => setTrigger(t => t + 1);
  return (
    <main className="flex-1 p-8 overflow-y-auto bg-slate-100">
      <h2 className="text-3xl font-bold text-slate-900 mb-8 capitalize">{view}</h2>
      {view === 'tracker' && <div className="max-w-6xl space-y-8"><TimeTrackerCard activeTimer={activeTimer} onTimerUpdate={onTimerUpdate} onDataRefresh={update} showToast={showToast} projectsData={projectsData} /><div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><div className="lg:col-span-2"><HistoryList trigger={trigger} onUpdate={update} showToast={showToast} projectsData={projectsData} /></div><div><ManualEntryCard onUpdate={update} showToast={showToast} projectsData={projectsData} /></div></div></div>}
      {view === 'settings' && <SettingsView user={user} showToast={showToast} onUpdate={(u) => { setUser({...user, ...u}); localStorage.setItem('timeapp_user', JSON.stringify({...user, ...u})); }} />}
      {view === 'analytics' && user.role === 'admin' && <AnalyticsView trigger={trigger} projectsData={projectsData} />}
      {view === 'projects' && user.role === 'admin' && <ProjectsManager showToast={showToast} projectsData={projectsData} refreshProjects={refreshProjects} />}
      {view === 'team' && user.role === 'admin' && <TeamView currentUser={user} showToast={showToast} />}
      {(view !== 'tracker' && view !== 'settings' && user.role !== 'admin') && <div className="flex flex-col items-center justify-center h-96 text-slate-400 glass-panel rounded-3xl"><ShieldAlert size={64} className="mb-4 text-slate-300"/><h3 className="text-xl font-bold text-slate-600">Access Restricted</h3></div>}
    </main>
  );
}

// --- SETTINGS VIEW ---
function SettingsView({ user, onUpdate, showToast }) {
  const [profile, setProfile] = useState({ name: user.name, email: user.email });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const res = await authFetch('/users/profile', { method: 'PUT', body: JSON.stringify(profile) });
    if (res.ok) { onUpdate(await res.json()); showToast('Profile updated!'); } 
    else showToast('Failed to update profile', 'error');
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) return showToast('New passwords do not match!', 'error');
    if (passwords.new.length < 6) return showToast('Password must be at least 6 chars', 'error');
    
    const res = await authFetch('/users/password', { method: 'PUT', body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new }) });
    if (res.ok) { showToast('Password changed successfully!'); setPasswords({ current: '', new: '', confirm: '' }); } 
    else showToast('Current password incorrect', 'error');
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div className="glass-panel p-8 rounded-3xl">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex gap-2"><User className="text-indigo-600"/> Profile Information</h3>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Full Name</label><input className="glass-input w-full p-3 rounded-xl font-medium" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Email Address</label><input className="glass-input w-full p-3 rounded-xl font-medium" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} /></div>
          </div>
          <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200">Save Changes</button>
        </form>
      </div>

      <div className="glass-panel p-8 rounded-3xl">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex gap-2"><Lock className="text-indigo-600"/> Change Password</h3>
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Current Password</label><PasswordInput value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} /></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">New Password</label><PasswordInput value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Confirm Password</label><PasswordInput value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} /></div>
          </div>
          <button className="bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-slate-900 transition-colors">Update Password</button>
        </form>
      </div>
    </div>
  );
}

// --- TEAM VIEW ---
function TeamView({ currentUser, showToast }) {
  const [users, setUsers] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const loadUsers = () => authFetch('/users').then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []));
  useEffect(() => { loadUsers(); }, []);
  
  const changeRole = async (userId, newRole) => { 
    const res = await authFetch(`/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) }); 
    if (res && res.ok) { loadUsers(); showToast("Role updated"); }
  };
  
  const confirmDelete = async () => { 
    if(!deleteTarget) return; 
    const res = await authFetch(`/users/${deleteTarget}`, { method: 'DELETE' }); 
    if(res.ok) { loadUsers(); showToast("User deleted successfully"); } 
    else { showToast("Failed to delete user", "error"); } 
    setDeleteTarget(null); 
  };

  return (
    <>
      <div className="glass-panel rounded-3xl overflow-hidden max-w-5xl">
        <div className="p-6 border-b border-slate-100 bg-white/50"><h3 className="font-bold text-slate-700">Team Members</h3></div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider text-xs"><tr><th className="p-5">Member</th><th className="p-5">Contact</th><th className="p-5">Access Level</th><th className="p-5 text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-indigo-50/30 transition-colors">
                <td className="p-5 font-bold text-slate-700 flex items-center gap-3"><span className="text-2xl">{u.avatar}</span> {u.name}</td>
                <td className="p-5 text-slate-500 font-medium">{u.email}</td>
                <td className="p-5"><span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>{u.role}</span></td>
                <td className="p-5 text-right flex justify-end gap-2">
                  {u.id !== currentUser.id && (
                    <>
                      <select className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}><option value="employee">Employee</option><option value="admin">Admin</option></select>
                      <button onClick={() => setDeleteTarget(u.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={16}/></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} title="Delete User" message="Are you sure? This will delete the user and all their tracked time entries permanently. Projects they created will be transferred to you." />
    </>
  );
}

// --- SUB-VIEWS (Analytics, Projects, Tracker) ---

function AnalyticsView({ trigger }) {
  const [data, setData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [viewMode, setViewMode] = useState('month'); 
  const [selectedProjects, setSelectedProjects] = useState([]); 
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const filterRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) { if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterOpen(false); }
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { authFetch('/projects').then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d.projects : [])); }, []);

  useEffect(() => {
    let query = '?';
    try {
      if (viewMode === 'month') {
        const y = currentDate.getFullYear(), m = currentDate.getMonth();
        query += `start=${toLocalISOString(new Date(y, m, 1))}&end=${toLocalISOString(new Date(y, m + 1, 0))}&`;
      } else if (viewMode === 'year') {
        const y = currentDate.getFullYear();
        query += `start=${toLocalISOString(new Date(y, 0, 1))}&end=${toLocalISOString(new Date(y, 11, 31))}&`;
      }
      if (selectedProjects.length > 0) query += `projectIds=${selectedProjects.join(',')}`;
      
      authFetch(`/analytics${query}`).then(r => r.json()).then(d => {
        if (Array.isArray(d)) setData(d);
        else setData([]); 
      });
    } catch (e) { console.error("Analytics fetch error", e); setData([]); }
  }, [trigger, viewMode, currentDate, selectedProjects]);

  const shiftDate = (amount) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + amount);
    else newDate.setFullYear(newDate.getFullYear() + amount);
    setCurrentDate(newDate);
  };

  const toggleProject = (id) => {
    if (selectedProjects.includes(id)) setSelectedProjects(selectedProjects.filter(p => p !== id));
    else setSelectedProjects([...selectedProjects, id]);
  };

  const processedData = useMemo(() => {
    const map = {};
    
    data.forEach(item => {
      const pName = item.project_name || 'Unknown';
      if (!map[pName]) map[pName] = { name: pName, total: 0, users: {}, tasks: {} };
      
      const hours = Number(item.hours) || 0;
      map[pName].total += hours;
      
      // User total for project
      map[pName].users[item.user_name] = (map[pName].users[item.user_name] || 0) + hours;

      // Task breakdown
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
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {['all', 'year', 'month'].map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)} className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${viewMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {mode === 'all' ? 'All Time' : mode}
            </button>
          ))}
        </div>

        {viewMode !== 'all' && (
          <div className="flex items-center gap-4 bg-white border border-slate-200 px-2 py-1.5 rounded-xl shadow-sm">
            <button onClick={() => shiftDate(-1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft size={20}/></button>
            <span className="font-bold text-slate-700 min-w-[140px] text-center select-none">
              {viewMode === 'month' ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : currentDate.getFullYear()}
            </span>
            <button onClick={() => shiftDate(1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight size={20}/></button>
          </div>
        )}

        <div className="relative" ref={filterRef}>
          <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${isFilterOpen || selectedProjects.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Filter size={16}/> Filter {selectedProjects.length > 0 && <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded text-[10px]">{selectedProjects.length}</span>} <ChevronDown size={14}/>
          </button>
          
          {isFilterOpen && (
            <div className="absolute right-0 top-14 bg-white p-3 rounded-2xl shadow-xl border border-slate-100 w-72 z-[100] animate-in fade-in slide-in-from-top-2">
               <div className="text-xs font-bold text-slate-400 uppercase mb-2 px-2">Select Projects</div>
               <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                 {projects.map(p => (
                   <div key={p.id} onClick={() => toggleProject(p.id)} className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${selectedProjects.includes(p.id) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}>
                     <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{backgroundColor: stringToColor(p.name)}}></div><span className="text-sm font-medium truncate max-w-[160px]">{p.name}</span></div>
                     {selectedProjects.includes(p.id) && <Check size={14}/>}
                   </div>
                 ))}
               </div>
               {selectedProjects.length > 0 && <div onClick={() => setSelectedProjects([])} className="border-t border-slate-100 mt-2 pt-2 text-center text-xs text-red-500 font-bold cursor-pointer hover:underline">Clear Filters</div>}
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel p-8 rounded-3xl">
        <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2"><Activity className="text-indigo-600"/> Team Project Distribution</h3>
        {processedData.chartData.length === 0 ? <div className="text-center p-10 text-slate-400">No data for this period.</div> : (
          <div className="w-full">
            <div className="chart-grid-row text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
              <div></div><div>Project</div><div>Distribution</div><div className="text-right">Total</div>
            </div>
            <div className="space-y-3">
              {processedData.chartData.map((p) => (
                <div key={p.name}>
                  {/* Main Project Row */}
                  <div className="chart-grid-row group cursor-pointer hover:bg-slate-50 rounded-lg p-1" onClick={() => setExpandedRow(expandedRow === p.name ? null : p.name)}>
                    <div className="flex justify-center text-slate-400">{expandedRow === p.name ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
                    <div className="text-sm font-bold text-slate-700 truncate pr-4" title={p.name}>{p.name}</div>
                    <div className="h-8 bg-slate-100 rounded-lg overflow-hidden flex relative w-full">
                      <div className="h-full flex" style={{ width: `${(p.total / processedData.globalMax) * 100}%` }}>
                         {Object.entries(p.users).map(([u, h]) => (
                           <div key={u} style={{width: `${(h/p.total)*100}%`, backgroundColor: stringToColor(u)}} className="h-full" title={`${u}: ${h.toFixed(1)}h`}></div>
                         ))}
                      </div>
                    </div>
                    <div className="text-right font-bold text-slate-800 text-sm">{p.total.toFixed(1)}h</div>
                  </div>

                  {/* Sub-rows (Tasks) */}
                  {expandedRow === p.name && (
                    <div className="mb-4 bg-slate-50/50 p-2 rounded-xl border border-slate-100 animate-in slide-in-from-top-2">
                      {Object.entries(p.tasks).map(([tName, tData]) => (
                        <div key={tName} className="chart-sub-row">
                          <div className="flex justify-end pr-2"><CornerDownRight size={14} className="text-slate-300"/></div>
                          <div className="text-xs font-medium text-slate-500 truncate">{tName}</div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden w-full">
                            <div className="h-full flex" style={{ width: `${(tData.total / p.total) * 100}%` }}> {/* Relative to Project Total */}
                               {Object.entries(tData.users).map(([u, h]) => (
                                 <div key={u} style={{width: `${(h/tData.total)*100}%`, backgroundColor: stringToColor(u)}} className="h-full" title={`${u}: ${h.toFixed(1)}h`}></div>
                               ))}
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
            <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t border-slate-100">{Object.keys(processedData.chartData[0]?.users || {}).map(u => (<div key={u} className="flex items-center gap-2 text-xs font-bold text-slate-600"><div className="w-3 h-3 rounded-full" style={{backgroundColor: stringToColor(u)}}></div> {u}</div>))}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function TimeTrackerCard({ activeTimer, onTimerUpdate, onDataRefresh, showToast, projectsData }) {
  const [proj, setProj] = useState(''); 
  const [task, setTask] = useState('');
  const [elapsed, setElapsed] = useState(0);

  // Filter tasks based on selected project
  const availableTasks = projectsData.tasks.filter(t => t.project_id === parseInt(proj));

  useEffect(() => { 
    if (activeTimer) { setProj(activeTimer.project_id); setTask(activeTimer.task_id || ''); } 
    else setElapsed(0); 
  }, [activeTimer]);

  useEffect(() => { 
    if (!activeTimer) return; 
    const i = setInterval(() => { setElapsed(Math.floor((new Date() - new Date(activeTimer.start_time)) / 1000)); }, 1000); 
    return () => clearInterval(i); 
  }, [activeTimer]);

  const toggle = async () => { 
    if (activeTimer) { 
      await authFetch('/entries/stop', { method: 'POST' }); 
      onTimerUpdate(null); 
      onDataRefresh(); 
      showToast("Timer Stopped"); 
    } else { 
      if(!proj) return alert('Select project'); 
      const res = await authFetch('/entries/start', { method: 'POST', body: JSON.stringify({ projectId: proj, taskId: task }) }); 
      if(res.ok) { onTimerUpdate(await res.json()); showToast("Timer Started"); } 
    } 
  };

  return (
    <div className="glass-panel p-8 rounded-3xl flex flex-col md:flex-row items-end gap-6 relative overflow-hidden">
      {activeTimer && <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse"></div>}
      <div className="flex-1 w-full flex gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-xs font-extrabold text-slate-400 uppercase tracking-widest ml-1">Project</label>
          <select className="glass-input w-full p-4 rounded-xl font-bold text-slate-700" value={proj} onChange={e=>{setProj(e.target.value); setTask('');}} disabled={!!activeTimer}>
            <option value="">Select Project...</option>{projectsData.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-xs font-extrabold text-slate-400 uppercase tracking-widest ml-1">Task (Optional)</label>
          <select className="glass-input w-full p-4 rounded-xl font-bold text-slate-700" value={task} onChange={e=>setTask(e.target.value)} disabled={!!activeTimer || !proj}>
            <option value="">-- No Task --</option>{availableTasks.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
      <div className="font-mono text-3xl font-bold text-slate-700 w-32 text-center tabular-nums hidden md:block">{formatDuration(elapsed)}</div>
      <button onClick={toggle} className={`w-full md:w-auto p-4 px-10 rounded-xl text-white font-extrabold shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 ${activeTimer ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'}`}>
        {activeTimer ? <><Square fill="currentColor" size={20}/> STOP</> : <><Play fill="currentColor" size={20}/> START</>}
      </button>
    </div>
  );
}

function HistoryList({ trigger, onUpdate, showToast, projectsData }) {
  const [entries, setEntries] = useState([]);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => { 
    authFetch('/entries')
      .then(r=>r.json())
      .then(d => setEntries(Array.isArray(d) ? d : [])); 
  }, [trigger]);

  const confirmDelete = async () => { 
    const res = await authFetch(`/entries/${deleteId}`, { method: 'DELETE' }); 
    if(res.ok) { onUpdate(); showToast("Entry deleted"); } 
    setDeleteId(null); 
  };
  
  const handleSave = async (e) => { 
    e.preventDefault(); 
    const start = `${editingEntry.date}T${editingEntry.startTime}`; 
    const end = `${editingEntry.date}T${editingEntry.endTime}`; 
    await authFetch(`/entries/${editingEntry.id}`, { method: 'PUT', body: JSON.stringify({ projectId: editingEntry.project_id, taskId: editingEntry.task_id, start, end }) }); 
    setEditingEntry(null); 
    onUpdate(); 
    showToast("Entry updated"); 
  };

  const openEdit = (e) => { 
    const d = new Date(e.start_time); 
    const endD = new Date(e.end_time); 
    setEditingEntry({ 
      id: e.id, 
      project_id: e.project_id,
      task_id: e.task_id,
      date: toLocalISOString(d), 
      startTime: d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}), 
      endTime: endD.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}) 
    }); 
  };

  return (
    <>
      <div className="glass-panel rounded-3xl overflow-hidden h-full flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-white/50 flex justify-between items-center"><h3 className="font-bold text-slate-700">Recent Activity</h3><ArrowRight size={18} className="text-slate-400"/></div>
        <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
          {entries.map(e=><div key={e.id} className="p-4 mb-2 rounded-2xl flex justify-between items-center hover:bg-white hover:shadow-md transition-all group"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md" style={{backgroundColor: stringToColor(e.project_name)}}><Clock size={18}/></div><div><div className="font-bold text-slate-700 text-sm flex items-center gap-2">{e.project_name}</div><div className="text-xs text-slate-500">{e.task_name ? `${e.task_name} • ` : ''}{new Date(e.start_time).toLocaleDateString()}</div></div></div><div className="flex items-center gap-3"><span className="font-mono text-sm font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">{Math.round(e.duration_seconds/60)}m</span><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => openEdit(e)} className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg"><Edit2 size={16}/></button><button onClick={() => setDeleteId(e.id)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={16}/></button></div></div></div>)}
          {entries.length === 0 && <div className="p-10 text-center text-slate-400">No recent entries.</div>}
        </div>
      </div>
      <Modal isOpen={!!editingEntry} onClose={() => setEditingEntry(null)} title="Edit Entry">
        {editingEntry && (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Project</label><select className="glass-input w-full p-3 rounded-xl" value={editingEntry.project_id} onChange={e => setEditingEntry({...editingEntry, project_id: e.target.value, task_id: ''})}>{projectsData.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Task</label><select className="glass-input w-full p-3 rounded-xl" value={editingEntry.task_id || ''} onChange={e => setEditingEntry({...editingEntry, task_id: e.target.value})}><option value="">-- No Task --</option>{projectsData.tasks.filter(t => t.project_id === parseInt(editingEntry.project_id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Date</label><input type="date" className="glass-input w-full p-3 rounded-xl" value={editingEntry.date} onChange={e => setEditingEntry({...editingEntry, date: e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Start</label><input type="time" className="glass-input w-full p-3 rounded-xl" value={editingEntry.startTime} onChange={e => setEditingEntry({...editingEntry, startTime: e.target.value})}/></div><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">End</label><input type="time" className="glass-input w-full p-3 rounded-xl" value={editingEntry.endTime} onChange={e => setEditingEntry({...editingEntry, endTime: e.target.value})}/></div></div>
            <button className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold mt-4 flex justify-center gap-2"><Save size={18}/> Save Changes</button>
          </form>
        )}
      </Modal>
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} title="Delete Entry" message="Are you sure you want to delete this time entry?" />
    </>
  );
}

function ManualEntryCard({ onUpdate, showToast, projectsData }) {
  const [formData, setFormData] = useState({ projectId: '', taskId: '', date: '', start: '', end: '' });
  const availableTasks = projectsData.tasks.filter(t => t.project_id === parseInt(formData.projectId));

  const handleSubmit = async (e) => { 
    e.preventDefault(); 
    const res = await authFetch('/entries/manual', { method: 'POST', body: JSON.stringify({ ...formData, start: `${formData.date}T${formData.start}`, end: `${formData.date}T${formData.end}` }) }); 
    if(res.ok) { onUpdate(); showToast("Entry added"); } 
  };
  
  return (
    <div className="glass-panel rounded-3xl p-6 h-full">
      <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><CalendarPlus size={20} className="text-indigo-500"/> Manual Entry</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Project</label><select className="glass-input w-full p-3 rounded-xl text-sm font-bold text-slate-700 outline-none" onChange={e => setFormData({...formData, projectId: e.target.value, taskId: ''})}><option value="">Select Project...</option>{projectsData.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Task (Optional)</label><select className="glass-input w-full p-3 rounded-xl text-sm font-bold text-slate-700 outline-none" disabled={!formData.projectId} onChange={e => setFormData({...formData, taskId: e.target.value})}><option value="">-- No Task --</option>{availableTasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Date</label><input type="date" className="glass-input w-full p-3 rounded-xl text-sm font-bold text-slate-700 outline-none" onChange={e => setFormData({...formData, date: e.target.value})}/></div>
        <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Start</label><input type="time" className="glass-input w-full p-3 rounded-xl text-sm font-bold text-slate-700 outline-none" onChange={e => setFormData({...formData, start: e.target.value})}/></div><div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">End</label><input type="time" className="glass-input w-full p-3 rounded-xl text-sm font-bold text-slate-700 outline-none" onChange={e => setFormData({...formData, end: e.target.value})}/></div></div>
        <button className="w-full bg-slate-800 text-white p-3.5 rounded-xl font-bold text-sm hover:bg-slate-900 transition-all shadow-lg mt-2">Add Entry</button>
      </form>
    </div>
  );
}

function ProjectsManager({ showToast, projectsData, refreshProjects }) {
  const [name, setName] = useState('');
  const [taskName, setTaskName] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [expandedProject, setExpandedProject] = useState(null);

  const addProject = async (e) => { e.preventDefault(); const res = await authFetch('/projects', { method:'POST', body:JSON.stringify({name, color:'#333'}) }); if(res.ok) { setName(''); refreshProjects(); showToast("Project created"); } };
  const addTask = async (projectId) => { const res = await authFetch('/tasks', { method:'POST', body:JSON.stringify({name: taskName, projectId}) }); if(res.ok) { setTaskName(''); refreshProjects(); showToast("Task created"); } };
  const confirmDelete = async () => { const res = await authFetch(`/projects/${deleteId}`, { method: 'DELETE' }); if(res.ok) { refreshProjects(); showToast("Project deleted"); } setDeleteId(null); };
  const handleSave = async (e) => { e.preventDefault(); const res = await authFetch(`/projects/${editingProject.id}`, { method: 'PUT', body: JSON.stringify({ name: editingProject.name, color: editingProject.color }) }); if(res.ok) { setEditingProject(null); refreshProjects(); showToast("Project updated"); } };
  const delTask = async (id) => { if(window.confirm('Delete task?')) { await authFetch(`/tasks/${id}`, { method: 'DELETE' }); refreshProjects(); } };

  return (
    <>
      <div className="glass-panel p-8 rounded-3xl max-w-4xl mb-6">
        <h3 className="font-bold text-slate-700 mb-6 text-xl">Create Project</h3>
        <form onSubmit={addProject} className="flex gap-4"><input value={name} onChange={e=>setName(e.target.value)} className="glass-input p-4 rounded-xl w-full font-bold outline-none" placeholder="New project name..." /><button className="bg-indigo-600 text-white px-8 rounded-xl font-bold shadow-lg shadow-indigo-200">Create</button></form>
      </div>
      <div className="grid gap-4 max-w-4xl">
        {projectsData.projects.map(p => {
          const tasks = projectsData.tasks.filter(t => t.project_id === p.id);
          const isExpanded = expandedProject === p.id;
          return (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md">
              <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => setExpandedProject(isExpanded ? null : p.id)}>
                <div className="flex items-center gap-3"><span className="font-bold text-slate-700">{p.name}</span><span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold">{tasks.length} tasks</span></div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); setEditingProject(p); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit2 size={18}/></button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  {isExpanded ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
                </div>
              </div>
              {isExpanded && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 animate-in slide-in-from-top-2">
                  <div className="mb-4 flex gap-2"><input value={taskName} onChange={e=>setTaskName(e.target.value)} className="glass-input p-2 rounded-lg w-full text-sm font-medium outline-none" placeholder="New sub-task..." /><button onClick={() => addTask(p.id)} className="bg-slate-800 text-white px-4 rounded-lg font-bold text-sm hover:bg-slate-900"><Plus size={16}/></button></div>
                  <div className="space-y-2">
                    {tasks.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200 text-sm shadow-sm">
                        <span className="text-slate-600 font-medium">{t.name}</span>
                        <button onClick={() => delTask(t.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                      </div>
                    ))}
                    {tasks.length === 0 && <div className="text-xs text-slate-400 italic text-center p-2">No sub-tasks defined yet.</div>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Modal isOpen={!!editingProject} onClose={() => setEditingProject(null)} title="Edit Project">
        {editingProject && (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Project Name</label><input className="glass-input w-full p-3 rounded-xl" value={editingProject.name} onChange={e => setEditingProject({...editingProject, name: e.target.value})}/></div>
            <button className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold mt-4 flex justify-center gap-2"><Save size={18}/> Update Project</button>
          </form>
        )}
      </Modal>
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} title="Delete Project" message="Are you sure? This will delete the project and ALL associated time entries." />
    </>
  );
}