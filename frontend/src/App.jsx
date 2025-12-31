import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, Square, Clock, Users, LogOut, 
  BarChart3, Timer, Plus, Trash2, 
  CalendarPlus, FolderKanban, Filter, ChevronDown, CheckCircle2, XCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

// Uses env variable for deployment or defaults to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// --- Styles ---
const GlobalStyles = () => (
  <style>{`
    body { background-color: #f8fafc; margin: 0; font-family: 'Inter', sans-serif; }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  `}</style>
);

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('tracker'); 
  const [loading, setLoading] = useState(true);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('timeapp_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const checkTimer = () => {
      fetch(`${API_URL}/entries/active/${currentUser.id}`)
        .then(res => res.json())
        .then(data => setIsTimerRunning(!!(data && data.id)))
        .catch(() => setIsTimerRunning(false));
    };
    checkTimer();
    const interval = setInterval(checkTimer, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('timeapp_user');
    setCurrentUser(null);
    setCurrentView('tracker');
    setIsTimerRunning(false);
  };

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading App...</div>;

  if (!currentUser) return (
    <>
      <GlobalStyles />
      <LoginScreen onLogin={(u) => { localStorage.setItem('timeapp_user', JSON.stringify(u)); setCurrentUser(u); }} />
    </>
  );

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-800 overflow-hidden">
      <GlobalStyles />
      <Sidebar 
        user={currentUser} 
        activeView={currentView} 
        onChangeView={setCurrentView} 
        onLogout={handleLogout}
        isTimerRunning={isTimerRunning}
      />
      <MainContent 
        user={currentUser} 
        view={currentView} 
        onTimerChange={setIsTimerRunning}
      />
    </div>
  );
}

