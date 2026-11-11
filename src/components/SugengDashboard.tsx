import React, { useState, useEffect } from 'react';
import type { TPSNode, CVRPSolution } from '../data/dummyData';
import { DUMMY_TPS_NODES, INITIAL_CVRP_SOLUTION } from '../data/dummyData';
import { applyLiveToNode, LIVE_NODE_ID } from '../lib/liveSensor';
import type { LiveSensorPayload } from '../lib/liveSensor';
import { connectSerial, disconnectSerial, isSerialSupported, connectBridge, disconnectBridge, isBridgeAvailable } from '../lib/liveSerial';
import { fetchInitialNodes, subscribeToRealtime, type RealtimeConnectionState } from '../lib/supabaseRealtime';
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
  Flame,
  Wind,
  Thermometer,
  Droplets,
  Gauge,
  Zap,
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

function getAmmoniaInfo(ppm: number) {
  if (ppm >= 60) {
    return {
      status: 'Kritis (Bau Busuk Menyengat)',
      badgeBg: 'var(--critical-bg)',
      badgeColor: 'var(--critical)',
      borderColor: 'var(--critical)',
      action: 'Bau amonia menyengat kuat ke lingkungan. Segera lakukan pengangkutan armada & semprot eco-enzyme!',
      color: 'var(--critical)',
      percent: Math.min(100, Math.round((ppm / 100) * 100)),
    };
  }
  if (ppm >= 30) {
    return {
      status: 'Sedang (Mulai Berbau)',
      badgeBg: 'var(--warning-bg)',
      badgeColor: 'var(--warning)',
      borderColor: 'var(--warning)',
      action: 'Aroma sampah mulai tercium. Bak perlu dijadwalkan pengangkutan sebelum fermentasi meningkat.',
      color: 'var(--warning)',
      percent: Math.min(100, Math.round((ppm / 100) * 100)),
    };
  }
  return {
    status: 'Normal (Udara Segar)',
    badgeBg: 'var(--success-bg)',
    badgeColor: 'var(--success)',
    borderColor: 'var(--success)',
    action: 'Konsentrasi gas amonia sangat rendah. Udara di sekitar bak bersih, higienis, dan tidak berbau.',
    color: 'var(--success)',
    percent: Math.min(100, Math.round((ppm / 100) * 100)),
  };
}

function getMethaneInfo(ppm: number) {
  if (ppm >= 250) {
    return {
      status: 'BAHAYA (Risiko Api / Ledakan)',
      badgeBg: 'var(--critical-bg)',
      badgeColor: 'var(--critical)',
      borderColor: 'var(--critical)',
      action: 'PERINGATAN K3: Dilarang menyalakan korek/rokok! Buka ventilasi bak dan segera evakuasi sampah.',
      color: 'var(--critical)',
      percent: Math.min(100, Math.round((ppm / 500) * 100)),
    };
  }
  if (ppm >= 100) {
    return {
      status: 'Waspada (Akumulasi Biometana)',
      badgeBg: 'var(--warning-bg)',
      badgeColor: 'var(--warning)',
      borderColor: 'var(--warning)',
      action: 'Terjadi akumulasi gas metana dari penguraian tertutup. Periksa sirkulasi ventilasi bak.',
      color: 'var(--warning)',
      percent: Math.min(100, Math.round((ppm / 500) * 100)),
    };
  }
  return {
    status: 'Aman (Konsentrasi Rendah)',
    badgeBg: 'var(--success-bg)',
    badgeColor: 'var(--success)',
    borderColor: 'var(--success)',
    action: 'Kadar metana sangat minim (< 100 ppm). Bebas risiko kebakaran dan akumulasi biometana.',
    color: 'var(--success)',
    percent: Math.min(100, Math.round((ppm / 500) * 100)),
  };
}

function getTempInfo(temp: number) {
  if (temp >= 35) {
    return {
      status: 'Sangat Panas',
      badgeBg: 'var(--critical-bg)',
      badgeColor: 'var(--critical)',
      desc: 'Suhu bak tinggi, mempercepat pembusukan bakteri.',
      percent: Math.min(100, Math.max(0, Math.round(((temp - 15) / 35) * 100))),
      color: 'var(--critical)',
    };
  }
  if (temp >= 31) {
    return {
      status: 'Hangat (Aktif)',
      badgeBg: 'var(--warning-bg)',
      badgeColor: 'var(--warning)',
      desc: 'Suhu siang hari normal untuk iklim tropis Magelang.',
      percent: Math.min(100, Math.max(0, Math.round(((temp - 15) / 35) * 100))),
      color: 'var(--warning)',
    };
  }
  return {
    status: 'Optimal / Sejuk',
    badgeBg: 'var(--success-bg)',
    badgeColor: 'var(--success)',
    desc: 'Suhu ideal, laju fermentasi organik lambat.',
    percent: Math.min(100, Math.max(0, Math.round(((temp - 15) / 35) * 100))),
    color: 'var(--success)',
  };
}

