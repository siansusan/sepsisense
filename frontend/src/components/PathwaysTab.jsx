import React from 'react';
import { 
  Award, ShieldCheck, Thermometer, Activity, 
  Layers, TrendingUp, AlertTriangle, ArrowRight 
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
  else if (h === 'H1') items.push('Mild Tachycardia');
  else if (h === 'H2') items.push('Severe Tachycardia');
  
  if (b === 'B0') items.push('Normal BP');
  else if (b === 'B1') items.push('Mild Hypotension');
  else if (b === 'B2') items.push('Severe Hypotension');
  
  if (w === 'W0') items.push('Normal WBC');
  else if (w === 'W1') items.push('Mild WBC');
  else if (w === 'W2') items.push('Severe WBC');
  
  if (l === 'L0') items.push('Normal Lactate');
  else if (l === 'L1') items.push('Mild Lactate');
  else if (l === 'L2') items.push('Severe Lactate');

  return {
    name: node,
    desc: items.join(', ')
  };
};

export default function PathwaysTab({ data }) {
  if (!data || !data.precomputed) return null;

  const { paths, stability } = data.precomputed;

  const getPathwayColorClass = (type) => {
    switch (type) {
      case 'Warm Sepsis': return 'text-amber-400 border-amber-800/40 bg-amber-950/20';
      case 'Cryptic Sepsis': return 'text-blue-400 border-blue-800/40 bg-blue-950/20';
      case 'Inflammatory Cascade': return 'text-red-400 border-red-800/40 bg-red-950/20';
      default: return 'text-gray-400 border-gray-800 bg-gray-900/20';
    }
  };

  return (
    <div className="space-y-8">
      {/* Discovered Paths Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Award className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Top Discovered Paths</h2>
            <p className="text-xs text-gray-400">Diversity-aware optimization results ranked by validation sensitivity</p>
          </div>
        </div>

        <div className="space-y-4">
          {paths.map((p) => (
            <div key={p.rank} className="glass-panel rounded-2xl p-5 border border-gray-800/60 flex flex-col gap-4">
              
              {/* Path Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800/50 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">#{p.rank}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 text-xs rounded-full font-semibold border ${getPathwayColorClass(p.pathway_type)}`}>
                    {p.pathway_type} Signature
                  </span>
                </div>

                {/* Score indicators */}
                <div className="flex gap-4 text-xs font-mono">
                  <div>
                    <span className="text-gray-500">Sensitivity Score:</span>{' '}
                    <span className="text-white font-bold">{p.score}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Ant Frequency:</span>{' '}
                    <span className="text-white font-bold">{p.frequency}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Val Coverage:</span>{' '}
                    <span className="text-white font-bold">{p.coverage}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Mean Pheromone ($\tau$):</span>{' '}
                    <span className="text-white font-bold">{p.mean_tau}</span>
                  </div>
                </div>
              </div>

              {/* Step progression flowchart */}
              <div className="flex flex-wrap items-center gap-2">
                {p.path.map((node, nodeIdx) => {
                  const nodeDetails = describeNode(node);
                  const isSentinel = node === 'START' || node === 'SEPSIS';
                  return (
                    <React.Fragment key={nodeIdx}>
                      {nodeIdx > 0 && <ArrowRight className="h-3 w-3 text-gray-700 shrink-0" />}
                      <div 
                        className={`p-2.5 rounded-lg border text-left cursor-help transition-all ${
                          node === 'START'
                            ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400'
                            : node === 'SEPSIS'
                            ? 'bg-red-950/20 border-red-500/20 text-red-400 pulse-ring-clinical'
                            : 'bg-[#090d16]/75 border-gray-800 hover:border-gray-700 text-gray-200'
                        }`}
                        title={nodeDetails.desc}
                      >
                        <div className="text-[10px] font-bold font-mono">{nodeDetails.name}</div>
                        {!isSentinel && (
                          <div className="text-[9px] text-gray-500 mt-0.5 leading-none">{nodeDetails.desc}</div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Description */}
              <div className="p-3.5 rounded-xl bg-gray-900/40 border border-gray-800 text-xs font-light text-gray-300 leading-relaxed">
                <span className="font-semibold text-gray-400">Clinical Progression Pattern:</span> {p.clinical}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stability Analysis Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Stability Analysis Metrics</h2>
            <p className="text-xs text-gray-400">Replications across 500 independent random seeds (60% threshold for stable discovery)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {stability.map((s, idx) => (
            <div key={idx} className="glass-panel rounded-2xl p-5 border border-gray-800/60 flex flex-col justify-between gap-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none"></div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">{s.pathway_type}</h3>
                  <span className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-full border ${
                    s.stability_pct >= 90 ? 'bg-emerald-950/20 border-emerald-800 text-emerald-400' : 'bg-purple-950/20 border-purple-800 text-purple-400'
                  }`}>
                    {s.stability_pct}% Stable
                  </span>
                </div>
                
                <div className="space-y-1.5 text-xs font-mono text-gray-400">
                  <div className="flex justify-between">
                    <span>Mean Discovery Score:</span>
                    <span className="text-white font-bold">{s.mean_score}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>95% Conf. Interval:</span>
                    <span className="text-purple-400 font-bold">({s.ci_95[0]}, {s.ci_95[1]})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Elected Run Frequency:</span>
                    <span className="text-white font-bold">{s.n_appearances} / 500 seeds</span>
                  </div>
                </div>
              </div>

              {/* Mini flowchart representation */}
              <div className="border-t border-gray-800/60 pt-4 space-y-2">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Best Representative Path
                </div>
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9px]">
                  {s.best_path.map((node, nodeIdx) => (
                    <React.Fragment key={nodeIdx}>
                      {nodeIdx > 0 && <span className="text-gray-700">→</span>}
                      <span 
                        className={`px-1.5 py-0.5 rounded border ${
                          node === 'START' ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400' :
                          node === 'SEPSIS' ? 'bg-red-950/20 border-red-900 text-red-400' : 'bg-gray-900 border-gray-800 text-gray-400'
                        }`}
                      >
                        {node === 'START' ? 'START' : node === 'SEPSIS' ? 'SEPSIS' : node.split('_').slice(0, 2).join('_')}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
