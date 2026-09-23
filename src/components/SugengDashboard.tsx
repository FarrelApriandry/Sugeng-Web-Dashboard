import React, { useState, useEffect } from 'react';
import type { TPSNode, CVRPSolution } from '../data/dummyData';
import { DUMMY_TPS_NODES, INITIAL_CVRP_SOLUTION, POOL_DEPOT, TPSA_BANYUURIP } from '../data/dummyData';
import { InteractiveMap } from './InteractiveMap';
import { 
  Trash2, 
  MapPin, 
  Truck, 
  Activity, 
  Sun, 
  Battery, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Navigation, 
  Search, 
  RefreshCw, 
  Cpu, 
  Thermometer, 
  Droplets, 
  Wind, 
  Radio,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

export const SugengDashboard: React.FC = () => {
  const [nodes, setNodes] = useState<TPSNode[]>(DUMMY_TPS_NODES);
  const [cvrp, setCvrp] = useState<CVRPSolution>(INITIAL_CVRP_SOLUTION);
  const [selectedNode, setSelectedNode] = useState<TPSNode | null>(DUMMY_TPS_NODES[0]);
  const [activeTab, setActiveTab] = useState<'map' | 'dispatch' | 'tps' | 'telemetry'>('map');
  const [showRoute, setShowRoute] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'warning' | 'optimal'>('all');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Live clock WIB
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Jakarta' });
      setCurrentTime(timeStr + ' WIB');
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const criticalNodesCount = nodes.filter(
    (n) => n.currentVolumePercent >= 80 || n.gasStatusMQ135 === 'Tinggi (Bau Busuk)'
  ).length;

  const filteredNodes = nodes.filter((node) => {
    const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'critical') return matchesSearch && (node.currentVolumePercent >= 80 || node.gasStatusMQ135 === 'Tinggi (Bau Busuk)');
    if (statusFilter === 'warning') return matchesSearch && node.currentVolumePercent >= 50 && node.currentVolumePercent < 80;
    if (statusFilter === 'optimal') return matchesSearch && node.currentVolumePercent < 50;
    return matchesSearch;
  });

  const handleSimulateTelemetry = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setNodes((prev) =>
        prev.map((node) => {
          const delta = Math.floor(Math.random() * 5) - 2;
          const newVol = Math.max(15, Math.min(96, node.currentVolumePercent + delta));
          const newDist = Math.max(22, Math.round(node.totalHeightCm - (newVol * (node.totalHeightCm - node.blindZoneCm)) / 100));
          return {
            ...node,
            currentVolumePercent: newVol,
            measuredDistanceCm: newDist,
            lastTelemetry: 'Baru saja',
          };
        })
      );
      setIsSimulating(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#E6EDF3] flex flex-col font-sans selection:bg-[#22C55E] selection:text-[#0B0F14]">
      
      {/* 5. GLOBAL HEADER */}
      <header className="sticky top-0 z-50 bg-[#11161D]/95 backdrop-blur-md border-b border-[#202832] px-4 lg:px-6 py-2.5">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Brand */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div>
              <h1 className="font-mono font-bold text-sm tracking-wide text-[#E6EDF3]">
                MWOC <span className="text-[#667381]">//</span> MAGELANG WASTE OPERATIONS CENTER
              </h1>
              <p className="text-[10px] font-mono text-[#9AA6B2]">
                IoT Telemetry & CVRP Fleet Management
              </p>
            </div>
          </div>

          {/* Center Navigation */}
          <nav className="flex items-center gap-1 bg-[#171D25] p-1 rounded-[6px] border border-[#202832] text-xs font-mono">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1.5 rounded-[4px] transition-colors ${
                activeTab === 'map' ? 'bg-[#202832] text-[#E6EDF3] font-semibold' : 'text-[#9AA6B2] hover:text-[#E6EDF3]'
              }`}
            >
              MAP
            </button>
            <button
              onClick={() => setActiveTab('dispatch')}
              className={`px-3 py-1.5 rounded-[4px] transition-colors ${
                activeTab === 'dispatch' ? 'bg-[#202832] text-[#E6EDF3] font-semibold' : 'text-[#9AA6B2] hover:text-[#E6EDF3]'
              }`}
            >
              DISPATCH
            </button>
            <button
              onClick={() => setActiveTab('tps')}
              className={`px-3 py-1.5 rounded-[4px] transition-colors ${
                activeTab === 'tps' ? 'bg-[#202832] text-[#E6EDF3] font-semibold' : 'text-[#9AA6B2] hover:text-[#E6EDF3]'
              }`}
            >
              TPS STATUS
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-3 py-1.5 rounded-[4px] transition-colors ${
                activeTab === 'telemetry' ? 'bg-[#202832] text-[#E6EDF3] font-semibold' : 'text-[#9AA6B2] hover:text-[#E6EDF3]'
              }`}
            >
              TELEMETRY
            </button>
          </nav>

          {/* Right System Status & Simulation */}
          <div className="flex items-center gap-3">
            <div className="hidden xl:flex items-center gap-3 font-mono text-[11px] bg-[#171D25] px-3 py-1.5 rounded-[6px] border border-[#202832]">
              <span className="flex items-center gap-1.5 text-[#22C55E]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-ping"></span>
                LIVE
              </span>
              <span className="text-[#202832]">|</span>
              <span className="text-[#9AA6B2]">{nodes.length} TPS</span>
              <span className="text-[#202832]">|</span>
              <span className="text-[#9AA6B2]">1 TRUCK</span>
              <span className="text-[#202832]">|</span>
              <span className="text-[#EF4444] font-semibold">{criticalNodesCount} ALERTS</span>
              <span className="text-[#202832]">|</span>
              <span className="text-[#E6EDF3]">{currentTime}</span>
            </div>

            <button
              onClick={handleSimulateTelemetry}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#171D25] hover:bg-[#202832] border border-[#202832] text-xs font-mono text-[#E6EDF3] transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#22C55E] ${isSimulating ? 'animate-spin' : ''}`} />
              <span>SIMULATE TELEMETRY</span>
            </button>
          </div>

        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 lg:p-4">

        {/* ================= TAB 1: MAP & OPERATIONS CENTER ================= */}
        {activeTab === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* LEFT SIDEBAR: TPS ASSET EXPLORER (Col 3) */}
            <div className="lg:col-span-3 bg-[#11161D] border border-[#202832] rounded-[8px] p-3 flex flex-col gap-3 h-[600px] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold tracking-wider text-[#9AA6B2]">TPS ASSETS</span>
                <span className="font-mono text-[10px] bg-[#171D25] px-2 py-0.5 rounded-[999px] text-[#E6EDF3] border border-[#202832]">
                  {filteredNodes.length} units
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#667381]" />
                <input
                  type="text"
                  placeholder="Search TPS or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0B0F14] border border-[#202832] rounded-[6px] pl-8 pr-3 py-1.5 text-xs font-mono text-[#E6EDF3] placeholder-[#667381] focus:outline-none focus:border-[#2A3440]"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
                {(['all', 'critical', 'warning', 'optimal'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`py-1 rounded-[4px] capitalize text-center border transition-all ${
                      statusFilter === f
                        ? 'bg-[#202832] text-[#E6EDF3] border-[#2A3440] font-bold'
                        : 'bg-[#0B0F14] text-[#9AA6B2] border-[#202832] hover:text-[#E6EDF3]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* TPS List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {filteredNodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  const isCritical = node.currentVolumePercent >= 80 || node.gasStatusMQ135 === 'Tinggi (Bau Busuk)';

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-2.5 rounded-[6px] border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#171D25] border-[#2A3440]'
                          : isCritical
                          ? 'bg-[#1a1214] border-red-950 hover:border-red-900'
                          : 'bg-[#0B0F14] border-[#202832] hover:border-[#2A3440]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-[#9AA6B2]">{node.id}</span>
                        <span className={`font-mono text-xs font-bold ${
                          isCritical ? 'text-[#EF4444]' : node.currentVolumePercent >= 50 ? 'text-[#F59E0B]' : 'text-[#22C55E]'
                        }`}>
                          {node.currentVolumePercent}% FULL
                        </span>
                      </div>
                      <p className="font-sans text-xs font-medium text-[#E6EDF3] mt-0.5 truncate">{node.name}</p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#667381] mt-1.5 pt-1.5 border-t border-[#202832]">
                        <span>NH₃: {node.gasPpmMQ135} ppm</span>
                        <span>BAT: {node.batteryVoltage}V</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CENTER GIS MAP (Col 6) */}
            <div className="lg:col-span-6 h-[500px] lg:h-[600px]">
              <InteractiveMap
                nodes={nodes}
                cvrp={cvrp}
                selectedNode={selectedNode}
                onSelectNode={(node) => setSelectedNode(node)}
                showRoute={showRoute}
              />
            </div>

            {/* RIGHT COLUMN: SELECTED TPS PANEL & LIVE ALERTS (Col 3) */}
            <div className="lg:col-span-3 flex flex-col gap-4 h-[600px] overflow-y-auto">
              
              {/* Selected TPS Card */}
              <div className="bg-[#11161D] border border-[#202832] rounded-[8px] p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#202832]">
                  <span className="font-mono text-xs text-[#9AA6B2]">SELECTED ASSET</span>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-[999px] border ${
                    selectedNode && selectedNode.currentVolumePercent >= 80 
                      ? 'bg-red-950/60 text-red-400 border-red-900' 
                      : 'bg-emerald-950/60 text-emerald-400 border-emerald-900'
                  }`}>
                    {selectedNode?.systemStatus || 'Normal'}
                  </span>
                </div>

                {selectedNode ? (
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-sans font-bold text-sm text-[#E6EDF3]">{selectedNode.name}</h3>
                      <p className="font-mono text-[11px] text-[#667381] mt-0.5">{selectedNode.id} • {selectedNode.address}</p>
                    </div>

                    {/* Fill level progress */}
                    <div className="space-y-1 bg-[#0B0F14] p-3 rounded-[6px] border border-[#202832]">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#9AA6B2]">FILL LEVEL</span>
                        <span className="font-bold text-[#E6EDF3]">{selectedNode.currentVolumePercent}%</span>
                      </div>
                      <div className="w-full bg-[#171D25] h-2 rounded-[999px] overflow-hidden border border-[#202832]">
                        <div 
                          className={`h-full rounded-[999px] ${
                            selectedNode.currentVolumePercent >= 80 ? 'bg-[#EF4444]' : selectedNode.currentVolumePercent >= 50 ? 'bg-[#F59E0B]' : 'bg-[#22C55E]'
                          }`}
                          style={{ width: `${selectedNode.currentVolumePercent}%` }}
                        />
                      </div>
                      <p className="text-[10px] font-mono text-[#667381] pt-0.5">Sensor Distance: {selectedNode.measuredDistanceCm} cm</p>
                    </div>

                    {/* Telemetry grid */}
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      <div className="bg-[#0B0F14] p-2.5 rounded-[6px] border border-[#202832]">
                        <span className="text-[10px] text-[#667381] block">NH₃ GAS</span>
                        <span className="font-bold text-[#E6EDF3]">{selectedNode.gasPpmMQ135} ppm</span>
                      </div>
                      <div className="bg-[#0B0F14] p-2.5 rounded-[6px] border border-[#202832]">
                        <span className="text-[10px] text-[#667381] block">BATTERY</span>
                        <span className="font-bold text-[#22C55E]">{selectedNode.batteryVoltage} V</span>
                      </div>
                      <div className="bg-[#0B0F14] p-2.5 rounded-[6px] border border-[#202832]">
                        <span className="text-[10px] text-[#667381] block">TEMPERATURE</span>
                        <span className="font-bold text-[#E6EDF3]">{selectedNode.temperatureCelsius} °C</span>
                      </div>
                      <div className="bg-[#0B0F14] p-2.5 rounded-[6px] border border-[#202832]">
                        <span className="text-[10px] text-[#667381] block">SOLAR PANEL</span>
                        <span className="font-bold text-[#F59E0B]">{selectedNode.solarCurrentMa} mA</span>
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-[#667381] pt-1 flex items-center justify-between">
                      <span>Telemetry: {selectedNode.lastTelemetry}</span>
                      <span className="text-[#22C55E]">● ONLINE</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-[#667381] py-8 text-center">No TPS selected</p>
                )}
              </div>

              {/* Live Alerts Panel */}
              <div className="bg-[#11161D] border border-[#202832] rounded-[8px] p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#202832] pb-2">
                  <span className="font-mono text-xs font-bold text-[#EF4444] flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    LIVE ALERTS
                  </span>
                  <span className="font-mono text-[10px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded border border-red-900">3 Active</span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div className="bg-[#0B0F14] p-2.5 rounded-[6px] border border-[#202832] space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <strong className="text-[#EF4444]">NODE-MGL-01</strong>
                      <span className="text-[#667381]">1 min ago</span>
                    </div>
                    <p className="text-[11px] text-[#9AA6B2]">Fill level reached 92% (Pasar Rejowinangun)</p>
                  </div>

                  <div className="bg-[#0B0F14] p-2.5 rounded-[6px] border border-[#202832] space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <strong className="text-[#EF4444]">NODE-MGL-05</strong>
                      <span className="text-[#667381]">3 min ago</span>
                    </div>
                    <p className="text-[11px] text-[#9AA6B2]">High NH₃ gas detected (71 ppm - UNTIDAR)</p>
                  </div>

                  <div className="bg-[#0B0F14] p-2.5 rounded-[6px] border border-[#202832] space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <strong className="text-[#F59E0B]">NODE-MGL-03</strong>
                      <span className="text-[#667381]">5 min ago</span>
                    </div>
                    <p className="text-[11px] text-[#9AA6B2]">Solar charging current low (65 mA - Mendung)</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ================= TAB 2: DISPATCHER & CVRP ================= */}
        {activeTab === 'dispatch' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left Truck Status Card */}
            <div className="lg:col-span-5 bg-[#11161D] border border-[#202832] rounded-[8px] p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[#202832] pb-2">
                <div>
                  <span className="font-mono text-xs text-[#9AA6B2]">DISPATCHER // FLEET OPS</span>
                  <h3 className="font-sans font-bold text-base text-[#E6EDF3] mt-0.5">{cvrp.truckId}</h3>
                </div>
                <span className="font-mono text-xs bg-emerald-950 text-emerald-400 px-2 py-1 rounded border border-emerald-900">
                  ● ACTIVE ROUTE
                </span>
              </div>

              {/* Capacity Bar */}
              <div className="bg-[#0B0F14] p-3.5 rounded-[6px] border border-[#202832] space-y-2 font-mono">
                <div className="flex justify-between text-xs">
                  <span className="text-[#9AA6B2]">TRUCK CAPACITY</span>
                  <span className="font-bold text-[#E6EDF3]">{cvrp.assignedLoadLiters} / {cvrp.truckCapacityLiters} L</span>
                </div>
                <div className="w-full bg-[#171D25] h-2.5 rounded-[999px] overflow-hidden border border-[#202832]">
                  <div 
                    className="bg-[#3B82F6] h-full rounded-[999px]"
                    style={{ width: `${(cvrp.assignedLoadLiters / cvrp.truckCapacityLiters) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#667381] pt-1">
                  <span>Utilization: 69.7%</span>
                  <span>Driver: {cvrp.truckDriver}</span>
                </div>
              </div>

              {/* CVRP Stats */}
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <div className="bg-[#0B0F14] p-3 rounded-[6px] border border-[#202832] text-center">
                  <span className="text-[10px] text-[#667381] block">TOTAL DISTANCE</span>
                  <span className="text-sm font-bold text-[#E6EDF3]">{cvrp.totalDistanceKm} km</span>
                </div>
                <div className="bg-[#0B0F14] p-3 rounded-[6px] border border-[#202832] text-center">
                  <span className="text-[10px] text-[#667381] block">DISTANCE SAVED</span>
                  <span className="text-sm font-bold text-[#22C55E]">-{cvrp.distanceSavedKm} km</span>
                </div>
                <div className="bg-[#0B0F14] p-3 rounded-[6px] border border-[#202832] text-center">
                  <span className="text-[10px] text-[#667381] block">FUEL SAVED</span>
                  <span className="text-sm font-bold text-[#F59E0B]">{cvrp.fuelSavedLiters} L</span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-[6px] bg-[#3B82F6] hover:bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  <span>KIRIM KE SUPIR (NAVIGASI)</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Right Waypoints Timeline */}
            <div className="lg:col-span-7 bg-[#11161D] border border-[#202832] rounded-[8px] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#202832] pb-2">
                <span className="font-mono text-xs font-bold text-[#9AA6B2]">TURN-BY-TURN WAYPOINTS (CVRP OR-TOOLS)</span>
                <span className="font-mono text-[10px] text-[#22C55E]">Optimal Route Generated</span>
              </div>

              <div className="space-y-2 font-mono text-xs">
                {cvrp.waypoints.map((wp) => (
                  <div
                    key={wp.step}
                    className={`p-3 rounded-[6px] border flex items-center justify-between ${
                      wp.type === 'depot' ? 'bg-blue-950/20 border-blue-900/50' :
                      wp.type === 'landfill' ? 'bg-purple-950/20 border-purple-900/50' :
                      'bg-[#0B0F14] border-[#202832]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-[4px] bg-[#171D25] text-[#E6EDF3] border border-[#202832] flex items-center justify-center text-[11px] font-bold">
                        {wp.step}
                      </span>
                      <div>
                        <p className="font-sans font-bold text-xs text-[#E6EDF3]">{wp.title}</p>
                        <p className="text-[10px] text-[#667381] mt-0.5">
                          {wp.pickupVolumeLiters > 0 ? `+${wp.pickupVolumeLiters} Liter • ` : ''}
                          Est: {wp.estimatedArrival}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-[999px] border ${
                      wp.status === 'Selesai' ? 'bg-emerald-950 text-emerald-400 border-emerald-900' :
                      wp.status === 'Menuju Lokasi' ? 'bg-blue-950 text-blue-400 border-blue-900 animate-pulse' :
                      'bg-[#171D25] text-[#667381] border-[#202832]'
                    }`}>
                      {wp.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ================= TAB 3: TPS STATUS TABLE ================= */}
        {activeTab === 'tps' && (
          <div className="bg-[#11161D] border border-[#202832] rounded-[8px] p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#202832] pb-3">
              <div>
                <span className="font-mono text-xs text-[#9AA6B2]">ASSET INVENTORY</span>
                <h3 className="font-sans font-bold text-base text-[#E6EDF3] mt-0.5">Semua Titik TPS Kota Magelang</h3>
              </div>
              <span className="font-mono text-xs bg-[#171D25] text-[#E6EDF3] px-3 py-1 rounded-[6px] border border-[#202832]">
                Total: {nodes.length} Nodes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#202832] text-[#667381] text-[11px]">
                    <th className="pb-3 font-medium">NODE ID</th>
                    <th className="pb-3 font-medium">NAMA TPS & ALAMAT</th>
                    <th className="pb-3 font-medium">FILL LEVEL</th>
                    <th className="pb-3 font-medium">GAS MQ-135</th>
                    <th className="pb-3 font-medium">METANA MQ-4</th>
                    <th className="pb-3 font-medium">BATT / SOLAR</th>
                    <th className="pb-3 font-medium">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202832]">
                  {nodes.map((n) => {
                    const isCritical = n.currentVolumePercent >= 80 || n.gasStatusMQ135 === 'Tinggi (Bau Busuk)';
                    return (
                      <tr key={n.id} className="hover:bg-[#171D25]/50 transition-colors">
                        <td className="py-3 text-[#9AA6B2]">{n.id}</td>
                        <td className="py-3 font-sans">
                          <p className="font-bold text-[#E6EDF3]">{n.name}</p>
                          <p className="text-[11px] text-[#667381]">{n.address}</p>
                        </td>
                        <td className="py-3">
                          <span className={`font-bold ${isCritical ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                            {n.currentVolumePercent}%
                          </span>
                          <span className="text-[10px] text-[#667381] block">({n.measuredDistanceCm} cm)</span>
                        </td>
                        <td className="py-3 text-[#E6EDF3]">{n.gasPpmMQ135} ppm</td>
                        <td className="py-3 text-[#E6EDF3]">{n.methanePpmMQ4} ppm</td>
                        <td className="py-3 text-[#22C55E]">{n.batteryVoltage}V <span className="text-[#F59E0B]">({n.solarCurrentMa}mA)</span></td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-[999px] text-[10px] border ${
                            isCritical ? 'bg-red-950 text-red-400 border-red-900' : 'bg-emerald-950 text-emerald-400 border-emerald-900'
                          }`}>
                            {n.systemStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 4: TELEMETRY INSPECTION ================= */}
        {activeTab === 'telemetry' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Distance / JSN-SR04T */}
            <div className="bg-[#11161D] border border-[#202832] rounded-[8px] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#202832] pb-2">
                <span className="font-mono text-xs text-[#9AA6B2]">DISTANCE SENSOR</span>
                <span className="font-mono text-[10px] text-blue-400">JSN-SR04T IP67</span>
              </div>
              <div className="font-mono space-y-1">
                <span className="text-[11px] text-[#667381]">Active Measurement</span>
                <p className="text-2xl font-bold text-[#E6EDF3]">{selectedNode?.measuredDistanceCm ?? '--'} <span className="text-sm font-normal text-[#9AA6B2]">cm</span></p>
                <p className="text-[11px] text-[#22C55E]">Blind Zone Verification: PASS (&gt;20cm)</p>
              </div>
            </div>

            {/* Gas / MQ-135 & MQ-4 */}
            <div className="bg-[#11161D] border border-[#202832] rounded-[8px] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#202832] pb-2">
                <span className="font-mono text-xs text-[#9AA6B2]">GAS EMISSION</span>
                <span className="font-mono text-[10px] text-amber-400">MQ-135 / MQ-4</span>
              </div>
              <div className="font-mono space-y-2">
                <div>
                  <span className="text-[11px] text-[#667381]">NH₃ (Amonia / Bau)</span>
                  <p className="text-xl font-bold text-[#F59E0B]">{selectedNode?.gasPpmMQ135 ?? '--'} <span className="text-xs text-[#9AA6B2]">ppm</span></p>
                </div>
                <div>
                  <span className="text-[11px] text-[#667381]">CH₄ (Metana)</span>
                  <p className="text-lg font-bold text-[#E6EDF3]">{selectedNode?.methanePpmMQ4 ?? '--'} <span className="text-xs text-[#9AA6B2]">ppm</span></p>
                </div>
              </div>
            </div>

            {/* Environment / DHT22 */}
            <div className="bg-[#11161D] border border-[#202832] rounded-[8px] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#202832] pb-2">
                <span className="font-mono text-xs text-[#9AA6B2]">ENVIRONMENT</span>
                <span className="font-mono text-[10px] text-emerald-400">DHT22</span>
              </div>
              <div className="font-mono space-y-2">
                <div>
                  <span className="text-[11px] text-[#667381]">Temperature</span>
                  <p className="text-xl font-bold text-[#E6EDF3]">{selectedNode?.temperatureCelsius ?? '--'} <span className="text-xs text-[#9AA6B2]">°C</span></p>
                </div>
                <div>
                  <span className="text-[11px] text-[#667381]">Humidity</span>
                  <p className="text-lg font-bold text-[#E6EDF3]">{selectedNode?.humidityPercent ?? '--'} <span className="text-xs text-[#9AA6B2]">%</span></p>
                </div>
              </div>
            </div>

            {/* Power / CN3065 & 18650 */}
            <div className="bg-[#11161D] border border-[#202832] rounded-[8px] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#202832] pb-2">
                <span className="font-mono text-xs text-[#9AA6B2]">POWER SYSTEM</span>
                <span className="font-mono text-[10px] text-emerald-400">CN3065 / 18650</span>
              </div>
              <div className="font-mono space-y-2">
                <div>
                  <span className="text-[11px] text-[#667381]">Battery Voltage</span>
                  <p className="text-xl font-bold text-[#22C55E]">{selectedNode?.batteryVoltage ?? '--'} <span className="text-xs text-[#9AA6B2]">V ({selectedNode?.batteryPercent}%)</span></p>
                </div>
                <div>
                  <span className="text-[11px] text-[#667381]">Solar Current</span>
                  <p className="text-lg font-bold text-[#F59E0B]">{selectedNode?.solarCurrentMa ?? '--'} <span className="text-xs text-[#9AA6B2]">mA</span></p>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#202832] bg-[#11161D] py-3 px-4 text-center font-mono text-[11px] text-[#667381]">
        MAGELANG WASTE OPERATIONS CENTER (MWOC) — INDUSTRIAL GEOSPATIAL OPERATIONS SYSTEM
      </footer>
    </div>
  );
};
