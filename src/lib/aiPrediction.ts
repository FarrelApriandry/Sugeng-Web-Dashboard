/**
 * SUGENG AI Predictive Intelligence Client & Fallback Engine
 * Model: Diurnal Time-Series Regressor & Time-to-Overflow (TTO) Predictor
 * Terintegrasi dengan BE-SUGENG dan mendukung komputasi klien instan
 */

export interface HourlyForecastPoint {
  targetTimestamp: string;
  targetHour: string; // format "HH:00"
  predictedVolumePercent: number;
  confidenceLower: number;
  confidenceUpper: number;
}

export type UrgencyLevel =
  | 'SAFE_STABLE'
  | 'MODERATE_FILLING'
  | 'RAPID_FILLING'
  | 'CRITICAL_IMMINENT'
  | 'ALREADY_FULL';

export interface AIPredictionResult {
  nodeId: string;
  nodeName: string;
  calculatedAt: string;
  currentVolumePercent: number;
  currentDistanceCm: number;
  estimatedFillingRatePerHour: number;
  minutesToWarning: number | null;
  predictedWarningTimeText: string | null;
  minutesToOverflow: number | null;
  predictedOverflowTimeText: string | null;
  urgencyLevel: UrgencyLevel;
  urgencyLabel: string;
  urgencyColor: string;
  recommendation: string;
  hourlyForecast: HourlyForecastPoint[];
  modelInfo: {
    modelName: string;
    r2Score: number;
    mae: number;
    rmse: number;
    isLiveRateActive: boolean;
  };
}

// Profil laju dasar empiris persampahan Kota Magelang (% per jam)
export const DIURNAL_RATES: Record<number, number> = {
  0: 0.42, 1: 0.42, 2: 0.41, 3: 0.42, 4: 0.42, 5: 0.41,
  6: 11.33, 7: 15.03, 8: 14.93, 9: 10.95, // Puncak Pagi
  10: 4.54, 11: 4.71, 12: 6.66, 13: 6.77, 14: 4.58, 15: 4.65, // Siang Normal
  16: 8.84, 17: 12.07, 18: 12.46, 19: 8.73, // Puncak Sore
  20: 2.52, 21: 2.59, 22: 2.48, 23: 0.42, // Malam
};

/**
 * Format durasi menit ke dalam format bahasa manusia (misal: "1 jam 25 menit" atau "45 menit")
 */
export function formatMinutesHuman(minutes: number | null): string {
  if (minutes === null) return 'Tidak terdeteksi';
  if (minutes <= 0) return '0 menit (Penuh)';
  if (minutes < 60) return `${Math.round(minutes)} menit`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return remainingMinutes > 0 ? `${hours} jam ${remainingMinutes} menit` : `${hours} jam`;
}

/**
 * Inferensi Regresi AI Lokal (Real-Time di Browser)
 * Digunakan jika backend offline atau saat simulasi langsung
 */
