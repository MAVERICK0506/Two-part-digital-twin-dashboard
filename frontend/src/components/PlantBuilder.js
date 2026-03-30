import React, { useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Download, FastForward, Link2, Play, Plus, Trash2 } from 'lucide-react';
import './PlantBuilder.css';

const NODE_TYPES = [
  { type: 'source', label: 'Source' },
  { type: 'machine', label: 'Machine' },
  { type: 'utility', label: 'Utility' },
  { type: 'sink', label: 'End' },
];

const DIST_OPTIONS = [
  { value: 'norm', label: 'Normal' },
  { value: 'weibull', label: 'Weibull' },
  { value: 'expon', label: 'Exponential' },
  { value: 'uniform', label: 'Uniform' },
  { value: 'triang', label: 'Triangular' },
];

function defaultDistribution(nodeType) {
  if (nodeType === 'source' || nodeType === 'sink') {
    return { type: 'norm', params: { p1: 0, p2: 1, p3: 0 } };
  }
  return { type: 'norm', params: { p1: 6, p2: 1.5, p3: 8 } };
}

function typeColor(nodeType) {
  if (nodeType === 'source') return '#1d4ed8';
  if (nodeType === 'machine') return '#059669';
  if (nodeType === 'utility') return '#7c3aed';
  return '#dc2626';
}

