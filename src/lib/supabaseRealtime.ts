import type { RealtimeChannel } from '@supabase/supabase-js';
import type { TPSNode } from '../data/dummyData';
import { DUMMY_TPS_NODES } from '../data/dummyData';
import type { LiveSensorPayload } from './liveSensor';
import { getSupabaseClient } from './supabaseClient';

export interface DbTpsNode {
  id: string;
  node_id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  capacity_liters: number;
  volume_status?: string;
  last_volume_percent?: number;
  last_gas_alert?: boolean;
  last_temperature?: number;
  last_humidity?: number;
  last_ammonia_ppm?: number;
  last_methane_ppm?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbTelemetryLog {
  id: number;
  node_id: string;
  temperature_celsius?: number;
  humidity_percent?: number;
  measured_distance_cm?: number;
  current_volume_percent: number;
  gas_ppm_mq135?: number;
  methane_ppm_mq4?: number;
  mq135_adc?: number;
  mq4_adc?: number;
  mq135_pct?: number;
  mq4_pct?: number;
  uptime_sec?: number;
  volume_status: string;
  gas_alert: boolean;
  ammonia_level?: string;
  methane_level?: string;
  created_at?: string;
}

export type RealtimeConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

let activeChannel: RealtimeChannel | null = null;

function mapGasStatus(ppm: number): TPSNode['gasStatusMQ135'] {
  if (ppm >= 60) return 'Tinggi (Bau Busuk)';
  if (ppm >= 30) return 'Sedang';
  return 'Normal';
}

function mapMethaneStatus(ppm: number): TPSNode['methaneStatusMQ4'] {
  if (ppm >= 250) return 'Bahaya';
  if (ppm >= 100) return 'Waspada';
  return 'Aman';
}

function mapSystemStatus(vol: number, gasAlert: boolean): TPSNode['systemStatus'] {
  if (vol >= 75 || gasAlert) return 'Kritis (Prioritas)';
  if (vol >= 50) return 'Peringatan';
  return 'Optimal';
}

/**
 * Mengonversi baris database tps_nodes menjadi interface TPSNode frontend
 */
export function mapDbNodeToUiNode(dbNode: DbTpsNode, existingNode?: TPSNode): TPSNode {
  const vol = Number(dbNode.last_volume_percent ?? existingNode?.currentVolumePercent ?? 0);
  const gasPpm = Number(dbNode.last_ammonia_ppm ?? existingNode?.gasPpmMQ135 ?? 15);
  const ch4Ppm = Number(dbNode.last_methane_ppm ?? existingNode?.methanePpmMQ4 ?? 45);
  const isGasAlert = Boolean(dbNode.last_gas_alert);
  const sysStatus = mapSystemStatus(vol, isGasAlert);

  // Estimasi jarak pantulan dari volume jika belum tercatat:
  // vol = (95 - d) / 75 * 100 => d = 95 - (vol * 75 / 100)
  const estimatedDist = Math.max(20, Math.min(95, Math.round((95 - (vol * 75) / 100) * 10) / 10));

  const nowFormatted = dbNode.updated_at
    ? new Date(dbNode.updated_at).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Baru saja';

  const nodeName =
    dbNode.node_id === 'NODE-MGL-05'
      ? 'TPS Kampus Tuguran UNTIDAR'
      : (existingNode?.name || dbNode.name);

  const nodeAddress =
    dbNode.node_id === 'NODE-MGL-05'
      ? 'Jl. Kapten Suparman No.39, Tuguran, Magelang Utara'
      : (existingNode?.address || dbNode.address || 'Kota Magelang');

  const nodeCoords: [number, number] =
    dbNode.node_id === 'NODE-MGL-05'
      ? [-7.459694, 110.216861]
      : (existingNode?.coordinates || [dbNode.latitude, dbNode.longitude]);

  return {
    id: dbNode.node_id,
    name: nodeName,
    address: nodeAddress,
    coordinates: nodeCoords,
    capacityLiters: Number(dbNode.capacity_liters || existingNode?.capacityLiters || 120),
    currentVolumePercent: Math.round(vol * 10) / 10,
    measuredDistanceCm: existingNode?.measuredDistanceCm ?? estimatedDist,
    totalHeightCm: existingNode?.totalHeightCm || 95.0,
    blindZoneCm: existingNode?.blindZoneCm || 20.0,
    gasPpmMQ135: Math.round(gasPpm * 10) / 10,
    gasStatusMQ135: mapGasStatus(gasPpm),
    methanePpmMQ4: Math.round(ch4Ppm),
    methaneStatusMQ4: mapMethaneStatus(ch4Ppm),
    temperatureCelsius: Number(dbNode.last_temperature ?? existingNode?.temperatureCelsius ?? 28.5),
    humidityPercent: Number(dbNode.last_humidity ?? existingNode?.humidityPercent ?? 65.0),
    batteryVoltage: existingNode?.batteryVoltage ?? 3.95,
    batteryPercent: existingNode?.batteryPercent ?? 88,
    solarStatus: existingNode?.solarStatus ?? 'Charging (Terik)',
    solarCurrentMa: existingNode?.solarCurrentMa ?? 180,
    systemStatus: sysStatus,
    isPriority: sysStatus === 'Kritis (Prioritas)',
    lastTelemetry: nowFormatted,
    pulsedHeatingActive: existingNode?.pulsedHeatingActive ?? false,
  };
}

/**
 * Mengambil data awal snapshot seluruh node TPS dari Supabase
 */
export async function fetchInitialNodes(): Promise<TPSNode[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('[REALTIME] Supabase tidak tersedia, menggunakan data default lokal.');
    return DUMMY_TPS_NODES;
  }