// --- 1. Login Screen ---
function LoginScreen({ onLogin }) {
  const [users, setUsers] = useState([]);
  useEffect(() => { fetch(`${API_URL}/users`).then(res => res.json()).then(setUsers); }, []);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-10">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-200">
            <Clock className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">TimeTracker Login</h1>
          <p className="text-slate-500 mt-2">Select your profile</p>
        </div>
        <div className="space-y-3">
          {users.map(u => (
            <button key={u.id} onClick={() => onLogin(u)} className="w-full flex items-center p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all bg-white text-left group shadow-sm">
              <span className="text-3xl mr-4">{u.avatar}</span>
              <div>
                <p className="font-bold text-slate-800 group-hover:text-blue-700">{u.name}</p>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">{u.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- 2. Sidebar ---
function Sidebar({ user, activeView, onChangeView, onLogout, isTimerRunning }) {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex h-full shadow-lg z-20 shrink-0">
      <div className="p-6 flex items-center gap-3 border-b border-slate-100">
        <div className="bg-blue-600 text-white p-1.5 rounded-lg"><Clock size={20} /></div>
        <span className="font-bold text-xl tracking-tight text-slate-900">TimeApp</span>
      </div>
      <nav className="flex-1 px-4 space-y-1.5 mt-6">
        <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Workspace</p>
        <NavItem icon={<Timer />} label="Tracker" isActive={activeView === 'tracker'} onClick={() => onChangeView('tracker')} />
        <NavItem icon={<BarChart3 />} label="Analytics" isActive={activeView === 'analytics'} onClick={() => onChangeView('analytics')} />
        <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6">Management</p>
        <NavItem icon={<FolderKanban />} label="Projects" isActive={activeView === 'projects'} onClick={() => onChangeView('projects')} />
        <NavItem icon={<Users />} label="Team" isActive={activeView === 'team'} onClick={() => onChangeView('team')} />
      </nav>
      {isTimerRunning && (
        <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 animate-pulse">
          <div className="w-2.5 h-2.5 bg-red-600 rounded-full shadow-red-200"></div>
          <span className="text-xs font-bold text-red-600">Timer Running...</span>
        </div>
      )}
      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-lg border border-slate-200 shadow-sm">{user.avatar}</div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate capitalize">{user.role}</p>
          </div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 px-4 py-2 rounded-lg transition-all text-sm font-medium">
          <LogOut size={16} /> Log Out
        </button>
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

// --- 3. Main Content ---
function MainContent({ user, view, onTimerChange }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = () => setRefreshTrigger(p => p + 1);

  return (
    <main className="flex-1 h-full overflow-y-auto bg-slate-50 relative w-full">
      <div className="max-w-7xl mx-auto w-full p-6 md:p-10 pb-20">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight capitalize">
              {view === 'tracker' ? 'Time Tracker' : view === 'projects' ? 'Project Management' : view === 'analytics' ? 'Analytics' : 'Team Overview'}
            </h2>
          </div>
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

// --- ANALYTICS VIEW ---
function AnalyticsView({ refreshTrigger }) {
  const [rawData, setRawData] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  
  const [userFilter, setUserFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  useEffect(() => {
    Promise.all([
        fetch(`${API_URL}/analytics`).then(res => res.json()),
        fetch(`${API_URL}/users`).then(res => res.json()),
        fetch(`${API_URL}/projects`).then(res => res.json())
    ]).then(([analyticsData, usersData, projectsData]) => {
        setRawData(analyticsData);
        setUsers(usersData);
        setProjects(projectsData);
    });
  }, [refreshTrigger]);

  const filteredData = useMemo(() => {
    return rawData.filter(item => {
        const itemUserId = item.user_id ? String(item.user_id) : '';
        const itemProjId = item.project_id ? String(item.project_id) : '';
        const matchesUser = userFilter === 'all' || itemUserId === String(userFilter);
        const matchesProject = projectFilter === 'all' || itemProjId === String(projectFilter);
        return matchesUser && matchesProject;
    });
  }, [rawData, userFilter, projectFilter]);

  const chartData = useMemo(() => {
    return filteredData.reduce((acc, curr) => {
      const found = acc.find(i => i.name === curr.project_name);
      if (found) { found.hours += Number(curr.hours); } 
      else { acc.push({ name: curr.project_name, hours: Number(curr.hours), color: curr.color }); }
      return acc;
    }, []);
  }, [filteredData]);

  const totalHours = filteredData.reduce((acc, curr) => acc + Number(curr.hours), 0);
  const resetFilters = () => { setUserFilter('all'); setProjectFilter('all'); };

  return (
    <div className="space-y-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 items-center flex-wrap">
                <div className="flex items-center gap-2 text-slate-500 font-medium"><Filter size={18} /> Filter:</div>
                <select className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 min-w-[160px]" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
                    <option value="all">All Employees</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 min-w-[160px]" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                    <option value="all">All Projects</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {(userFilter !== 'all' || projectFilter !== 'all') && (
                    <button onClick={resetFilters} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"><XCircle size={16} /> Reset</button>
                )}
            </div>
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold text-sm border border-blue-100 whitespace-nowrap">Total: {totalHours.toFixed(2)} h</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[500px]">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart3 className="text-blue-500" size={20}/> Visualization</h3>
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                      <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="hours" name="Hours" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50"><h3 className="text-lg font-bold text-slate-800">Details</h3><p className="text-sm text-slate-500">Filtered Entries ({filteredData.length})</p></div>
                <div className="overflow-y-auto flex-1 p-0">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-400 sticky top-0 z-10 border-b border-slate-100"><tr><th className="px-6 py-3">Employee</th><th className="px-6 py-3">Project</th><th className="px-6 py-3 text-right">Hours</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map((row, i) => (
                                <tr key={i} className="hover:bg-blue-50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-slate-700 flex items-center gap-2"><Users size={16} className="text-slate-400"/> {row.user_name}</td>
                                    <td className="px-6 py-4"><span className="inline-block w-2.5 h-2.5 rounded-full mr-2 shadow-sm" style={{backgroundColor: row.color}}></span>{row.project_name}</td>
                                    <td className="px-6 py-4 text-right font-mono text-blue-600 font-bold bg-slate-50/50">{row.hours} h</td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && <tr><td colSpan="3" className="p-10 text-center text-slate-400">No data for this filter</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
}

// --- TRACKER COMPONENTS ---
function TimeTrackerCard({ user, onUpdate, onTimerStateChange }) {
  const [projects, setProjects] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { fetch(`${API_URL}/projects`).then(res => res.json()).then(setProjects); }, []);
  useEffect(() => {
    const checkActive = async () => {
      try {
        const res = await fetch(`${API_URL}/entries/active/${user.id}`);
        const data = await res.json();
        if (data && data.id) { setActiveTimer(data); setSelectedProject(data.project_id); onTimerStateChange(true); } 
        else { onTimerStateChange(false); }
      } catch (e) {}
    };
    checkActive();
  }, [user]);
  useEffect(() => {
    let interval;
    if (activeTimer) { interval = setInterval(() => { setElapsed(Math.floor((new Date() - new Date(activeTimer.start_time)) / 1000)); }, 1000); } 
    else { setElapsed(0); }
    return () => clearInterval(interval);
  }, [activeTimer]);
  const handleStart = async () => {
    if (!selectedProject) return alert('Please select a project!');
    const res = await fetch(`${API_URL}/entries/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: selectedProject, userId: user.id }) });
    if (res.ok) { const entry = await res.json(); setActiveTimer(entry); onTimerStateChange(true); }
  };
  const handleStop = async () => {
    const res = await fetch(`${API_URL}/entries/stop`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) });
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
        {activeTimer ? <span className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full text-xs font-bold border border-red-100"><div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div> RECORDING</span> : <span className="text-slate-400 text-sm font-medium">Ready to start</span>}
      </div>
      <div className="flex flex-col md:flex-row items-end gap-6">
        <div className="w-full md:flex-1">
          <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-wider">Select Project</label>
          <div className="relative">
            <select className="w-full p-4 pl-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-semibold text-slate-700 transition-all appearance-none" value={selectedProject} onChange={e => setSelectedProject(e.target.value)} disabled={!!activeTimer}>
                <option value="">-- What are you working on? --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronDown size={20} /></div>
          </div>
        </div>
        <div className="w-full md:w-auto flex items-center gap-4 bg-slate-900 text-white p-2 pl-6 pr-2 rounded-xl shadow-xl shadow-slate-200">
           <div className="font-mono text-3xl font-bold tracking-wider mr-4 min-w-[140px] text-center tabular-nums">{formatTime(elapsed)}</div>
           {!activeTimer ? <button onClick={handleStart} className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-lg transition-all active:scale-95 shadow-lg shadow-blue-900/20"><Play size={24} fill="currentColor" /></button> : <button onClick={handleStop} className="bg-red-500 hover:bg-red-400 text-white p-4 rounded-lg transition-all active:scale-95 shadow-lg shadow-red-900/20"><Square size={24} fill="currentColor" /></button>}
        </div>
      </div>
    </div>
  );
}

function ManualEntryCard({ user, onUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({ projectId: '', date: '', start: '', end: '' });
  useEffect(() => { fetch(`${API_URL}/projects`).then(res => res.json()).then(setProjects); }, []);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.projectId || !formData.date || !formData.start || !formData.end) return;
    const res = await fetch(`${API_URL}/entries/manual`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, projectId: formData.projectId, start: new Date(`${formData.date}T${formData.start}`).toISOString(), end: new Date(`${formData.date}T${formData.end}`).toISOString() }) });
    if (res.ok) { setFormData({ projectId: '', date: '', start: '', end: '' }); setIsOpen(false); onUpdate(); }
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-800 flex items-center gap-2"><CalendarPlus size={20} className="text-slate-400"/> Manual Entry</h3><button onClick={() => setIsOpen(!isOpen)} className="text-blue-600 text-sm font-medium hover:underline">{isOpen ? 'Close' : 'Open'}</button></div>
      {isOpen ? <div className="p-6 bg-slate-50/50"><form onSubmit={handleSubmit} className="space-y-4"><div><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Project</label><select className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}><option value="">Select...</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Date</label><input type="date" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" onChange={e => setFormData({...formData, date: e.target.value})} value={formData.date}/></div><div className="flex gap-2"><div className="flex-1"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">From</label><input type="time" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" onChange={e => setFormData({...formData, start: e.target.value})} value={formData.start}/></div><div className="flex-1"><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">To</label><input type="time" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" onChange={e => setFormData({...formData, end: e.target.value})} value={formData.end}/></div></div><button type="submit" className="w-full bg-slate-800 text-white font-bold p-2.5 rounded-lg hover:bg-slate-700 text-sm">Save</button></form></div> : <div className="p-6 text-center text-slate-400 text-sm"><p>Did you forget to track?</p><button onClick={() => setIsOpen(true)} className="mt-2 text-blue-600 font-medium hover:underline">Add entry here</button></div>}
    </div>
  );
}

function HistoryList({ user, refreshTrigger }) {
  const [entries, setEntries] = useState([]);
  useEffect(() => { fetch(`${API_URL}/entries/${user.id}`).then(res => res.json()).then(setEntries).catch(console.error); }, [user, refreshTrigger]);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold text-slate-800">History</h3></div>
      <div className="max-h-[300px] overflow-y-auto"><table className="w-full text-left text-sm text-slate-600"><thead className="bg-slate-50 text-xs uppercase font-bold text-slate-400 sticky top-0"><tr><th className="px-6 py-3">Project</th><th className="px-6 py-3">Time</th><th className="px-6 py-3 text-right">Duration</th></tr></thead><tbody className="divide-y divide-slate-100">{entries.map(e => (<tr key={e.id} className="hover:bg-blue-50 transition-colors"><td className="px-6 py-3 font-medium text-slate-700 flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: e.color}}></div>{e.project_name}</td><td className="px-6 py-3">{new Date(e.start_time).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})}</td><td className="px-6 py-3 text-right font-mono text-blue-600 font-bold bg-slate-50/50">{Math.round(e.duration_seconds / 60)} m</td></tr>))}{entries.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-slate-400">No entries today</td></tr>}</tbody></table></div>
    </div>
  );
}

function ProjectsManager() {
  const [projects, setProjects] = useState([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const loadProjects = () => fetch(`${API_URL}/projects`).then(res => res.json()).then(setProjects);
  useEffect(() => { loadProjects(); }, []);
  const handleCreate = async (e) => { e.preventDefault(); if (!newName) return; await fetch(`${API_URL}/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName, color: newColor }) }); setNewName(''); loadProjects(); };
  const handleDelete = async (id) => { if (!window.confirm('Delete project?')) return; await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE' }); loadProjects(); };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-1 h-fit"><h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Plus className="text-blue-500" size={20}/> New Project</h3><form onSubmit={handleCreate} className="space-y-4"><div><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Name</label><input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Project Name" value={newName} onChange={e => setNewName(e.target.value)}/></div><div><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Color</label><div className="flex gap-2 items-center"><input type="color" className="h-9 w-14 rounded cursor-pointer border-0" value={newColor} onChange={e => setNewColor(e.target.value)}/><span className="text-sm text-slate-500 font-mono">{newColor}</span></div></div><button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm shadow-md shadow-blue-200">Create</button></form></div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 md:col-span-2 overflow-hidden"><div className="p-6 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-800">Project List</h3></div><div className="p-0">{projects.map(p => (<div key={p.id} className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50"><div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full shadow-sm" style={{backgroundColor: p.color}}></div><span className="font-medium text-slate-700">{p.name}</span></div><button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition-colors"><Trash2 size={18} /></button></div>))}</div></div>
    </div>
  );
}

function TeamView() {
  const [users, setUsers] = useState([]);
  useEffect(() => fetch(`${API_URL}/users`).then(res => res.json()).then(setUsers), []);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{users.map(u => (<div key={u.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all group"><div className="text-4xl filter drop-shadow-sm group-hover:scale-110 transition-transform">{u.avatar}</div><div><h3 className="font-bold text-slate-900">{u.name}</h3><span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded mt-1 font-bold uppercase tracking-wider"><CheckCircle2 size={12}/> {u.role}</span></div></div>))}</div>
  );
}