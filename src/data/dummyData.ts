export interface ScenarioNode {
  id: string;
  dbId?: string;
  name: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  distance: number;
  fill: number;
  volumePct: number;
  liters: number;
  adc: number;
  gas: number;
  age: number;
  operational: 'critical' | 'warning' | 'safe';
  sanitation: boolean;
  temp?: number;
  humidity?: number;
  methaneAdc?: number;
  methanePpm?: number;
  batteryVolt?: number;
  batteryPct?: number;
  solarStatus?: string;
  solarCurrentMa?: number;
  lastTelemetryText?: string;
  provenance?: 'db' | 'live-serial' | 'live-bridge' | 'sim';
}

export function normalizeNodeId(id: string): string {
  if (id.startsWith('NODE-MGL-0')) return 'NODE-0' + id.slice(10);
  if (id.startsWith('NODE-MGL-')) return 'NODE-' + id.slice(9);
  return id;
}

export function tpsNodeToScenarioNode(tps: TPSNode): ScenarioNode {
  const shortId = normalizeNodeId(tps.id);
  const fill = Math.min(100, Math.max(0, tps.currentVolumePercent));
  const volumePct = Math.round(fill * 0.98 * 10) / 10;
  const liters = Math.round((volumePct / 100) * (tps.capacityLiters || 120) * 10) / 10;

  let operational: 'critical' | 'warning' | 'safe' = 'safe';
  if (fill >= 75) operational = 'critical';
  else if (fill >= 50) operational = 'warning';

  const distance = tps.measuredDistanceCm ?? Math.max(20, Math.min(95, Math.round((95 - (fill * 75) / 100) * 10) / 10));
  const gasIndex = Math.min(100, Math.max(0, Math.round((tps.gasPpmMQ135 / 100) * 100)));
  const adc = Math.round((gasIndex / 100) * 4095);
  const isSanitation = gasIndex >= 60 || tps.gasStatusMQ135 === 'Tinggi (Bau Busuk)';

  let area = 'Kota Magelang';
  if (tps.address.includes('Utara')) area = 'Magelang Utara';
  else if (tps.address.includes('Selatan')) area = 'Magelang Selatan';
  else if (tps.address.includes('Tengah')) area = 'Magelang Tengah';

  return {
    id: shortId,
    dbId: tps.id,
    name: tps.name,
    area,
    address: tps.address,
    lat: tps.coordinates[0],
    lng: tps.coordinates[1],
    distance,
    fill,
    volumePct,
    liters,
    adc,
    gas: gasIndex,
    age: 1,
    operational,
    sanitation: isSanitation,
    temp: tps.temperatureCelsius,
    humidity: tps.humidityPercent,
    methanePpm: tps.methanePpmMQ4,
    batteryVolt: tps.batteryVoltage,
    batteryPct: tps.batteryPercent,
    solarStatus: tps.solarStatus,
    solarCurrentMa: tps.solarCurrentMa,
    lastTelemetryText: tps.lastTelemetry,
    provenance: 'db',
  };
}

