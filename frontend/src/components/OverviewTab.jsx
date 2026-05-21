import React from 'react';
import { 
  Users, Activity, Network, Eye, 
  HelpCircle, ShieldAlert, Award, FileText 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';

export default function OverviewTab({ data }) {
  if (!data) return null;

  const { dataset, graph, precomputed } = data;
  
  // Prepare data for Cohort Pie Chart
  const cohortData = [
    { name: 'Non-Sepsis (Control)', value: dataset.cohorts.non_sepsis, color: '#10B981' },
    { name: 'Warm Sepsis', value: dataset.cohorts.warm_sepsis, color: '#F59E0B' },
    { name: 'Cryptic Sepsis', value: dataset.cohorts.cryptic_sepsis, color: '#3B82F6' },
    { name: 'Inflammatory Cascade', value: dataset.cohorts.inflammatory_cascade, color: '#EF4444' },
  ];

  // Prepare data for Wards Bar Chart
  const wardData = [
    { name: 'Intensive Care Unit (ICU)', count: dataset.wards.icu, color: '#8B5CF6' },
    { name: 'Emergency Room', count: dataset.wards.emergency, color: '#EC4899' },
    { name: 'General Ward', count: dataset.wards.general, color: '#6B7280' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Patient Cohort</span>
            <Users className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-white">{dataset.total_patients}</div>
          <div className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {dataset.total_observations.toLocaleString()} hourly data points
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Sepsis Prevalence</span>
            <ShieldAlert className="h-5 w-5 text-red-500" />
          </div>
          <div className="text-3xl font-extrabold text-white">{dataset.sepsis_rate_pct}%</div>
          <div className="text-xs text-gray-400 mt-2">
            {dataset.cohorts.warm_sepsis + dataset.cohorts.cryptic_sepsis + dataset.cohorts.inflammatory_cascade} septic patients discovered
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">State Transition Nodes</span>
            <Network className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-3xl font-extrabold text-white">{graph.nodes}</div>
          <div className="text-xs text-gray-400 mt-2">
            Discretized clinical states representing vitals
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">State Transitions (Edges)</span>
            <Activity className="h-5 w-5 text-purple-500" />
          </div>
          <div className="text-3xl font-extrabold text-white">{graph.edges}</div>
          <div className="text-xs text-gray-400 mt-2">
            Graph density: {(graph.density * 100).toFixed(2)}% connectivity
          </div>
        </div>
      </div>

      {/* Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cohort Pie Chart */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            Cohort Phenotype Distribution
            <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" title="Sepsis subgroups generated in clinical simulation" />
          </h2>
          <p className="text-xs text-gray-400 mb-6">Patient classification based on progression signatures</p>
          <div className="h-64 w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cohortData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {cohortData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', border: '1px solid #1f2937', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-xs text-gray-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Wards Bar Chart */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col">
          <h2 className="text-lg font-bold text-white mb-1">Ward Location Breakdown</h2>
          <p className="text-xs text-gray-400 mb-6">Patient enrollment locations inside the hospital database</p>
          <div className="h-64 w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wardData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                <XAxis type="number" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={10} width={130} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', border: '1px solid #1f2937', borderRadius: '8px' }}
                  labelStyle={{ color: '#9ca3af', fontSize: '10px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                  {wardData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* MC2-ACO Pipeline Overview */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <Award className="h-5 w-5 text-emerald-500" />
          MC²-ACO Pipeline Architecture
        </h2>
        <p className="text-xs text-gray-400 mb-6">Visual workflow showing how the mathematical models discover stable clinical pathways</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 relative">
          <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800/40 relative">
            <div className="absolute top-3 right-3 text-2xl font-black text-gray-800/30">01</div>
            <div className="text-xs font-semibold text-emerald-500 uppercase mb-1">State Discretization</div>
            <h3 className="text-sm font-semibold text-white mb-2">Discrete Clinical Tokens</h3>
            <p className="text-xs text-gray-400 font-light">
              Continuous patient vitals (T, HR, BP, WBC, Lac) are mapped into categorical state tuples, starting at <code>START</code> and leading to <code>SEPSIS</code>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800/40 relative">
            <div className="absolute top-3 right-3 text-2xl font-black text-gray-800/30">02</div>
            <div className="text-xs font-semibold text-blue-500 uppercase mb-1">Monte Carlo Init</div>
            <h3 className="text-sm font-semibold text-white mb-2">Pheromone Bootstrapping</h3>
            <p className="text-xs text-gray-400 font-light">
              10,000 bootstrap patient iterations compute transition means and variances ($\sigma^2$), initializing edge pheromone concentrations ($\tau$).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800/40 relative">
            <div className="absolute top-3 right-3 text-2xl font-black text-gray-800/30">03</div>
            <div className="text-xs font-semibold text-purple-500 uppercase mb-1">Uncertainty Evaporation</div>
            <h3 className="text-sm font-semibold text-white mb-2">Uncertainty-Adaptive Rho</h3>
            <p className="text-xs text-gray-400 font-light">
              Per-edge evaporation rates ($\rho$) are computed dynamically using sigmoid scaling on MC variance. Unreliable pathways evaporate quicker.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800/40 relative">
            <div className="absolute top-3 right-3 text-2xl font-black text-gray-800/30">04</div>
            <div className="text-xs font-semibold text-pink-500 uppercase mb-1">Ant Optimization</div>
            <h3 className="text-sm font-semibold text-white mb-2">Validation Feedback Walk</h3>
            <p className="text-xs text-gray-400 font-light">
              50 ants walk the graph for 200 iterations. Fitness is measured as validation-set sensitivity, reinforcing high-performing paths.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800/40 relative">
            <div className="absolute top-3 right-3 text-2xl font-black text-gray-800/30">05</div>
            <div className="text-xs font-semibold text-red-500 uppercase mb-1">Stability Analysis</div>
            <h3 className="text-sm font-semibold text-white mb-2">Multi-Seed Verification</h3>
            <p className="text-xs text-gray-400 font-light">
              The entire pipeline repeats 500 times with random seeds. Subtypes exceeding 60% frequency are validated as stable, high-confidence pathways.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
