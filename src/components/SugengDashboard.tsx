import React, { useState, useEffect, useRef } from 'react';
import type { ScenarioNode, TPSNode } from '../data/dummyData';
import {
  CANONICAL_SCENARIO,
  fmt,
  freshness,
  statusLabel,
  tpsNodeToScenarioNode,
  normalizeNodeId,
  INITIAL_CVRP_SOLUTION,
} from '../data/dummyData';
import {
  fetchInitialNodes,
  subscribeToRealtime,
  type RealtimeConnectionState,
} from '../lib/supabaseRealtime';
import {
  connectSerial,
  disconnectSerial,
  isSerialSupported,
  connectBridge,
  disconnectBridge,
  isBridgeAvailable,
} from '../lib/liveSerial';
import type { LiveSensorPayload } from '../lib/liveSensor';
import { InteractiveMap } from './InteractiveMap';

interface TelemetryLogEntry {
  id: string;
  time: string;
  source: 'Cloud WSS' | 'Bridge WSS' | 'USB Serial' | 'System';
  nodeId: string;
  detail: string;
}

// Komponen Indikator Tempat Sampah (Visual Waste Bin Gauge)
interface BinProps {
  fill: number;
  operational: 'critical' | 'warning' | 'safe';
  id?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
}

const TrashBinSvg: React.FC<BinProps> = ({
  fill,
  operational,
  id = 'default',
  width = 64,
  height = 92,
  className = 'bin-svg',
}) => {
  const fillPct = Math.max(0, Math.min(100, fill));
  // Rentang ketinggian sampah: dari Y=80 (kosong) hingga Y=29 (penuh), rentang tinggi = 51px
  const fillH = (fillPct / 100) * 51;
  const topY = 80 - fillH;

  const fillColor =
    operational === 'critical'
      ? '#C94E47'
      : operational === 'warning'
      ? '#B77924'
      : '#176B49';

  const strokeColor =
    operational === 'critical'
      ? '#A83D38'
      : operational === 'warning'
      ? '#94601A'
      : '#115238';

  const clipId = `bin-clip-${id}`;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 64 92"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`Ilustrasi tingkat pengisian tempat sampah: ${fmt(fill)}%`}
    >
      {/* Handle */}
      <path d="M25 7H39" stroke="#8C9B90" strokeWidth="3" strokeLinecap="round" />
      <path d="M27 7V11H37V7" fill="#D9E2DB" stroke="#AAB9AD" />

      {/* Lid */}
      <path d="M9 13H55L53 19H11L9 13Z" fill="#D9E2DB" stroke="#AAB9AD" strokeWidth="1.5" />
      <path d="M7 12H57" stroke="#8C9B90" strokeWidth="2.5" strokeLinecap="round" />

      {/* Bin body */}
      <path d="M13 20H51L47 83H17L13 20Z" fill="#F0F3F0" stroke="#AAB9AD" strokeWidth="1.5" />

      {/* Trash fill */}
      <defs>
        <clipPath id={clipId}>
          <path d="M15 29H49L45.5 80H18.5L15 29Z" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {fillPct > 0 && (
          <>
            <rect
              x="13"
              y={topY}
              width="38"
              height={fillH + 4}
              fill={fillColor}
              opacity="0.88"
            />
            <line
              x1="14"
              y1={topY}
              x2="50"
              y2={topY}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
          </>
        )}
      </g>

      {/* Side details */}
      <path d="M21 27L23 77M43 27L41 77" stroke="#D0DAD2" strokeWidth="1.5" strokeLinecap="round" />

      {/* Bottom */}
      <path d="M18 85H46" stroke="#8C9B90" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
};

export type NavSection = 'Pusat Operasi' | 'Logistik Armada' | 'Diagnostik IoT' | 'Inventaris';

export interface SugengDashboardProps {
  initialNav?: NavSection;
}