export const CANONICAL_SCENARIO: ScenarioNode[] = [
  { id: 'NODE-01', name: 'TPS Pasar Rejowinangun', area: 'Magelang Selatan', address: 'Jl. Mataram, Rejowinangun Selatan', lat: -7.4815, lng: 110.2223, distance: 26.0, fill: 92.0, volumePct: 90.6, liters: 108.8, adc: 2800, gas: 68, age: 1, operational: 'critical', sanitation: true },
  { id: 'NODE-02', name: 'TPS Alun-Alun Magelang', area: 'Magelang Tengah', address: 'Kawasan Alun-Alun, Kemirirejo', lat: -7.4798, lng: 110.2178, distance: 30.5, fill: 86.0, volumePct: 83.8, liters: 100.5, adc: 1150, gas: 28, age: 3, operational: 'critical', sanitation: false },
  { id: 'NODE-03', name: 'TPS RSUD Tidar', area: 'Magelang Selatan', address: 'Jl. Tidar No. 30A', lat: -7.4886, lng: 110.2162, distance: 33.5, fill: 82.0, volumePct: 79.3, liters: 95.1, adc: 2650, gas: 65, age: 2, operational: 'critical', sanitation: true },
  { id: 'NODE-04', name: 'TPS Taman Kyai Langgeng', area: 'Magelang Selatan', address: 'Jl. Cempaka No. 6', lat: -7.4839, lng: 110.2115, distance: 39.5, fill: 74.0, volumePct: 70.4, liters: 84.5, adc: 750, gas: 18, age: 5, operational: 'warning', sanitation: false },
  { id: 'NODE-05', name: 'TPS Kampus Tuguran', area: 'Magelang Utara', address: 'Jl. Kapten Suparman No. 39', lat: -7.4642, lng: 110.2291, distance: 28.2, fill: 89.1, volumePct: 87.3, liters: 104.8, adc: 2450, gas: 60, age: 1, operational: 'critical', sanitation: true },
  { id: 'NODE-06', name: 'TPS Terminal Tidar', area: 'Magelang Selatan', address: 'Jl. Soekarno-Hatta, Magersari', lat: -7.5025, lng: 110.2268, distance: 44.0, fill: 68.0, volumePct: 64.0, liters: 76.8, adc: 620, gas: 15, age: 4, operational: 'warning', sanitation: false },
  { id: 'NODE-07', name: 'TPS Potrobangsan', area: 'Magelang Utara', address: 'Jl. Pahlawan, Magelang Utara', lat: -7.4610, lng: 110.2215, distance: 64.2, fill: 41.1, volumePct: 36.6, liters: 43.9, adc: 339, gas: 8, age: 7, operational: 'safe', sanitation: false },
  { id: 'NODE-08', name: 'TPS Kebonpolo', area: 'Magelang Utara', address: 'Jl. Urip Sumoharjo', lat: -7.4695, lng: 110.2238, distance: 68.7, fill: 35.1, volumePct: 30.9, liters: 37.1, adc: 290, gas: 7, age: 6, operational: 'safe', sanitation: false }
];

export const fmt = (n: number, decimals = 1) =>
  Number(n).toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const freshness = (age: number): 'live' | 'delayed' | 'stale' | 'offline' =>
  age < 4 ? 'live' : age <= 15 ? 'delayed' : age <= 120 ? 'stale' : 'offline';

export const statusLabel = (s: 'critical' | 'warning' | 'safe') =>
  ({ critical: 'Prioritas', warning: 'Siaga', safe: 'Aman' })[s];

export interface TPSNode {
  id: string;
  name: string;
  address: string;
  coordinates: [number, number]; // [lat, lng]
  capacityLiters: number;
  currentVolumePercent: number;
  measuredDistanceCm: number; // JSN-SR04T distance from sensor
  totalHeightCm: number;
  blindZoneCm: number;
  gasPpmMQ135: number; // NH3 & odor level (ppm)
  gasStatusMQ135: 'Normal' | 'Sedang' | 'Tinggi (Bau Busuk)';
  methanePpmMQ4: number; // CH4 methane (ppm)
  methaneStatusMQ4: 'Aman' | 'Waspada' | 'Bahaya';
  temperatureCelsius: number; // DHT22
  humidityPercent: number; // DHT22
  batteryVoltage: number; // 18650 Li-Ion (3.2V - 4.2V)
  batteryPercent: number;
  solarStatus: 'Charging (Terik)' | 'Standby (Mendung)' | 'Night Mode';
  solarCurrentMa: number; // CN3065 charging current
  systemStatus: 'Optimal' | 'Peringatan' | 'Kritis (Prioritas)';
  isPriority: boolean;
  lastTelemetry: string;
  pulsedHeatingActive: boolean;
}

export interface CVRPSolution {
  routeId: string;
  truckId: string;
  truckDriver: string;
  truckCapacityLiters: number;
  assignedLoadLiters: number;
  totalDistanceKm: number;
  conventionalDistanceKm: number;
  distanceSavedKm: number;
  fuelSavedLiters: number;
  co2SavedKg: number;
  waypoints: {
    step: number;
    title: string;
    type: 'depot' | 'tps' | 'landfill';
    lat: number;
    lng: number;
    pickupVolumeLiters: number;
    cumulativeLoadLiters: number;
    estimatedArrival: string;
    status: 'Pending' | 'Selesai' | 'Menuju Lokasi';
  }[];
}

