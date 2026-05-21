import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api';
import { 
  Sliders, Info, HelpCircle, Network, ArrowRight, 
  Activity, ShieldAlert, CheckCircle 
} from 'lucide-react';

export default function GraphTab() {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [minWeight, setMinWeight] = useState(5); // Filter noise, default weight >= 5
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  // Fetch graph data
  useEffect(() => {
    const fetchGraph = async () => {
      setLoading(true);
      try {
        // Fetch graph with weight=1 and filter client-side for smoother sliders
        const data = await apiService.getGraph(1);
        setGraphData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGraph();
  }, []);

  // Calculate coordinates for nodes using a clinical deterioration timeline
  const laidOutGraph = useMemo(() => {
    if (!graphData) return null;

    const { nodes, edges } = graphData;
    
    // Filter edges client-side
    const filteredEdges = edges.filter(e => e.weight >= minWeight);
    
    // Find connected nodes
    const activeNodeIds = new Set();
    filteredEdges.forEach(e => {
      activeNodeIds.add(e.source);
      activeNodeIds.add(e.target);
    });
    
    // Include the start and sepsis nodes always
    activeNodeIds.add('START');
    activeNodeIds.add('SEPSIS');

    const activeNodes = nodes.filter(n => activeNodeIds.has(n.id));

    // Calculate severity score (0 to 10) for clinical states
    const getSeverity = (node) => {
      if (node.id === 'START') return 0;
      if (node.id === 'SEPSIS') return 10;
      
      const bins = node.details.bins;
      if (!bins) return 5;
      
      // Map bins to numeric scores (0, 1, or 2)
      const parseBin = (val) => {
        if (!val || val.includes('?')) return 0;
        return parseInt(val.charAt(1)) || 0;
      };
      
      const t = parseBin(bins.temp);
      const h = parseBin(bins.hr);
      const b = parseBin(bins.bp);
      const w = parseBin(bins.wbc);
      const l = parseBin(bins.lac);
      
      return t + h + b + w + l;
    };

    // Group active nodes by severity to distribute them
    const groups = {};
    activeNodes.forEach(node => {
      const sev = getSeverity(node);
      if (!groups[sev]) groups[sev] = [];
      groups[sev].push(node);
    });

    const coords = {};
    const svgWidth = 1000;
    const svgHeight = 550;

    // Place nodes on a grid
    Object.keys(groups).forEach(sevStr => {
      const sev = parseInt(sevStr);
      const groupNodes = groups[sev];
      
      // Calculate X coordinate based on severity (timeline left to right)
      // START is far left, SEPSIS far right, others spaced out in between
      let x;
      if (sev === 0) x = 50;
      else if (sev === 10) x = 950;
      else x = 120 + (sev / 9) * 760; // Spread severity 1-9 in middle

      // Sort nodes inside group to maintain neatness
      groupNodes.sort((a, b) => a.id.localeCompare(b.id));

      // Calculate Y coordinate (staggered vertically)
      const nInGroup = groupNodes.length;
      groupNodes.forEach((node, idx) => {
        let y;
        if (nInGroup === 1) {
          y = svgHeight / 2;
        } else {
          // Distribute evenly between top and bottom padding
          const padding = 60;
          y = padding + (idx / (nInGroup - 1)) * (svgHeight - padding * 2);
        }
        
        coords[node.id] = { x, y, severity: sev, node };
      });
    });

    return {
      nodes: activeNodes,
      edges: filteredEdges,
      coords,
      svgWidth,
      svgHeight
    };
  }, [graphData, minWeight]);

  const getNodeColor = (severity, isSentinel, id) => {
    if (id === 'START') return '#10B981'; // Green
    if (id === 'SEPSIS') return '#EF4444'; // Red
    
    // Scale color between green-orange-red based on severity (0-10)
    if (severity <= 2) return '#10B981'; // green
    if (severity <= 4) return '#84CC16'; // lime
    if (severity <= 6) return '#F59E0B'; // orange
    if (severity <= 8) return '#F97316'; // dark orange
    return '#EF4444'; // red
  };

  const getClinicalDescription = (bins) => {
    if (!bins) return '';
    const t_desc = { "T0": "Normal Temp", "T1": "Mild Fever", "T2": "Severe Fever", "T?": "Temp Unmeasured" }[bins.temp];
    const h_desc = { "H0": "Normal HR", "H1": "Mild Tachy", "H2": "Severe Tachy", "H?": "HR Unmeasured" }[bins.hr];
    const b_desc = { "B0": "Normal BP", "B1": "Mild Hypo", "B2": "Severe Hypo", "B?": "BP Unmeasured" }[bins.bp];
    const w_desc = { "W0": "Normal WBC", "W1": "Mild WBC", "W2": "Severe WBC", "W?": "WBC Unmeasured" }[bins.wbc];
    const l_desc = { "L0": "Normal Lac", "L1": "Mild Lac", "L2": "Severe Lac", "L?": "Lac Unmeasured" }[bins.lac];
    return [t_desc, h_desc, b_desc, w_desc, l_desc].join(' | ');
  };

  // Node highlight logic
  const isNodeHighlighted = (nodeId) => {
    if (!hoveredNode) return true;
    if (hoveredNode === nodeId) return true;
    
    // Highlight if connected to hovered node
    return laidOutGraph?.edges.some(e => 
      (e.source === hoveredNode && e.target === nodeId) ||
      (e.target === hoveredNode && e.source === nodeId)
    );
  };

  const isEdgeHighlighted = (edge) => {
    if (!hoveredNode) return true;
    return edge.source === hoveredNode || edge.target === hoveredNode;
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Network className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Clinical Deterioration Highway</h2>
            <p className="text-xs text-gray-400">Map of state transitions representing progressive organ failure</p>
          </div>
        </div>

        {/* Filter Slider */}
        <div className="flex items-center gap-4 w-full md:w-80 justify-end">
          <Sliders className="h-4 w-4 text-gray-500 shrink-0" />
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Filter transitions (weight $\ge$ {minWeight}):</span>
          <input
            type="range"
            min="1"
            max="30"
            value={minWeight}
            onChange={(e) => {
              setMinWeight(parseInt(e.target.value));
              setSelectedNode(null);
            }}
            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Network Diagram View */}
        <div className="xl:col-span-3 glass-panel rounded-2xl p-4 overflow-hidden flex flex-col items-center justify-center relative min-h-[580px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <span className="text-sm text-gray-400">Constructing clinical state network...</span>
            </div>
          ) : laidOutGraph ? (
            <>
              {/* Overlay legend */}
              <div className="absolute top-4 left-4 p-3 rounded-xl bg-gray-950/80 border border-gray-800/60 flex flex-col gap-2 z-10">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">State Severity Indicator</span>
                <div className="flex items-center gap-4 text-[10px] text-gray-400">
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Admission (0)</div>
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500"></span> Medium (3-6)</div>
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500"></span> Sepsis Onset (10)</div>
                </div>
              </div>

              {/* SVG Network Canvas */}
              <svg 
                viewBox={`0 0 ${laidOutGraph.svgWidth} ${laidOutGraph.svgHeight}`}
                className="w-full h-auto select-none overflow-visible"
              >
                {/* Arrow Marker Definitions */}
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="20"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#1f2937" />
                  </marker>
                  <marker
                    id="arrow-active"
                    viewBox="0 0 10 10"
                    refX="22"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#10B981" />
                  </marker>
                </defs>

                {/* Draw Edges */}
                {laidOutGraph.edges.map((edge, idx) => {
                  const srcCoord = laidOutGraph.coords[edge.source];
                  const dstCoord = laidOutGraph.coords[edge.target];
                  if (!srcCoord || !dstCoord) return null;

                  const isHigh = isEdgeHighlighted(edge);
                  const isHovered = hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode);
                  
                  // Calculate bezier curve offset to separate overlapping lines slightly
                  const dx = dstCoord.x - srcCoord.x;
                  const dy = dstCoord.y - srcCoord.y;
                  const dr = Math.sqrt(dx * dx + dy * dy);
                  const qx = srcCoord.x + dx / 2 - dy / 6;
                  const qy = srcCoord.y + dy / 2 + dx / 6;
                  
                  // Set path
                  const d = `M ${srcCoord.x} ${srcCoord.y} Q ${qx} ${qy} ${dstCoord.x} ${dstCoord.y}`;
                  
                  return (
                    <path
                      key={idx}
                      d={d}
                      fill="none"
                      stroke={isHovered ? '#10B981' : '#1f2937'}
                      strokeWidth={isHovered ? 2.5 : Math.min(6, Math.max(1, edge.weight / 6))}
                      strokeOpacity={isHigh ? (isHovered ? 0.9 : 0.4) : 0.05}
                      markerEnd={isHovered ? "url(#arrow-active)" : "url(#arrow)"}
                      className="transition-all duration-200"
                    />
                  );
                })}

                {/* Draw Nodes */}
                {laidOutGraph.nodes.map((n) => {
                  const coord = laidOutGraph.coords[n.id];
                  if (!coord) return null;

                  const isSelected = selectedNode && selectedNode.id === n.id;
                  const isHigh = isNodeHighlighted(n.id);
                  const isHovered = hoveredNode === n.id;
                  
                  const radius = n.id === 'START' || n.id === 'SEPSIS' ? 14 : 10;
                  const color = getNodeColor(coord.severity, n.id === 'START' || n.id === 'SEPSIS', n.id);

                  return (
                    <g 
                      key={n.id}
                      transform={`translate(${coord.x}, ${coord.y})`}
                      className="cursor-pointer"
                      onClick={() => setSelectedNode(coord.node)}
                      onMouseEnter={() => setHoveredNode(n.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      {/* Outer pulse ring for Sepsis or hovered nodes */}
                      {(n.id === 'SEPSIS' || isHovered || isSelected) && (
                        <circle
                          r={radius + 6}
                          fill="none"
                          stroke={color}
                          strokeWidth={1.5}
                          className="opacity-70 pulse-ring-clinical"
                        />
                      )}
                      
                      {/* Main Node Circle */}
                      <circle
                        r={radius}
                        fill={color}
                        stroke="#030712"
                        strokeWidth={2}
                        opacity={isHigh ? 1 : 0.15}
                        className="transition-all duration-200"
                      />

                      {/* Sentinel Node Labels Inside */}
                      {n.id === 'START' && (
                        <text dy="3.5" textAnchor="middle" fill="#000" fontSize="8" fontWeight="bold">IN</text>
                      )}
                      {n.id === 'SEPSIS' && (
                        <text dy="3.5" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">SEPS</text>
                      )}

                      {/* Small hover text */}
                      {isHovered && n.id !== 'START' && n.id !== 'SEPSIS' && (
                        <text
                          y="-18"
                          textAnchor="middle"
                          fill="#fff"
                          fontSize="9"
                          fontWeight="bold"
                          className="bg-black p-1 pointer-events-none"
                        >
                          {n.id}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </>
          ) : null}
        </div>

        {/* Selected Node Details Sidebar */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between min-h-[580px]">
          {selectedNode ? (
            <div className="space-y-6">
              <div className="border-b border-gray-800 pb-4">
                <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1">
                  Active Node Metrics
                </div>
                <h3 className="text-xl font-bold text-white font-mono">{selectedNode.id}</h3>
              </div>

              {selectedNode.details.type === 'clinical_state' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80">
                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Physiological Bins</div>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Temperature (T):</span>
                        <span className="text-white font-bold">{selectedNode.details.bins.temp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Heart Rate (H):</span>
                        <span className="text-white font-bold">{selectedNode.details.bins.hr}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">BP Systolic (B):</span>
                        <span className="text-white font-bold">{selectedNode.details.bins.bp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">WBC Count (W):</span>
                        <span className="text-white font-bold">{selectedNode.details.bins.wbc}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Lactate (L):</span>
                        <span className="text-white font-bold">{selectedNode.details.bins.lac}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80">
                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Diagnostic Summary</div>
                    <p className="text-xs text-gray-300 font-light leading-relaxed">
                      {getClinicalDescription(selectedNode.details.bins)}
                    </p>
                  </div>
                </div>
              )}

              {selectedNode.id === 'START' && (
                <p className="text-xs text-gray-400 font-light leading-relaxed">
                  Sentinel root node matching patient admission. Every sequence starts here.
                </p>
              )}
              {selectedNode.id === 'SEPSIS' && (
                <p className="text-xs text-gray-400 font-light leading-relaxed">
                  Sentinel target node representing clinically diagnosed sepsis progression. All discovered pathways culminate here.
                </p>
              )}
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
              <Info className="h-8 w-8 text-gray-600 mb-3" />
              <h3 className="text-sm font-semibold text-gray-300">No Node Selected</h3>
              <p className="text-xs text-gray-500 mt-2 font-light max-w-[200px]">
                Hover nodes in the deteriorate highway to view connection highlighting. Click nodes to inspect clinical features.
              </p>
            </div>
          )}

          <div className="border-t border-gray-800/60 pt-4 mt-auto">
            <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Graph Analytics</h4>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 font-mono">
              <div className="p-2 bg-gray-900/40 border border-gray-800/40 rounded-lg">
                <div>Active Nodes</div>
                <div className="text-white font-bold mt-0.5">{laidOutGraph ? laidOutGraph.nodes.length : 0}</div>
              </div>
              <div className="p-2 bg-gray-900/40 border border-gray-800/40 rounded-lg">
                <div>Active Edges</div>
                <div className="text-white font-bold mt-0.5">{laidOutGraph ? laidOutGraph.edges.length : 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