function PlantBuilder({ apiUrl, onUseGeneratedCsv }) {
  const canvasRef = useRef(null);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [connectFrom, setConnectFrom] = useState(null);
  const [dragging, setDragging] = useState(null);

  const [jobCount, setJobCount] = useState(1000);
  const [interarrival, setInterarrival] = useState(1.0);
  const [seed, setSeed] = useState('');
  const [fastForward, setFastForward] = useState(true);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const onPaletteDragStart = (event, nodeType) => {
    event.dataTransfer.setData('node/type', nodeType);
  };

  const onCanvasDrop = (event) => {
    event.preventDefault();
    const nodeType = event.dataTransfer.getData('node/type');
    if (!nodeType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const countSameType = nodes.filter((n) => n.type === nodeType).length + 1;

    const nextNode = {
      id,
      type: nodeType,
      name: `${nodeType.toUpperCase()}_${countSameType}`,
      x,
      y,
      capacity: 1,
      distribution: defaultDistribution(nodeType),
    };

    setNodes((prev) => [...prev, nextNode]);
    setSelectedNodeId(id);
  };

  const onCanvasDragOver = (event) => {
    event.preventDefault();
  };

  const beginNodeDrag = (event, nodeId) => {
    event.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setDragging({
      id: nodeId,
      offsetX: event.clientX - rect.left - node.x,
      offsetY: event.clientY - rect.top - node.y,
    });
  };

  const onCanvasMouseMove = (event) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left - dragging.offsetX;
    const y = event.clientY - rect.top - dragging.offsetY;

    setNodes((prev) =>
      prev.map((n) =>
        n.id === dragging.id
          ? {
              ...n,
              x: Math.max(10, Math.min(rect.width - 130, x)),
              y: Math.max(10, Math.min(rect.height - 90, y)),
            }
          : n
      )
    );
  };

  const endNodeDrag = () => {
    setDragging(null);
  };

  const onNodeClick = (event, nodeId) => {
    event.stopPropagation();
    setSelectedNodeId(nodeId);

    if (!connectFrom) {
      setConnectFrom(nodeId);
      return;
    }

    if (connectFrom === nodeId) {
      setConnectFrom(null);
      return;
    }

    const exists = edges.some((e) => e.from === connectFrom && e.to === nodeId);
    if (!exists) {
      setEdges((prev) => [...prev, { from: connectFrom, to: nodeId }]);
    }
    setConnectFrom(null);
  };

  const removeNode = (nodeId) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    if (connectFrom === nodeId) setConnectFrom(null);
  };

  const removeEdge = (index) => {
    setEdges((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSelectedNode = (patch) => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.map((n) => (n.id === selectedNodeId ? { ...n, ...patch } : n)));
  };

  const updateDistribution = (distPatch) => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((n) =>
        n.id === selectedNodeId
          ? {
              ...n,
              distribution: {
                ...n.distribution,
                ...distPatch,
                params: {
                  ...n.distribution.params,
                  ...(distPatch.params || {}),
                },
              },
            }
          : n
      )
    );
  };

  const runSimulation = async () => {
    setError(null);
    setResult(null);

    if (nodes.length === 0) {
      setError('Add at least one node to your plant.');
      return;
    }

    const serviceNodes = nodes.filter((n) => ['machine', 'utility', 'station'].includes(n.type));
    if (serviceNodes.length === 0) {
      setError('Add at least one machine or utility node.');
      return;
    }

    setRunning(true);
    setProgress(0);

    let timer = null;
    if (!fastForward) {
      timer = setInterval(() => {
        setProgress((p) => (p >= 94 ? p : p + Math.max(1, (100 - p) * 0.08)));
      }, 180);
    } else {
      setProgress(35);
    }

    try {
      const payload = {
        plant: {
          nodes,
          edges,
        },
        settings: {
          jobCount,
          interarrival,
          seed: seed === '' ? null : Number(seed),
          fastForward,
        },
      };

      const response = await axios.post(`${apiUrl}/api/manual-simulate`, payload);
      setResult(response.data);
      setProgress(100);

      if (onUseGeneratedCsv && response.data.csv_content) {
        onUseGeneratedCsv(response.data.csv_content);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Simulation failed. Please review your plant setup.');
      setProgress(0);
    } finally {
      if (timer) clearInterval(timer);
      setRunning(false);
    }
  };

  const downloadCsv = () => {
    if (!result?.csv_content) return;
    const blob = new Blob([result.csv_content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'generated_plant_event_log.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="plant-builder">
      <div className="card builder-header">
        <h2>Plant Builder + Synthetic Event Generator</h2>
        <p>
          Drag nodes into the canvas, connect flow paths, configure distributions, and generate a downloadable
          event log CSV ready for your existing inference pipeline.
        </p>
      </div>

      <div className="builder-layout">
        <div className="card side-panel">
          <h3>Palette</h3>
          <div className="palette-items">
            {NODE_TYPES.map((item) => (
              <div
                key={item.type}
                className="palette-item"
                draggable
                onDragStart={(e) => onPaletteDragStart(e, item.type)}
              >
                <span className="dot" style={{ background: typeColor(item.type) }}></span>
                {item.label}
              </div>
            ))}
          </div>

          <h3>Simulation Controls</h3>
          <label>Job Count (1 to 10000)</label>
          <input type="number" min="1" max="10000" value={jobCount} onChange={(e) => setJobCount(Number(e.target.value || 1))} />

          <label>Mean Interarrival Time (seconds)</label>
          <input type="number" min="0.001" step="0.1" value={interarrival} onChange={(e) => setInterarrival(Number(e.target.value || 1))} />

          <label>Random Seed (optional)</label>
          <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="42" />

          <label className="checkbox-line">
            <input type="checkbox" checked={fastForward} onChange={(e) => setFastForward(e.target.checked)} />
            <span><FastForward size={16} /> Fast Forward</span>
          </label>

          <button className="btn btn-primary" disabled={running} onClick={runSimulation}>
            {running ? <><Play size={18} /> Running...</> : <><Play size={18} /> Run Simulation</>}
          </button>

          {running && (
            <div className="progress-wrap">
              <div className="progress-label">{fastForward ? 'Turbo sim in progress...' : 'Animating simulation...'}</div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }}></div></div>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}

          {result?.status === 'success' && (
            <div className="success-box">
              <div><strong>Jobs:</strong> {result.summary.jobs}</div>
              <div><strong>Events:</strong> {result.summary.events}</div>
              <div><strong>Stations:</strong> {result.summary.stations}</div>
              <div><strong>Total Time:</strong> {result.summary.total_time}s</div>
              <button className="btn btn-download" onClick={downloadCsv}>
                <Download size={16} /> Download Event Log CSV
              </button>
            </div>
          )}
        </div>

        <div className="card canvas-card">
          <div className="canvas-toolbar">
            <span><Link2 size={16} /> Connection mode: click node A then node B</span>
            <button className="btn btn-small" onClick={() => { setConnectFrom(null); setSelectedNodeId(null); }}>
              Clear Selection
            </button>
          </div>

          <div
            className="plant-canvas"
            ref={canvasRef}
            onDrop={onCanvasDrop}
            onDragOver={onCanvasDragOver}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={endNodeDrag}
            onMouseLeave={endNodeDrag}
            onClick={() => setConnectFrom(null)}
          >
            <svg className="edge-layer">
              {edges.map((edge, i) => {
                const fromNode = nodes.find((n) => n.id === edge.from);
                const toNode = nodes.find((n) => n.id === edge.to);
                if (!fromNode || !toNode) return null;

                return (
                  <line
                    key={`${edge.from}_${edge.to}_${i}`}
                    x1={fromNode.x + 50}
                    y1={fromNode.y + 25}
                    x2={toNode.x + 50}
                    y2={toNode.y + 25}
                    stroke="#334155"
                    strokeWidth="2"
                    markerEnd="url(#arrow)"
                  />
                );
              })}
              <defs>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L9,3 z" fill="#334155" />
                </marker>
              </defs>
            </svg>

            {nodes.map((node) => (
              <div
                key={node.id}
                className={`plant-node ${selectedNodeId === node.id ? 'selected' : ''} ${connectFrom === node.id ? 'connect-from' : ''}`}
                style={{ left: node.x, top: node.y, borderColor: typeColor(node.type) }}
                onMouseDown={(e) => beginNodeDrag(e, node.id)}
                onClick={(e) => onNodeClick(e, node.id)}
              >
                <button className="node-delete" onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}>
                  <Trash2 size={12} />
                </button>
                <div className="node-title">{node.name}</div>
                <div className="node-type">{node.type}</div>
              </div>
            ))}

            {nodes.length === 0 && (
              <div className="canvas-empty">
                <Plus size={24} /> Drag items from the left panel into this canvas to build your plant.
              </div>
            )}
          </div>

          <div className="edge-list">
            <h4>Connections</h4>
            {edges.length === 0 && <p>No edges yet.</p>}
            {edges.map((edge, idx) => {
              const fromName = nodes.find((n) => n.id === edge.from)?.name || edge.from;
              const toName = nodes.find((n) => n.id === edge.to)?.name || edge.to;
              return (
                <div key={`${edge.from}_${edge.to}_${idx}`} className="edge-item">
                  <span>{fromName} → {toName}</span>
                  <button onClick={() => removeEdge(idx)}>Remove</button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card side-panel">
          <h3>Selected Node</h3>
          {!selectedNode && <p>Select a node to edit properties.</p>}

          {selectedNode && (
            <>
              <label>Name</label>
              <input value={selectedNode.name} onChange={(e) => updateSelectedNode({ name: e.target.value })} />

              <label>Capacity</label>
              <input
                type="number"
                min="1"
                value={selectedNode.capacity}
                onChange={(e) => updateSelectedNode({ capacity: Number(e.target.value || 1) })}
                disabled={selectedNode.type === 'source' || selectedNode.type === 'sink'}
              />

              <label>Distribution Type</label>
              <select
                value={selectedNode.distribution?.type || 'norm'}
                onChange={(e) => updateDistribution({ type: e.target.value })}
                disabled={selectedNode.type === 'source' || selectedNode.type === 'sink'}
              >
                {DIST_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>

              <label>Param 1</label>
              <input
                type="number"
                step="0.1"
                value={selectedNode.distribution?.params?.p1 ?? 0}
                onChange={(e) => updateDistribution({ params: { p1: Number(e.target.value || 0) } })}
                disabled={selectedNode.type === 'source' || selectedNode.type === 'sink'}
              />

              <label>Param 2</label>
              <input
                type="number"
                step="0.1"
                value={selectedNode.distribution?.params?.p2 ?? 0}
                onChange={(e) => updateDistribution({ params: { p2: Number(e.target.value || 0) } })}
                disabled={selectedNode.type === 'source' || selectedNode.type === 'sink'}
              />

              <label>Param 3 (for Triangular max)</label>
              <input
                type="number"
                step="0.1"
                value={selectedNode.distribution?.params?.p3 ?? 0}
                onChange={(e) => updateDistribution({ params: { p3: Number(e.target.value || 0) } })}
                disabled={selectedNode.type === 'source' || selectedNode.type === 'sink'}
              />

              <div className="help-text">
                Normal: p1=mean, p2=std | Weibull: p1=shape, p2=scale | Exponential: p1=mean | Uniform: p1=min, p2=max | Triangular: p1=min, p2=mode, p3=max
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlantBuilder;