export const POOL_DEPOT: { name: string; coordinates: [number, number]; address: string } = {
  name: 'Pool DLH Kota Magelang (Depot)',
  coordinates: [-7.4772, 110.2185],
  address: 'Jl. Veteran No.7, Magelang Tengah'
};

export const TPSA_BANYUURIP: { name: string; coordinates: [number, number]; address: string } = {
  name: 'TPSA Banyuurip (TPA Akhir)',
  coordinates: [-7.4988, 110.2312],
  address: 'Kawasan TPSA Banyuurip, Tegalrejo / Magelang Selatan'
};

export const DUMMY_TPS_NODES: TPSNode[] = [
  {
    id: 'NODE-MGL-01',
    name: 'TPS Pasar Rejowinangun',
    address: 'Jl. Mataram, Rejowinangun Selatan, Kec. Magelang Selatan',
    coordinates: [-7.4815, 110.2223],
    capacityLiters: 120,
    currentVolumePercent: 92,
    measuredDistanceCm: 26, // close to top (blind zone 20cm)
    totalHeightCm: 95,
    blindZoneCm: 20,
    gasPpmMQ135: 84,
    gasStatusMQ135: 'Tinggi (Bau Busuk)',
    methanePpmMQ4: 310,
    methaneStatusMQ4: 'Waspada',
    temperatureCelsius: 32.4,
    humidityPercent: 88,
    batteryVoltage: 4.05,
    batteryPercent: 91,
    solarStatus: 'Charging (Terik)',
    solarCurrentMa: 185,
    systemStatus: 'Kritis (Prioritas)',
    isPriority: true,
    lastTelemetry: '1 menit yang lalu',
    pulsedHeatingActive: false,
  },
  {
    id: 'NODE-MGL-02',
    name: 'TPS Alun-Alun Kota Magelang',
    address: 'Kawasan Alun-Alun, Kemirirejo, Kec. Magelang Tengah',
    coordinates: [-7.4798, 110.2178],
    capacityLiters: 120,
    currentVolumePercent: 86,
    measuredDistanceCm: 31,
    totalHeightCm: 95,
    blindZoneCm: 20,
    gasPpmMQ135: 62,
    gasStatusMQ135: 'Sedang',
    methanePpmMQ4: 180,
    methaneStatusMQ4: 'Aman',
    temperatureCelsius: 30.8,
    humidityPercent: 79,
    batteryVoltage: 3.98,
    batteryPercent: 84,
    solarStatus: 'Charging (Terik)',
    solarCurrentMa: 190,
    systemStatus: 'Kritis (Prioritas)',
    isPriority: true,
    lastTelemetry: '3 menit yang lalu',
    pulsedHeatingActive: false,
  },
  {
    id: 'NODE-MGL-03',
    name: 'TPS RSUD Tidar Magelang',
    address: 'Jl. Tidar No.30A, Kemirirejo, Kec. Magelang Selatan',
    coordinates: [-7.4886, 110.2162],
    capacityLiters: 120,
    currentVolumePercent: 82,
    measuredDistanceCm: 34,
    totalHeightCm: 95,
    blindZoneCm: 20,
    gasPpmMQ135: 78,
    gasStatusMQ135: 'Tinggi (Bau Busuk)',
    methanePpmMQ4: 295,
    methaneStatusMQ4: 'Waspada',
    temperatureCelsius: 31.2,
    humidityPercent: 82,
    batteryVoltage: 3.92,
    batteryPercent: 78,
    solarStatus: 'Standby (Mendung)',
    solarCurrentMa: 65,
    systemStatus: 'Kritis (Prioritas)',
    isPriority: true,
    lastTelemetry: '2 menit yang lalu',
    pulsedHeatingActive: false,
  },
  {
    id: 'NODE-MGL-04',
    name: 'TPS Taman Kyai Langgeng',
    address: 'Jl. Cempaka No.6, Kemirirejo, Magelang Tengah',
    coordinates: [-7.4839, 110.2115],
    capacityLiters: 120,
    currentVolumePercent: 74,
    measuredDistanceCm: 40,
    totalHeightCm: 95,
    blindZoneCm: 20,
    gasPpmMQ135: 45,
    gasStatusMQ135: 'Sedang',
    methanePpmMQ4: 110,
    methaneStatusMQ4: 'Aman',
    temperatureCelsius: 29.5,
    humidityPercent: 75,
    batteryVoltage: 4.10,
    batteryPercent: 95,
    solarStatus: 'Charging (Terik)',
    solarCurrentMa: 200,
    systemStatus: 'Peringatan',
    isPriority: false,
    lastTelemetry: '5 menit yang lalu',
    pulsedHeatingActive: false,
  },
  {
    id: 'NODE-MGL-05',
    name: 'TPS Kampus Tuguran UNTIDAR',
    address: 'Jl. Kapten Suparman No.39, Tuguran, Magelang Utara',
    coordinates: [-7.4642, 110.2291],
    capacityLiters: 120,
    currentVolumePercent: 89,
    measuredDistanceCm: 28,
    totalHeightCm: 95,
    blindZoneCm: 20,
    gasPpmMQ135: 71,
    gasStatusMQ135: 'Tinggi (Bau Busuk)',
    methanePpmMQ4: 240,
    methaneStatusMQ4: 'Waspada',
    temperatureCelsius: 30.1,
    humidityPercent: 80,
    batteryVoltage: 3.88,
    batteryPercent: 74,
    solarStatus: 'Charging (Terik)',
    solarCurrentMa: 175,
    systemStatus: 'Kritis (Prioritas)',
    isPriority: true,
    lastTelemetry: '1 menit yang lalu',
    pulsedHeatingActive: true,
  },
  {
    id: 'NODE-MGL-06',
    name: 'TPS Terminal Tidar (Magersari)',
    address: 'Jl. Soekarno-Hatta, Magersari, Magelang Selatan',
    coordinates: [-7.5025, 110.2268],
    capacityLiters: 120,
    currentVolumePercent: 68,
    measuredDistanceCm: 44,
    totalHeightCm: 95,
    blindZoneCm: 20,
    gasPpmMQ135: 39,
    gasStatusMQ135: 'Normal',
    methanePpmMQ4: 90,
    methaneStatusMQ4: 'Aman',
    temperatureCelsius: 31.8,
    humidityPercent: 70,
    batteryVoltage: 4.02,
    batteryPercent: 88,
    solarStatus: 'Charging (Terik)',
    solarCurrentMa: 195,
    systemStatus: 'Peringatan',
    isPriority: false,
    lastTelemetry: '4 menit yang lalu',
    pulsedHeatingActive: false,
  },
  {
    id: 'NODE-MGL-07',
    name: 'TPS Potrobangsan (Pasar Cacaban)',
    address: 'Jl. Pahlawan, Potrobangsan, Magelang Utara',
    coordinates: [-7.4610, 110.2215],
    capacityLiters: 120,
    currentVolumePercent: 41,
    measuredDistanceCm: 64,
    totalHeightCm: 95,
    blindZoneCm: 20,
    gasPpmMQ135: 22,
    gasStatusMQ135: 'Normal',
    methanePpmMQ4: 55,
    methaneStatusMQ4: 'Aman',
    temperatureCelsius: 28.7,
    humidityPercent: 68,
    batteryVoltage: 4.18,
    batteryPercent: 98,
    solarStatus: 'Charging (Terik)',
    solarCurrentMa: 205,
    systemStatus: 'Optimal',
    isPriority: false,
    lastTelemetry: '7 menit yang lalu',
    pulsedHeatingActive: false,
  },
  {
    id: 'NODE-MGL-08',
    name: 'TPS Bayeman Kebonpolo',
    address: 'Jl. Urip Sumoharjo, Kebonpolo, Magelang Utara',
    coordinates: [-7.4695, 110.2238],
    capacityLiters: 120,
    currentVolumePercent: 35,
    measuredDistanceCm: 69,
    totalHeightCm: 95,
    blindZoneCm: 20,
    gasPpmMQ135: 18,
    gasStatusMQ135: 'Normal',
    methanePpmMQ4: 42,
    methaneStatusMQ4: 'Aman',
    temperatureCelsius: 29.0,
    humidityPercent: 65,
    batteryVoltage: 4.12,
    batteryPercent: 96,
    solarStatus: 'Charging (Terik)',
    solarCurrentMa: 190,
    systemStatus: 'Optimal',
    isPriority: false,
    lastTelemetry: '6 menit yang lalu',
    pulsedHeatingActive: false,
  },
];

