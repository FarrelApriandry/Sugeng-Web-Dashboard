// Tipe payload sensor dari alat fisik + mapping ke TPSNode dashboard.
// Transport: USB serial via Web Serial API (lihat liveSerial.ts).
// Firmware kirim 1 baris JSON:{...} tiap 2 detik
// (lihat firmware/SugengNode_USBSerial.ino)
import type { TPSNode } from '../data/dummyData';

export interface LiveSensorPayload {
  nodeId?: string;
  temperatureCelsius?: number;
  humidityPercent?: number;
  measuredDistanceCm?: number;
  currentVolumePercent?: number;
  gasPpmMQ135?: number;
  methanePpmMQ4?: number;
  batteryVoltage?: number;
  batteryPercent?: number;
  mq135Adc?: number;
  mq4Adc?: number;
  mq135Pct?: number;
  mq4Pct?: number;
  wifiRssi?: number;
  uptimeSec?: number;
}

/** ID TPS yang diwakili alat fisik saat demo (prototype di kampus). */
export const LIVE_NODE_ID = 'NODE-MGL-05';

function gasStatus(ppm: number): TPSNode['gasStatusMQ135'] {
  if (ppm >= 60) return 'Tinggi (Bau Busuk)';
  if (ppm >= 30) return 'Sedang';
  return 'Normal';
}

function methaneStatus(ppm: number): TPSNode['methaneStatusMQ4'] {
  if (ppm >= 250) return 'Bahaya';
  if (ppm >= 100) return 'Waspada';
  return 'Aman';
}

/** Tempel payload live ke node dummy -> node live. Nilai NaN/undefined ditahan (pakai lama). */
export function applyLiveToNode(node: TPSNode, p: LiveSensorPayload, nowLabel: string): TPSNode {
  const num = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;

  const vol = num(p.currentVolumePercent, node.currentVolumePercent);
  const gas = num(p.gasPpmMQ135, node.gasPpmMQ135);
  const ch4 = num(p.methanePpmMQ4, node.methanePpmMQ4);
  const gasSt = gasStatus(gas);
  const isCritical = vol >= 80 || gasSt === 'Tinggi (Bau Busuk)';
  const isWarn = !isCritical && vol >= 50;

  return {
    ...node,
    currentVolumePercent: Math.round(vol * 10) / 10,
    measuredDistanceCm: num(p.measuredDistanceCm, node.measuredDistanceCm),
    gasPpmMQ135: Math.round(gas * 10) / 10,
    gasStatusMQ135: gasSt,
    methanePpmMQ4: Math.round(ch4),
    methaneStatusMQ4: methaneStatus(ch4),
    temperatureCelsius: num(p.temperatureCelsius, node.temperatureCelsius),
    humidityPercent: num(p.humidityPercent, node.humidityPercent),
    batteryVoltage: num(p.batteryVoltage, node.batteryVoltage),
    batteryPercent: Math.round(num(p.batteryPercent, node.batteryPercent)),
    systemStatus: isCritical ? 'Kritis (Prioritas)' : isWarn ? 'Peringatan' : 'Optimal',
    isPriority: isCritical ? true : node.isPriority,
    lastTelemetry: nowLabel,
  };
}
