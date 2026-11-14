import React, { useEffect, useRef, useState } from 'react';
import type { ScenarioNode } from '../data/dummyData';
import { POOL_DEPOT, TPSA_BANYUURIP, fmt, statusLabel } from '../data/dummyData';

interface Props {
  nodes: ScenarioNode[];
  selectedId: string;
  onSelectNode: (id: string) => void;
  showSpecial: boolean;
  fitTrigger: number;
}

// API key CARTO Basemaps via env untuk menghilangkan watermark "API key required"
const CARTO_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_CARTO_KEY as string | undefined) || '';

function getTileUrl(style: 'voyager' | 'dark_all' = 'voyager'): string {
  const base = `https://{s}.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}{r}.png`;
  return CARTO_API_KEY ? `${base}?key=${CARTO_API_KEY}` : base;
}

export const InteractiveMap: React.FC<Props> = ({
  nodes,
  selectedId,
  onSelectNode,
  showSpecial,
  fitTrigger,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const specialMarkersRef = useRef<any[]>([]);
  const routeLineRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  // Inisialisasi peta Leaflet
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    let isMounted = true;

    const init = async () => {
      const L = await import('leaflet');
      if (!isMounted || !mapContainerRef.current || mapInstanceRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [-7.4800, 110.2200],
        zoom: 14,
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      // Basemap Voyager CARTO (dengan API Key untuk menghilangkan watermark)
      L.tileLayer(getTileUrl('voyager'), {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Closed-loop CVRP route polyline (Depot -> Alun-Alun -> Rejowinangun -> RSUD Tidar -> Tuguran -> TPSA -> Depot)
      const routePoints: [number, number][] = [
        [POOL_DEPOT.lat, POOL_DEPOT.lng],
        [-7.4798, 110.2178], // Alun-Alun
        [-7.4815, 110.2223], // Rejowinangun
        [-7.4886, 110.2162], // RSUD Tidar
        [-7.4642, 110.2291], // Tuguran
        [TPSA_BANYUURIP.lat, TPSA_BANYUURIP.lng],
        [POOL_DEPOT.lat, POOL_DEPOT.lng],
      ];

      routeLineRef.current = L.polyline(routePoints, {
        color: '#3975a5',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '6 4',
      }).addTo(map);

      setMapReady(true);
    };

    init();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    const updatePins = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;

      // Bersihkan marker lama jika ada
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      specialMarkersRef.current.forEach((m) => m.remove());
      specialMarkersRef.current = [];

      // Helper icon
      const createIcon = (n: ScenarioNode) => {
        const isSel = n.id === selectedId;
        return L.divIcon({
          className: '',
          html: `<div class="map-pin ${n.operational} ${isSel ? 'selected' : ''}">${n.id.slice(-2)}</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
      };

      // Tambahkan marker TPS
      nodes.forEach((n) => {
        const marker = L.marker([n.lat, n.lng], { icon: createIcon(n) }).addTo(map);
        marker.bindPopup(
          `<div class="map-popup-name">${n.name}</div><div class="map-popup-detail">${n.id} · Fill height ${fmt(n.fill)}% · ${statusLabel(n.operational)}</div>`
        );
        marker.on('click', () => {
          onSelectNode(n.id);
        });
        markersRef.current.set(n.id, marker);
      });

      // Special pins: Depot & TPSA
      const depotIcon = L.divIcon({
        className: '',
        html: '<div class="special-pin">D</div>',
        iconSize: [25, 25],
        iconAnchor: [12, 12],
      });
      const tpsaIcon = L.divIcon({
        className: '',
        html: '<div class="special-pin destination">A</div>',
        iconSize: [25, 25],
        iconAnchor: [12, 12],
      });

      const dm = L.marker([POOL_DEPOT.lat, POOL_DEPOT.lng], { icon: depotIcon }).bindPopup(
        `<div class="map-popup-name">${POOL_DEPOT.name}</div><div class="map-popup-detail">Titik awal dan akhir skenario</div>`
      );
      const tm = L.marker([TPSA_BANYUURIP.lat, TPSA_BANYUURIP.lng], { icon: tpsaIcon }).bindPopup(
        `<div class="map-popup-name">${TPSA_BANYUURIP.name}</div><div class="map-popup-detail">Fasilitas pembuangan antara skenario</div>`
      );

      specialMarkersRef.current = [dm, tm];
      if (showSpecial) {
        specialMarkersRef.current.forEach((m) => m.addTo(map));
      }

      // Initial fitBounds
      const allMarkers = [...markersRef.current.values(), ...(showSpecial ? specialMarkersRef.current : [])];
      if (allMarkers.length > 0) {
        const group = L.featureGroup(allMarkers);
        map.fitBounds(group.getBounds().pad(0.12));
      }
    };

    updatePins();
  }, [mapReady, nodes]);

  // Update selection style & fly to node
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const updateSel = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;
      nodes.forEach((n) => {
        const m = markersRef.current.get(n.id);
        if (m) {
          const isSel = n.id === selectedId;
          m.setIcon(
            L.divIcon({
              className: '',
              html: `<div class="map-pin ${n.operational} ${isSel ? 'selected' : ''}">${n.id.slice(-2)}</div>`,
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            })
          );
          if (isSel) {
            map.flyTo([n.lat, n.lng], 15, { duration: 0.5 });
            m.openPopup();
          }
        }
      });
    };
    updateSel();
  }, [selectedId, mapReady]);

  // Toggle special markers
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    specialMarkersRef.current.forEach((m) => {
      if (showSpecial) {
        m.addTo(map);
      } else {
        map.removeLayer(m);
      }
    });
  }, [showSpecial, mapReady]);

  // Fit bounds trigger
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || fitTrigger === 0) return;
    const updateFit = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;
      const allMarkers = [...markersRef.current.values(), ...(showSpecial ? specialMarkersRef.current : [])];
      if (allMarkers.length > 0) {
        const group = L.featureGroup(allMarkers);
        map.fitBounds(group.getBounds().pad(0.12));
      }
    };
    updateFit();
  }, [fitTrigger]);

  return (
    <div className="map-wrap">
      {/* Fallback SVG saat offline atau sebelum tiles siap */}
      <div className={`map-fallback ${mapReady ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} id="map-fallback" aria-hidden="true">
        <svg viewBox="0 0 900 560" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
          <defs>
            <pattern id="blocks" width="110" height="82" patternUnits="userSpaceOnUse">
              <rect x="9" y="9" width="35" height="23" rx="4" fill="#dce5dc" />
              <rect x="54" y="10" width="45" height="27" rx="4" fill="#e1e9e2" />
              <rect x="11" y="42" width="39" height="30" rx="4" fill="#e3eae4" />
              <rect x="58" y="48" width="36" height="24" rx="4" fill="#dce5dc" />
            </pattern>
          </defs>
          <rect width="900" height="560" fill="#edf2ed" />
          <rect width="900" height="560" fill="url(#blocks)" opacity=".8" />
          <path d="M-40 115 C120 155 220 95 335 128 S570 165 690 125 S850 110 950 150" stroke="#fff" strokeWidth="13" fill="none" />
          <path d="M-30 300 C120 260 245 300 360 275 S630 260 940 320" stroke="#fff" strokeWidth="14" fill="none" />
          <path d="M160 -30 C175 90 140 160 175 270 S200 450 155 600" stroke="#fff" strokeWidth="13" fill="none" />
          <path d="M455 -20 C420 100 480 170 445 280 S425 450 470 590" stroke="#fff" strokeWidth="12" fill="none" />
          <path d="M710 -20 C685 90 730 220 690 330 S720 470 685 590" stroke="#fff" strokeWidth="13" fill="none" />
          <path d="M60 0 C80 80 35 150 65 240 S40 400 90 560" stroke="#b8d9d0" strokeWidth="28" fill="none" opacity=".8" />
          <path d="M60 0 C80 80 35 150 65 240 S40 400 90 560" stroke="#d5e9e1" strokeWidth="17" fill="none" />
          <path d="M270 390 Q330 340 395 380 T540 390" stroke="#fff" strokeWidth="8" fill="none" />
          <path d="M590 40 Q610 105 570 170 T600 275" stroke="#fff" strokeWidth="7" fill="none" />
          <g fill="#9aa99d" fontFamily="sans-serif" fontSize="11" fontWeight="700">
            <text x="305" y="94">MAGELANG TENGAH</text>
            <text x="580" y="430">MAGELANG SELATAN</text>
            <text x="240" y="475">MAGELANG UTARA</text>
            <text x="70" y="285" transform="rotate(-88 70 285)">KORIDOR SUNGAI</text>
          </g>
        </svg>
      </div>

      {/* Kontainer Peta Leaflet */}
      <div id="map" ref={mapContainerRef} aria-label="Peta interaktif lokasi TPS skenario" className="absolute inset-0 z-10" />

      {/* Overlay Atas Kiri */}
      <div className="map-overlay-top">
        <strong>WILAYAH KOTA MAGELANG</strong>
        <span>Koordinat skenario · WGS 84</span>
      </div>

      {/* Overlay Legenda Bawah Kiri */}
      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-dot"></span>Prioritas
        </div>
        <div className="legend-item">
          <span className="legend-dot warning"></span>Siaga
        </div>
        <div className="legend-item">
          <span className="legend-dot safe"></span>Aman
        </div>
        <div className="legend-item">
          <span className="legend-square"></span>Depot / TPSA
        </div>
      </div>

      {/* Overlay Provenance Bawah Kanan */}
      <div className="map-provenance">Titik TPS: aproksimasi geocoding skenario</div>
    </div>
  );
};