export const SugengDashboard: React.FC<SugengDashboardProps> = ({ initialNav = 'Pusat Operasi' }) => {
  // 1. Data Node TPS Utama
  const [nodes, setNodes] = useState<ScenarioNode[]>(CANONICAL_SCENARIO);
  const [selectedId, setSelectedId] = useState<string>('NODE-05');
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'sanitation' | 'delayed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSpecial, setShowSpecial] = useState<boolean>(true);
  const [fitTrigger, setFitTrigger] = useState<number>(0);
  const [activeNav, setActiveNav] = useState<NavSection>(initialNav);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 2. State Koneksi Supabase Realtime WSS
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionState>('connecting');
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<string>('Memulai...');

  // 3. State Koneksi Hardware Lokal (Bridge ws://127.0.0.1:5050 / Web Serial)
  const [hardwareStatus, setHardwareStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [hardwareTransport, setHardwareTransport] = useState<'bridge' | 'serial' | null>(null);
  const [hardwarePayload, setHardwarePayload] = useState<LiveSensorPayload | null>(null);
  const [hardwareLastPacket, setHardwareLastPacket] = useState<string>('');
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLogEntry[]>([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      source: 'System',
      nodeId: 'SYSTEM',
      detail: 'Sistem SUGENG diinisialisasi. Menunggu aliran telemetri sensor.',
    },
  ]);

  // 4. State Dispatch Armada Logistik (CVRP)
  const [cvrpSolution, setCvrpSolution] = useState(INITIAL_CVRP_SOLUTION);
  const [dispatchStatus, setDispatchStatus] = useState<'standby' | 'dispatched'>('standby');
  const [spjNumber, setSpjNumber] = useState<string | null>(null);
  const [spjTimestamp, setSpjTimestamp] = useState<string | null>(null);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Helper navigasi multi-halaman
  const navigateTo = (nav: NavSection) => {
    setActiveNav(nav);
    if (typeof window !== 'undefined') {
      const navUrls: Record<NavSection, string> = {
        'Pusat Operasi': '/',
        'Logistik Armada': '/logistik-armada',
        'Diagnostik IoT': '/diagnostik-iot',
        'Inventaris': '/inventaris',
      };
      const targetUrl = navUrls[nav];
      if (window.location.pathname !== targetUrl && window.location.pathname !== targetUrl + '/') {
        window.history.pushState({}, '', targetUrl);
      }
    }
  };

  // Sinkronisasi navigasi dari URL path browser & tombol Back/Forward
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const getNavFromPath = (pathname: string): NavSection | null => {
        const clean = pathname.replace(/\/$/, '') || '/';
        if (clean === '/logistik-armada' || clean === '/logistik') return 'Logistik Armada';
        if (clean === '/diagnostik-iot' || clean === '/diagnostik') return 'Diagnostik IoT';
        if (clean === '/inventaris') return 'Inventaris';
        if (clean === '' || clean === '/' || clean === '/index.html') return 'Pusat Operasi';
        return null;
      };

      const pathNav = getNavFromPath(window.location.pathname);
      if (pathNav && pathNav !== activeNav) {
        setActiveNav(pathNav);
      }

      const handlePopState = () => {
        const pNav = getNavFromPath(window.location.pathname);
        if (pNav) {
          setActiveNav(pNav);
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  // Update document title saat tab berubah
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const titles: Record<NavSection, string> = {
        'Pusat Operasi': 'SUGENG: Pusat Operasi & Pemantauan TPS Kota Magelang',
        'Logistik Armada': 'SUGENG: Logistik Armada & Optimasi Rute CVRP',
        'Diagnostik IoT': 'SUGENG: Diagnostik Telemetri Sensor IoT',
        'Inventaris': 'SUGENG: Inventaris Master TPS Kota Magelang',
      };
      if (titles[activeNav]) {
        document.title = titles[activeNav];
      }
    }
  }, [activeNav]);

  const addTelemetryLog = (source: TelemetryLogEntry['source'], nodeId: string, detail: string) => {
    const newEntry: TelemetryLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      time: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      source,
      nodeId,
      detail,
    };
    setTelemetryLogs((prev) => [newEntry, ...prev.slice(0, 49)]);
  };

  // Helper untuk menerapkan telemetri live ke state node
  const applyLiveSensorPayload = (payload: LiveSensorPayload, source: 'Cloud WSS' | 'Bridge WSS' | 'USB Serial') => {
    const rawTargetId = payload.nodeId || 'NODE-05';
    const targetId = normalizeNodeId(rawTargetId);
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';

    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === targetId || (n.dbId && normalizeNodeId(n.dbId) === targetId)) {
          const dist = payload.measuredDistanceCm ?? n.distance;
          const fill =
            payload.currentVolumePercent ??
            Math.min(100, Math.max(0, ((95 - dist) / 75) * 100));
          const volPct = Math.round(fill * 0.98 * 10) / 10;
          const liters = Math.round((volPct / 100) * 120 * 10) / 10;
          const gas =
            payload.mq135Pct ??
            (payload.gasPpmMQ135 ? Math.round(payload.gasPpmMQ135) : n.gas);
          const adc = payload.mq135Adc ?? Math.round((gas / 100) * 4095);
          const op = fill >= 75 ? 'critical' : fill >= 50 ? 'warning' : 'safe';
          const sanitation = gas >= 60;

          return {
            ...n,
            distance: Math.round(dist * 10) / 10,
            fill: Math.round(fill * 10) / 10,
            volumePct: volPct,
            liters,
            gas,
            adc,
            operational: op,
            sanitation,
            age: 0,
            temp: payload.temperatureCelsius ?? n.temp,
            humidity: payload.humidityPercent ?? n.humidity,
            methanePpm: payload.methanePpmMQ4 ?? n.methanePpm,
            methaneAdc: payload.mq4Adc ?? n.methaneAdc,
            batteryVolt: payload.batteryVoltage ?? n.batteryVolt,
            batteryPct: payload.batteryPercent ?? n.batteryPct,
            lastTelemetryText: `${nowTime} (${source})`,
            provenance: source === 'Cloud WSS' ? 'db' : source === 'Bridge WSS' ? 'live-bridge' : 'live-serial',
          };
        }
        return n;
      })
    );

    setHardwarePayload(payload);
    setHardwareLastPacket(`${nowTime} (${source})`);
    addTelemetryLog(
      source,
      targetId,
      `Telemetri diterima: Vol ${payload.currentVolumePercent ?? '-'}%, Jarak ${payload.measuredDistanceCm ?? '-'} cm, MQ-135 ${payload.mq135Pct ?? payload.gasPpmMQ135 ?? '-'}, Suhu ${payload.temperatureCelsius ?? '-'}°C`
    );
  };

  // ==========================================
  // EFEK 1: INITIAL SNAPSHOT & SUPABASE REALTIME
  // ==========================================
  useEffect(() => {
    let isMounted = true;

    // A. Ambil snapshot data awal dari database Supabase
    fetchInitialNodes().then((dbNodes) => {
      if (!isMounted) return;
      if (dbNodes && dbNodes.length > 0) {
        console.log(`[SUGENG DB] Sinkronisasi ${dbNodes.length} node dari Supabase berhasil.`);
        const mappedNodes = dbNodes.map((dbn) => tpsNodeToScenarioNode(dbn));
        setNodes(mappedNodes);
        const nowStr = new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';
        setLastRealtimeUpdate(nowStr);
        addTelemetryLog('Cloud WSS', 'SUPABASE_DB', `Berhasil memuat snapshot ${dbNodes.length} TPS dari Postgres.`);
      }
    });

    // B. Langganan WebSocket Realtime Supabase (tps_nodes & telemetry_logs)
    const unsubscribe = subscribeToRealtime({
      onStatusChange: (status) => {
        if (!isMounted) return;
        setRealtimeStatus(status);
        if (status === 'connected') {
          setLastRealtimeUpdate(new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB');
          addTelemetryLog('Cloud WSS', 'SUPABASE_WSS', 'WebSocket channel sugeng-dashboard-realtime terhubung aktif.');
        } else if (status === 'error' || status === 'disconnected') {
          addTelemetryLog('Cloud WSS', 'SUPABASE_WSS', `Status koneksi WebSocket: ${status}`);
        }
      },
      onNodeChange: (updatedTpsNode) => {
        if (!isMounted) return;
        const mapped = tpsNodeToScenarioNode(updatedTpsNode);
        setNodes((prev) =>
          prev.map((n) => (n.id === mapped.id || n.dbId === updatedTpsNode.id ? { ...n, ...mapped } : n))
        );
        const timeNow = new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';
        setLastRealtimeUpdate(timeNow);
        addTelemetryLog('Cloud WSS', updatedTpsNode.id, `Update baris TPS: ${updatedTpsNode.name} -> Vol ${updatedTpsNode.currentVolumePercent}%`);
        showToast(`Update Realtime: ${updatedTpsNode.name} (${updatedTpsNode.currentVolumePercent}%)`);
      },
      onTelemetryInsert: (payload) => {
        if (!isMounted) return;
        applyLiveSensorPayload(payload, 'Cloud WSS');
      },
    });

    // C. Cek apakah serial bridge lokal (ws://127.0.0.1:5050) sudah aktif, jika ya hubungkan otomatis!
    isBridgeAvailable().then((available) => {
      if (!isMounted) return;
      if (available) {
        console.log('[HARDWARE] Local WebSocket Bridge terdeteksi di ws://127.0.0.1:5050. Menyambungkan...');
        setHardwareStatus('connecting');
        connectBridge(
          (payload) => {
            if (isMounted) applyLiveSensorPayload(payload, 'Bridge WSS');
          },
          (errMsg) => {
            if (isMounted) {
              setHardwareStatus('disconnected');
              setHardwareTransport(null);
            }
          }
        )
          .then(() => {
            if (isMounted) {
              setHardwareStatus('connected');
              setHardwareTransport('bridge');
              showToast('Hardware ESP32 terhubung via WebSocket Bridge lokal (ws://127.0.0.1:5050)!');
              addTelemetryLog('Bridge WSS', 'NODE-05', 'WebSocket Bridge lokal aktif pada port 5050.');
            }
          })
          .catch(() => {
            if (isMounted) setHardwareStatus('disconnected');
          });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      disconnectBridge();
      disconnectSerial();
    };
  }, []);

  // Handler toggle koneksi hardware manual (Bridge / USB Serial)
  const handleToggleHardware = async () => {
    if (hardwareStatus === 'connected' || hardwareStatus === 'connecting') {
      disconnectBridge();
      await disconnectSerial();
      setHardwareStatus('disconnected');
      setHardwareTransport(null);
      showToast('Koneksi hardware ESP32 diputuskan.');
      addTelemetryLog('System', 'HARDWARE', 'Koneksi sensor fisik diputuskan oleh operator.');
      return;
    }

    setHardwareStatus('connecting');
    showToast('Mencoba menghubungkan sensor ESP32...');

    // 1. Prioritaskan Bridge WebSocket lokal (ws://127.0.0.1:5050)
    const bridgeOk = await isBridgeAvailable();
    if (bridgeOk) {
      try {
        await connectBridge(
          (payload) => applyLiveSensorPayload(payload, 'Bridge WSS'),
          (errMsg) => {
            setHardwareStatus('error');
            setHardwareTransport(null);
            showToast(`Bridge terputus: ${errMsg}`);
          }
        );
        setHardwareStatus('connected');
        setHardwareTransport('bridge');
        setSelectedId('NODE-05');
        showToast('Terhubung ke ESP32 via WebSocket Bridge lokal!');
        addTelemetryLog('Bridge WSS', 'NODE-05', 'Koneksi ws://127.0.0.1:5050 berhasil dibuka.');
        return;
      } catch (err: any) {
        console.warn('Gagal connect bridge:', err);
      }
    }

    // 2. Fallback ke Web Serial API jika didukung browser
    if (isSerialSupported()) {
      try {
        await connectSerial(
          (payload) => applyLiveSensorPayload(payload, 'USB Serial'),
          (errMsg) => {
            setHardwareStatus('error');
            setHardwareTransport(null);
            showToast(`Serial terputus: ${errMsg}`);
          }
        );
        setHardwareStatus('connected');
        setHardwareTransport('serial');
        setSelectedId('NODE-05');
        showToast('Terhubung ke ESP32 via Web Serial USB!');
        addTelemetryLog('USB Serial', 'NODE-05', 'Port serial browser berhasil dibuka pada 115200 baud.');
        return;
      } catch (err: any) {
        setHardwareStatus('error');
        showToast(err.message || 'Gagal membuka port Web Serial.');
        return;
      }
    }

    setHardwareStatus('disconnected');
    showToast('Bridge ws://127.0.0.1:5050 tidak aktif dan Web Serial tidak didukung. Jalankan python3 serial_bridge.py.');
  };

  // Handler Dispatch CVRP
  const handleExecuteDispatch = () => {
    const generatedSpj = `SPJ-DLH-MGL-2026-${String(Math.floor(Math.random() * 900) + 100)}`;
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';
    setSpjNumber(generatedSpj);
    setSpjTimestamp(timeStr);
    setDispatchStatus('dispatched');

    // Update status waypoints
    setCvrpSolution((prev) => ({
      ...prev,
      waypoints: prev.waypoints.map((wp, idx) => {
        if (idx === 0) return { ...wp, status: 'Selesai' };
        if (idx === 1) return { ...wp, status: 'Menuju Lokasi' };
        return { ...wp, status: 'Pending' };
      }),
    }));

    showToast(`SPJ Berhasil Diterbitkan: ${generatedSpj} untuk ${cvrpSolution.truckId}!`);
    addTelemetryLog('System', 'DISPATCH', `SPJ ${generatedSpj} diterbitkan. Driver ${cvrpSolution.truckDriver} diberangkatkan.`);
  };

  const selectedNode = nodes.find((n) => n.id === selectedId) || nodes[0];

  // Filter manifest
  const q = searchQuery.trim().toLowerCase();
  const filteredNodes = nodes.filter((n) => {
    const matchesText = !q || `${n.id} ${n.name} ${n.address}`.toLowerCase().includes(q);
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'critical' && n.operational === 'critical') ||
      (activeFilter === 'sanitation' && n.sanitation) ||
      (activeFilter === 'delayed' && freshness(n.age) !== 'live');
    return matchesText && matchesFilter;
  });

  // KPI calculations
  const totalCount = nodes.length;
  const criticalCount = nodes.filter((n) => n.operational === 'critical').length;
  const sanitationCount = nodes.filter((n) => n.sanitation).length;
  const liveCount = nodes.filter((n) => freshness(n.age) === 'live').length;

  // Selected node computations
  const fillPct = selectedNode.fill;
  const distanceCm = selectedNode.distance;
  const wasteHeightCm = Math.max(0, 95 - distanceCm);
  const headspaceCm = distanceCm;
  const isValidRange = distanceCm >= 25 && distanceCm <= 95;
  const isNearLimit = distanceCm >= 20 && distanceCm < 25;
  const sensorStateText = isValidRange ? 'Valid' : isNearLimit ? 'Mendekati batas' : 'Di luar rentang';
  const sensorStateNote = isValidRange
    ? 'Pembacaan berada dalam rentang ukur normal.'
    : 'Pembacaan memerlukan verifikasi; jangan anggap sebagai nilai penuh tervalidasi.';

  const h = Math.max(0, Math.min(1, fillPct / 100));
  const topY = 81 - h * 52;
  const binFillColor =
    selectedNode.operational === 'critical'
      ? '#c94e47'
      : selectedNode.operational === 'warning'
      ? '#b77924'
      : '#6b9479';

  return (
    <div className="app-shell">
      {/* Topbar Navigasi Institusional */}
      <header className="topbar">
        <div className="brand" aria-label="SUGENG">
          <div className="brand-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M19.5 4.5C12.8 4.7 7.2 6.6 5 11.1c-1.2 2.4-.4 5.3 1.8 6.4 2.3 1.1 5.4.1 7-2.2 1.4-2 1.7-4.6 1.8-6.6-2.5 1.1-4.7 2.5-6.3 4.4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 20c2.7-4 6.2-6.8 10.9-9.1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <a
              href="/"
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey) {
                  e.preventDefault();
                  navigateTo('Pusat Operasi');
                }
              }}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="brand-name">SUGENG</div>
              <div className="brand-caption">WASTE OPERATIONS SYSTEM</div>
            </a>
          </div>
        </div>

        <nav className="main-nav" aria-label="Navigasi modul">
          <a
            href="/"
            className={`nav-item ${activeNav === 'Pusat Operasi' ? 'active' : ''}`}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                navigateTo('Pusat Operasi');
              }
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
              <rect x="13" y="3" width="8" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
              <rect x="13" y="10" width="8" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
              <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            Pusat Operasi
          </a>
          <a
            href="/logistik-armada"
            className={`nav-item ${activeNav === 'Logistik Armada' ? 'active' : ''}`}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                navigateTo('Logistik Armada');
              }
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <circle cx="7.5" cy="18" r="2" fill="white" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="17.5" cy="18" r="2" fill="white" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            Logistik Armada
          </a>
          <a
            href="/diagnostik-iot"
            className={`nav-item ${activeNav === 'Diagnostik IoT' ? 'active' : ''}`}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                navigateTo('Diagnostik IoT');
              }
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M9 2v5M15 2v5M9 17v5M15 17v5M2 9h5M2 15h5M17 9h5M17 15h5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            Diagnostik IoT
          </a>
          <a
            href="/inventaris"
            className={`nav-item ${activeNav === 'Inventaris' ? 'active' : ''}`}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                navigateTo('Inventaris');
              }
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12.2V21" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            Inventaris
          </a>
        </nav>

        {/* Status Koneksi Realtime WSS & Hardware ESP32 */}
        <div className="topbar-right">
          <div className="topbar-conn-group">
            {/* Indikator Cloud Supabase Realtime WSS */}
            <div className="conn-pill" title={`Supabase Realtime Channel: sugeng-dashboard-realtime (${lastRealtimeUpdate})`}>
              <span className={`dot ${realtimeStatus === 'connected' ? 'connected' : realtimeStatus === 'connecting' ? 'connecting' : 'disconnected'}`}></span>
              <span className="conn-pill-text">
                {realtimeStatus === 'connected' ? 'Cloud WSS: Aktif' : realtimeStatus === 'connecting' ? 'Cloud WSS: Sinkron...' : 'Cloud WSS: Terputus'}
              </span>
            </div>

            {/* Kontrol Hardware ESP32 Lokal (ws://127.0.0.1:5050 atau USB Serial) */}
            {hardwareStatus === 'connected' ? (
              <div className="conn-pill" style={{ background: '#eaf4ee', borderColor: '#b5d7bf' }}>
                <span className="dot connected"></span>
                <span className="conn-pill-text">ESP32 Live ({hardwareTransport === 'bridge' ? 'Bridge 5050' : 'USB'})</span>
                <button
                  onClick={handleToggleHardware}
                  style={{ background: 'transparent', border: 'none', color: '#c94e47', cursor: 'pointer', fontWeight: 700, marginLeft: 4 }}
                  title="Putuskan koneksi hardware"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                className={`conn-btn ${hardwareStatus === 'connecting' ? 'active' : ''}`}
                onClick={handleToggleHardware}
                title="Hubungkan langsung ke sensor ESP32 via WebSocket Bridge lokal atau USB Serial"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="conn-btn-text">{hardwareStatus === 'connecting' ? 'Menghubungkan...' : 'Hubungkan Sensor ESP32'}</span>
              </button>
            )}
          </div>

          <div className="user-chip" title="Operator DLH Kota Magelang">
            OP
          </div>
        </div>
      </header>

      {/* Konten Halaman */}
      <main className="page">
        {/* Heading Halaman */}
        <div className="page-heading">
          <div>
            <div className="eyebrow">DINAS LINGKUNGAN HIDUP · KOTA MAGELANG</div>
            <h1>
              {activeNav === 'Pusat Operasi' && 'Pusat operasi'}
              {activeNav === 'Logistik Armada' && 'Logistik armada & optimasi rute'}
              {activeNav === 'Diagnostik IoT' && 'Diagnostik telemetri sensor IoT'}
              {activeNav === 'Inventaris' && 'Inventaris TPS kota Magelang'}
            </h1>
            <p className="page-subtitle">
              {activeNav === 'Pusat Operasi' && 'Pantau kondisi TPS, identifikasi kebutuhan penanganan, dan tinjau kesiapan pengangkutan.'}
              {activeNav === 'Logistik Armada' && 'Pengiriman armada truk sampah berbasis algoritma CVRP dengan kalkulasi efisiensi muatan dan bahan bakar.'}
              {activeNav === 'Diagnostik IoT' && 'Pengawasan kesehatan register sensor JSN-SR04T, MQ-135, MQ-4, DHT22, dan koneksi WebSocket stream.'}
              {activeNav === 'Inventaris' && 'Daftar master seluruh titik Tempat Penampungan Sementara di wilayah Kota Magelang.'}
            </p>
          </div>
          <div className="heading-meta">
            <div className="sync-label">
              <svg className="sync-icon" width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 7v5h-5M4 17v-5h5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              Sinkronisasi: {lastRealtimeUpdate}
            </div>
            <span>
              {realtimeStatus === 'connected' ? 'Database Supabase Terkoneksi' : 'Koneksi Lokal Aktif'}
            </span>
          </div>
        </div>

        {/* Banner Catatan Skenario Demonstrasi */}
        <div className="scenario-note" role="note">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
            <path d="M12 10.5v5M12 7.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>
            {hardwareStatus === 'connected' ? (
              <strong>Sensor Fisik Aktif.</strong>
            ) : realtimeStatus === 'connected' ? (
              <strong>Data Terhubung ke Database Supabase.</strong>
            ) : (
              <strong>Data skenario demonstrasi.</strong>
            )}
            {' '}
            {hardwareStatus === 'connected'
              ? `Menerima streaming real-time dari node prototipe (${hardwarePayload?.nodeId || 'NODE-05'}) setiap 2 detik.`
              : 'Sinkronisasi cloud berjalan secara live melalui WebSocket Postgres.'}
          </span>
          <span className="scenario-id">
            {hardwareStatus === 'connected' ? 'LIVE-ESP32' : 'SIM-MGL-2026-01'}
          </span>
        </div>

        {/* Baris Ringkasan KPI Operasional */}
        <section className="kpi-row" aria-label="Ringkasan operasional">
          <div className="kpi">
            <div className="kpi-icon green">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M4 20V8l8-4 8 4v12M8 20v-6h8v6M4 9h16" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="kpi-copy">
              <div className="kpi-label">Total TPS terpantau</div>
              <div className="kpi-value">{String(totalCount).padStart(2, '0')}</div>
            </div>
            <div className="kpi-detail">
              Titik terdaftar<br />Kota Magelang
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-icon red">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M12 3 22 20H2L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M12 9v5M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="kpi-copy">
              <div className="kpi-label">Prioritas pengangkutan</div>
              <div className="kpi-value">{String(criticalCount).padStart(2, '0')}</div>
            </div>
            <div className="kpi-detail">
              Fill height<br />≥ 75%
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-icon amber">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M12 3c-3.5 4-6 6.5-6 10a6 6 0 0 0 12 0c0-3.5-2.5-6-6-10Z" stroke="currentColor" strokeWidth="1.7" />
                <path d="M9.5 14.5c.3 1.2 1.1 1.8 2.4 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            <div className="kpi-copy">
              <div className="kpi-label">Peringatan sanitasi</div>
              <div className="kpi-value">{String(sanitationCount).padStart(2, '0')}</div>
            </div>
            <div className="kpi-detail">
              Indeks emisi<br />relatif ≥ 60
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-icon blue">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            <div className="kpi-copy">
              <div className="kpi-label">Stream aktif realtime</div>
              <div className="kpi-value">{String(liveCount).padStart(2, '0')}</div>
            </div>
            <div className="kpi-detail">
              Telemetri<br />kesegaran live
            </div>
          </div>
        </section>

        {/* ========================================================
            TAB 1: PUSAT OPERASI (3-PANEL UNIFIED COCKPIT)
           ======================================================== */}
        {activeNav === 'Pusat Operasi' && (
          <section className="workspace" aria-label="Ruang kerja pusat operasi">
            {/* Panel Kiri: Manifest TPS */}
            <aside className="panel manifest-panel" aria-label="Daftar manifest TPS">
              <div className="panel-head">
                <div>
                  <div className="panel-kicker">Pemantauan lokasi</div>
                  <div className="panel-title">Manifest TPS</div>
                  <div className="panel-subtitle">Pilih lokasi untuk melihat detail</div>
                </div>
                <div className="count-label">
                  {String(filteredNodes.length).padStart(2, '0')} / {String(nodes.length).padStart(2, '0')} TITIK
                </div>
              </div>

              <div className="manifest-tools">
                <label className="searchbox">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" />
                    <path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <input
                    type="search"
                    placeholder="Cari ID, nama TPS, atau jalan..."
                    aria-label="Cari TPS"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>
                <div className="filter-row" role="group" aria-label="Filter status TPS">
                  <button
                    className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                  >
                    Semua <span>{totalCount}</span>
                  </button>
                  <button
                    className={`filter-btn ${activeFilter === 'critical' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('critical')}
                  >
                    Prioritas <span>{criticalCount}</span>
                  </button>
                  <button
                    className={`filter-btn ${activeFilter === 'sanitation' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('sanitation')}
                  >
                    Sanitasi <span>{sanitationCount}</span>
                  </button>
                  <button
                    className={`filter-btn ${activeFilter === 'delayed' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('delayed')}
                  >
                    Tertunda <span>{nodes.filter((n) => freshness(n.age) !== 'live').length}</span>
                  </button>
                </div>
              </div>

              <div className="manifest-summary">
                <span>LOKASI TPS</span>
                <span>FILL HEIGHT</span>
              </div>

              <div className="manifest-list" role="list">
                {filteredNodes.length === 0 ? (
                  <div className="empty-state">Tidak ada TPS yang sesuai dengan filter pencarian.</div>
                ) : (
                  filteredNodes.map((n) => {
                    const isSel = n.id === selectedId;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        className={`tps-row ${isSel ? 'selected' : ''}`}
                        onClick={() => setSelectedId(n.id)}
                        aria-pressed={isSel}
                      >
                        <TrashBinSvg
                          fill={n.fill}
                          operational={n.operational}
                          id={`manifest-${n.id}`}
                          width={24}
                          height={34}
                          className="mini-bin-svg"
                        />
                        <div className="tps-main">
                          <div className="tps-header-line">
                            <span className="tps-code">{n.id}</span>
                          </div>
                          <div className="tps-name" title={n.name}>{n.name}</div>
                          <div className="tps-meta">
                            <span>{n.area}</span>
                            <span className="mini-dot"></span>
                            <span>
                              {freshness(n.age) === 'live' ? 'Live' : freshness(n.age) === 'delayed' ? 'Tertunda' : 'Stale'} · {n.age}m
                            </span>
                            {n.sanitation && (
                              <>
                                <span className="mini-dot" style={{ background: '#c18a3c' }}></span>
                                <span style={{ color: '#c18a3c', fontWeight: 600 }}>Sanitasi</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="tps-value">
                          <span className="tps-percent">{fmt(n.fill)}%</span>
                          <span className={`tps-status ${n.operational}`}>
                            {statusLabel(n.operational)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="manifest-foot">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c18a3c', display: 'inline-block' }}></span>
                Umur data mengikuti interval telemetri sensor 2 menit.
              </div>
            </aside>

            {/* Panel Tengah: Peta Interaktif GIS */}
            <section className="panel map-panel" aria-label="Visualisasi spasial TPS">
              <div className="map-head">
                <div className="map-title-block">
                  <h2>Pemetaan TPS & rute pengangkutan</h2>
                  <div className="map-subtitle">
                    KOTA MAGELANG · KOORDINAT EPSG:4326 · BASEMAP CARTO VOYAGER
                  </div>
                </div>
                <div className="map-actions">
                  <button
                    className={`small-btn ${showSpecial ? 'active' : ''}`}
                    onClick={() => setShowSpecial((v) => !v)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" />
                      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" />
                      <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" />
                      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                    <span>Fasilitas</span>
                  </button>
                  <button
                    className={`small-btn ${selectedId === 'NODE-05' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedId('NODE-05');
                      showToast('Fokus ke Kampus Tuguran UNTIDAR (-7.459694, 110.216861)');
                    }}
                    title="Fokus ke Kampus Tuguran UNTIDAR (-7.459694, 110.216861)"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                    <span>Kampus Tuguran</span>
                  </button>
                  <button
                    className="small-btn"
                    onClick={() => setFitTrigger((n) => n + 1)}
                    title="Pusatkan peta ke seluruh titik TPS"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                    <span>Reset pusat</span>
                  </button>
                </div>
              </div>

              {/* Peta Interaktif Leaflet GIS (Full Height/Width di dalam Card) */}
              <InteractiveMap
                nodes={nodes}
                selectedId={selectedId}
                onSelectNode={(id) => setSelectedId(id)}
                showSpecial={showSpecial}
                fitTrigger={fitTrigger}
                hardwareActive={hardwareStatus === 'connected'}
              />

              {/* Preview Rute Pengangkutan CVRP Terpadu */}
              <div className="route-preview">
                <div className="route-stat">
                  <label>Rute teroptimasi</label>
                  <strong>{cvrpSolution.routeId}</strong>
                </div>
                <div className="route-stat">
                  <label>Estimasi jarak tempuh</label>
                  <strong>{fmt(cvrpSolution.totalDistanceKm)} km</strong>
                </div>
                <div className="route-stat">
                  <label>Efisiensi jarak</label>
                  <strong style={{ color: 'var(--green)' }}>-{fmt(cvrpSolution.distanceSavedKm)} km (-43,7%)</strong>
                </div>
                <div className="route-stat">
                  <label>Penghematan solar</label>
                  <strong style={{ color: 'var(--green)' }}>{fmt(cvrpSolution.fuelSavedLiters)} Liter</strong>
                </div>
              </div>
            </section>

            {/* Panel Kanan: Inspector Node Terpilih */}
            <aside className="panel inspector-panel" aria-label="Detail TPS terpilih">
              <div className="inspector-top">
                <h2>{selectedNode.name}</h2>
                <div className="inspector-sub">
                  {selectedNode.area} · {selectedNode.id}
                </div>
                <div className="status-line">
                  <span className={`status-tag ${selectedNode.operational}`}>
                    <span>●</span>
                    {statusLabel(selectedNode.operational).toUpperCase()}
                  </span>
                  {selectedNode.sanitation && (
                    <span className="status-tag sanitation">INDIKASI SANITASI</span>
                  )}
                  <span className="status-tag" style={{ background: '#f0f4f1', color: '#627368' }}>
                    {freshness(selectedNode.age).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="inspector-content">
                {/* Seksi 1: Keterisian Wadah */}
                <section className="info-section">
                  <div className="section-heading">
                    <h3>Kondisi keterisian wadah</h3>
                    <span className="section-hint">JSN-SR04T</span>
                  </div>
                  <div className="fill-main">
                    <div
                      className="fill-number"
                      style={{
                        color:
                          selectedNode.operational === 'critical'
                            ? 'var(--red)'
                            : selectedNode.operational === 'warning'
                            ? 'var(--amber)'
                            : 'var(--green)',
                      }}
                    >
                      {fmt(selectedNode.fill)}%
                    </div>
                    <div className="fill-caption">
                      Fill height
                      <br />
                      <strong>
                        {selectedNode.operational === 'critical'
                          ? 'Prioritas pengangkutan'
                          : selectedNode.operational === 'warning'
                          ? 'Dalam pemantauan'
                          : 'Kondisi terkendali'}
                      </strong>
                    </div>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(selectedNode.fill, 100)}%`,
                        background:
                          selectedNode.operational === 'critical'
                            ? 'var(--red)'
                            : selectedNode.operational === 'warning'
                            ? 'var(--amber)'
                            : 'var(--green)',
                      }}
                    ></div>
                  </div>
                  <div className="fill-details">
                    <div className="detail-cell">
                      <label>Estimasi volume</label>
                      <strong>{fmt(selectedNode.liters)} L</strong>
                    </div>
                    <div className="detail-cell">
                      <label>Jarak pantul</label>
                      <strong>{fmt(selectedNode.distance)} cm</strong>
                    </div>
                  </div>

                  {/* Skematik Wadah Tempat Sampah */}
                  <div className="bin-visual-row">
                    <TrashBinSvg
                      fill={selectedNode.fill}
                      operational={selectedNode.operational}
                      id={`inspector-${selectedNode.id}`}
                      width={52}
                      height={78}
                      className="bin-svg"
                    />
                    <div className="bin-legend">
                      <div className="bin-legend-row">
                        <span>Tinggi sampah</span>
                        <strong>{fmt(wasteHeightCm)} cm</strong>
                      </div>
                      <div className="bin-legend-row">
                        <span>Zona buta sensor</span>
                        <strong>20,0 cm</strong>
                      </div>
                      <div className="bin-legend-row">
                        <span>Headspace</span>
                        <strong>{fmt(headspaceCm)} cm</strong>
                      </div>
                      <div className="bin-legend-row">
                        <span>Status pembacaan</span>
                        <strong>{sensorStateText}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="sensor-state">
                    <span className="dot"></span>
                    <span>{sensorStateNote}</span>
                  </div>
                </section>

                {/* Seksi 2: Udara Headspace */}
                <section className="info-section">
                  <div className="section-heading">
                    <h3>Kondisi udara headspace</h3>
                    <span className="section-hint">DHT22</span>
                  </div>
                  <div className="env-grid">
                    <div className="env-item">
                      <label>Suhu udara</label>
                      <strong>{selectedNode.temp ? fmt(selectedNode.temp) : '31,5'}°C</strong>
                      <span>Ruang atas wadah</span>
                    </div>
                    <div className="env-item">
                      <label>Kelembapan udara</label>
                      <strong>{selectedNode.humidity ? fmt(selectedNode.humidity) : '65,4'}%</strong>
                      <span>Relative humidity</span>
                    </div>
                  </div>
                </section>

                {/* Seksi 3: Indikator Gas Emisi Relatif */}
                <section className="info-section">
                  <div className="section-heading">
                    <h3>Indikator emisi relatif</h3>
                    <span className="section-hint">BUKAN PPM TERKALIBRASI</span>
                  </div>
                  <div className="gas-row">
                    <div>
                      <div className="gas-name">MQ-135 · Indeks emisi relatif</div>
                      <div className="gas-sub">Raw ADC: {selectedNode.adc} / 4095</div>
                    </div>
                    <div className="gas-right">
                      <span className="gas-score">{selectedNode.gas}/100</span>
                      <div className="gas-mini">
                        <span
                          style={{
                            width: `${selectedNode.gas}%`,
                            background: selectedNode.sanitation ? '#c18a3c' : '#8ea294',
                          }}
                        ></span>
                      </div>
                    </div>
                  </div>
                  <div className="gas-row">
                    <div>
                      <div className="gas-name">MQ-4 · Metana</div>
                      <div className="gas-sub">
                        {selectedNode.methanePpm
                          ? `Raw ADC: ${selectedNode.methaneAdc || 850} · ${selectedNode.methanePpm} ppm`
                          : 'Monitoring aktif'}
                      </div>
                    </div>
                    <div className="gas-right">
                      <span className="gas-score">
                        {selectedNode.methanePpm ? `${Math.round(selectedNode.methanePpm / 5)}/100` : '18/100'}
                      </span>
                    </div>
                  </div>
                  <div className="sensor-state">
                    <span className="dot" style={{ background: selectedNode.sanitation ? '#c18a3c' : '#7c9b85' }}></span>
                    <span>
                      {selectedNode.sanitation
                        ? 'Indeks melewati ambang batas (≥60). Perlu verifikasi sanitasi; bukan bukti konsentrasi gas terkalibrasi.'
                        : 'Indeks berada di bawah ambang peringatan. Ini bukan sertifikasi kualitas udara.'}
                    </span>
                  </div>
                </section>

                {/* Seksi 4: Kesehatan Perangkat Hardware */}
                <section className="info-section">
                  <div className="section-heading">
                    <h3>Kesehatan perangkat</h3>
                    <span className="section-hint">ESP32 HARDWARE</span>
                  </div>
                  {selectedNode.id === 'NODE-05' && hardwareStatus === 'connected' ? (
                    <div className="env-grid" style={{ marginBottom: 8 }}>
                      <div className="env-item">
                        <label>Tegangan Baterai</label>
                        <strong style={{ color: 'var(--green)' }}>3,95 V</strong>
                        <span>Li-Ion 18650</span>
                      </div>
                      <div className="env-item">
                        <label>Status Sambungan</label>
                        <strong style={{ color: 'var(--green)' }}>Live Streaming</strong>
                        <span>{hardwareTransport === 'bridge' ? 'Bridge 5050' : 'Web Serial'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="power-unavailable">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flex: '0 0 auto' }}>
                        <rect x="3" y="7" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
                        <path d="M7 11h5M7 14h2M21 10h1.5v5H21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      </svg>
                      <span>
                        Telemetry tegangan baterai aktual hanya tersedia pada node prototipe (NODE-05 Kampus Tuguran).
                      </span>
                    </div>
                  )}
                </section>

                {/* Seksi 5: Informasi Data & Provenance */}
                <section className="info-section">
                  <div className="section-heading">
                    <h3>Informasi data</h3>
                    <span className="section-hint">PROVENANCE</span>
                  </div>
                  <div className="telemetry-meta">
                    <span>Sumber Data</span>
                    <strong>{selectedNode.lastTelemetryText || (selectedNode.id === 'NODE-05' ? 'LIVE-NODE-05' : 'Postgres Supabase')}</strong>
                  </div>
                  <div className="telemetry-meta">
                    <span>Status Kesegaran</span>
                    <strong>{freshness(selectedNode.age).toUpperCase()} · {selectedNode.provenance === 'db' ? 'Cloud WSS' : selectedNode.provenance?.includes('live') ? 'Hardware Live' : 'Simulasi'}</strong>
                  </div>
                  <div className="telemetry-meta">
                    <span>Koordinat Geografis (DD)</span>
                    <strong style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>
                      {selectedNode.lat.toFixed(6)}, {selectedNode.lng.toFixed(6)}
                    </strong>
                  </div>
                </section>
              </div>

              {/* Aksi Penugasan Bawah */}
              <div className="inspector-action">
                <button
                  className="primary-btn"
                  onClick={() => {
                    navigateTo('Logistik Armada');
                    showToast(`Membuka rute logistik untuk penanganan ${selectedNode.name}.`);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 12h18M13 5l7 7-7 7"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Tinjau penugasan armada di Logistik
                </button>
                <div className="action-note">
                  Membuka modul CVRP untuk mengonfigurasi penugasan supir dan penerbitan SPJ resmi.
                </div>
              </div>
            </aside>
          </section>
        )}

        {/* ========================================================
            TAB 2: LOGISTIK ARMADA (CVRP ROUTE OPTIMIZATION & DISPATCH)
           ======================================================== */}
        {activeNav === 'Logistik Armada' && (
          <div className="module-container">
            <div className="grid-2col">
              {/* Kolom Kiri: Kartu Armada & SPJ Dispatch */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="module-card">
                  <div className="module-card-head">
                    <h2>Penugasan Armada Pengangkut</h2>
                    <span className="meta">{cvrpSolution.routeId}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 9,
                        background: '#e8f4ed',
                        color: 'var(--green)',
                        display: 'grid',
                        placeItems: 'center',
                        flex: '0 0 auto',
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                        <circle cx="7.5" cy="18" r="2" fill="white" stroke="currentColor" strokeWidth="1.8" />
                        <circle cx="17.5" cy="18" r="2" fill="white" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1a2b20' }}>
                        {cvrpSolution.truckId}
                      </h3>
                      <div style={{ fontSize: 11, color: '#68796e', marginTop: 3 }}>
                        Supir & Petugas: <strong>{cvrpSolution.truckDriver}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                      <span style={{ color: '#5f7065' }}>Kapasitas Muatan Bak:</span>
                      <strong>
                        {cvrpSolution.assignedLoadLiters} L / {cvrpSolution.truckCapacityLiters} L (
                        {Math.round((cvrpSolution.assignedLoadLiters / cvrpSolution.truckCapacityLiters) * 100)}%)
                      </strong>
                    </div>
                    <div className="progress-track" style={{ height: 8 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.round((cvrpSolution.assignedLoadLiters / cvrpSolution.truckCapacityLiters) * 100)}%`,
                          background: 'var(--green)',
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Ringkasan Penghematan CVRP */}
                  <div className="cvrp-summary-grid">
                    <div>
                      <div className="summary-label">Jarak Teroptimasi</div>
                      <div className="summary-val">
                        {fmt(cvrpSolution.totalDistanceKm)} km
                      </div>
                      <div className="summary-sub" style={{ color: 'var(--green)', fontWeight: 600 }}>Hemat 43,7%</div>
                    </div>
                    <div>
                      <div className="summary-label">Penghematan BBM</div>
                      <div className="summary-val" style={{ color: 'var(--green)' }}>
                        {fmt(cvrpSolution.fuelSavedLiters)} L
                      </div>
                      <div className="summary-sub">Solar Industri</div>
                    </div>
                    <div>
                      <div className="summary-label">Reduksi Emisi</div>
                      <div className="summary-val" style={{ color: '#2a5a3f' }}>
                        {fmt(cvrpSolution.co2SavedKg)} kg
                      </div>
                      <div className="summary-sub">CO2 Ekivalen</div>
                    </div>
                  </div>

                  {/* Tombol Terbitkan SPJ */}
                  {dispatchStatus === 'dispatched' ? (
                    <div
                      style={{
                        padding: 14,
                        background: '#eaf4ee',
                        border: '1px solid #b7dbbf',
                        borderRadius: 7,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#176b49', marginBottom: 4 }}>
                        ✓ SPJ Diterbitkan & Rute Terkirim ke Supir
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: '#233529' }}>
                        {spjNumber}
                      </div>
                      <div style={{ fontSize: 9.5, color: '#64776b', marginTop: 4 }}>
                        Diberangkatkan pada {spjTimestamp}. Petugas armada siap bergerak.
                      </div>
                    </div>
                  ) : (
                    <div>
                      <button
                        className="primary-btn"
                        onClick={handleExecuteDispatch}
                        style={{ height: 42, fontSize: 11 }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Terbitkan SPJ & Notifikasi Supir
                      </button>
                      <div className="action-note">
                        Menerbitkan Surat Perintah Jalan resmi Dinas Lingkungan Hidup dan mengunci rute armada.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Kolom Kanan: Urutan Waypoint CVRP */}
              <div className="module-card">
                <div className="module-card-head">
                  <h2>Urutan Pemberhentian Armada (Closed-Loop)</h2>
                  <span className="meta">7 Titik Kunjungan</span>
                </div>

                <div className="mobile-table-hint">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Geser tabel ke samping untuk melihat rincian waypoint armada</span>
                </div>

                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Lokasi / Titik Kunjungan</th>
                        <th>Muatan</th>
                        <th>Total</th>
                        <th>Jadwal</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cvrpSolution.waypoints.map((wp) => (
                        <tr key={wp.step}>
                          <td style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{wp.step}</td>
                          <td>
                            <strong>{wp.title}</strong>
                            <div style={{ fontSize: 9, color: '#6d7e73', marginTop: 1 }}>
                              {wp.type === 'depot' ? 'Depot Pusat DLH' : wp.type === 'landfill' ? 'TPA Banyuurip' : 'TPS Prioritas'}
                            </div>
                          </td>
                          <td style={{ fontFamily: 'var(--mono)' }}>
                            {wp.pickupVolumeLiters > 0 ? `+${wp.pickupVolumeLiters} L` : '-'}
                          </td>
                          <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>
                            {wp.cumulativeLoadLiters} L
                          </td>
                          <td style={{ fontFamily: 'var(--mono)', color: '#526357' }}>
                            {wp.estimatedArrival}
                          </td>
                          <td>
                            <span
                              className={`table-tag ${
                                wp.status === 'Selesai' ? 'done' : wp.status === 'Menuju Lokasi' ? 'active' : 'pending'
                              }`}
                            >
                              {wp.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: DIAGNOSTIK IOT & TERMINAL REALTIME
           ======================================================== */}
        {activeNav === 'Diagnostik IoT' && (
          <div className="module-container">
            <div className="grid-2col">
              {/* Kolom Kiri: Kartu Status Koneksi & Sensor Studio */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="module-card">
                  <div className="module-card-head">
                    <h2>Manajer Koneksi Hardware & WebSocket</h2>
                    <span className="meta">{hardwareTransport ? hardwareTransport.toUpperCase() : 'STANDBY'}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, paddingBottom: 8, borderBottom: '1px solid #edf1ee' }}>
                      <span style={{ color: '#68796e' }}>Supabase Realtime Cloud (Postgres WSS):</span>
                      <strong style={{ color: realtimeStatus === 'connected' ? 'var(--green)' : 'var(--amber)' }}>
                        {realtimeStatus === 'connected' ? 'Terhubung (SUBSCRIBED)' : realtimeStatus}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, paddingBottom: 8, borderBottom: '1px solid #edf1ee' }}>
                      <span style={{ color: '#68796e' }}>Local Serial Bridge (ws://127.0.0.1:5050):</span>
                      <strong style={{ color: hardwareStatus === 'connected' ? 'var(--green)' : '#728177' }}>
                        {hardwareStatus === 'connected' ? 'Streaming Aktif' : 'Standby / Belum Terhubung'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: '#68796e' }}>Paket Terakhir Diterima:</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5 }}>{hardwareLastPacket || 'Menunggu paket...'}</span>
                    </div>
                  </div>

                  <button
                    className={`primary-btn ${hardwareStatus === 'connected' ? 'active' : ''}`}
                    onClick={handleToggleHardware}
                    style={{
                      background: hardwareStatus === 'connected' ? '#c94e47' : 'var(--green)',
                      borderColor: hardwareStatus === 'connected' ? '#c94e47' : 'var(--green)',
                    }}
                  >
                    {hardwareStatus === 'connected'
                      ? 'Putuskan Koneksi Hardware ESP32'
                      : hardwareStatus === 'connecting'
                      ? 'Menghubungkan...'
                      : 'Buka Koneksi WebSocket Bridge / USB Serial'}
                  </button>
                </div>

                {/* Diagnostic Sensor Grid untuk Node Terpilih */}
                <div className="module-card">
                  <div className="module-card-head">
                    <h2>Register Telemetri: {selectedNode.name}</h2>
                    <span className="meta">{selectedNode.id}</span>
                  </div>

                  <div className="diag-sensor-grid">
                    <div className="sensor-box">
                      <div className="sensor-box-head">
                        <span className="sensor-box-title">JSN-SR04T</span>
                        <span className="sensor-box-tag">Ultrasonik</span>
                      </div>
                      <div className="sensor-box-val">{fmt(selectedNode.distance)} cm</div>
                      <div className="sensor-box-sub">Tinggi sampah: {fmt(wasteHeightCm)} cm · Blind zone 20 cm</div>
                    </div>

                    <div className="sensor-box">
                      <div className="sensor-box-head">
                        <span className="sensor-box-title">MQ-135</span>
                        <span className="sensor-box-tag">Gas Amonia & Bau</span>
                      </div>
                      <div className="sensor-box-val" style={{ color: selectedNode.sanitation ? 'var(--amber)' : 'var(--green)' }}>
                        {selectedNode.gas}/100
                      </div>
                      <div className="sensor-box-sub">Raw ADC: {selectedNode.adc} / 4095 · Indeks Relatif</div>
                    </div>

                    <div className="sensor-box">
                      <div className="sensor-box-head">
                        <span className="sensor-box-title">MQ-4</span>
                        <span className="sensor-box-tag">Gas Metana CH4</span>
                      </div>
                      <div className="sensor-box-val">
                        {selectedNode.methanePpm ? `${Math.round(selectedNode.methanePpm)} ppm` : '18/100'}
                      </div>
                      <div className="sensor-box-sub">Ambang K3: &lt; 250 ppm (Kondisi Aman)</div>
                    </div>

                    <div className="sensor-box">
                      <div className="sensor-box-head">
                        <span className="sensor-box-title">DHT22</span>
                        <span className="sensor-box-tag">Suhu & RH</span>
                      </div>
                      <div className="sensor-box-val">
                        {selectedNode.temp ? fmt(selectedNode.temp) : '31,5'}°C
                      </div>
                      <div className="sensor-box-sub">Kelembapan: {selectedNode.humidity ? fmt(selectedNode.humidity) : '65,4'}% RH</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Terminal Console Live Stream */}
              <div className="module-card">
                <div className="module-card-head">
                  <h2>Konsol Aliran Paket Telemetri Real-Time</h2>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="meta">{telemetryLogs.length} Log</span>
                    <button
                      className="small-btn"
                      onClick={() => setTelemetryLogs([])}
                      style={{ padding: '3px 8px', fontSize: 9 }}
                    >
                      Bersihkan
                    </button>
                  </div>
                </div>

                <div className="terminal-console" aria-label="Log telemetri real-time">
                  {telemetryLogs.map((log) => (
                    <div key={log.id} className="terminal-line">
                      <span className="terminal-time">[{log.time}]</span>
                      <span className="terminal-source">[{log.source}]</span>
                      <span className="terminal-body">{log.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: INVENTARIS MASTER TPS KOTA MAGELANG
           ======================================================== */}
        {activeNav === 'Inventaris' && (
          <div className="module-container">
            <div className="module-card">
              <div className="module-card-head">
                <h2>Master Inventaris Tempat Penampungan Sementara (TPS)</h2>
                <span className="meta">Total: {nodes.length} Titik</span>
              </div>

              <div className="mobile-table-hint">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Geser tabel ke samping untuk melihat kolom kapasitas, sensor, dan status</span>
              </div>

              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID Node</th>
                      <th>Nama TPS & Alamat</th>
                      <th>Wilayah</th>
                      <th>Kapasitas Wadah</th>
                      <th>Keterisian</th>
                      <th>Status Operasional</th>
                      <th>Peringatan Sanitasi</th>
                      <th>Telemetri Terakhir</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map((n) => (
                      <tr key={n.id}>
                        <td style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{n.id}</td>
                        <td>
                          <strong>{n.name}</strong>
                          <div style={{ fontSize: 9.5, color: '#68796e', marginTop: 1 }}>{n.address}</div>
                        </td>
                        <td>{n.area}</td>
                        <td style={{ fontFamily: 'var(--mono)' }}>HDPE 120 L</td>
                        <td>
                          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: n.operational === 'critical' ? 'var(--red)' : n.operational === 'warning' ? 'var(--amber)' : 'var(--green)' }}>
                            {fmt(n.fill)}% ({fmt(n.liters)} L)
                          </div>
                        </td>
                        <td>
                          <span className={`status-pill ${n.operational}`}>
                            <span>●</span>
                            {statusLabel(n.operational).toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {n.sanitation ? (
                            <span className="table-tag pending" style={{ background: '#fdf3e7', color: '#b77924' }}>
                              Indikasi ({n.gas}/100)
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, color: '#88988e' }}>Normal</span>
                          )}
                        </td>
                        <td style={{ fontSize: 9.5, color: '#5d6f63' }}>
                          {n.lastTelemetryText || `${n.age} m yang lalu`}
                        </td>
                        <td>
                          <button
                            className="conn-btn"
                            onClick={() => {
                              setSelectedId(n.id);
                              navigateTo('Pusat Operasi');
                              showToast(`Menampilkan ${n.name} di Pusat Operasi.`);
                            }}
                          >
                            Buka di Peta
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Catatan Kaki Halaman */}
        <div className="footer-note">
          <span>
            <strong>SUGENG</strong> · Sistem Unggulan Pengelolaan & Monitoring Sampah Kota Magelang
          </span>
          <span>
            {realtimeStatus === 'connected' ? 'Terhubung ke Database & WebSocket Postgres' : 'Mode Offline / Simulasi'} · Koordinat EPSG:4326
          </span>
        </div>
      </main>

      {/* Toast Notifikasi Responsif */}
      <div className={`toast ${toastMessage ? 'show' : ''}`} role="status" aria-live="polite">
        {toastMessage}
      </div>
    </div>
  );
};