  try {
    const { data, error } = await supabase
      .from('tps_nodes')
      .select('*')
      .order('node_id', { ascending: true });

    if (error) {
      console.error('[REALTIME] Error fetch tps_nodes dari Supabase:', error.message);
      return DUMMY_TPS_NODES;
    }

    if (!data || data.length === 0) {
      console.warn('[REALTIME] Tabel tps_nodes kosong, menggunakan data default.');
      return DUMMY_TPS_NODES;
    }

    // Gabungkan data dari Supabase dengan data default dummy (agar node yang belum ada di DB tetap tampil)
    const existingMap = new Map<string, TPSNode>();
    for (const d of DUMMY_TPS_NODES) {
      existingMap.set(d.id, d);
    }

    const mergedNodes: TPSNode[] = [];
    for (const dbItem of data as DbTpsNode[]) {
      const fallback = existingMap.get(dbItem.node_id);
      const mapped = mapDbNodeToUiNode(dbItem, fallback);
      mergedNodes.push(mapped);
      existingMap.delete(dbItem.node_id);
    }

    // Tambahkan node dummy sisa yang belum ada di database
    for (const remaining of existingMap.values()) {
      mergedNodes.push(remaining);
    }

    console.log(`[REALTIME] Berhasil memuat ${mergedNodes.length} titik TPS dari Supabase.`);
    return mergedNodes;
  } catch (err) {
    console.error('[REALTIME] Eksepsi saat fetch tps_nodes:', err);
    return DUMMY_TPS_NODES;
  }
}

/**
 * Berlangganan ke stream WebSocket Realtime Supabase
 */
export function subscribeToRealtime(options: {
  onNodeChange: (updatedNode: TPSNode) => void;
  onTelemetryInsert?: (payload: LiveSensorPayload) => void;
  onStatusChange?: (status: RealtimeConnectionState) => void;
}): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    options.onStatusChange?.('error');
    return () => {};
  }

  options.onStatusChange?.('connecting');

  // Bersihkan channel aktif jika ada
  if (activeChannel) {
    try {
      supabase.removeChannel(activeChannel);
    } catch {}
    activeChannel = null;
  }

  const channel = supabase
    .channel('sugeng-dashboard-realtime')
    // 1. Mendengarkan perubahan data pada tps_nodes (UPDATE / INSERT)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tps_nodes',
      },
      (payload) => {
        const newRow = payload.new as DbTpsNode;
        if (newRow && newRow.node_id) {
          console.log(`[REALTIME WSS] Pembaruan tps_nodes: ${newRow.node_id} (Vol: ${newRow.last_volume_percent}%)`);
          const uiNode = mapDbNodeToUiNode(newRow);
          options.onNodeChange(uiNode);
        }
      }
    )
    // 2. Mendengarkan rekaman baru telemetri time-series pada telemetry_logs
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'telemetry_logs',
      },
      (payload) => {
        const log = payload.new as DbTelemetryLog;
        if (log && log.node_id) {
          console.log(`[REALTIME WSS] Telemetri Baru masuk: ${log.node_id} (Vol: ${log.current_volume_percent}%, Jarak: ${log.measured_distance_cm} cm)`);

          const sensorPayload: LiveSensorPayload = {
            nodeId: log.node_id,
            temperatureCelsius: log.temperature_celsius,
            humidityPercent: log.humidity_percent,
            measuredDistanceCm: log.measured_distance_cm,
            currentVolumePercent: log.current_volume_percent,
            gasPpmMQ135: log.gas_ppm_mq135,
            methanePpmMQ4: log.methane_ppm_mq4,
            mq135Adc: log.mq135_adc,
            mq4Adc: log.mq4_adc,
            mq135Pct: log.mq135_pct,
            mq4Pct: log.mq4_pct,
            uptimeSec: Number(log.uptime_sec || 0),
          };

          options.onTelemetryInsert?.(sensorPayload);
        }
      }
    )
    .subscribe((status, err) => {
      console.log(`[REALTIME WSS STATUS]: ${status}`, err || '');
      if (status === 'SUBSCRIBED') {
        options.onStatusChange?.('connected');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        options.onStatusChange?.('error');
      } else if (status === 'TIMED_OUT') {
        options.onStatusChange?.('disconnected');
      }
    });

  activeChannel = channel;

  return () => {
    if (activeChannel) {
      console.log('[REALTIME WSS] Menutup koneksi WebSocket Supabase...');
      try {
        supabase.removeChannel(activeChannel);
      } catch {}
      activeChannel = null;
      options.onStatusChange?.('disconnected');
    }
  };
}