export const INITIAL_CVRP_SOLUTION: CVRPSolution = {
  routeId: 'CVRP-MGL-202609-001',
  truckId: 'Armada Truk DLH 03 (Isuzu Elf 6-Roda)',
  truckDriver: 'Budi Santoso & Slamet Riyadi',
  truckCapacityLiters: 600, // Kapasitas bak truk demo
  assignedLoadLiters: 418, // Total muatan 4 TPS prioritas
  totalDistanceKm: 9.8,
  conventionalDistanceKm: 17.4,
  distanceSavedKm: 7.6,
  fuelSavedLiters: 2.1,
  co2SavedKg: 5.5,
  waypoints: [
    {
      step: 1,
      title: 'Pool DLH Kota Magelang',
      type: 'depot',
      lat: POOL_DEPOT.coordinates[0],
      lng: POOL_DEPOT.coordinates[1],
      pickupVolumeLiters: 0,
      cumulativeLoadLiters: 0,
      estimatedArrival: '08:00 WIB',
      status: 'Selesai',
    },
    {
      step: 2,
      title: 'TPS Alun-Alun Kota Magelang (86%)',
      type: 'tps',
      lat: DUMMY_TPS_NODES[1]!.coordinates[0],
      lng: DUMMY_TPS_NODES[1]!.coordinates[1],
      pickupVolumeLiters: 103,
      cumulativeLoadLiters: 103,
      estimatedArrival: '08:15 WIB',
      status: 'Menuju Lokasi',
    },
    {
      step: 3,
      title: 'TPS Pasar Rejowinangun (92%)',
      type: 'tps',
      lat: DUMMY_TPS_NODES[0]!.coordinates[0],
      lng: DUMMY_TPS_NODES[0]!.coordinates[1],
      pickupVolumeLiters: 110,
      cumulativeLoadLiters: 213,
      estimatedArrival: '08:35 WIB',
      status: 'Pending',
    },
    {
      step: 4,
      title: 'TPS RSUD Tidar Magelang (82%)',
      type: 'tps',
      lat: DUMMY_TPS_NODES[2]!.coordinates[0],
      lng: DUMMY_TPS_NODES[2]!.coordinates[1],
      pickupVolumeLiters: 98,
      cumulativeLoadLiters: 311,
      estimatedArrival: '08:55 WIB',
      status: 'Pending',
    },
    {
      step: 5,
      title: 'TPS Kampus Tuguran UNTIDAR (89%)',
      type: 'tps',
      lat: DUMMY_TPS_NODES[4]!.coordinates[0],
      lng: DUMMY_TPS_NODES[4]!.coordinates[1],
      pickupVolumeLiters: 107,
      cumulativeLoadLiters: 418,
      estimatedArrival: '09:20 WIB',
      status: 'Pending',
    },
    {
      step: 6,
      title: 'TPSA Banyuurip (Bongkar Muatan)',
      type: 'landfill',
      lat: TPSA_BANYUURIP.coordinates[0],
      lng: TPSA_BANYUURIP.coordinates[1],
      pickupVolumeLiters: 0,
      cumulativeLoadLiters: 418,
      estimatedArrival: '09:50 WIB',
      status: 'Pending',
    },
    {
      step: 7,
      title: 'Kembali ke Pool DLH Magelang',
      type: 'depot',
      lat: POOL_DEPOT.coordinates[0],
      lng: POOL_DEPOT.coordinates[1],
      pickupVolumeLiters: 0,
      cumulativeLoadLiters: 0,
      estimatedArrival: '10:15 WIB',
      status: 'Pending',
    },
  ],
};
