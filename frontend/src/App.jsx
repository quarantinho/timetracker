import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, Square, Clock, Users, LogOut, BarChart3, Timer, Plus, Trash2, 
  CalendarPlus, FolderKanban, Filter, ChevronDown, CheckCircle2, XCircle, Mail, Lock, User
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to make authorized requests
const authFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('timeapp_token');
  const headers = { ...options.headers, 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('timeapp_token');
    window.location.reload(); // Force logout on invalid token
    return null;
  }
  return res;
};

// Global Styles
const GlobalStyles = () => (
  <style>{`
    body { background-color: #f8fafc; margin: 0; font-family: 'Inter', sans-serif; }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  `}</style>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('tracker'); 
  const [loading, setLoading] = useState(true);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('timeapp_user');
    const token = localStorage.getItem('timeapp_token');
    if (savedUser && token) setUser(JSON.parse(savedUser));
    setLoading(false);
  }, []);

  // Timer Check
  useEffect(() => {
    if (!user) return;
    const checkTimer = async () => {
      const res = await authFetch('/entries/active');
      if (res && res.ok) {
        const data = await res.json();
        setIsTimerRunning(!!(data && data.id));
      }
    };
    checkTimer();
    const interval = setInterval(checkTimer, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('timeapp_user');
    localStorage.removeItem('timeapp_token');
    setUser(null);
    setIsTimerRunning(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-500">Loading...</div>;

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
    <div className="flex h-screen w-screen bg-slate-50 text-slate-800 overflow-hidden">
      <GlobalStyles />
      <Sidebar user={user} activeView={currentView} onChangeView={setCurrentView} onLogout={handleLogout} isTimerRunning={isTimerRunning} />
      <MainContent user={user} view={currentView} onTimerChange={setIsTimerRunning} />
    </div>
  );
}

// --- NEW AUTH SCREEN (Login / Register) ---
function AuthScreen({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data === 'string' ? data : 'Authentication failed');

      if (isRegister) {
        setIsRegister(false); // Switch to login after signup
        setError('Account created! Please log in.');
      } else {
        onLogin(data.user, data.token);
      }
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-200">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <Clock className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{isRegister ? 'Create Account' : 'Welcome Back'}</h1>
        </div>

        {error && <div className={`p-3 mb-4 text-sm rounded-lg ${error.includes('created') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400" size={18} />
              <input type="text" placeholder="Full Name" className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
            <input type="email" placeholder="Email Address" className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
              value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
            <input type="password" placeholder="Password" className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
              value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm shadow-md shadow-blue-200">
            {isRegister ? 'Sign Up' : 'Log In'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-slate-500">
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={() => setIsRegister(!isRegister)} className="text-blue-600 font-bold hover:underline">
            {isRegister ? 'Log In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- SIDEBAR & MAIN (Updated to pass user prop) ---
function Sidebar({ user, activeView, onChangeView, onLogout, isTimerRunning }) {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex h-full shadow-lg z-20 shrink-0">
      <div className="p-6 flex items-center gap-3 border-b border-slate-100">
        <div className="bg-blue-600 text-white p-1.5 rounded-lg"><Clock size={20} /></div>
        <span className="font-bold text-xl tracking-tight text-slate-900">TimeApp</span>
      </div>
      <nav className="flex-1 px-4 space-y-1.5 mt-6">
        <NavItem icon={<Timer />} label="Tracker" isActive={activeView === 'tracker'} onClick={() => onChangeView('tracker')} />
        <NavItem icon={<BarChart3 />} label="Analytics" isActive={activeView === 'analytics'} onClick={() => onChangeView('analytics')} />
        <NavItem icon={<FolderKanban />} label="Projects" isActive={activeView === 'projects'} onClick={() => onChangeView('projects')} />
        <NavItem icon={<Users />} label="Team" isActive={activeView === 'team'} onClick={() => onChangeView('team')} />
      </nav>
      {isTimerRunning && <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 animate-pulse"><div className="w-2 h-2 bg-red-600 rounded-full"></div><span className="text-xs font-bold text-red-600">Timer Active</span></div>}
      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-lg border border-slate-200 shadow-sm">{user.avatar}</div>
          <div className="overflow-hidden"><p className="text-sm font-bold text-slate-800 truncate">{user.name}</p><p className="text-xs text-slate-500 truncate">{user.email}</p></div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 px-4 py-2 rounded-lg transition-all text-sm font-medium"><LogOut size={16} /> Log Out</button>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, isActive, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
      {React.cloneElement(icon, { size: 18 })} {label}
    </button>
  );
}

function MainContent({ user, view, onTimerChange }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = () => setRefreshTrigger(p => p + 1);

  return (
    <main className="flex-1 h-full overflow-y-auto bg-slate-50 relative w-full">
      <div className="max-w-7xl mx-auto w-full p-6 md:p-10 pb-20">
        <header className="flex justify-between items-center mb-8">
          <div><h2 className="text-3xl font-bold text-slate-900 tracking-tight capitalize">{view}</h2></div>
        </header>
        {view === 'tracker' && (
          <div className="space-y-6 max-w-5xl">
            <TimeTrackerCard user={user} onUpdate={triggerRefresh} onTimerStateChange={onTimerChange} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2"><HistoryList user={user} refreshTrigger={refreshTrigger} /></div>
                <div className="lg:col-span-1"><ManualEntryCard user={user} onUpdate={triggerRefresh} /></div>
            </div>
          </div>
        )}
        {view === 'analytics' && <AnalyticsView refreshTrigger={refreshTrigger} />}
        {view === 'team' && <TeamView />}
        {view === 'projects' && <ProjectsManager />}
      </div>
    </main>
  );
}

// --- UPDATED COMPONENTS USING authFetch ---

function TimeTrackerCard({ user, onUpdate, onTimerStateChange }) {
  const [projects, setProjects] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => { authFetch('/projects').then(res => res.json()).then(setProjects); }, []);
  
  useEffect(() => {
    const checkActive = async () => {
      const res = await authFetch('/entries/active');
      const data = await res.json();
      if (data && data.id) { setActiveTimer(data); setSelectedProject(data.project_id); onTimerStateChange(true); } 
      else { onTimerStateChange(false); }
    };
    checkActive();
  }, []);

  useEffect(() => {
    let interval;
    if (activeTimer) { interval = setInterval(() => { setElapsed(Math.floor((new Date() - new Date(activeTimer.start_time)) / 1000)); }, 1000); } 
    else { setElapsed(0); }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const handleStart = async () => {
    if (!selectedProject) return alert('Select Project');
    const res = await authFetch('/entries/start', { method: 'POST', body: JSON.stringify({ projectId: selectedProject }) });
    if (res.ok) { const entry = await res.json(); setActiveTimer(entry); onTimerStateChange(true); }
  };

  const handleStop = async () => {
    const res = await authFetch('/entries/stop', { method: 'POST' });
    if (res.ok) { setActiveTimer(null); setElapsed(0); onUpdate(); onTimerStateChange(false); }
  };

  const formatTime = (sec) => {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
      {activeTimer && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>}
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Clock className="text-blue-600" size={24}/> Active Task</h3>
        {activeTimer ? <span className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full text-xs font-bold border border-red-100">RECORDING</span> : <span className="text-slate-400 text-sm font-medium">Ready</span>}
      </div>
      <div className="flex flex-col md:flex-row items-end gap-6">
        <div className="w-full md:flex-1">
          <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700" value={selectedProject} onChange={e => setSelectedProject(e.target.value)} disabled={!!activeTimer}>
            <option value="">-- Project --</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="w-full md:w-auto flex items-center gap-4 bg-slate-900 text-white p-2 pl-6 pr-2 rounded-xl shadow-xl">
           <div className="font-mono text-3xl font-bold tracking-wider mr-4 min-w-[140px] text-center tabular-nums">{formatTime(elapsed)}</div>
           {!activeTimer ? <button onClick={handleStart} className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-lg"><Play size={24} fill="currentColor" /></button> : <button onClick={handleStop} className="bg-red-500 hover:bg-red-400 text-white p-4 rounded-lg"><Square size={24} fill="currentColor" /></button>}
        </div>
      </div>
    </div>
  );
}

function HistoryList({ refreshTrigger }) {
  const [entries, setEntries] = useState([]);
  useEffect(() => { authFetch('/entries').then(res => res.json()).then(setEntries); }, [refreshTrigger]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold text-slate-800">My History</h3></div>
      <div className="max-h-[300px] overflow-y-auto"><table className="w-full text-left text-sm text-slate-600"><thead className="bg-slate-50 text-xs uppercase font-bold text-slate-400 sticky top-0"><tr><th className="px-6 py-3">Project</th><th className="px-6 py-3">Time</th><th className="px-6 py-3 text-right">Duration</th></tr></thead><tbody className="divide-y divide-slate-100">{entries.map(e => (<tr key={e.id} className="hover:bg-blue-50 transition-colors"><td className="px-6 py-3 font-medium text-slate-700 flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: e.color}}></div>{e.project_name}</td><td className="px-6 py-3">{new Date(e.start_time).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})}</td><td className="px-6 py-3 text-right font-mono text-blue-600 font-bold bg-slate-50/50">{Math.round(e.duration_seconds / 60)} m</td></tr>))}{entries.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-slate-400">No entries yet</td></tr>}</tbody></table></div>
    </div>
  );
}

function ManualEntryCard({ onUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({ projectId: '', date: '', start: '', end: '' });
  useEffect(() => { authFetch('/projects').then(res => res.json()).then(setProjects); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await authFetch('/entries/manual', { method: 'POST', body: JSON.stringify({ projectId: formData.projectId, start: new Date(`${formData.date}T${formData.start}`).toISOString(), end: new Date(`${formData.date}T${formData.end}`).toISOString() }) });
    setIsOpen(false); onUpdate();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-800 flex items-center gap-2"><CalendarPlus size={20} className="text-slate-400"/> Manual Entry</h3><button onClick={() => setIsOpen(!isOpen)} className="text-blue-600 text-sm font-medium hover:underline">{isOpen ? 'Close' : 'Open'}</button></div>
      {isOpen && <div className="p-6 bg-slate-50/50"><form onSubmit={handleSubmit} className="space-y-4"><select className="w-full p-2" onChange={e => setFormData({...formData, projectId: e.target.value})}><option>Select Project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="date" className="w-full p-2" onChange={e => setFormData({...formData, date: e.target.value})}/><div className="flex gap-2"><input type="time" className="w-full p-2" onChange={e => setFormData({...formData, start: e.target.value})}/><input type="time" className="w-full p-2" onChange={e => setFormData({...formData, end: e.target.value})}/></div><button type="submit" className="w-full bg-slate-800 text-white p-2 rounded">Save</button></form></div>}
    </div>
  );
}

function ProjectsManager() {
  const [projects, setProjects] = useState([]);
  const [newName, setNewName] = useState('');
  useEffect(() => { authFetch('/projects').then(res => res.json()).then(setProjects); }, []);
  const handleCreate = async (e) => { e.preventDefault(); await authFetch('/projects', { method: 'POST', body: JSON.stringify({ name: newName, color: '#3b82f6' }) }); setNewName(''); authFetch('/projects').then(res => res.json()).then(setProjects); };
  const handleDelete = async (id) => { if(window.confirm('Delete?')) { await authFetch(`/projects/${id}`, { method: 'DELETE' }); authFetch('/projects').then(res => res.json()).then(setProjects); }};
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200">
      <h3 className="font-bold mb-4">Project Management</h3>
      <form onSubmit={handleCreate} className="flex gap-2 mb-6"><input className="border p-2 rounded w-full" placeholder="New Project Name" value={newName} onChange={e => setNewName(e.target.value)} /><button className="bg-blue-600 text-white p-2 rounded">Create</button></form>
      {projects.map(p => <div key={p.id} className="flex justify-between border-b p-2"><span>{p.name}</span><button onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button></div>)}
    </div>
  );
}

function AnalyticsView({ refreshTrigger }) {
  const [data, setData] = useState([]);
  useEffect(() => { authFetch('/analytics').then(res => res.json()).then(setData); }, [refreshTrigger]);
  const chartData = useMemo(() => data.reduce((acc, curr) => { const f = acc.find(i => i.name === curr.project_name); if(f) f.hours += Number(curr.hours); else acc.push({name:curr.project_name, hours:Number(curr.hours), color:curr.color}); return acc; }, []), [data]);
  return (
    <div className="h-[400px] bg-white p-6 rounded-2xl border border-slate-200">
      <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><XAxis dataKey="name"/><Tooltip/><Bar dataKey="hours" fill="#8884d8"/></BarChart></ResponsiveContainer>
    </div>
  );
}

function TeamView() {
  const [users, setUsers] = useState([]);
  useEffect(() => { authFetch('/users').then(res => res.json()).then(setUsers); }, []);
  return <div className="grid grid-cols-3 gap-4">{users.map(u => <div key={u.id} className="bg-white p-4 border rounded">{u.name} ({u.role})</div>)}</div>;
}