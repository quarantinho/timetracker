import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, Square, Clock, Users, LogOut, BarChart3, Timer, FolderKanban, Trash2, CalendarPlus, Mail, Lock, User, Shield, ShieldAlert
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';

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
  return res;
};

const getRandomColor = (seed) => {
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];
  return colors[seed % colors.length];
};

// --- MAIN APP ---
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
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-500">Loading...</div>;

  if (!user) return <AuthScreen onLogin={(u, t) => { 
    localStorage.setItem('timeapp_user', JSON.stringify(u)); 
    localStorage.setItem('timeapp_token', t);
    setUser(u); 
  }} />;

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      <Sidebar user={user} activeView={currentView} onChangeView={setCurrentView} onLogout={handleLogout} isTimerRunning={isTimerRunning} />
      <MainContent user={user} view={currentView} onTimerChange={setIsTimerRunning} />
    </div>
  );
}

// --- AUTH SCREEN ---
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
        setIsRegister(false);
        setError('Account created! Please log in.');
      } else {
        onLogin(data.user, data.token);
      }
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-200">
        <h1 className="text-xl font-bold text-center mb-6 text-slate-900">{isRegister ? 'Create Account' : 'Welcome Back'}</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && <div className="relative"><User className="absolute left-3 top-3 text-slate-400" size={18}/><input type="text" placeholder="Name" className="w-full pl-10 p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required/></div>}
          <div className="relative"><Mail className="absolute left-3 top-3 text-slate-400" size={18}/><input type="email" placeholder="Email" className="w-full pl-10 p-2 border rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required/></div>
          <div className="relative"><Lock className="absolute left-3 top-3 text-slate-400" size={18}/><input type="password" placeholder="Password" className="w-full pl-10 p-2 border rounded" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required/></div>
          <button className="w-full bg-blue-600 text-white p-2 rounded font-bold">{isRegister ? 'Sign Up' : 'Log In'}</button>
        </form>
        <button onClick={() => setIsRegister(!isRegister)} className="w-full text-center mt-4 text-sm text-blue-600 hover:underline">{isRegister ? 'Switch to Login' : 'Create an Account'}</button>
      </div>
    </div>
  );
}

// --- SIDEBAR (Updated Logic) ---
function Sidebar({ user, activeView, onChangeView, onLogout, isTimerRunning }) {
  const isAdmin = user.role === 'admin';

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex h-full p-4">
      <h1 className="text-xl font-bold mb-6 flex gap-2 items-center"><Clock className="text-blue-600"/> TimeApp</h1>
      
      <nav className="flex-1 space-y-2">
        <button onClick={() => onChangeView('tracker')} className={`w-full text-left p-2 rounded capitalize flex items-center gap-3 ${activeView === 'tracker' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
          <Timer size={18}/> Tracker
        </button>

        {/* --- PERMISSION CHECK: Only Admins see Analytics, Projects, Team --- */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Admin</div>
            <button onClick={() => onChangeView('analytics')} className={`w-full text-left p-2 rounded capitalize flex items-center gap-3 ${activeView === 'analytics' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
              <BarChart3 size={18}/> Analytics
            </button>
            <button onClick={() => onChangeView('projects')} className={`w-full text-left p-2 rounded capitalize flex items-center gap-3 ${activeView === 'projects' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
              <FolderKanban size={18}/> Projects
            </button>
            <button onClick={() => onChangeView('team')} className={`w-full text-left p-2 rounded capitalize flex items-center gap-3 ${activeView === 'team' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
              <Users size={18}/> Team
            </button>
          </>
        )}
      </nav>

      {isTimerRunning && <div className="bg-red-50 text-red-600 p-2 rounded text-xs font-bold mb-4 animate-pulse flex items-center gap-2"><div className="w-2 h-2 bg-red-600 rounded-full"></div> Timer Active</div>}
      
      <div className="border-t pt-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="font-bold text-sm truncate">{user.name}</div>
          {isAdmin && <Shield size={14} className="text-blue-600" title="Admin" />}
        </div>
        <div className="text-xs text-slate-500 mb-3 truncate">{user.email}</div>
        <button onClick={onLogout} className="text-red-500 text-sm flex gap-1 items-center hover:bg-red-50 w-full p-2 rounded transition-colors"><LogOut size={16}/> Log Out</button>
      </div>
    </aside>
  );
}

// --- MAIN CONTENT ---
function MainContent({ user, view, onTimerChange }) {
  const [trigger, setTrigger] = useState(0);
  const update = () => setTrigger(t => t + 1);

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-slate-50">
      <h2 className="text-2xl font-bold capitalize mb-6 text-slate-800">{view === 'analytics' ? 'Dashboard' : view}</h2>
      
      {view === 'tracker' && (
        <div className="max-w-5xl space-y-6">
          <TimeTrackerCard onUpdate={update} onTimerChange={onTimerChange}/>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2"><HistoryList trigger={trigger}/></div>
             <div><ManualEntryCard onUpdate={update}/></div>
          </div>
        </div>
      )}

      {/* Admin Views */}
      {view === 'analytics' && user.role === 'admin' && <AnalyticsView trigger={trigger}/>}
      {view === 'projects' && user.role === 'admin' && <ProjectsManager/>}
      {view === 'team' && user.role === 'admin' && <TeamView/>}
      
      {/* Fallback for unauthorized access */}
      {(view !== 'tracker' && user.role !== 'admin') && (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <ShieldAlert size={48} className="mb-4"/>
          <p>Access Restricted to Administrators</p>
        </div>
      )}
    </main>
  );
}

