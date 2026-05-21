import React, { useState, useEffect } from 'react';
import { apiService } from './services/api';
import Login from './components/Login';
import OverviewTab from './components/OverviewTab';
import PatientsTab from './components/PatientsTab';
import GraphTab from './components/GraphTab';
import PathwaysTab from './components/PathwaysTab';
import SandboxTab from './components/SandboxTab';

import { 
  Activity, Users, Network, Award, 
  Sliders, LogOut, Radio, User, AlertTriangle 
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check auth on startup
  useEffect(() => {
    if (apiService.isAuthenticated()) {
      setUser(apiService.getUser());
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch overview stats when logged in
  useEffect(() => {
    if (!user) return;
    
    const fetchOverview = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiService.getOverview();
        setOverviewData(data);
      } catch (err) {
        setError('Unable to establish connection with SepsisSense FastAPI server. Please check that the backend is running on http://localhost:8000.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [user]);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    setOverviewData(null);
    setActiveTab('overview');
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const tabs = [
    { id: 'overview', name: 'Dashboard Overview', icon: Activity },
    { id: 'graph', name: 'Deterioration Highway', icon: Network },
    { id: 'pathways', name: 'Pathway Discoveries', icon: Award },
    { id: 'sandbox', name: 'Sandbox Simulation', icon: Sliders },
  ];

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col md:flex-row relative">
      {/* Background radial overlays */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full filter blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full filter blur-[120px] pointer-events-none z-0"></div>

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#080d16] border-b md:border-b-0 md:border-r border-gray-800/80 flex flex-col justify-between p-5 z-10 shrink-0 select-none">
        <div className="space-y-8">
          {/* Logo banner */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-tr from-emerald-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/10 ring-1 ring-white/10 pulse-ring-clinical shrink-0">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white font-sans tracking-tight">SepsisSense</h1>
              <div className="text-[10px] text-gray-500 flex items-center gap-1 font-light mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                MC²-ACO discovery
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                    isActive 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/40 border border-transparent hover:border-gray-800/50'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User bar */}
        <div className="mt-8 pt-5 border-t border-gray-800/60 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 shrink-0">
              <User className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{user.name}</div>

            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-gray-800 hover:border-red-500/20 text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-950/5 transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            Terminate Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-6 md:p-8 overflow-y-auto max-h-screen z-10">
        
        {/* Error notification banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-800/30 text-red-200 text-sm flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">Backend Connectivity Offline</div>
              <p className="font-light text-xs text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Global Loading screen */}
        {loading && !overviewData ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            <span className="text-sm text-gray-400">Loading optimization database...</span>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Header section */}
            <div className="flex justify-between items-center border-b border-gray-800/40 pb-5">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  {tabs.find(t => t.id === activeTab).name}
                </h1>
                <p className="text-xs text-gray-400 mt-1 font-light">
                  {activeTab === 'overview' && 'Overview of patient cohorts, transitions graph stats and algorithm configuration.'}
                  {activeTab === 'patients' && 'Registry of ICU/ER patients. Search and analyze individual vital graphs and progression matching.'}
                  {activeTab === 'graph' && 'Interactive transition graph representing patient clinical progression lanes.'}
                  {activeTab === 'pathways' && 'Ranked list of discovered sepsis progression patterns and multi-run stability results.'}
                  {activeTab === 'sandbox' && 'Live simulation sandbox. Customize prior-bootstrapping and ant walk parameters to discover pathways.'}
                </p>
              </div>

              {/* Server Live tag */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/20 border border-emerald-800/40 text-emerald-400 text-xs font-medium">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                <span>FastAPI: Active</span>
              </div>
            </div>

            {/* Tab Rendering */}
            <div className="transition-opacity duration-300">
              {activeTab === 'overview' && <OverviewTab data={overviewData} />}
              {activeTab === 'patients' && <PatientsTab />}
              {activeTab === 'graph' && <GraphTab />}
              {activeTab === 'pathways' && <PathwaysTab data={overviewData} />}
              {activeTab === 'sandbox' && <SandboxTab />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
