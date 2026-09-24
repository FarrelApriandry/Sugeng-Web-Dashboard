import React, { useState, useEffect } from 'react';
import type { TPSNode, CVRPSolution } from '../data/dummyData';
import { DUMMY_TPS_NODES, INITIAL_CVRP_SOLUTION } from '../data/dummyData';
import { InteractiveMap } from './InteractiveMap';
import {
  MapPin,
  Truck,
  Search,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Sun,
  Moon,
  ClipboardList,
  Activity,
  ChevronRight,
  Send,
  Eye,
} from 'lucide-react';

type TabId = 'map' | 'dispatch' | 'tps' | 'telemetry';
type Theme = 'light' | 'dark';
type StatusLevel = 'critical' | 'warning' | 'optimal';

/* ---------- Helper status & interpretasi bahasa awam (P1) ---------- */

function getStatus(node: TPSNode): { level: StatusLevel; label: string; action: string } {
  const isCritical =
    node.currentVolumePercent >= 80 || node.gasStatusMQ135 === 'Tinggi (Bau Busuk)';
  if (isCritical) return { level: 'critical', label: 'Penuh — Segera Angkut', action: 'Prioritas pengangkutan' };
  if (node.currentVolumePercent >= 50)
    return { level: 'warning', label: 'Hampir Penuh — Pantau', action: 'Jadwalkan pengangkutan' };
  return { level: 'optimal', label: 'Aman', action: 'Kondisi normal' };
}

function interpretGas(ppm: number): string {
  if (ppm >= 60) return 'Bau menyengat — segera angkut';
  if (ppm >= 30) return 'Mulai berbau — perlu perhatian';
  return 'Tidak berbau — aman';
}

function interpretMethane(ppm: number): string {
  if (ppm >= 250) return 'Tinggi — jauhkan dari api';
  if (ppm >= 100) return 'Naik — pantau berkala';
  return 'Aman';
}

function interpretBattery(volt: number): string {
  if (volt >= 3.9) return 'Baterai penuh — normal';
  if (volt >= 3.6) return 'Baterai cukup — normal';
  return 'Baterai lemah — periksa panel surya';
}

function statusStyle(level: StatusLevel, theme: Theme): React.CSSProperties {
  if (level === 'critical')
    return theme === 'light'
      ? { backgroundColor: '#fee2e2', color: '#b91c1c', border: '2px solid #b91c1c' }
      : { backgroundColor: 'rgba(239,68,68,.15)', color: '#f87171', border: '2px solid #f87171' };
  if (level === 'warning')
    return theme === 'light'
      ? { backgroundColor: '#fef3c7', color: '#92400e', border: '2px solid #92400e' }
      : { backgroundColor: 'rgba(245,158,11,.15)', color: '#fbbf24', border: '2px solid #fbbf24' };
  return theme === 'light'
    ? { backgroundColor: '#dcfce7', color: '#166534', border: '2px solid #166534' }
    : { backgroundColor: 'rgba(34,197,94,.15)', color: '#4ade80', border: '2px solid #4ade80' };
}

const FILTER_LABEL: Record<'all' | StatusLevel, string> = {
  all: 'Semua',
  critical: 'Penuh ≥ 80%',
  warning: 'Hampir penuh',
  optimal: 'Aman',
};

