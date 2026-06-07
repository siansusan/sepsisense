import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { 
  Search, Filter, Eye, X, ChevronLeft, ChevronRight, 
  Thermometer, Heart, Activity, ShieldAlert, Award, AlertCircle 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';

// Helper to translate token bins to clinical descriptions
const describeToken = (token) => {
  if (token === 'START') return { name: 'Admission', desc: 'Initial baseline vitals recording' };
  if (token === 'SEPSIS') return { name: 'Sepsis Onset', desc: 'Clinical declaration of sepsis progression' };
  
  const parts = token.split('_');
  if (parts.length !== 5) return { name: token, desc: '' };
  
  const [t, h, b, w, l] = parts;
  const items = [];
  
  if (t === 'T0') items.push('Normal Temp');
  else if (t === 'T1') items.push('Mild Fever');
  else if (t === 'T2') items.push('Severe Fever / Hypothermia');
  
  if (h === 'H0') items.push('Normal HR');
  else if (h === 'H1') items.push('Mild Tachycardia');
  else if (h === 'H2') items.push('Severe Tachycardia');
  
  if (b === 'B0') items.push('Normal BP');
  else if (b === 'B1') items.push('Mild Hypotension');
  else if (b === 'B2') items.push('Severe Hypotension');
  
  if (w === 'W0') items.push('Normal WBC');
  else if (w === 'W1') items.push('Mild Leukocytosis');
  else if (w === 'W2') items.push('Severe WBC Deviation');
  
  if (l === 'L0') items.push('Normal Lactate');
  else if (l === 'L1') items.push('Hyperlactatemia');
  else if (l === 'L2') items.push('Severe Hyperlactatemia');

  return {
    name: token,
    desc: items.join(', ')
  };
};

export default function PatientsTab() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchId, setSearchId] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [cohortFilter, setCohortFilter] = useState('');
  
  // Selected Patient details
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientDetail, setPatientDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch patients list
  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await apiService.getPatients({
        page,
        limit: 10,
        ward: wardFilter,
        cohort: cohortFilter,
        searchId: searchId ? parseInt(searchId) : null
      });
      setPatients(data.patients);
      setTotalPages(data.pagination.total_pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [page, wardFilter, cohortFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadPatients();
  };

  // Fetch individual patient details
  const viewPatient = async (id) => {
    setSelectedPatientId(id);
    setDetailLoading(true);
    try {
      const data = await apiService.getPatientDetail(id);
      setPatientDetail(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedPatientId(null);
    setPatientDetail(null);
  };

  const getCohortBadge = (cohort) => {
    switch (cohort) {
      case 'None':
        return <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">Control (Non-Sepsis)</span>;
      case 'Warm Sepsis':
        return <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-amber-950/40 border border-amber-800/40 text-amber-400">Warm Sepsis</span>;
      case 'Cryptic Sepsis':
        return <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-blue-950/40 border border-blue-800/40 text-blue-400">Cryptic Sepsis</span>;
      case 'Inflammatory Cascade':
        return <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-red-950/40 border border-red-800/40 text-red-400">Inflammatory Cascade</span>;
      default:
        return <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-gray-800 border border-gray-700 text-gray-400">{cohort}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Panel */}
      <div className="glass-panel rounded-2xl p-5">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="number"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full bg-[#090d16] border border-gray-800 focus:border-emerald-500/50 rounded-xl py-2 pl-9 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-sm transition-all"
              placeholder="Search by Patient ID (e.g. 50)"
            />
          </div>

          <div className="flex flex-wrap gap-4 w-full md:w-auto items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={wardFilter}
                onChange={(e) => { setWardFilter(e.target.value); setPage(1); }}
                className="bg-[#090d16] border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">All Wards</option>
                <option value="ICU">ICU</option>
                <option value="Emergency">Emergency</option>
                <option value="General">General</option>
              </select>
            </div>

            <select
              value={cohortFilter}
              onChange={(e) => { setCohortFilter(e.target.value); setPage(1); }}
              className="bg-[#090d16] border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">All Cohorts</option>
              <option value="non_sepsis">Control (Non-Sepsis)</option>
              <option value="warm_sepsis">Warm Sepsis</option>
              <option value="cryptic_sepsis">Cryptic Sepsis</option>
              <option value="inflammatory_cascade">Inflammatory Cascade</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs transition-all shadow-md shadow-emerald-950/20"
            >
              Search Registry
            </button>
          </div>
        </form>
      </div>

      {/* Patients Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            <span className="text-sm text-gray-400">Accessing clinical registry...</span>
          </div>
        ) : patients.length === 0 ? (
          <div className="py-20 text-center text-gray-500 text-sm flex flex-col items-center justify-center gap-2">
            <AlertCircle className="h-8 w-8 text-gray-600" />
            No patients match current clinical query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Patient ID</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Cohort Phenotype</th>
                  <th className="p-4">Tracker Duration</th>
                  <th className="p-4">Avg Heart Rate</th>
                  <th className="p-4">Max Lactate</th>
                  <th className="p-4">Sepsis Flag</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-sm text-gray-300 font-light">
                {patients.map((p) => (
                  <tr key={p.patient_id} className="hover:bg-gray-900/10 transition-colors">
                    <td className="p-4 pl-6 font-mono font-medium text-white"># {String(p.patient_id).padStart(4, '0')}</td>
                    <td className="p-4">{p.ward}</td>
                    <td className="p-4">{getCohortBadge(p.cohort)}</td>
                    <td className="p-4 font-mono">{p.hours_tracked} hrs</td>
                    <td className="p-4 font-mono">{p.vitals_summary.avg_hr} bpm</td>
                    <td className="p-4 font-mono">{p.vitals_summary.max_lac} mmol/L</td>
                    <td className="p-4">
                      {p.sepsis_flag === 1 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-red-400 font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 pulse-ring-clinical"></span>
                          Septic
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Stable
                        </span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => viewPatient(p.patient_id)}
                        className="p-1.5 rounded-lg bg-gray-900/60 hover:bg-gray-800 border border-gray-800 hover:border-emerald-500/30 text-gray-400 hover:text-emerald-400 transition-all flex items-center gap-1.5 text-xs ml-auto"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Analyze Vitals
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Panel */}
        <div className="p-4 border-t border-gray-800/80 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-gray-900/60 border border-gray-800 disabled:opacity-30 text-gray-400 hover:text-white transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-gray-900/60 border border-gray-800 disabled:opacity-30 text-gray-400 hover:text-white transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Patient Detail Modal */}
      {selectedPatientId !== null && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl glass-panel rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative border border-gray-800 flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-white font-sans">
                    Patient Profile: # {String(selectedPatientId).padStart(4, '0')}
                  </h3>
                  {patientDetail && getCohortBadge(patientDetail.meta.cohort)}
                </div>
                {patientDetail && (
                  <p className="text-xs text-gray-400 mt-1">
                    Enrolled Location: {patientDetail.meta.ward} Ward | Timeline tracking: {patientDetail.timeline.length * 2} hours
                  </p>
                )}
              </div>
              <button
                onClick={closeDetail}
                className="p-2 rounded-xl bg-gray-900/60 hover:bg-gray-800 border border-gray-800 hover:border-red-500/20 text-gray-400 hover:text-red-500 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            {detailLoading ? (
              <div className="py-32 flex flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <span className="text-sm text-gray-400">Loading physiological history...</span>
              </div>
            ) : patientDetail ? (
              <div className="p-6 space-y-6 flex-grow">
                {/* Visual Vitals Grid Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Coordinated Vitals Chart */}
                  <div className="p-4 rounded-xl bg-[#090d16]/60 border border-gray-800 flex flex-col">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                      <Thermometer className="h-4 w-4 text-emerald-500" />
                      Physiological Vitals (Temperature, Heart Rate, BP)
                    </h4>
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={patientDetail.timeline} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="hour" stroke="#6b7280" fontSize={10} unit="h" />
                          <YAxis stroke="#6b7280" fontSize={10} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#090d16', border: '1px solid #1f2937', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '12px' }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                          <Line type="monotone" name="Heart Rate (bpm)" dataKey="heart_rate" stroke="#EC4899" strokeWidth={2} dot={false} />
                          <Line type="monotone" name="Systolic BP (mmHg)" dataKey="bp_systolic" stroke="#3B82F6" strokeWidth={2} dot={false} />
                          <Line type="monotone" name="Temperature (°C)" dataKey="temperature" stroke="#EF4444" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Coordinated Lab Values Chart */}
                  <div className="p-4 rounded-xl bg-[#090d16]/60 border border-gray-800 flex flex-col">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-purple-500" />
                      Biological Biomarkers (Lactate & WBC count)
                    </h4>
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={patientDetail.timeline} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="hour" stroke="#6b7280" fontSize={10} unit="h" />
                          <YAxis stroke="#6b7280" fontSize={10} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#090d16', border: '1px solid #1f2937', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '12px' }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                          <Line type="monotone" name="WBC Count (k/µL)" dataKey="wbc_count" stroke="#F59E0B" strokeWidth={2} dot={false} />
                          <Line type="monotone" name="Lactate (mmol/L)" dataKey="lactate" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Patient Progression Path */}
                <div className="p-5 rounded-xl bg-[#090d16]/60 border border-gray-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
                    Discretized Clinical State Trajectory
                  </h4>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    {patientDetail.state_sequence.map((state, idx) => {
                      const desc = describeToken(state);
                      const isSentinel = state === 'START' || state === 'SEPSIS';
                      return (
                        <React.Fragment key={idx}>
                          {idx > 0 && <span className="text-gray-600 font-mono">→</span>}
                          <div 
                            className={`p-3 rounded-xl border flex flex-col text-left cursor-default transition-all ${
                              state === 'START' 
                                ? 'bg-emerald-950/20 border-emerald-500/30' 
                                : state === 'SEPSIS'
                                ? 'bg-red-950/20 border-red-500/30 pulse-ring-clinical'
                                : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                            }`}
                            title={desc.desc}
                          >
                            <span className={`text-xs font-bold font-mono ${
                              state === 'START' ? 'text-emerald-400' : state === 'SEPSIS' ? 'text-red-400' : 'text-white'
                            }`}>
                              {desc.name}
                            </span>
                            <span className="text-[10px] text-gray-500 mt-1 max-w-[120px] leading-tight">
                              {desc.desc || 'Baseline status'}
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Subsequence Matcher Results */}
                <div className="p-5 rounded-xl bg-[#090d16]/60 border border-gray-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-emerald-500" />
                    Subsequence Path Matching Analysis
                  </h4>
                  {patientDetail.matched_pathways.length === 0 ? (
                    <div className="text-xs text-gray-500 font-light italic">
                      This patient's trajectory does not contain any of the top-5 discovered pathway signatures. They may belong to the Control group.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {patientDetail.matched_pathways.map((path, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-gray-950/40 border border-gray-800 flex items-start gap-3">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <span className="text-xs text-emerald-400 font-bold">#{path.rank}</span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{path.pathway_type} Signature</div>
                            <div className="text-xs text-emerald-500 mt-0.5">Discovered Sensitivity: {(path.score * 100).toFixed(1)}%</div>
                            <p className="text-xs text-gray-400 mt-2 font-light leading-relaxed">{path.clinical}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