function getHumidityInfo(hum: number) {
  if (hum >= 75) {
    return {
      status: 'Lembap Tinggi (Basah)',
      badgeBg: 'var(--warning-bg)',
      badgeColor: 'var(--warning)',
      desc: 'Kelembapan tinggi memicu timbulnya lindi & bau busuk.',
      percent: Math.min(100, Math.round(hum)),
      color: 'var(--warning)',
    };
  }
  if (hum >= 50) {
    return {
      status: 'Normal',
      badgeBg: 'var(--success-bg)',
      badgeColor: 'var(--success)',
      desc: 'Kondisi kelembapan seimbang.',
      percent: Math.min(100, Math.round(hum)),
      color: 'var(--success)',
    };
  }
  return {
    status: 'Kering',
    badgeBg: 'var(--bg-tertiary)',
    badgeColor: 'var(--text-secondary)',
    desc: 'Sampah relatif kering.',
    percent: Math.min(100, Math.round(hum)),
    color: 'var(--text-secondary)',
  };
}

function statusStyle(level: StatusLevel, theme: Theme): React.CSSProperties {
  if (level === 'critical')
    return theme === 'light'
      ? { backgroundColor: '#FBE3E1', color: '#C1272D', border: '2px solid #C1272D' }
      : { backgroundColor: 'rgba(193,39,45,.22)', color: '#FF7A7A', border: '2px solid #FF7A7A' };
  if (level === 'warning')
    return theme === 'light'
      ? { backgroundColor: '#FDF0D5', color: '#B45309', border: '2px solid #B45309' }
      : { backgroundColor: 'rgba(255,184,0,.16)', color: '#FFB800', border: '2px solid #FFB800' };
  return theme === 'light'
    ? { backgroundColor: '#DFF5E6', color: '#0E7A3D', border: '2px solid #0E7A3D' }
    : { backgroundColor: 'rgba(14,122,61,.28)', color: '#32D583', border: '2px solid #32D583' };
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
  const [selectedNode, setSelectedNode] = useState<TPSNode | null>(DUMMY_TPS_NODES[0] ?? null);
  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [showRoute, setShowRoute] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | StatusLevel>('all');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [theme, setTheme] = useState<Theme>('light'); // P0: terang sebagai default
  const [dispatchSent, setDispatchSent] = useState<boolean>(false);

  /* ---------- SUPABASE REALTIME (Cloud WebSocket) ---------- */
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionState>('connecting');
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<string>('');

  // 1. Inisialisasi data & Berlangganan Supabase Realtime WebSocket
  useEffect(() => {
    let isMounted = true;

    // Ambil data snapshot awal dari Supabase
    fetchInitialNodes().then((initialNodes) => {
      if (isMounted && initialNodes.length > 0) {
        setNodes(initialNodes);
        setSelectedNode((prev) => {
          if (!prev) return initialNodes[0] ?? null;
          return initialNodes.find((n) => n.id === prev.id) ?? initialNodes[0] ?? null;
        });
      }
    });

    // Langganan stream WebSocket real-time
    const unsubscribe = subscribeToRealtime({
      onStatusChange: (status) => {
        if (isMounted) setRealtimeStatus(status);
      },
      onNodeChange: (updatedNode) => {
        if (!isMounted) return;
        setNodes((prev) =>
          prev.map((n) => (n.id === updatedNode.id ? { ...n, ...updatedNode } : n))
        );
        setSelectedNode((prev) =>
          prev && prev.id === updatedNode.id ? { ...prev, ...updatedNode } : prev
        );
        const nowStr =
          new Date().toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Jakarta' }) + ' WIB';
        setLastRealtimeUpdate(nowStr);
      },
      onTelemetryInsert: (payload) => {
        if (!isMounted) return;
        const targetId = payload.nodeId || LIVE_NODE_ID;
        const label =
          new Date().toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Jakarta' }) +
          ' WIB (Cloud WSS)';
        setNodes((prev) =>
          prev.map((n) => (n.id === targetId ? applyLiveToNode(n, payload, label) : n))
        );
        setSelectedNode((prev) =>
          prev && prev.id === targetId ? applyLiveToNode(prev, payload, label) : prev
        );
        setLiveRaw(payload);
        setLiveLastOk(label);
        setLastRealtimeUpdate(label);
      },
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  /* ---------- LIVE SENSOR (jalur demo: USB serial langsung, tanpa WiFi/DB) ---------- */
  const [liveOn, setLiveOn] = useState<boolean>(false); // port serial terbuka?
  const [liveConnecting, setLiveConnecting] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveLastOk, setLiveLastOk] = useState<string>('');
  const [liveRaw, setLiveRaw] = useState<LiveSensorPayload | null>(null);

  const applyPayload = (payload: LiveSensorPayload) => {
    const isWs = (payload as any)._transport === 'websocket';
    const tag = isWs ? 'WebSocket' : 'USB';
    const label = new Date().toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Jakarta' }) + ` WIB (${tag})`;
    setNodes((prev) => prev.map((n) => (n.id === LIVE_NODE_ID ? applyLiveToNode(n, payload, label) : n)));
    setSelectedNode((prev) => (prev && prev.id === LIVE_NODE_ID ? applyLiveToNode(prev, payload, label) : prev));
    setLiveRaw(payload);
    setLiveError(null);
    setLiveLastOk(label);
  };

  // Lepas port saat komponen unmount
  useEffect(() => {
    return () => {
      disconnectSerial();
      disconnectBridge();
    };
  }, []);

  const handleConnectUsb = async () => {
    setLiveConnecting(true);
    setLiveError(null);
    try {
      // 1. Cek apakah Python Local Bridge aktif di 127.0.0.1:5050
      const bridgeOk = await isBridgeAvailable();
      if (bridgeOk) {
        await connectBridge(
          (payload) => applyPayload(payload),
          (msg) => {
            setLiveError(msg);
            setLiveOn(false);
          }
        );
        setLiveOn(true);
        const found = nodes.find((n) => n.id === LIVE_NODE_ID);
        if (found) setSelectedNode(found);
        return;
      }

      // 2. Jika bridge tidak aktif, gunakan Web Serial API browser
      await connectSerial(
        (payload) => applyPayload(payload),
        (msg) => {
          setLiveError(msg);
          setLiveOn(false);
        }
      );
      setLiveOn(true);
      {
        const found = nodes.find((n) => n.id === LIVE_NODE_ID);
        if (found) setSelectedNode(found);
      }
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : 'Gagal membuka port serial.');
      setLiveOn(false);
    } finally {
      setLiveConnecting(false);
    }
  };

  const handleDisconnectUsb = async () => {
    await disconnectSerial();
    disconnectBridge();
    setLiveOn(false);
    setLiveError(null);
  };

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

  const handleSimulateTelemetry = async () => {
    setIsSimulating(true);
    try {
      const freshNodes = await fetchInitialNodes();
      if (freshNodes && freshNodes.length > 0) {
        setNodes(freshNodes);
        if (selectedNode) {
          const found = freshNodes.find((n) => n.id === selectedNode.id);
          if (found) setSelectedNode(found);
        }
      }
    } catch {
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
    } finally {
      setIsSimulating(false);
    }
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
        {/* ===== HEADER PAPAN OPERASI (Ruang Kontrol Bersih) ===== */}
        <header
          className="sticky top-0 z-50 border-b px-4 lg:px-6 py-3"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-strong)', borderBottomWidth: 2 }}
        >
          <div className="max-w-[1600px] mx-auto flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex items-center justify-center w-12 h-12 rounded-[10px] font-display text-white text-xl"
                  style={{ backgroundColor: 'var(--dlh)', border: '2px solid var(--border-strong)', boxShadow: 'var(--hard-shadow)' }}
                >
                  S
                </span>
                <div>
                  <h1 className="font-display font-black text-xl leading-none tracking-tight">
                    SUGENG <span className="font-mono font-bold text-xs align-middle px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>DLH MAGELANG</span>
                  </h1>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Pusat Operasi Sampah — pantau TPS & kirim armada
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Status Badge Supabase Realtime WebSocket */}
                <div
                  className="flex items-center gap-2 px-3 min-h-[44px] rounded-lg text-xs font-bold border transition-all"
                  style={{
                    backgroundColor:
                      realtimeStatus === 'connected'
                        ? 'var(--success-bg)'
                        : realtimeStatus === 'connecting'
                        ? 'var(--warning-bg)'
                        : 'var(--bg-tertiary)',
                    borderColor:
                      realtimeStatus === 'connected'
                        ? 'var(--success)'
                        : realtimeStatus === 'connecting'
                        ? 'var(--warning)'
                        : 'var(--border-strong)',
                    color:
                      realtimeStatus === 'connected'
                        ? 'var(--success)'
                        : realtimeStatus === 'connecting'
                        ? 'var(--warning)'
                        : 'var(--text-secondary)',
                  }}
                  title={
                    realtimeStatus === 'connected'
                      ? `Terhubung ke Supabase Realtime WebSocket (${lastRealtimeUpdate || 'Live WSS'})`
                      : realtimeStatus === 'connecting'
                      ? 'Menghubungkan ke Supabase Realtime WebSocket...'
                      : 'Koneksi Cloud Realtime terputus'
                  }
                >
                  <span className="relative flex h-2.5 w-2.5">
                    {realtimeStatus === 'connected' && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        realtimeStatus === 'connected'
                          ? 'bg-emerald-500'
                          : realtimeStatus === 'connecting'
                          ? 'bg-amber-500 animate-pulse'
                          : 'bg-zinc-400'
                      }`}
                    ></span>
                  </span>
                  <span className="font-mono tracking-tight hidden sm:inline">
                    {realtimeStatus === 'connected'
                      ? 'CLOUD REALTIME'
                      : realtimeStatus === 'connecting'
                      ? 'WSS CONNECTING…'
                      : 'OFFLINE'}
                  </span>
                </div>

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
                    className="flex items-center gap-2 px-4 min-h-[48px] rounded-[10px] text-base font-bold border transition-all lift"
                    style={
                      active
                        ? { backgroundColor: 'var(--text-primary)', color: 'var(--bg-secondary)', borderColor: 'var(--text-primary)', boxShadow: 'var(--hard-shadow)' }
                        : {
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)',
                            borderColor: 'var(--border-strong)',
                            borderWidth: 1.5,
                          }
                    }
                  >
                    <span
                      aria-hidden
                      className="step-num flex items-center justify-center w-7 h-7 rounded-md text-sm border"
                      style={
                        active
                          ? { borderColor: 'currentColor' }
                          : { borderColor: 'var(--border)', backgroundColor: 'var(--bg-tertiary)' }
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
              className="reveal flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5 rounded-[10px] text-sm font-semibold"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1.5px solid var(--border-strong)', boxShadow: 'var(--hard-shadow)', ['--d' as string]: '60ms' }}
            >
              <span className="flex items-center gap-2 font-display font-bold tracking-tight" style={{ color: 'var(--success)' }}>
                <span aria-hidden className="w-2.5 h-2.5 rounded-full bg-current animate-pulse" />
                LANGSUNG
              </span>
              <span className="tabular-nums">{nodes.length} TPS dipantau</span>
              <span style={statusStyle('critical', theme)} className="px-3 py-1 rounded-full text-sm font-extrabold">
                {criticalNodes.length} TPS penuh — segera angkut
              </span>
              {warningNodes.length > 0 && (
                <span style={statusStyle('warning', theme)} className="px-3 py-1 rounded-full text-sm font-extrabold">
                  {warningNodes.length} hampir penuh
                </span>
              )}
              <span className="ml-auto tabular-nums font-mono text-sm">{currentTime}</span>
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
                className="reveal lg:col-span-3 card p-4 flex flex-col gap-3 lg:h-[640px]"
                style={{ ['--d' as string]: '120ms' }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-extrabold tracking-tight">DAFTAR TPS</h2>
                  <span
                    className="font-mono text-xs font-bold px-3 py-1 rounded-full border"
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
                  {filteredNodes.map((node, i) => {
                    const st = getStatus(node);
                    const isSelected = selectedNode?.id === node.id;
                    const spineCls = st.level === 'critical' ? 'spine-critical' : st.level === 'warning' ? 'spine-warning' : 'spine-optimal';
                    return (
                      <button
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        aria-pressed={isSelected}
                        aria-label={`${node.name}, sampah ${node.currentVolumePercent} persen, ${st.label}`}
                        className={`reveal lift spine ${spineCls} w-full text-left pl-4 pr-3 py-3 rounded-[10px] border transition-all min-h-[64px]`}
                        style={{
                          ['--d' as string]: `${140 + Math.min(i, 8) * 40}ms`,
                          borderColor: 'var(--border-strong)',
                          borderWidth: 1.5,
                          backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                          boxShadow: isSelected ? 'var(--hard-shadow)' : 'none',
                          outline: isSelected ? '2px solid var(--text-primary)' : 'none',
                          outlineOffset: -2,
                        }}
                      >
                        <span className="flex items-center gap-2">
                          {st.level === 'critical' ? (
                            <AlertTriangle className="w-6 h-6 shrink-0" style={{ color: 'var(--critical)' }} aria-hidden />
                          ) : st.level === 'warning' ? (
                            <AlertCircle className="w-6 h-6 shrink-0" style={{ color: 'var(--warning)' }} aria-hidden />
                          ) : (
                            <CheckCircle2 className="w-6 h-6 shrink-0" style={{ color: 'var(--success)' }} aria-hidden />
                          )}
                          <span className="font-display text-2xl font-black tabular-nums tracking-tight">{node.currentVolumePercent}%</span>
                          <span
                            className="ml-auto text-xs font-extrabold px-2.5 py-1 rounded-full border"
                            style={statusStyle(st.level, theme)}
                          >
                            {st.level === 'critical' ? 'PENUH' : st.level === 'warning' ? 'HAMPIR' : 'AMAN'}
                          </span>
                        </span>
                        <span className="block text-base font-bold mt-1 leading-snug">{node.name}</span>
                        <span className="block text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {node.id === LIVE_NODE_ID && liveOn && liveLastOk ? '🔴 LIVE • ' : ''}Bau: {interpretGas(node.gasPpmMQ135)} • {node.lastTelemetry}
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
                  className="lift flex items-center gap-3 mt-3 px-4 min-h-[48px] rounded-[10px] border text-base font-semibold cursor-pointer card"
                >
                  <input
                    type="checkbox"
                    checked={showRoute}
                    onChange={(e) => setShowRoute(e.target.checked)}
                    className="w-6 h-6"
                    style={{ accentColor: 'var(--safety)' }}
                  />
                  Tampilkan rute armada di peta
                </label>
              </div>

              {/* Detail TPS + Peringatan */}
              <div className="lg:col-span-3 flex flex-col gap-4 lg:h-[640px] lg:overflow-y-auto">
                <section aria-label="TPS yang dipilih" className="reveal card p-4 space-y-3" style={{ ['--d' as string]: '160ms' }}>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-base font-extrabold tracking-tight">TPS YANG DIPILIH</h2>
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
                          <span className="font-display font-black text-3xl tabular-nums tracking-tight">
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
                        className="lift w-full min-h-[56px] rounded-[10px] text-base font-display font-extrabold tracking-tight flex items-center justify-center gap-2 text-white"
                        style={{ backgroundColor: 'var(--safety)', border: '1.5px solid var(--border-strong)', boxShadow: 'var(--hard-shadow)' }}
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
              <section aria-label="Armada pengangkut" className="reveal lg:col-span-5 card p-5 space-y-4" style={{ ['--d' as string]: '80ms' }}>
                <div>
                  <p className="font-mono text-xs font-bold tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                    LANGKAH 02 — PENGIRIMAN ARMADA
                  </p>
                  <h2 className="font-display font-black text-2xl mt-1 tracking-tight">{cvrp.truckId}</h2>
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
                    <div className="h-full rounded-full" style={{ width: `${utilization}%`, backgroundColor: 'var(--safety)' }} />
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
                  className="lift w-full min-h-[60px] rounded-[10px] text-lg font-display font-extrabold tracking-tight flex items-center justify-center gap-2 text-white"
                  style={{ backgroundColor: 'var(--safety)', border: '1.5px solid var(--border-strong)', boxShadow: 'var(--hard-shadow)' }}
                >
                  <Navigation className="w-6 h-6" aria-hidden />
                  {dispatchSent ? 'Rute Terkirim ke Supir!' : 'Kirim Rute ke Supir'}
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

              <section aria-label="Urutan pemberhentian" className="reveal lg:col-span-7 card p-5 space-y-3" style={{ ['--d' as string]: '120ms' }}>
                <h2 className="font-display text-base font-extrabold tracking-tight">URUTAN PEMBERHENTIAN ARMADA</h2>
                <ol className="space-y-2">
                  {cvrp.waypoints.map((wp, i) => (
                    <li
                      key={wp.step}
                      className="reveal card-inset p-3.5 flex items-center justify-between gap-3"
                      style={{ ['--d' as string]: `${140 + Math.min(i, 7) * 40}ms` }}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="step-num flex items-center justify-center w-9 h-9 rounded-lg text-base border shrink-0"
                          style={{ borderColor: 'var(--border-strong)', backgroundColor: 'var(--bg-secondary)' }}
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
                              ? { backgroundColor: '#FDEBD9', color: '#C24E03', border: '2px solid #C24E03' }
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
            <section aria-label="Semua titik TPS" className="reveal card p-5 space-y-4" style={{ ['--d' as string]: '80ms' }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-xs font-bold tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                    LANGKAH 03 — INVENTARIS
                  </p>
                  <h2 className="font-display font-black text-2xl tracking-tight">Semua Titik TPS Kota Magelang</h2>
                </div>
                <span className="font-mono text-sm font-bold px-4 py-2 rounded-[10px] border" style={{ borderColor: 'var(--border-strong)' }}>
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
              <div className="reveal card p-5" style={{ ['--d' as string]: '80ms' }}>
                <p className="font-mono text-xs font-bold tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                  LANGKAH 04 — PANTAU ALAT
                </p>
                <h2 className="font-display font-black text-2xl tracking-tight">
                  Kondisi Alat di {selectedNode?.name ?? '—'}
                </h2>
                <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Penjelasan dibuat sederhana. Kode alat (mis. MQ-135) disembunyikan di “Detail teknis”.
                </p>

                {/* ---- KONTROL ALAT LIVE (demo: USB serial langsung, tanpa WiFi) ---- */}
                <div className="card-inset p-4 mt-4 space-y-3" aria-label="Kontrol alat live USB">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-extrabold text-base">
                      Sumber data:{' '}
                      {liveOn && liveLastOk
                        ? '🔴 Alat Live (USB / Local WebSocket)'
                        : realtimeStatus === 'connected'
                        ? '🟢 Supabase Realtime (Cloud WebSocket)'
                        : '🟡 Data Cache / Contoh'}
                    </p>
                    {!liveOn ? (
                      <button
                        onClick={handleConnectUsb}
                        disabled={liveConnecting}
                        className="lift min-h-[52px] px-5 rounded-[10px] text-base font-display font-extrabold tracking-tight flex items-center gap-2 text-white disabled:opacity-60"
                        style={{ backgroundColor: 'var(--safety)', border: '1.5px solid var(--border-strong)', boxShadow: 'var(--hard-shadow)' }}
                      >
                        {liveConnecting ? 'Menghubungkan…' : '⚡ Hubungkan Alat Realtime'}
                      </button>
                    ) : (
                      <button
                        onClick={handleDisconnectUsb}
                        className="min-h-[52px] px-5 rounded-[10px] text-base font-bold border"
                        style={{ borderColor: 'var(--border-strong)' }}
                      >
                        Putuskan Koneksi
                      </button>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Colok ESP32 via kabel USB ke laptop ini, lalu klik tombol <strong>⚡ Hubungkan Alat Realtime</strong>.
                    Sistem otomatis terhubung instan via <strong>Realtime WebSocket (ws://127.0.0.1:5050)</strong> dengan latensi &lt;1ms. Data live menimpa <strong>{LIVE_NODE_ID} (TPS Kampus Tuguran UNTIDAR)</strong> tiap 2 detik.
                  </p>
                  {liveError && (
                    <p role="alert" className="text-base font-bold" style={{ color: 'var(--critical)' }}>⚠ {liveError}</p>
                  )}
                  {liveOn && !liveError && liveLastOk && (
                    <div className="flex items-center gap-2.5 p-3 rounded-lg text-sm font-semibold border" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderColor: 'var(--success)' }}>
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
                      </span>
                      <span>
                        ✓ Terhubung Realtime — update data masuk <strong>{liveLastOk}</strong>
                        {typeof liveRaw?.uptimeSec === 'number' ? ` • Uptime Alat: ${liveRaw.uptimeSec} detik` : ''}
                      </span>
                    </div>
                  )}
                  {!liveOn && realtimeStatus === 'connected' && (
                    <div
                      className="flex items-center gap-2.5 p-3 rounded-lg text-sm font-semibold border"
                      style={{
                        backgroundColor: 'var(--success-bg)',
                        color: 'var(--success)',
                        borderColor: 'var(--success)',
                      }}
                    >
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
                      </span>
                      <span>
                        ✓ Terhubung ke <strong>Supabase Realtime Cloud (WebSocket)</strong> — menerima pembaruan sensor secara otomatis.
                        {lastRealtimeUpdate ? ` (Update terakhir: ${lastRealtimeUpdate})` : ''}
                      </span>
                    </div>
                  )}
                  {liveRaw && (
                    <details className="text-sm card-inset p-3">
                      <summary className="font-bold cursor-pointer min-h-[44px] flex items-center">JSON mentah dari alat (untuk teknisi)</summary>
                      <pre className="mt-2 overflow-x-auto font-mono text-xs p-2 rounded" style={{ backgroundColor: 'var(--bg-primary)' }}>{JSON.stringify(liveRaw, null, 2)}</pre>
                    </details>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. KARTU VOLUME & JARAK (JSN-SR04T) */}
                {(() => {
                  const vol = selectedNode?.currentVolumePercent ?? 0;
                  const dist = selectedNode?.measuredDistanceCm ?? -1;
                  const volColor = vol >= 80 ? 'var(--critical)' : vol >= 50 ? 'var(--warning)' : 'var(--success)';
                  const volBadgeBg = vol >= 80 ? 'var(--critical-bg)' : vol >= 50 ? 'var(--warning-bg)' : 'var(--success-bg)';
                  const volStatus = vol >= 80 ? 'Penuh — Prioritas Angkut' : vol >= 50 ? 'Siaga — Setengah Penuh' : 'Normal / Masih Lega';
                  return (
                    <section aria-label="Kapasitas dan volume sampah" className="reveal card p-5 space-y-4" style={{ ['--d' as string]: '120ms' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: volBadgeBg, color: volColor }}>
                            <Gauge className="w-5 h-5" aria-hidden />
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              Sensor Ultrasonik JSN-SR04T
                            </span>
                            <h3 className="font-display text-lg font-extrabold tracking-tight">VOLUME SAMPAH</h3>
                          </div>
                        </div>
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-extrabold border"
                          style={{ backgroundColor: volBadgeBg, color: volColor, borderColor: volColor }}
                        >
                          {volStatus}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-5xl font-black tabular-nums tracking-tight" style={{ color: volColor }}>
                          {vol}%
                        </span>
                        <span className="text-base font-semibold" style={{ color: 'var(--text-secondary)' }}>kapasitas terisi</span>
                      </div>

                      {/* Visual Meter Bar */}
                      <div className="space-y-1.5">
                        <div className="w-full h-3.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${Math.min(100, Math.max(0, vol))}%`,
                              backgroundColor: volColor,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs font-mono font-medium" style={{ color: 'var(--text-muted)' }}>
                          <span>0% (Kosong)</span>
                          <span style={{ color: 'var(--warning)' }}>50% (Waspada)</span>
                          <span style={{ color: 'var(--critical)' }}>80%+ (Penuh)</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {vol >= 80
                            ? '🚨 Bak hampir luber! Masuk antrean prioritas rute pengangkutan DLH.'
                            : vol >= 50
                              ? '⚠️ Bak terisi setengah lebih — pantau sebelum jam sibuk warga.'
                              : '✅ Bak masih longgar — belum membutuhkan penjemputan armada.'}
                        </p>
                      </div>

                      <details className="text-xs card-inset p-2.5">
                        <summary className="font-bold cursor-pointer min-h-[36px] flex items-center">Detail Teknis Kalibrasi Ultrasonik</summary>
                        <p className="mt-1.5 font-mono" style={{ color: 'var(--text-secondary)' }}>
                          Jarak pantul: <strong>{dist > 0 ? `${dist} cm` : 'Sensor Tertutup / Out of Range'}</strong> • Tinggi bak total: {selectedNode?.totalHeightCm ?? 95} cm • Batas buta (blind zone): {selectedNode?.blindZoneCm ?? 20} cm.
                        </p>
                      </details>
                    </section>
                  );
                })()}

                {/* 2. KARTU SUHU & KELEMBAPAN (DHT22) */}
                {(() => {
                  const temp = selectedNode?.temperatureCelsius ?? 0;
                  const hum = selectedNode?.humidityPercent ?? 0;
                  const tInfo = getTempInfo(temp);
                  const hInfo = getHumidityInfo(hum);

                  return (
                    <section aria-label="Suhu dan kelembapan bak" className="reveal card p-5 space-y-4" style={{ ['--d' as string]: '160ms' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
                            <Thermometer className="w-5 h-5" aria-hidden />
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              Sensor Lingkungan DHT22
                            </span>
                            <h3 className="font-display text-lg font-extrabold tracking-tight">SUHU & KELEMBAPAN</h3>
                          </div>
                        </div>
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-extrabold border"
                          style={{
                            backgroundColor: temp >= 32 || hum >= 75 ? 'var(--warning-bg)' : 'var(--success-bg)',
                            color: temp >= 32 || hum >= 75 ? 'var(--warning)' : 'var(--success)',
                            borderColor: temp >= 32 || hum >= 75 ? 'var(--warning)' : 'var(--success)',
                          }}
                        >
                          {temp >= 35 || hum >= 85 ? 'Fermentasi Aktif' : 'Mikroiklim Stabil'}
                        </span>
                      </div>

                      {/* Dual Metric Columns */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Suhu */}
                        <div className="card-inset p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                              <Thermometer className="w-3.5 h-3.5" /> Suhu
                            </span>
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: tInfo.badgeBg, color: tInfo.badgeColor }}>
                              {tInfo.status}
                            </span>
                          </div>
                          <p className="font-display text-3xl font-black tabular-nums tracking-tight">
                            {temp}<span className="text-lg font-bold"> °C</span>
                          </p>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${tInfo.percent}%`, backgroundColor: tInfo.color }} />
                          </div>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{tInfo.desc}</p>
                        </div>

                        {/* Kelembapan */}
                        <div className="card-inset p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                              <Droplets className="w-3.5 h-3.5" /> Kelembapan (RH)
                            </span>
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: hInfo.badgeBg, color: hInfo.badgeColor }}>
                              {hInfo.status}
                            </span>
                          </div>
                          <p className="font-display text-3xl font-black tabular-nums tracking-tight">
                            {hum}<span className="text-lg font-bold"> %</span>
                          </p>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${hInfo.percent}%`, backgroundColor: hInfo.color }} />
                          </div>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{hInfo.desc}</p>
                        </div>
                      </div>

                      {/* Mikroiklim note */}
                      <div className="p-2.5 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>
                          <strong>Analisis Dekomposisi: </strong>
                          {hum > 75 && temp > 30
                            ? 'Kombinasi lembap tinggi (>75%) dan hangat (>30°C) memicu percepatan bakteri anaerobik menghasilkan bau & gas.'
                            : 'Kondisi suhu dan kelembapan bak relatif seimbang, laju pembusukan sampah terkendali.'}
                        </p>
                      </div>

                      <details className="text-xs card-inset p-2.5">
                        <summary className="font-bold cursor-pointer min-h-[36px] flex items-center">Detail Pinout & Kalibrasi DHT22</summary>
                        <p className="mt-1.5 font-mono" style={{ color: 'var(--text-secondary)' }}>
                          GPIO Pin: D19 • Rentang operasi: -40 s/d 80°C (akurasi ±0.5°C), 0–100% RH (akurasi ±2%).
                        </p>
                      </details>
                    </section>
                  );
                })()}

                {/* 3. KARTU GAS AMONIA & BAU BUSUK (MQ-135) */}
                {(() => {
                  const nh3 = selectedNode?.gasPpmMQ135 ?? 0;
                  const nh3Info = getAmmoniaInfo(nh3);
                  return (
                    <section aria-label="Sensor gas amonia dan bau busuk" className="reveal card p-5 space-y-4" style={{ ['--d' as string]: '200ms' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: nh3Info.badgeBg, color: nh3Info.color }}>
                            <Wind className="w-5 h-5" aria-hidden />
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              Sensor Gas MQ-135 (NH₃ / Organik)
                            </span>
                            <h3 className="font-display text-lg font-extrabold tracking-tight">GAS AMONIA (BAU BUSUK)</h3>
                          </div>
                        </div>
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-extrabold border"
                          style={{ backgroundColor: nh3Info.badgeBg, color: nh3Info.color, borderColor: nh3Info.borderColor }}
                        >
                          {nh3Info.status}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-5xl font-black tabular-nums tracking-tight" style={{ color: nh3Info.color }}>
                          {nh3}
                        </span>
                        <span className="text-base font-semibold" style={{ color: 'var(--text-secondary)' }}>ppm (Ammonia Equivalent)</span>
                      </div>

                      {/* Visual Meter Bar */}
                      <div className="space-y-1.5">
                        <div className="w-full h-3.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${nh3Info.percent}%`,
                              backgroundColor: nh3Info.color,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs font-mono font-medium" style={{ color: 'var(--text-muted)' }}>
                          <span>0 ppm (Segar)</span>
                          <span style={{ color: 'var(--warning)' }}>30 ppm (Mulai Berbau)</span>
                          <span style={{ color: 'var(--critical)' }}>60+ ppm (Menyengat)</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {nh3Info.action}
                        </p>
                      </div>

                      <details className="text-xs card-inset p-2.5">
                        <summary className="font-bold cursor-pointer min-h-[36px] flex items-center">Detail Kalibrasi Sensor MQ-135</summary>
                        <p className="mt-1.5 font-mono" style={{ color: 'var(--text-secondary)' }}>
                          Pin Analog: GPIO 34 (ADC1) • ADC Terbaca: {liveRaw?.mq135Adc ?? '—'} (12-bit / 0–4095) • Skala Demo: {liveRaw?.mq135Pct ?? '—'}% ADC • Target Deteksi: Gas NH₃ (Amonia), Alkohol, Sulfida dari sampah basah.
                        </p>
                      </details>
                    </section>
                  );
                })()}

                {/* 4. KARTU GAS METANA & RISIKO API (MQ-4) */}
                {(() => {
                  const ch4 = selectedNode?.methanePpmMQ4 ?? 0;
                  const ch4Info = getMethaneInfo(ch4);
                  return (
                    <section aria-label="Sensor gas metana dan risiko kebakaran" className="reveal card p-5 space-y-4" style={{ ['--d' as string]: '240ms' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: ch4Info.badgeBg, color: ch4Info.color }}>
                            <Flame className="w-5 h-5" aria-hidden />
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              Sensor Gas MQ-4 (CH₄ / Biometana)
                            </span>
                            <h3 className="font-display text-lg font-extrabold tracking-tight">GAS METANA (RISIKO API)</h3>
                          </div>
                        </div>
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-extrabold border"
                          style={{ backgroundColor: ch4Info.badgeBg, color: ch4Info.color, borderColor: ch4Info.borderColor }}
                        >
                          {ch4Info.status}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-5xl font-black tabular-nums tracking-tight" style={{ color: ch4Info.color }}>
                          {ch4}
                        </span>
                        <span className="text-base font-semibold" style={{ color: 'var(--text-secondary)' }}>ppm (CH₄ Concentration)</span>
                      </div>

                      {/* Visual Meter Bar */}
                      <div className="space-y-1.5">
                        <div className="w-full h-3.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${ch4Info.percent}%`,
                              backgroundColor: ch4Info.color,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs font-mono font-medium" style={{ color: 'var(--text-muted)' }}>
                          <span>0 ppm (Aman)</span>
                          <span style={{ color: 'var(--warning)' }}>100 ppm (Waspada)</span>
                          <span style={{ color: 'var(--critical)' }}>250+ ppm (BAHAYA API)</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {ch4Info.action}
                        </p>
                      </div>

                      <details className="text-xs card-inset p-2.5">
                        <summary className="font-bold cursor-pointer min-h-[36px] flex items-center">Detail Kalibrasi Sensor MQ-4</summary>
                        <p className="mt-1.5 font-mono" style={{ color: 'var(--text-secondary)' }}>
                          Pin Analog: GPIO 35 (ADC1) • ADC Terbaca: {liveRaw?.mq4Adc ?? '—'} (12-bit / 0–4095) • Skala Demo: {liveRaw?.mq4Pct ?? '—'}% ADC • Ambang Bahaya LEL (Lower Explosive Limit) Gas Rawa/Biometana.
                        </p>
                      </details>
                    </section>
                  );
                })()}

                {/* 5. KARTU SUPLAI DAYA & PANEL SURYA (FULL WIDTH) */}
                {(() => {
                  const battVolt = selectedNode?.batteryVoltage ?? 0;
                  const battPct = selectedNode?.batteryPercent ?? 0;
                  const solarStatus = selectedNode?.solarStatus ?? 'Night Mode';
                  const isCharging = solarStatus === 'Charging (Terik)';
                  const battColor = battPct > 40 ? 'var(--success)' : battPct > 20 ? 'var(--warning)' : 'var(--critical)';

                  return (
                    <section aria-label="Sistem suplai daya baterai dan panel surya" className="reveal card p-5 md:col-span-2 space-y-4" style={{ ['--d' as string]: '280ms' }}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                            <Sun className="w-5 h-5" aria-hidden />
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              Power Management System (IoT Standalone)
                            </span>
                            <h3 className="font-display text-lg font-extrabold tracking-tight">DAYA BATERAI & PANEL SURYA</h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-extrabold border flex items-center gap-1.5"
                            style={{
                              backgroundColor: isCharging ? 'var(--success-bg)' : 'var(--bg-tertiary)',
                              color: isCharging ? 'var(--success)' : 'var(--text-secondary)',
                              borderColor: isCharging ? 'var(--success)' : 'var(--border)',
                            }}
                          >
                            <Zap className="w-3.5 h-3.5" /> {solarStatus}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                        {/* Status Baterai */}
                        <div className="card-inset p-3.5 space-y-2">
                          <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Status Baterai 18650</span>
                          <div className="flex items-baseline gap-2">
                            <span className="font-display text-3xl font-black tabular-nums" style={{ color: battColor }}>
                              {battPct}%
                            </span>
                            <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>({battVolt} V)</span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${battPct}%`, backgroundColor: battColor }} />
                          </div>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{interpretBattery(battVolt)}</p>
                        </div>

                        {/* Modul Solar CN3065 */}
                        <div className="card-inset p-3.5 space-y-2">
                          <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Solar Charge CN3065</span>
                          <p className="font-display text-3xl font-black tabular-nums" style={{ color: isCharging ? 'var(--success)' : 'var(--text-primary)' }}>
                            {selectedNode?.solarCurrentMa ?? 0} <span className="text-base font-bold">mA</span>
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {isCharging
                              ? 'Panel surya aktif mengisi daya baterai cadangan.'
                              : 'Arus pengisian rendah (kondisi berawan atau malam).'}
                          </p>
                        </div>

                        {/* Pemanas Sensor Pulsed Heating */}
                        <div className="card-inset p-3.5 space-y-2">
                          <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Pemanas Sensor MQ</span>
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded text-xs font-extrabold"
                              style={{
                                backgroundColor: selectedNode?.pulsedHeatingActive ? 'var(--warning-bg)' : 'var(--bg-primary)',
                                color: selectedNode?.pulsedHeatingActive ? 'var(--warning)' : 'var(--text-muted)',
                              }}
                            >
                              {selectedNode?.pulsedHeatingActive ? 'PULSED HEATING ON' : 'STANDBY (HEMAT DAYA)'}
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Metode siklus pemanas berdenyut menghemat daya baterai hingga 80% pada sensor MQ-135/MQ-4.
                          </p>
                        </div>
                      </div>
                    </section>
                  );
                })()}
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
          className="border-t py-4 px-4 text-center text-sm font-semibold"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-strong)', borderTopWidth: 2, color: 'var(--text-secondary)' }}
        >
          <span className="font-display font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>SUGENG</span> — Sistem Cerdas Angkut Sampah Kota Magelang • Dinas Lingkungan Hidup • Data diperbarui otomatis
        </footer>
      </div>
    </div>
  );
};

export default SugengDashboard;
