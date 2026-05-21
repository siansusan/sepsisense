import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, FileSpreadsheet, CheckCircle2, Loader2, AlertTriangle, 
  Search, Filter, RefreshCw, ArrowUpRight, Database, Info
} from 'lucide-react';

export default function IngestionTab() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, processing, completed
  const [searchId, setSearchId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const fileInputRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Mock patient summary data matching mockup precisely
  const initialPatients = [
    { id: '22-05124', age: 67, gender: 'M', hr: 108, map: 62, lactate: '4.2 ↑', lactateValue: 4.2, missing: '28%', status: 'SEVERE' },
    { id: '22-05125', age: 54, gender: 'F', hr: 92, map: 74, lactate: '1.8', lactateValue: 1.8, missing: '31%', status: 'MODERATE' },
    { id: '22-05126', age: 71, gender: 'M', hr: 86, map: 78, lactate: '1.2', lactateValue: 1.2, missing: '22%', status: 'MILD' },
    { id: '22-05127', age: 45, gender: 'F', hr: 96, map: 72, lactate: '0.9', lactateValue: 0.9, missing: '35%', status: 'LOW' },
    { id: '22-05128', age: 58, gender: 'M', hr: 101, map: 68, lactate: '2.1', lactateValue: 2.1, missing: '29%', status: 'MODERATE' },
    { id: '22-05129', age: 63, gender: 'F', hr: 88, map: 80, lactate: '1.0', lactateValue: 1.0, missing: '18%', status: 'LOW' },
    { id: '22-05130', age: 72, gender: 'M', hr: 115, map: 59, lactate: '5.6 ↑', lactateValue: 5.6, missing: '15%', status: 'SEVERE' },
    { id: '22-05131', age: 50, gender: 'F', hr: 94, map: 71, lactate: '1.5', lactateValue: 1.5, missing: '24%', status: 'MILD' }
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      startIngestion(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      startIngestion(e.target.files[0]);
    }
  };

  const startIngestion = (selectedFile) => {
    setFile(selectedFile);
    setStatus('processing');
    setProgress(0);

    // Clean up previous interval if any
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Simulate pipeline ingestion progress
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressIntervalRef.current);
          setStatus('completed');
          return 100;
        }
        // Increment progress incrementally
        return prev + 1;
      });
    }, 35); // Takes approx 3.5 seconds to complete
  };

  const selectSampleFile = (fileName) => {
    const mockFile = { name: fileName, size: 48512 };
    startIngestion(mockFile);
  };

  const resetIngestion = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    setFile(null);
    setProgress(0);
    setStatus('idle');
    setSearchId('');
    setStatusFilter('ALL');
  };

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const getStatusBadge = (statusName) => {
    switch (statusName) {
      case 'SEVERE':
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold tracking-wider rounded-lg bg-red-950/60 border border-red-800/80 text-red-400 w-24 shadow-sm shadow-red-950/20">
            SEVERE
          </span>
        );
      case 'MODERATE':
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold tracking-wider rounded-lg bg-amber-900/40 border border-amber-700/60 text-amber-300 w-24">
            MODERATE
          </span>
        );
      case 'MILD':
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold tracking-wider rounded-lg bg-orange-950/40 border border-orange-800/40 text-orange-400 w-24">
            MILD
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold tracking-wider rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 w-24">
            LOW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold tracking-wider rounded-lg bg-gray-800 text-gray-400 w-24">
            {statusName}
          </span>
        );
    }
  };

  // Filter patient listings based on filters
  const filteredPatients = initialPatients.filter((p) => {
    const matchesSearch = p.id.toLowerCase().includes(searchId.trim().toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Dynamic Dashboard Section Title Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/30 to-slate-950/30 border border-blue-900/20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">SepsisSense | Data Ingestion & Patient Summary</h2>
            <p className="text-xs text-gray-400 font-light mt-0.5">Import EHR datasets to extract structured clinical features and run stability analysis.</p>
          </div>
        </div>
        
        {status === 'completed' && (
          <button
            onClick={resetIngestion}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-500/30 hover:bg-gray-800 text-xs text-gray-400 hover:text-blue-400 transition-all font-medium"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Clear & Import New
          </button>
        )}
      </div>

      {/* 1. Drag & Drop File Container (Idle State) */}
      {status === 'idle' && (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative py-12 px-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
            dragActive 
              ? 'border-blue-500 bg-blue-950/15 shadow-lg shadow-blue-950/10' 
              : 'border-gray-800/80 bg-gray-950/20 hover:border-blue-500/40 hover:bg-blue-950/5'
          }`}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".csv" 
            onChange={handleFileChange} 
            className="hidden" 
          />
          
          <div className="h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 group-hover:border-blue-500/40 transition-all duration-300">
            <UploadCloud className="h-8 w-8" />
          </div>

          <h3 className="text-base font-semibold text-white tracking-tight">
            Drag & Drop EHR CSV Files Here
          </h3>
          <p className="text-xs text-gray-500 font-light mt-1 max-w-sm leading-relaxed">
            Drag clinical batch files directly, or select a file using the local browser system.
          </p>

          <button 
            type="button"
            className="mt-5 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-blue-950/30"
          >
            Browse Files
          </button>

          <div className="mt-8 flex flex-col gap-2 items-center">
            <span className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">Accepted formats & schemas</span>
            <div className="flex gap-4 text-xs font-light text-gray-400">
              <span className="px-2 py-0.5 rounded bg-gray-900 border border-gray-800">MIMIC-III CSV</span>
              <span className="px-2 py-0.5 rounded bg-gray-900 border border-gray-800">PhysioNet 2019 CSV</span>
              <span className="px-2 py-0.5 rounded bg-gray-900 border border-gray-800">Custom Schema</span>
            </div>
          </div>

          {/* Quick simulation helper files */}
          <div className="absolute top-4 right-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-[10px] text-gray-500">Quick Test Files:</span>
            <button
              onClick={() => selectSampleFile('patient_batch_12May.csv')}
              className="text-[10px] px-2 py-1 rounded bg-[#0b1322] border border-blue-900/30 hover:border-blue-500/40 text-blue-400 font-medium transition-colors"
            >
              patient_batch_12May.csv
            </button>
            <button
              onClick={() => selectSampleFile('physionet_cohort_sepsis.csv')}
              className="text-[10px] px-2 py-1 rounded bg-[#0b1322] border border-blue-900/30 hover:border-blue-500/40 text-blue-400 font-medium transition-colors"
            >
              physionet_cohort_sepsis.csv
            </button>
          </div>
        </div>
      )}

      {/* 2. Processing Pipeline State */}
      {status === 'processing' && (
        <div className="glass-panel rounded-2xl p-6 border border-gray-800/80 shadow-lg relative overflow-hidden">
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="h-5 w-5 text-blue-400" />
              <div>
                <h4 className="text-sm font-bold text-white">Processing: {file?.name || 'ehr_clinical_batch.csv'}</h4>
                <p className="text-[10px] text-gray-500 font-light mt-0.5">Running clinical ingestion pipeline algorithms...</p>
              </div>
            </div>
            <span className="text-base font-extrabold text-blue-400 font-mono">{progress}%</span>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full h-3.5 bg-gray-950 rounded-full border border-gray-800 overflow-hidden mb-6 relative">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-100 rounded-full shadow-inner"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Clinical Steps Checklist Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-900">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
              {progress >= 25 ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              ) : (
                <Loader2 className="h-4.5 w-4.5 text-blue-400 animate-spin shrink-0" />
              )}
              <span className={`text-xs font-medium ${progress >= 25 ? 'text-gray-300' : 'text-gray-500'}`}>
                Schema Validated
              </span>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-2">
              {progress >= 50 ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              ) : progress >= 25 ? (
                <Loader2 className="h-4.5 w-4.5 text-blue-400 animate-spin shrink-0" />
              ) : (
                <div className="h-4.5 w-4.5 rounded-full border border-gray-800 shrink-0" />
              )}
              <span className={`text-xs font-medium ${progress >= 50 ? 'text-gray-300' : 'text-gray-500'}`}>
                Missing Values Imputed
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-2">
              {progress >= 75 ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              ) : progress >= 50 ? (
                <Loader2 className="h-4.5 w-4.5 text-blue-400 animate-spin shrink-0" />
              ) : (
                <div className="h-4.5 w-4.5 rounded-full border border-gray-800 shrink-0" />
              )}
              <span className={`text-xs font-medium ${progress >= 75 ? 'text-gray-300' : 'text-gray-500'}`}>
                Normalization Applied
              </span>
            </div>

            {/* Step 4 */}
            <div className="flex items-center gap-2">
              {progress >= 100 ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              ) : progress >= 75 ? (
                <div className="flex items-center gap-1 text-amber-500">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span className="text-[10px] font-bold">Windowing...</span>
                </div>
              ) : (
                <div className="h-4.5 w-4.5 rounded-full border border-gray-800 shrink-0" />
              )}
              {progress < 75 && (
                <span className="text-xs font-medium text-gray-500">
                  Windowing...
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Completed State: pipeline checklists all green! */}
      {status === 'completed' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Active Pipeline Checkmarks Panel */}
          <div className="glass-panel rounded-2xl p-5 border border-emerald-950/20 bg-emerald-950/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Ingestion Complete: {file?.name || 'patient_batch_12May.csv'}</h4>
                <p className="text-[10px] text-gray-400 font-light mt-0.5">Clinical cohort records have been fully normalized and integrated.</p>
              </div>
            </div>

            {/* Checkmarks Strip */}
            <div className="flex flex-wrap gap-4 text-xs font-medium text-emerald-400">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Schema Validated</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Missing Values Imputed</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Normalization Applied</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Windowing Complete</span>
            </div>
          </div>

          {/* Pale Green Data Metrics Bar */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30 flex flex-wrap gap-x-8 gap-y-3 text-xs text-emerald-300 font-medium justify-between shadow-inner">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-500">Patients loaded:</span>
              <span className="text-white font-mono font-semibold">248</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-500">Variables:</span>
              <span className="text-white font-mono font-semibold">40</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-500">Missing rate (avg):</span>
              <span className="text-white font-mono font-semibold">34.2%</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-emerald-500">Imputed (LOCF):</span>
              <span className="text-white font-mono font-semibold">28.1%</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-emerald-500">Imputed (median):</span>
              <span className="text-white font-mono font-semibold">6.1%</span>
            </div>

            <div className="flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Schema warnings:</span>
              <span className="text-white font-mono font-semibold">2</span>
            </div>
          </div>

          {/* Search, Filter and Patient Table Panel */}
          <div className="glass-panel rounded-2xl overflow-hidden shadow-lg border border-gray-800/80">
            
            {/* Table Control Header */}
            <div className="p-5 border-b border-gray-800 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-950/30">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                <FileSpreadsheet className="h-4.5 w-4.5 text-blue-400" />
                Patient Summary Table
              </h3>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                {/* Search Admission ID */}
                <div className="relative w-full sm:w-60">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    className="w-full bg-[#090d16] border border-gray-800 focus:border-blue-500/50 rounded-xl py-1.5 pl-9 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20 text-xs transition-all"
                    placeholder="Search Admission ID (e.g. 22-0512)"
                  />
                </div>

                {/* Filter Status */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <Filter className="h-3.5 w-3.5 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#090d16] border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500/50 w-full sm:w-auto"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="SEVERE">SEVERE</option>
                    <option value="MODERATE">MODERATE</option>
                    <option value="MILD">MILD</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Ingestion Table Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800/80 bg-gray-900/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">Admission ID</th>
                    <th className="p-4 text-center">Age</th>
                    <th className="p-4 text-center">Gender</th>
                    <th className="p-4 text-center">HR (mean)</th>
                    <th className="p-4 text-center">MAP (mean)</th>
                    <th className="p-4 text-center text-blue-300">Lactate (last)</th>
                    <th className="p-4 text-center">Missing %</th>
                    <th className="p-4 pr-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40 text-sm text-gray-300 font-light">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-gray-500 text-xs italic">
                        No active EHR rows match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-900/10 transition-colors">
                        <td className="p-4 pl-6 font-mono font-semibold text-white tracking-wide">
                          {p.id}
                        </td>
                        <td className="p-4 text-center font-mono">{p.age}</td>
                        <td className="p-4 text-center font-bold text-gray-400">{p.gender}</td>
                        <td className="p-4 text-center font-mono">{p.hr}</td>
                        <td className="p-4 text-center font-mono">{p.map}</td>
                        <td className="p-4 text-center font-mono font-semibold">
                          {p.lactate.includes('↑') ? (
                            <span className="text-red-500 font-extrabold flex items-center justify-center gap-1">
                              {p.lactate}
                            </span>
                          ) : (
                            <span className="text-gray-300">{p.lactate}</span>
                          )}
                        </td>
                        <td className="p-4 text-center font-mono text-gray-400">{p.missing}</td>
                        <td className="p-4 pr-6 text-center">{getStatusBadge(p.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Stats strip */}
            <div className="p-4 border-t border-gray-800/80 bg-gray-950/20 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-gray-600" />
                Showing {filteredPatients.length} of {initialPatients.length} tracked cohort profiles.
              </span>
              
              <span className="mt-2 sm:mt-0 font-light">
                Pipeline execution completed in <span className="font-mono text-emerald-400 font-medium">3.50 seconds</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