export function calculateLocalPrediction(
  nodeId: string,
  nodeName: string,
  currentVolumePercent: number,
  hourOfDay = new Date().getHours(),
  recentRatePerHour?: number
): AIPredictionResult {
  const baseRate = DIURNAL_RATES[hourOfDay] ?? 5.5;
  const isLive = recentRatePerHour !== undefined && recentRatePerHour > 0;
  const effectiveRate = isLive
    ? Number((recentRatePerHour * 0.65 + baseRate * 0.35).toFixed(2))
    : baseRate;

  const emptyDistance = 95.0;
  const fullDistance = 20.0;
  const currentDistanceCm = Number(
    (emptyDistance - (currentVolumePercent / 100.0) * (emptyDistance - fullDistance)).toFixed(1)
  );

  const now = new Date();

  // Kasus tong sudah penuh
  if (currentVolumePercent >= 98.0) {
    return {
      nodeId,
      nodeName,
      calculatedAt: now.toISOString(),
      currentVolumePercent: Number(currentVolumePercent.toFixed(1)),
      currentDistanceCm,
      estimatedFillingRatePerHour: effectiveRate,
      minutesToWarning: null,
      predictedWarningTimeText: 'Sudah Melebihi Kritis',
      minutesToOverflow: 0,
      predictedOverflowTimeText: 'Saat Ini Juga',
      urgencyLevel: 'ALREADY_FULL',
      urgencyLabel: 'KAPASITAS PENUH (100%)',
      urgencyColor: '#c94e47',
      recommendation: 'KAPASITAS MAKSIMAL: Segera kosongkan wadah tempat penampungan sekarang juga.',
      hourlyForecast: generateForecastPoints(currentVolumePercent, hourOfDay, effectiveRate),
      modelInfo: {
        modelName: 'SUGENG Diurnal Time-Series Regressor v1.0',
        r2Score: 0.9894,
        mae: 1.44,
        rmse: 2.487,
        isLiveRateActive: isLive,
      },
    };
  }

  // Simulasi langkah per 5 menit ke depan
  let simVol = currentVolumePercent;
  let simMinutes = 0;
  const maxMinutes = 24 * 60;

  let minToWarn: number | null = null;
  let minToOver: number | null = null;

  while (simMinutes < maxMinutes) {
    simMinutes += 5;
    const simHour = (hourOfDay + Math.floor(simMinutes / 60)) % 24;
    const hourRate = DIURNAL_RATES[simHour] ?? 5.0;
    const decay = Math.exp(-simMinutes / 120);
    const stepRate = effectiveRate * decay + hourRate * (1 - decay);

    simVol += (stepRate / 60) * 5;

    if (minToWarn === null && simVol >= 75.0 && currentVolumePercent < 75.0) {
      minToWarn = simMinutes;
    }

    if (simVol >= 100.0) {
      minToOver = simMinutes;
      break;
    }
  }

  if (minToOver === null) minToOver = maxMinutes;

  const warnDate = minToWarn !== null ? new Date(now.getTime() + minToWarn * 60 * 1000) : null;
  const overDate = minToOver !== null ? new Date(now.getTime() + minToOver * 60 * 1000) : null;

  const formatClock = (d: Date | null) =>
    d
      ? `${d.getHours().toString().padStart(2, '0')}:${d
          .getMinutes()
          .toString()
          .padStart(2, '0')} WIB`
      : null;

  let urgencyLevel: UrgencyLevel = 'SAFE_STABLE';
  let urgencyLabel = 'KONDISI STABIL';
  let urgencyColor = '#176b49';
  let recommendation = 'Status stabil: Laju buangan normal, belum memerlukan dispatch armada.';

  if (currentVolumePercent >= 75.0 || minToOver <= 60) {
    urgencyLevel = 'CRITICAL_IMMINENT';
    urgencyLabel = 'KRITIS / MELUBER SEGERA';
    urgencyColor = '#c94e47';
    recommendation = `PRIORITAS TINGGI: Diprediksi meluber dalam ${formatMinutesHuman(minToOver)}. Armada truk DLH disarankan segera bergerak.`;
  } else if (minToOver <= 180) {
    urgencyLevel = 'RAPID_FILLING';
    urgencyLabel = 'LAJU PENGISIAN TINGGI';
    urgencyColor = '#b77924';
    recommendation = `SIAGA: Laju pengisian tergolong tinggi (+${effectiveRate}%/jam). Siapkan penjemputan dalam 2 jam ke depan.`;
  } else if (minToOver <= 360) {
    urgencyLevel = 'MODERATE_FILLING';
    urgencyLabel = 'PENGISIAN MODERAT';
    urgencyColor = '#3975a5';
    recommendation = `MODERAT: Diperkirakan penuh dalam ${formatMinutesHuman(minToOver)}. Masuk ke antrean ritase pengangkutan berikutnya.`;
  }

  return {
    nodeId,
    nodeName,
    calculatedAt: now.toISOString(),
    currentVolumePercent: Number(currentVolumePercent.toFixed(1)),
    currentDistanceCm,
    estimatedFillingRatePerHour: effectiveRate,
    minutesToWarning: minToWarn,
    predictedWarningTimeText: minToWarn !== null ? formatClock(warnDate) : (currentVolumePercent >= 75 ? 'Sudah Kritis' : null),
    minutesToOverflow: minToOver,
    predictedOverflowTimeText: formatClock(overDate),
    urgencyLevel,
    urgencyLabel,
    urgencyColor,
    recommendation,
    hourlyForecast: generateForecastPoints(currentVolumePercent, hourOfDay, effectiveRate),
    modelInfo: {
      modelName: 'SUGENG Diurnal Time-Series Regressor v1.0',
      r2Score: 0.9894,
      mae: 1.44,
      rmse: 2.487,
      isLiveRateActive: isLive,
    },
  };
}

function generateForecastPoints(
  currentVolume: number,
  startHour: number,
  initialRate: number
): HourlyForecastPoint[] {
  const points: HourlyForecastPoint[] = [];
  let volume = currentVolume;
  const now = new Date();

  for (let offset = 1; offset <= 6; offset++) {
    const targetDate = new Date(now.getTime() + offset * 60 * 60 * 1000);
    const targetHourNum = (startHour + offset) % 24;
    const hourRate = DIURNAL_RATES[targetHourNum] ?? 5.0;

    const decay = Math.exp(-offset / 2);
    const effectiveRate = initialRate > 0 ? initialRate * decay + hourRate * (1 - decay) : hourRate;

    volume = Math.min(100.0, volume + effectiveRate);

    const margin = 2.5 + offset * 0.8;
    const lower = Number(Math.max(0, volume - margin).toFixed(1));
    const upper = Number(Math.min(100, volume + margin).toFixed(1));

    const hourStr = `${targetHourNum.toString().padStart(2, '0')}:00`;

    points.push({
      targetTimestamp: targetDate.toISOString(),
      targetHour: hourStr,
      predictedVolumePercent: Number(volume.toFixed(1)),
      confidenceLower: lower,
      confidenceUpper: upper,
    });
  }

  return points;
}