// --- ANALYTICS VIEW (New Horizontal Charts) ---
function AnalyticsView({ trigger }) {
  const [data, setData] = useState([]);
  
  useEffect(() => { authFetch('/analytics').then(r => r.json()).then(setData) }, [trigger]);

  // Transform Data: Group by Project for Team Chart
  // Output format: { name: "Project A", "User1": 5, "User2": 3 }
  const projectData = useMemo(() => {
    const map = {};
    const usersSet = new Set();

    data.forEach(item => {
      if (!map[item.project_name]) map[item.project_name] = { name: item.project_name };
      map[item.project_name][item.user_name] = Number(item.hours);
      usersSet.add(item.user_name);
    });
    return { chartData: Object.values(map), users: Array.from(usersSet) };
  }, [data]);

  // Transform Data: Group by User for Individual Charts
  const userData = useMemo(() => {
    const map = {};
    data.forEach(item => {
      if (!map[item.user_name]) map[item.user_name] = [];
      map[item.user_name].push({ 
        project: item.project_name, 
        hours: Number(item.hours),
        color: item.color 
      });
    });
    return map;
  }, [data]);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* 1. Team Overview (Stacked Horizontal) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-lg mb-6 text-slate-700">Team Project Distribution</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={projectData.chartData} margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Legend />
              {projectData.users.map((userName, index) => (
                <Bar key={userName} dataKey={userName} stackId="a" fill={getRandomColor(index)}>
                   <LabelList dataKey={userName} position="center" style={{ fill: '#fff', fontSize: '10px', fontWeight: 'bold' }} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Individual Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(userData).map(([userName, entries]) => (
          <div key={userName} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-md mb-4 flex items-center gap-2">
              <User size={16} className="text-slate-400"/> {userName}
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={entries} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="project" type="category" width={80} tick={{fontSize: 11}} />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                    <Cell fill={(entry) => entry.color || '#3b82f6'} />
                    <LabelList dataKey="hours" position="right" style={{ fill: '#64748b', fontSize: '12px', fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- TEAM VIEW (With Permission Editing) ---
function TeamView() {
  const [users, setUsers] = useState([]);
  
  const loadUsers = () => authFetch('/users').then(r => r.json()).then(setUsers);
  useEffect(() => { loadUsers(); }, []);

  const changeRole = async (userId, newRole) => {
    if (!window.confirm(`Are you sure you want to change this user to ${newRole}?`)) return;
    
    const res = await authFetch(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole })
    });
    
    if (res && res.ok) {
      loadUsers(); // Refresh list
    } else {
      alert('Failed to update role');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-4xl">
      <div className="p-6 border-b border-slate-100"><h3 className="font-bold text-slate-700">Team Management</h3></div>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500 font-medium">
          <tr>
            <th className="p-4">Name</th>
            <th className="p-4">Email</th>
            <th className="p-4">Role</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map(u => (
            <tr key={u.id}>
              <td className="p-4 font-medium text-slate-800 flex items-center gap-2">
                <span className="text-xl">{u.avatar}</span> {u.name}
              </td>
              <td className="p-4 text-slate-500">{u.email}</td>
              <td className="p-4">
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                  {u.role}
                </span>
              </td>
              <td className="p-4 text-right">
                <select 
                  className="bg-white border border-slate-200 rounded p-1 text-xs cursor-pointer outline-none focus:border-blue-500"
                  value={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- EXISTING COMPONENTS (Unchanged logic, just style tweaks) ---

function TimeTrackerCard({ onUpdate, onTimerChange }) {
  const [projects, setProjects] = useState([]);
  const [timer, setTimer] = useState(null);
  const [proj, setProj] = useState('');
  useEffect(() => { authFetch('/projects').then(r=>r.json()).then(setProjects) }, []);
  useEffect(() => { authFetch('/entries/active').then(r=>r.json()).then(t => { if(t && t.id) { setTimer(t); setProj(t.project_id); onTimerChange(true); } else onTimerChange(false); }) }, []);

  const toggle = async () => {
    if (timer) {
       await authFetch('/entries/stop', { method: 'POST' });
       setTimer(null); onUpdate(); onTimerChange(false);
    } else {
       if(!proj) return alert('Select project');
       const res = await authFetch('/entries/start', { method: 'POST', body: JSON.stringify({ projectId: proj }) });
       if(res.ok) { setTimer(await res.json()); onTimerChange(true); }
    }
  };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-end gap-4">
      <div className="flex-1 w-full"><label className="text-xs font-bold text-slate-400 mb-1 block">PROJECT</label><select className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 outline-none" value={proj} onChange={e=>setProj(e.target.value)} disabled={!!timer}><option value="">Select Project...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <button onClick={toggle} className={`w-full md:w-auto p-3 px-8 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all ${timer ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}>{timer ? <><Square fill="currentColor" size={18}/> STOP</> : <><Play fill="currentColor" size={18}/> START</>}</button>
    </div>
  );
}

function HistoryList({ trigger }) {
  const [entries, setEntries] = useState([]);
  useEffect(() => { authFetch('/entries').then(r=>r.json()).then(setEntries) }, [trigger]);
  return <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"><div className="p-4 border-b border-slate-100 bg-slate-50/50 font-bold text-slate-700">Recent Activity</div><div className="max-h-[300px] overflow-y-auto">{entries.map(e=><div key={e.id} className="border-b border-slate-50 p-4 flex justify-between items-center hover:bg-slate-50 transition-colors"><div><div className="font-medium text-slate-800">{e.project_name}</div><div className="text-xs text-slate-400">{new Date(e.start_time).toLocaleDateString()}</div></div><span className="font-mono bg-blue-50 text-blue-600 px-2 py-1 rounded text-sm font-bold">{Math.round(e.duration_seconds/60)}m</span></div>)}</div></div>;
}

function ManualEntryCard({ onUpdate }) {
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({ projectId: '', date: '', start: '', end: '' });
  useEffect(() => { authFetch('/projects').then(r => r.json()).then(setProjects); }, []);
  const handleSubmit = async (e) => {
    e.preventDefault();
    await authFetch('/entries/manual', { method: 'POST', body: JSON.stringify({ projectId: formData.projectId, start: new Date(`${formData.date}T${formData.start}`).toISOString(), end: new Date(`${formData.date}T${formData.end}`).toISOString() }) });
    onUpdate();
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><CalendarPlus size={18}/> Add Manual Time</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <select className="w-full p-2 border rounded bg-slate-50 text-sm" onChange={e => setFormData({...formData, projectId: e.target.value})}><option>Project...</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <input type="date" className="w-full p-2 border rounded bg-slate-50 text-sm" onChange={e => setFormData({...formData, date: e.target.value})}/>
        <div className="flex gap-2"><input type="time" className="w-full p-2 border rounded bg-slate-50 text-sm" onChange={e => setFormData({...formData, start: e.target.value})}/><input type="time" className="w-full p-2 border rounded bg-slate-50 text-sm" onChange={e => setFormData({...formData, end: e.target.value})}/></div>
        <button className="w-full bg-slate-800 text-white p-2 rounded font-medium text-sm hover:bg-slate-900">Save Entry</button>
      </form>
    </div>
  );
}

function ProjectsManager() {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  useEffect(() => { authFetch('/projects').then(r=>r.json()).then(setProjects) }, []);
  const add = async (e) => { e.preventDefault(); await authFetch('/projects', { method:'POST', body:JSON.stringify({name, color:'#333'}) }); setName(''); authFetch('/projects').then(r=>r.json()).then(setProjects); };
  return <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h3 className="font-bold mb-4">Manage Projects</h3><form onSubmit={add} className="flex gap-2 mb-4"><input value={name} onChange={e=>setName(e.target.value)} className="border p-2 rounded w-full" placeholder="New Project"/><button className="bg-blue-600 text-white p-2 rounded">Add</button></form><div className="space-y-1">{projects.map(p=><div key={p.id} className="p-2 border-b flex justify-between"><span>{p.name}</span><span className="text-xs bg-slate-100 p-1 rounded text-slate-500">ID: {p.id}</span></div>)}</div></div>;
}