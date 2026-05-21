import React, { useState } from 'react';
import { apiService } from '../services/api';
import { Activity, ShieldAlert, Key, User, ArrowRight } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await apiService.login(username, password);
      if (response.status === 'success') {
        onLoginSuccess(response.user);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreset = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] relative px-4 select-none">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full filter blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel rounded-2xl p-8 shadow-2xl relative border border-gray-800">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-gradient-to-tr from-emerald-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4 ring-1 ring-white/10 pulse-ring-clinical">
            <Activity className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-sans">
            Sepsis<span className="text-emerald-500">Sense</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1 text-center font-light">
            MC²-ACO Clinical Progression Pathway Discovery
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-red-200 text-sm flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Clinician ID / Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <User className="h-5 w-5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#090d16] border border-gray-800 focus:border-emerald-500/50 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all font-light text-sm"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Secure Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <Key className="h-5 w-5" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#090d16] border border-gray-800 focus:border-emerald-500/50 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all font-light text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-emerald-950/20 hover:shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all group text-sm"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                Initialize Discovery
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-800/60">
          <p className="text-xs text-gray-500 text-center mb-3">
            Quick demo credentials for reviews:
          </p>
          <div className="grid grid-cols-2 gap-3">

            <button
              onClick={() => loadPreset('admin', 'sepsisense2026')}
              className="px-3 py-2 rounded-lg bg-gray-900/60 hover:bg-gray-800 border border-gray-800/40 text-left transition-all hover:border-emerald-500/30"
            >
              <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                Clinician
              </div>
              <div className="text-xs text-white truncate">admin / sepsisense2026</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
