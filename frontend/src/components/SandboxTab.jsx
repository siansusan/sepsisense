import React, { useState } from 'react';
import { apiService } from '../services/api';
import { 
  Play, Sliders, RefreshCw, HelpCircle, Activity, 
  Award, ShieldAlert, CheckCircle, ArrowRight, Loader 
} from 'lucide-react';

const describeNode = (node) => {
  if (node === 'START') return { name: 'Admission', desc: 'Initial baseline vitals recording' };
  if (node === 'SEPSIS') return { name: 'Sepsis Onset', desc: 'Clinical declaration of sepsis progression' };
  
  const parts = node.split('_');
  if (parts.length !== 5) return { name: node, desc: '' };
  
  const [t, h, b, w, l] = parts;
  const items = [];
  
  if (t === 'T0') items.push('Normal Temp');
  else if (t === 'T1') items.push('Mild Fever');
  else if (t === 'T2') items.push('Severe Fever');
  
  if (h === 'H0') items.push('Normal HR');
  else if (h === 'H1') items.push('Mild Tachy');
  else if (h === 'H2') items.push('Severe Tachy');
  
  if (b === 'B0') items.push('Normal BP');
  else if (b === 'B1') items.push('Mild Hypo');
  else if (b === 'B2') items.push('Severe Hypo');
  
  if (w === 'W0') items.push('Normal WBC');
  else if (w === 'W1') items.push('Mild WBC');
  else if (w === 'W2') items.push('Severe WBC');
  
  if (l === 'L0') items.push('Normal Lac');
  else if (l === 'L1') items.push('Mild Lac');
  else if (l === 'L2') items.push('Severe Lac');

  return {
    name: node,
    desc: items.join(', ')
  };
};

