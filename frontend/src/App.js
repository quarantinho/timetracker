import React, { useState, useEffect } from 'react';
import { Play, Square, LayoutDashboard, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API_URL = 'http://localhost:5000/api';

export default function App() {
  const [view, setView] = useState('tracker');

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setView('tracker')}
            className={`flex gap-2 px-4 py-2 rounded ${view === 'tracker' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            <Clock size={20} /> Zeiterfassung
          </button>
          <button 
            onClick={() => setView('dashboard')}
            className={`flex gap-2 px-4 py-2 rounded ${view === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            <LayoutDashboard size={20} /> Chef-Dashboard
          </button>
        </div>

        {view === 'tracker' ? <TimeTracker /> : <Dashboard />}
      </div>
    </div>
  );
}

function TimeTracker() {
  const [projects, setProjects] = useState([]);
  const [activeTimer, setActiveTimer] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    fetch(`${API_URL}/projects`).then(res => res.json()).then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    let interval;
    if (activeTimer) {
      interval = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const handleStart = async () => {
    if (!selectedProject) return alert('Bitte Projekt wählen');
    const res = await fetch(`${API_URL}/entries/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: selectedProject })
    });
    if (res.ok) {
      setActiveTimer(true);
      setElapsed(0);
    }
  };

  const handleStop = async () => {
    const res = await fetch(`${API_URL}/entries/stop`, { method: 'POST' });
    if (res.ok) {
      setActiveTimer(false);
      setElapsed(0);
      alert('Zeit gespeichert!');
    }
  };

  const formatTime = (sec) => {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="bg-white p-6 rounded shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Timer</h2>
      <div className="flex gap-4 items-center">
        <select 
          className="border p-2 rounded flex-1 text-black"
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
          disabled={activeTimer}
        >
          <option value="">-- Projekt wählen --</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="text-2xl font-mono w-32 text-center text-black font-bold">{formatTime(elapsed)}</div>
        {!activeTimer ? (
          <button onClick={handleStart} className="bg-green-600 text-white p-2 rounded flex gap-2 hover:bg-green-700 font-bold">
            <Play /> Start
          </button>
        ) : (
          <button onClick={handleStop} className="bg-red-600 text-white p-2 rounded flex gap-2 hover:bg-red-700 font-bold">
            <Square /> Stopp
          </button>
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/analytics`).then(res => res.json()).then(setData).catch(console.error);
  }, []);

  return (
    <div className="bg-white p-6 rounded shadow-md">
      <h2 className="text-xl font-bold mb-6 text-gray-800">Projekt-Analyse</h2>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis unit="h" />
            <Tooltip />
            <Bar dataKey="hours" name="Stunden">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}