export const SugengDashboard: React.FC = () => {
  const [nodes, setNodes] = useState<TPSNode[]>(DUMMY_TPS_NODES);
  const [cvrp] = useState<CVRPSolution>(INITIAL_CVRP_SOLUTION);
  const [selectedNode, setSelectedNode] = useState<TPSNode | null>(DUMMY_TPS_NODES[0]);
  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [showRoute, setShowRoute] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | StatusLevel>('all');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [theme, setTheme] = useState<Theme>('light'); // P0: terang sebagai default
  const [dispatchSent, setDispatchSent] = useState<boolean>(false);

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

  const criticalNodes = nodes.filter((n) => getStatus(n).level === 'critical');
  const warningNodes = nodes.filter((n) => getStatus(n).level === 'warning');

  const filteredNodes = nodes.filter((node) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      node.name.toLowerCase().includes(q) ||
      node.address.toLowerCase().includes(q) ||
      node.id.toLowerCase().includes(q);
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && getStatus(node).level === statusFilter;
  });

  const handleSimulateTelemetry = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setNodes((prev) =>
        prev.map((node) => {
          const delta = Math.floor(Math.random() * 5) - 2;
          const newVol = Math.max(15, Math.min(96, node.currentVolumePercent + delta));
          const newDist = Math.max(
            22,
            Math.round(node.totalHeightCm - (newVol * (node.totalHeightCm - node.blindZoneCm)) / 100)
          );
          return { ...node, currentVolumePercent: newVol, measuredDistanceCm: newDist, lastTelemetry: 'Baru saja' };
        })
      );
      setIsSimulating(false);
    }, 500);
  };

  const handleSendDispatch = () => {
    setDispatchSent(true);
    setTimeout(() => setDispatchSent(false), 4000);
  };

  const utilization = Math.round((cvrp.assignedLoadLiters / cvrp.truckCapacityLiters) * 100);

  const tabDefs: { id: TabId; step: string; label: string; icon: React.ReactNode }[] = [
    { id: 'map', step: '1', label: 'Prioritas & Peta', icon: <MapPin className="w-5 h-5" /> },
    { id: 'dispatch', step: '2', label: 'Kirim Armada', icon: <Truck className="w-5 h-5" /> },
    { id: 'tps', step: '3', label: 'Daftar TPS', icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'telemetry', step: '4', label: 'Data Sensor', icon: <Activity className="w-5 h-5" /> },
  ];

  return (
    <div
      className={theme === 'light' ? 'theme-light' : 'theme-dark'}
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}
    >
      <div className="flex flex-col min-h-screen font-sans">
        {/* ===== HEADER (P0: Bahasa Indonesia, tombol ≥44px) ===== */}
        <header
          className="sticky top-0 z-50 border-b px-4 lg:px-6 py-3"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <div className="max-w-[1600px] mx-auto flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-bold text-lg leading-snug">
                  SUGENG <span style={{ color: 'var(--text-muted)' }}>•</span> Pusat Operasi Sampah Magelang
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Pantau TPS & kirim armada — Dinas Lingkungan Hidup Kota Magelang
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  aria-label={theme === 'light' ? 'Ganti ke mode gelap' : 'Ganti ke mode terang'}
                  className="flex items-center gap-2 px-4 min-h-[44px] rounded-lg text-sm font-semibold border transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  <span>{theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}</span>
                </button>
                <button
                  onClick={handleSimulateTelemetry}
                  disabled={isSimulating}
                  className="flex items-center gap-2 px-4 min-h-[44px] rounded-lg text-sm font-semibold border transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <RefreshCw className={`w-5 h-5 ${isSimulating ? 'animate-spin' : ''}`} />
                  <span>{isSimulating ? 'Memperbarui…' : 'Perbarui Data'}</span>
                </button>
              </div>
            </div>

            {/* Navigasi langkah 1→4 (P2: alur Lihat–Kirim–Pantau) */}
            <nav aria-label="Langkah kerja" className="flex flex-wrap items-center gap-2">
              {tabDefs.map((t) => {
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    aria-current={active ? 'page' : undefined}
                    className="flex items-center gap-2 px-4 min-h-[48px] rounded-lg text-base font-bold border transition-all"
                    style={
                      active
                        ? { backgroundColor: 'var(--text-primary)', color: 'var(--bg-secondary)', borderColor: 'var(--text-primary)' }
                        : {
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                            borderColor: 'var(--border)',
                          }
                    }
                  >
                    <span
                      aria-hidden
                      className="flex items-center justify-center w-7 h-7 rounded-full text-sm font-extrabold border"
                      style={
                        active
                          ? { borderColor: 'currentColor' }
                          : { borderColor: 'var(--border-strong)' }
                      }
                    >
                      {t.step}
                    </span>
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Ringkasan selalu tampil (P1) */}
            <div
              role="status"
              aria-live="polite"
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 rounded-lg text-sm font-semibold border"
              style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
            >
              <span className="flex items-center gap-2" style={{ color: 'var(--success)' }}>
                <span aria-hidden className="w-2.5 h-2.5 rounded-full bg-current animate-pulse" />
                Data langsung
              </span>
              <span>{nodes.length} TPS dipantau</span>
              <span style={statusStyle('critical', theme)} className="px-3 py-1 rounded-full text-sm font-extrabold">
                ⚠ {criticalNodes.length} TPS penuh — segera angkut
              </span>
              {warningNodes.length > 0 && (
                <span style={statusStyle('warning', theme)} className="px-3 py-1 rounded-full text-sm font-extrabold">
                  {warningNodes.length} hampir penuh
                </span>
              )}
              <span className="ml-auto tabular-nums">{currentTime}</span>
            </div>
          </div>
        </header>

        {/* ===== ISI ===== */}
        <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 lg:p-5">
          {/* ---- LANGKAH 1: Prioritas & Peta ---- */}
          {activeTab === 'map' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Daftar TPS */}
              <section
                aria-label="Daftar TPS"
                className="lg:col-span-3 card p-4 flex flex-col gap-3 lg:h-[640px]"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-extrabold">Daftar TPS</h2>
                  <span
                    className="text-sm font-bold px-3 py-1 rounded-full border"
                    style={{ borderColor: 'var(--border-strong)' }}
                  >
                    {filteredNodes.length} lokasi
                  </span>
                </div>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-3.5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="search"
                    aria-label="Cari TPS berdasarkan nama atau alamat"
                    placeholder="Cari nama TPS atau alamat…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg pl-11 pr-3 min-h-[48px] text-base border"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-strong)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Saring berdasarkan kondisi">
                  {(['all', 'critical', 'warning', 'optimal'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      aria-pressed={statusFilter === f}
                      className="min-h-[48px] px-2 rounded-lg text-sm font-bold border transition-all"
                      style={
                        statusFilter === f
                          ? { backgroundColor: 'var(--text-primary)', color: 'var(--bg-secondary)', borderColor: 'var(--text-primary)' }
                          : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }
                      }
                    >
                      {FILTER_LABEL[f]}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filteredNodes.map((node) => {
                    const st = getStatus(node);
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <button
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        aria-pressed={isSelected}
                        aria-label={`${node.name}, sampah ${node.currentVolumePercent} persen, ${st.label}`}
                        className="w-full text-left p-3 rounded-lg border transition-all min-h-[64px]"
                        style={
                          isSelected
                            ? { borderColor: 'var(--info)', borderWidth: 3, backgroundColor: 'var(--bg-tertiary)' }
                            : { borderColor: 'var(--border)', backgroundColor: 'var(--bg-tertiary)' }
                        }
                      >
                        <span className="flex items-center gap-2">
                          {st.level === 'critical' ? (
                            <AlertTriangle className="w-6 h-6 shrink-0" style={{ color: 'var(--critical)' }} aria-hidden />
                          ) : st.level === 'warning' ? (
                            <AlertCircle className="w-6 h-6 shrink-0" style={{ color: 'var(--warning)' }} aria-hidden />
                          ) : (
                            <CheckCircle2 className="w-6 h-6 shrink-0" style={{ color: 'var(--success)' }} aria-hidden />
                          )}
                          <span className="text-xl font-extrabold tabular-nums">{node.currentVolumePercent}%</span>
                          <span
                            className="ml-auto text-sm font-extrabold px-2.5 py-1 rounded-full border"
                            style={statusStyle(st.level, theme)}
                          >
                            {st.level === 'critical' ? 'PENUH' : st.level === 'warning' ? 'HAMPIR' : 'AMAN'}
                          </span>
                        </span>
                        <span className="block text-base font-bold mt-1 leading-snug">{node.name}</span>
                        <span className="block text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          Bau: {interpretGas(node.gasPpmMQ135)} • {node.lastTelemetry}
                        </span>
                      </button>
                    );
                  })}
                  {filteredNodes.length === 0 && (
                    <p className="text-base text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                      Tidak ada TPS yang cocok dengan pencarian.
                    </p>
                  )}
                </div>
              </section>

              {/* Peta */}
              <div className="lg:col-span-6 lg:h-[640px] h-[480px]">
                <InteractiveMap
                  nodes={nodes}
                  cvrp={cvrp}
                  selectedNode={selectedNode}
                  onSelectNode={(node) => setSelectedNode(node)}
                  showRoute={showRoute}
                  theme={theme}
                />
                <label
                  className="flex items-center gap-3 mt-3 px-4 min-h-[48px] rounded-lg border text-base font-semibold cursor-pointer card"
                >
                  <input
                    type="checkbox"
                    checked={showRoute}
                    onChange={(e) => setShowRoute(e.target.checked)}
                    className="w-6 h-6 accent-blue-700"
                  />
                  Tampilkan rute armada di peta
                </label>
              </div>

              {/* Detail TPS + Peringatan */}
              <div className="lg:col-span-3 flex flex-col gap-4 lg:h-[640px] lg:overflow-y-auto">
                <section aria-label="TPS yang dipilih" className="card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-extrabold">TPS yang dipilih</h2>
                    {selectedNode && (
                      <span
                        className="text-sm font-extrabold px-3 py-1.5 rounded-full border flex items-center gap-1.5"
                        style={statusStyle(getStatus(selectedNode).level, theme)}
                      >
                        {getStatus(selectedNode).level === 'critical' ? (
                          <AlertTriangle className="w-4 h-4" aria-hidden />
                        ) : getStatus(selectedNode).level === 'warning' ? (
                          <AlertCircle className="w-4 h-4" aria-hidden />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" aria-hidden />
                        )}
                        {getStatus(selectedNode).level === 'critical'
                          ? 'Penuh'
                          : getStatus(selectedNode).level === 'warning'
                            ? 'Hampir penuh'
                            : 'Aman'}
                      </span>
                    )}
                  </div>
                  {selectedNode ? (
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-bold text-lg leading-snug">{selectedNode.name}</h3>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {selectedNode.address}
                        </p>
                      </div>
                      <div className="card-inset p-4 space-y-2">
                        <div className="flex justify-between items-baseline text-base">
                          <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            Sampah
                          </span>
                          <span className="font-extrabold text-2xl tabular-nums">
                            {selectedNode.currentVolumePercent}%
                          </span>
                        </div>
                        <div
                          role="progressbar"
                          aria-valuenow={selectedNode.currentVolumePercent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Sampah ${selectedNode.currentVolumePercent} persen`}
                          className="w-full h-4 rounded-full overflow-hidden border"
                          style={{ borderColor: 'var(--border-strong)', backgroundColor: 'var(--bg-primary)' }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${selectedNode.currentVolumePercent}%`,
                              backgroundColor:
                                getStatus(selectedNode).level === 'critical'
                                  ? 'var(--critical)'
                                  : getStatus(selectedNode).level === 'warning'
                                    ? 'var(--warning)'
                                    : 'var(--success)',
                            }}
                          />
                        </div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          {getStatus(selectedNode).action}
                        </p>
                      </div>
                      <dl className="grid grid-cols-1 gap-2 text-base">
                        <div className="card-inset p-3">
                          <dt className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            Bau sampah
                          </dt>
                          <dd className="font-bold">{interpretGas(selectedNode.gasPpmMQ135)}</dd>
                        </div>
                        <div className="card-inset p-3">
                          <dt className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            Suhu tempat sampah
                          </dt>
                          <dd className="font-bold">{selectedNode.temperatureCelsius} °C</dd>
                        </div>
                        <div className="card-inset p-3">
                          <dt className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            Baterai alat
                          </dt>
                          <dd className="font-bold">{interpretBattery(selectedNode.batteryVoltage)}</dd>
                        </div>
                      </dl>
                      <button
                        onClick={() => setActiveTab('dispatch')}
                        className="w-full min-h-[56px] rounded-lg text-base font-extrabold flex items-center justify-center gap-2 text-white"
                        style={{ backgroundColor: 'var(--info)' }}
                      >
                        <Send className="w-5 h-5" aria-hidden />
                        Kirim Armada ke TPS ini
                      </button>
                      <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                        Data diperbarui: {selectedNode.lastTelemetry} • Alat menyala
                      </p>
                    </div>
                  ) : (
                    <p className="text-base py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                      Pilih salah satu TPS di daftar atau peta.
                    </p>
                  )}
                </section>

                {/* Peringatan yang bisa diklik */}
                <section aria-label="Perlu perhatian" className="card p-4 space-y-2.5">
                  <h2 className="text-base font-extrabold flex items-center gap-2" style={{ color: 'var(--critical)' }}>
                    <AlertTriangle className="w-5 h-5" aria-hidden />
                    Perlu Perhatian ({criticalNodes.length})
                  </h2>
                  <div className="space-y-2">
                    {criticalNodes.slice(0, 4).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => setSelectedNode(n)}
                        className="w-full text-left card-inset p-3 min-h-[64px] hover:opacity-90 transition-opacity"
                      >
                        <span className="flex justify-between gap-2 text-base">
                          <strong>{n.name}</strong>
                          <strong className="tabular-nums" style={{ color: 'var(--critical)' }}>
                            {n.currentVolumePercent}%
                          </strong>
                        </span>
                        <span className="block text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {interpretGas(n.gasPpmMQ135)} • Ketuk untuk melihat
                        </span>
                      </button>
                    ))}
                    {criticalNodes.length === 0 && (
                      <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                        Semua TPS dalam kondisi aman. Kerja yang bagus!
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* ---- LANGKAH 2: Kirim Armada ---- */}
          {activeTab === 'dispatch' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <section aria-label="Armada pengangkut" className="lg:col-span-5 card p-5 space-y-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Langkah 2 — Pengiriman armada
                  </p>
                  <h2 className="font-extrabold text-xl mt-0.5">{cvrp.truckId}</h2>
                  <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                    Supir: {cvrp.truckDriver}
                  </p>
                </div>
                <div className="card-inset p-4 space-y-2">
                  <div className="flex justify-between text-base">
                    <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Muatan truk
                    </span>
                    <strong className="tabular-nums">
                      {cvrp.assignedLoadLiters} / {cvrp.truckCapacityLiters} liter
                    </strong>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={utilization}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Muatan truk ${utilization} persen`}
                    className="w-full h-4 rounded-full overflow-hidden border"
                    style={{ borderColor: 'var(--border-strong)', backgroundColor: 'var(--bg-primary)' }}
                  >
                    <div className="h-full rounded-full" style={{ width: `${utilization}%`, backgroundColor: 'var(--info)' }} />
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Terisi {utilization}% — masih cukup untuk {criticalNodes.length} TPS prioritas
                  </p>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-center">
                  <div className="card-inset p-3">
                    <dt className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Jarak tempuh
                    </dt>
                    <dd className="text-lg font-extrabold tabular-nums">{cvrp.totalDistanceKm} km</dd>
                  </div>
                  <div className="card-inset p-3">
                    <dt className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Jarak hemat
                    </dt>
                    <dd className="text-lg font-extrabold tabular-nums" style={{ color: 'var(--success)' }}>
                      {cvrp.distanceSavedKm} km
                    </dd>
                  </div>
                  <div className="card-inset p-3">
                    <dt className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      BBM hemat
                    </dt>
                    <dd className="text-lg font-extrabold tabular-nums" style={{ color: 'var(--warning)' }}>
                      {cvrp.fuelSavedLiters} L
                    </dd>
                  </div>
                </dl>
                <button
                  onClick={handleSendDispatch}
                  className="w-full min-h-[60px] rounded-xl text-lg font-extrabold flex items-center justify-center gap-2 text-white"
                  style={{ backgroundColor: 'var(--success)' }}
                >
                  <Navigation className="w-6 h-6" aria-hidden />
                  {dispatchSent ? '✓ Rute Terkirim ke Supir!' : 'Kirim Rute ke Supir'}
                </button>
                {dispatchSent && (
                  <p role="status" className="text-base font-bold text-center" style={{ color: 'var(--success)' }}>
                    Rute {cvrp.routeId} sudah diteruskan ke {cvrp.truckDriver}.
                  </p>
                )}
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Rute otomatis melewati TPS yang penuh terlebih dahulu, lalu berakhir di TPSA Banyuurip.
                </p>
              </section>

              <section aria-label="Urutan pemberhentian" className="lg:col-span-7 card p-5 space-y-3">
                <h2 className="text-base font-extrabold">Urutan Pemberhentian Armada</h2>
                <ol className="space-y-2">
                  {cvrp.waypoints.map((wp) => (
                    <li
                      key={wp.step}
                      className="card-inset p-3.5 flex items-center justify-between gap-3"
                    >
                      <span className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="flex items-center justify-center w-9 h-9 rounded-lg text-base font-extrabold border shrink-0"
                          style={{ borderColor: 'var(--border-strong)' }}
                        >
                          {wp.step}
                        </span>
                        <span>
                          <span className="block font-bold text-base leading-snug">{wp.title}</span>
                          <span className="block text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {wp.pickupVolumeLiters > 0 ? `Angkut ${wp.pickupVolumeLiters} liter • ` : ''}
                            Tiba sekitar {wp.estimatedArrival}
                          </span>
                        </span>
                      </span>
                      <span
                        className="text-sm font-extrabold px-3 py-1.5 rounded-full border shrink-0"
                        style={
                          wp.status === 'Selesai'
                            ? statusStyle('optimal', theme)
                            : wp.status === 'Menuju Lokasi'
                              ? { backgroundColor: '#dbeafe', color: '#1d4ed8', border: '2px solid #1d4ed8' }
                              : { borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }
                        }
                      >
                        {wp.status === 'Selesai' ? '✓ Selesai' : wp.status === 'Menuju Lokasi' ? '→ Sedang jalan' : 'Menunggu'}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}

          {/* ---- LANGKAH 3: Daftar TPS ---- */}
          {activeTab === 'tps' && (
            <section aria-label="Semua titik TPS" className="card p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Langkah 3 — Inventaris
                  </p>
                  <h2 className="font-extrabold text-xl">Semua Titik TPS Kota Magelang</h2>
                </div>
                <span className="text-base font-bold px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--border-strong)' }}>
                  Total: {nodes.length} TPS
                </span>
              </div>
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full text-left text-base min-w-[760px]">
                  <thead>
                    <tr className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <th scope="col" className="pb-3 pr-3 font-bold">TPS</th>
                      <th scope="col" className="pb-3 pr-3 font-bold">Sampah</th>
                      <th scope="col" className="pb-3 pr-3 font-bold">Bau</th>
                      <th scope="col" className="pb-3 pr-3 font-bold">Alat</th>
                      <th scope="col" className="pb-3 font-bold">Kondisi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map((n) => {
                      const st = getStatus(n);
                      return (
                        <tr key={n.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                          <td className="py-3 pr-3">
                            <p className="font-bold leading-snug">{n.name}</p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{n.address}</p>
                          </td>
                          <td className="py-3 pr-3">
                            <strong className="text-lg tabular-nums">{n.currentVolumePercent}%</strong>
                          </td>
                          <td className="py-3 pr-3 text-sm font-semibold">{interpretGas(n.gasPpmMQ135)}</td>
                          <td className="py-3 pr-3 text-sm font-semibold">{interpretBattery(n.batteryVoltage)}</td>
                          <td className="py-3">
                            <span
                              className="inline-flex items-center gap-1.5 text-sm font-extrabold px-3 py-1.5 rounded-full border"
                              style={statusStyle(st.level, theme)}
                            >
                              {st.level === 'critical' ? (
                                <AlertTriangle className="w-4 h-4" aria-hidden />
                              ) : st.level === 'warning' ? (
                                <AlertCircle className="w-4 h-4" aria-hidden />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" aria-hidden />
                              )}
                              {st.level === 'critical' ? 'Segera angkut' : st.level === 'warning' ? 'Pantau' : 'Aman'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ---- LANGKAH 4: Data Sensor (P2: bahasa awam + detail teknis) ---- */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4">
              <div className="card p-5">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Langkah 4 — Pantau alat
                </p>
                <h2 className="font-extrabold text-xl">
                  Kondisi Alat di {selectedNode?.name ?? '—'}
                </h2>
                <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Penjelasan dibuat sederhana. Kode alat (mis. MQ-135) disembunyikan di “Detail teknis”.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section aria-label="Isi sampah" className="card p-5 space-y-2">
                  <h3 className="text-base font-extrabold">Isi Sampah</h3>
                  <p className="text-3xl font-extrabold tabular-nums">
                    {selectedNode?.currentVolumePercent ?? '—'}%
                    <span className="text-base font-semibold" style={{ color: 'var(--text-secondary)' }}> penuh</span>
                  </p>
                  <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                    {selectedNode && selectedNode.currentVolumePercent >= 80
                      ? 'Sudah penuh — masuk prioritas pengangkutan.'
                      : selectedNode && selectedNode.currentVolumePercent >= 50
                        ? 'Setengah lebih — pantau 1–2 jam ke depan.'
                        : 'Masih lega — belum perlu diangkut.'}
                  </p>
                  <details className="text-sm card-inset p-3">
                    <summary className="font-bold cursor-pointer min-h-[44px] flex items-center">
                      Detail teknis (untuk teknisi)
                    </summary>
                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Sensor jarak JSN-SR04T: {selectedNode?.measuredDistanceCm} cm • Tinggi bak{' '}
                      {selectedNode?.totalHeightCm} cm • Batas buta {selectedNode?.blindZoneCm} cm.
                    </p>
                  </details>
                </section>
                <section aria-label="Bau dan gas" className="card p-5 space-y-2">
                  <h3 className="text-base font-extrabold">Bau & Gas</h3>
                  <p className="text-xl font-extrabold">{selectedNode ? interpretGas(selectedNode.gasPpmMQ135) : '—'}</p>
                  <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                    Gas metana: {selectedNode ? interpretMethane(selectedNode.methanePpmMQ4) : '—'}
                  </p>
                  <details className="text-sm card-inset p-3">
                    <summary className="font-bold cursor-pointer min-h-[44px] flex items-center">
                      Detail teknis (untuk teknisi)
                    </summary>
                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                      MQ-135 (NH₃): {selectedNode?.gasPpmMQ135} ppm • MQ-4 (CH₄): {selectedNode?.methanePpmMQ4} ppm.
                    </p>
                  </details>
                </section>
                <section aria-label="Suhu dan kelembapan" className="card p-5 space-y-2">
                  <h3 className="text-base font-extrabold">Suhu & Kelembapan</h3>
                  <p className="text-3xl font-extrabold tabular-nums">
                    {selectedNode?.temperatureCelsius ?? '—'}<span className="text-lg"> °C</span>
                  </p>
                  <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                    Kelembapan {selectedNode?.humidityPercent ?? '—'}% —{' '}
                    {selectedNode && selectedNode.temperatureCelsius > 31
                      ? 'agak panas, wajar di siang hari.'
                      : 'normal.'}
                  </p>
                  <details className="text-sm card-inset p-3">
                    <summary className="font-bold cursor-pointer min-h-[44px] flex items-center">
                      Detail teknis (untuk teknisi)
                    </summary>
                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Sensor DHT22 — suhu {selectedNode?.temperatureCelsius} °C, kelembapan {selectedNode?.humidityPercent}%.
                    </p>
                  </details>
                </section>
                <section aria-label="Baterai dan panel surya" className="card p-5 space-y-2">
                  <h3 className="text-base font-extrabold">Baterai & Panel Surya</h3>
                  <p className="text-xl font-extrabold">
                    {selectedNode ? interpretBattery(selectedNode.batteryVoltage) : '—'}
                  </p>
                  <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                    {selectedNode?.solarStatus === 'Charging (Terik)'
                      ? 'Panel surya sedang mengisi (cuaca cerah).'
                      : selectedNode?.solarStatus === 'Standby (Mendung)'
                        ? 'Panel surya siaga (cuaca mendung).'
                        : 'Mode malam — memakai baterai.'}
                  </p>
                  <details className="text-sm card-inset p-3">
                    <summary className="font-bold cursor-pointer min-h-[44px] flex items-center">
                      Detail teknis (untuk teknisi)
                    </summary>
                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Baterai 18650: {selectedNode?.batteryVoltage} V ({selectedNode?.batteryPercent}%) • Modul CN3065:{' '}
                      {selectedNode?.solarCurrentMa} mA.
                    </p>
                  </details>
                </section>
              </div>
              <div className="card p-4 flex flex-wrap items-center gap-3">
                <label htmlFor="telemetry-tps" className="text-base font-bold">
                  Lihat alat di TPS lain:
                </label>
                <select
                  id="telemetry-tps"
                  value={selectedNode?.id ?? ''}
                  onChange={(e) => {
                    const found = nodes.find((n) => n.id === e.target.value);
                    if (found) setSelectedNode(found);
                  }}
                  className="min-h-[48px] text-base font-semibold rounded-lg border px-3"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} — {n.currentVolumePercent}%
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setActiveTab('map')}
                  className="flex items-center gap-2 min-h-[48px] px-4 rounded-lg text-base font-bold border"
                  style={{ borderColor: 'var(--border-strong)' }}
                >
                  <Eye className="w-5 h-5" aria-hidden /> Kembali ke Peta
                  <ChevronRight className="w-5 h-5" aria-hidden />
                </button>
              </div>
            </div>
          )}
        </main>

        <footer
          className="border-t py-4 px-4 text-center text-sm"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          SUGENG — Sistem Cerdas Angkut Sampah Kota Magelang • Dinas Lingkungan Hidup • Data diperbarui otomatis
        </footer>
      </div>
    </div>
  );
};

export default SugengDashboard;