export default function SandboxTab() {
  const [alpha, setAlpha] = useState(1.0);
  const [beta, setBeta] = useState(2.0);
  const [rho, setRho] = useState(0.10);
  const [nAnts, setNAnts] = useState(20);
  const [nIterations, setNIterations] = useState(15);
  const [mcBootstraps, setMcBootstraps] = useState(100);
  const [seed, setSeed] = useState(42);

  // States
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const runSimulation = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);
    setProgressStep(1);

    // Dynamic progress messages simulation
    const steps = [
      'Generating bootstrap patient subsets...',
      'Running Monte Carlo transition likelihood estimation...',
      'Computing uncertainty-adaptive pheromone evaporation rates...',
      'Initializing artificial ant walkers on clinical state graph...',
      'Walking transition graph & evaluating path validation sensitivity...',
      'Compiling diversity-aware final ranking...'
    ];

    const interval = setInterval(() => {
      setProgressStep((prev) => {
        if (prev < steps.length) {
          return prev + 1;
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 900);

    try {
      const data = await apiService.runSimulation({
        alpha,
        beta,
        rhoDefault: rho,
        nAnts,
        nIterations,
        mcBootstraps,
        seed
      });
      setResults(data);
    } catch (err) {
      setError(err.message || 'Simulation execution failed.');
    } finally {
      clearInterval(interval);
      setLoading(false);
      setProgressStep(0);
    }
  };

  const resetParams = () => {
    setAlpha(1.0);
    setBeta(2.0);
    setRho(0.10);
    setNAnts(20);
    setNIterations(15);
    setMcBootstraps(100);
    setSeed(42);
  };

  const getPathwayColorClass = (type) => {
    switch (type) {
      case 'Warm Sepsis': return 'text-amber-400 border-amber-800/40 bg-amber-950/20';
      case 'Cryptic Sepsis': return 'text-blue-400 border-blue-800/40 bg-blue-950/20';
      case 'Inflammatory Cascade': return 'text-red-400 border-red-800/40 bg-red-950/20';
      default: return 'text-gray-400 border-gray-800 bg-gray-900/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Sandbox Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Tuning Controls Panel */}
        <div className="glass-panel rounded-2xl p-5 border border-gray-800 flex flex-col justify-between">
          <form onSubmit={runSimulation} className="space-y-5">
            <div className="border-b border-gray-800 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-500" />
                Hyperparameters
              </h2>
              <button 
                type="button" 
                onClick={resetParams}
                className="text-[10px] text-gray-500 hover:text-emerald-400 flex items-center gap-1 transition-all"
              >
                <RefreshCw className="h-3 w-3" /> Reset Defaults
              </button>
            </div>

            {/* Alpha */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 flex items-center gap-1">
                  Pheromone Weight ($\alpha$):
                  <HelpCircle className="h-3 w-3 text-gray-600 cursor-help" title="Power of transition pheromone in probability calculation" />
                </span>
                <span className="text-white font-mono font-bold">{alpha.toFixed(1)}</span>
              </div>
              <input
                type="range" min="0.1" max="4.0" step="0.1" value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Beta */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 flex items-center gap-1">
                  Heuristic Weight ($\beta$):
                  <HelpCircle className="h-3 w-3 text-gray-600 cursor-help" title="Power of transition frequency in probability calculation" />
                </span>
                <span className="text-white font-mono font-bold">{beta.toFixed(1)}</span>
              </div>
              <input
                type="range" min="0.1" max="4.0" step="0.1" value={beta}
                onChange={(e) => setBeta(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Rho */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 flex items-center gap-1">
                  Base Evaporation ($\rho$):
                  <HelpCircle className="h-3 w-3 text-gray-600 cursor-help" title="Standard pheromone decay rate per iteration" />
                </span>
                <span className="text-white font-mono font-bold">{rho.toFixed(2)}</span>
              </div>
              <input
                type="range" min="0.01" max="0.4" step="0.01" value={rho}
                onChange={(e) => setRho(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Colony Size */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Colony Size (Ants):</span>
                <span className="text-white font-mono font-bold">{nAnts}</span>
              </div>
              <input
                type="range" min="5" max="60" step="5" value={nAnts}
                onChange={(e) => setNAnts(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Iterations */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Iterations:</span>
                <span className="text-white font-mono font-bold">{nIterations}</span>
              </div>
              <input
                type="range" min="5" max="30" step="1" value={nIterations}
                onChange={(e) => setNIterations(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Bootstraps */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 flex items-center gap-1">
                  MC Bootstraps (B):
                  <HelpCircle className="h-3 w-3 text-gray-600 cursor-help" title="Number of bootstrap estimation cycles for transition prior initialization" />
                </span>
                <span className="text-white font-mono font-bold">{mcBootstraps}</span>
              </div>
              <input
                type="range" min="50" max="300" step="10" value={mcBootstraps}
                onChange={(e) => setMcBootstraps(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Random Seed */}
            <div className="space-y-2">
              <label className="block text-[10px] text-gray-400 uppercase font-semibold">Random seed:</label>
              <input
                type="number" value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value))}
                className="w-full bg-[#090d16] border border-gray-800 focus:border-emerald-500/50 rounded-xl py-2 px-3 text-white text-xs font-mono focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-emerald-950/20 hover:shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all text-xs"
            >
              {loading ? (
                <Loader className="h-4 w-4 animate-spin text-white" />
              ) : (
                <>
                  <Play className="h-4 w-4 text-white fill-white" />
                  Execute Optimization
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Screen View */}
        <div className="xl:col-span-3 glass-panel rounded-2xl p-6 border border-gray-800 min-h-[500px] flex flex-col">
          {loading ? (
            <div className="flex-grow flex flex-col items-center justify-center py-20 gap-8 max-w-lg mx-auto">
              <div className="relative h-16 w-16 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <Activity className="h-7 w-7 text-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-3 text-center">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Optimization Engine Active</h3>
                <p className="text-xs text-gray-400 font-light">
                  Executing Python algorithm stack. Drawing patient profiles, estimating Monte Carlo variance and searching the transition graph...
                </p>
              </div>

              {/* Progress checklist indicator */}
              <div className="w-full space-y-2 text-xs font-light text-gray-400">
                <div className="flex items-center gap-2">
                  {progressStep > 1 ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <div className="h-4 w-4 rounded-full border border-gray-800"></div>}
                  <span className={progressStep === 1 ? 'text-emerald-400 font-medium' : ''}>1. Initialize Monte Carlo variance</span>
                </div>
                <div className="flex items-center gap-2">
                  {progressStep > 3 ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <div className="h-4 w-4 rounded-full border border-gray-800"></div>}
                  <span className={progressStep === 3 ? 'text-emerald-400 font-medium' : ''}>2. Calculate uncertainty-adaptive evaporation</span>
                </div>
                <div className="flex items-center gap-2">
                  {progressStep > 5 ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <div className="h-4 w-4 rounded-full border border-gray-800"></div>}
                  <span className={progressStep === 5 ? 'text-emerald-400 font-medium' : ''}>3. Deploy artificial ants walkthrough</span>
                </div>
                <div className="flex items-center gap-2">
                  {results ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <div className="h-4 w-4 rounded-full border border-gray-800"></div>}
                  <span>4. Rank discovered pathways on validation dataset</span>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6 text-red-400 gap-3">
              <ShieldAlert className="h-10 w-10 text-red-500" />
              <h3 className="text-sm font-bold">Execution Failed</h3>
              <p className="text-xs text-gray-500 max-w-md font-light leading-relaxed">{error}</p>
            </div>
          ) : results ? (
            <div className="flex-grow space-y-6">
              <div className="border-b border-gray-800 pb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">Custom Simulation Outcomes</h3>
                  <p className="text-xs text-gray-500">Parameters: Alpha={results.summary.parameters.alpha} | Beta={results.summary.parameters.beta} | Iterations={results.summary.parameters.n_iterations}</p>
                </div>
                <div className="px-3 py-1 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-400 text-xs font-mono font-semibold">
                  {results.summary.discovered_paths_count} Unique Paths Found
                </div>
              </div>

              <div className="space-y-4">
                {results.top_paths.map((p) => (
                  <div key={p.rank} className="p-4 rounded-xl bg-gray-900/30 border border-gray-800/60 space-y-4">
                    
                    {/* Path Header */}
                    <div className="flex flex-wrap justify-between items-center gap-3 border-b border-gray-800/50 pb-2 text-xs font-mono">
                      <div className="flex items-center gap-2.5">
                        <span className="h-5 w-5 rounded bg-gray-900 border border-gray-800 flex items-center justify-center text-white font-bold">#{p.rank}</span>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getPathwayColorClass(p.pathway_type)}`}>
                          {p.pathway_type}
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <div><span className="text-gray-500">Score:</span> <span className="text-white font-bold">{p.score.toFixed(4)}</span></div>
                        <div><span className="text-gray-500">Mean Pheromone:</span> <span className="text-white font-bold">{p.mean_tau.toFixed(4)}</span></div>
                      </div>
                    </div>

                    {/* Step flowchart */}
                    <div className="flex flex-wrap items-center gap-2">
                      {p.path.map((node, nodeIdx) => {
                        const nodeDetails = describeNode(node);
                        const isSentinel = node === 'START' || node === 'SEPSIS';
                        return (
                          <React.Fragment key={nodeIdx}>
                            {nodeIdx > 0 && <ArrowRight className="h-3 w-3 text-gray-700 shrink-0" />}
                            <div 
                              className={`p-2 rounded border text-left cursor-help transition-all ${
                                node === 'START' ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' :
                                node === 'SEPSIS' ? 'bg-red-950/20 border-red-500/20 text-red-400' : 'bg-[#090d16]/75 border-gray-800 text-gray-200 hover:border-gray-700'
                              }`}
                              title={nodeDetails.desc}
                            >
                              <div className="text-[10px] font-bold font-mono">{nodeDetails.name}</div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>

                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6">
              <Play className="h-10 w-10 text-gray-600 mb-3" />
              <h3 className="text-sm font-semibold text-gray-300">Sandbox Playground Ready</h3>
              <p className="text-xs text-gray-500 mt-2 font-light max-w-sm leading-relaxed">
                Tune optimization weights in the left panel. Click "Execute Optimization" to run a live ACO pathway discovery query on the train/validation datasets.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
