import React, { useEffect, useRef, useState } from 'react';
import type { TPSNode, CVRPSolution } from '../data/dummyData';
import { POOL_DEPOT, TPSA_BANYUURIP } from '../data/dummyData';

interface Props {
  nodes: TPSNode[];
  cvrp: CVRPSolution;
  selectedNode: TPSNode | null;
  onSelectNode: (node: TPSNode) => void;
  showRoute: boolean;
  theme: 'light' | 'dark';
}

function statusOf(node: TPSNode): 'critical' | 'warning' | 'optimal' {
  if (node.currentVolumePercent >= 80 || node.gasStatusMQ135 === 'Tinggi (Bau Busuk)') return 'critical';
  if (node.currentVolumePercent >= 50) return 'warning';
  return 'optimal';
}

// API key CARTO Basemaps via env untuk raster tiles.
// Astro: variabel diawali PUBLIC_ otomatis tersedia di client via import.meta.env.
const CARTO_API_KEY = import.meta.env.PUBLIC_CARTO_KEY as string | undefined;

function tileUrl(style: 'voyager' | 'dark_all'): string {
  const base = `https://{s}.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}{r}.png`;
  return CARTO_API_KEY ? `${base}?key=${CARTO_API_KEY}` : base;
}

const TILE_URL: Record<Props['theme'], string> = {
  // P1: mode terang memakai basemap terang agar terbaca di siang hari/outdoor
  light: tileUrl('voyager'),
  dark: tileUrl('dark_all'),
};

export const InteractiveMap: React.FC<Props> = ({
  nodes,
  cvrp,
  selectedNode,
  onSelectNode,
  showRoute,
  theme,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const routePolylineRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    let isMounted = true;

    const initMap = async () => {
      const L = await import('leaflet');
      if (!isMounted || !mapContainerRef.current || mapInstanceRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [-7.482, 110.222],
        zoom: 14,
        zoomControl: false,
      });

      // Kontrol zoom di kanan bawah
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
      setMapLoaded(true);
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Ganti basemap saat tema berubah
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;
    const swapTiles = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;
      if (tileLayerRef.current) {
        tileLayerRef.current.remove();
        tileLayerRef.current = null;
      }
      tileLayerRef.current = L.tileLayer(TILE_URL[theme], {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);
    };
    swapTiles();
  }, [mapLoaded, theme]);

  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    const renderLayers = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;

      Object.values(markersRef.current).forEach((m: any) => m.remove());
      markersRef.current = {};

      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
        routePolylineRef.current = null;
      }

      // Pool armada DLH
      const depotIcon = L.divIcon({
        className: 'leaflet-divicon-sugeng',
        html: `
          <div class="sugeng-marker sugeng-marker-depot" title="Pool DLH Kota Magelang: titik awal armada">
            DLH
          </div>
        `,
        iconSize: [52, 52],
        iconAnchor: [26, 26],
      });
      const depotMarker = L.marker(POOL_DEPOT.coordinates, { icon: depotIcon, keyboard: true })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;line-height:1.55;color:#101828;min-width:190px"><p style="margin:0 0 4px;font-family:Archivo,sans-serif;font-weight:800;font-size:15px;letter-spacing:-0.01em">${POOL_DEPOT.name}</p><p style="margin:0;color:#344054">${POOL_DEPOT.address}</p><p style="margin:6px 0 0;display:inline-block;background:#0E7A3D;color:#fff;font-weight:700;font-size:12px;padding:3px 8px;border-radius:9999px">Tempat berangkat armada</p></div>`
        );
      markersRef.current['depot'] = depotMarker;

      // TPSA Banyuurip
      const landfillIcon = L.divIcon({
        className: 'leaflet-divicon-sugeng',
        html: `
          <div class="sugeng-marker sugeng-marker-landfill" title="TPSA Banyuurip: tempat bongkar muatan">
            TPA
          </div>
        `,
        iconSize: [52, 52],
        iconAnchor: [26, 26],
      });
      const landfillMarker = L.marker(TPSA_BANYUURIP.coordinates, { icon: landfillIcon, keyboard: true })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;line-height:1.55;color:#101828;min-width:190px"><p style="margin:0 0 4px;font-family:Archivo,sans-serif;font-weight:800;font-size:15px;letter-spacing:-0.01em">${TPSA_BANYUURIP.name}</p><p style="margin:0;color:#344054">${TPSA_BANYUURIP.address}</p><p style="margin:6px 0 0;display:inline-block;background:#101828;color:#fff;font-weight:700;font-size:12px;padding:3px 8px;border-radius:9999px">Tempat bongkar muatan</p></div>`
        );
      markersRef.current['landfill'] = landfillMarker;

      // Marker titik TPS
      nodes.forEach((node) => {
        const st = statusOf(node);
        const label = st === 'critical' ? 'Penuh, segera angkut' : st === 'warning' ? 'Hampir penuh' : 'Aman';
        const isSelected = selectedNode?.id === node.id;

        const icon = L.divIcon({
          className: 'leaflet-divicon-sugeng',
          html: `
            <div title="${node.name}: ${node.currentVolumePercent}% (${label})" style="position:relative;cursor:pointer;">
              <div class="sugeng-marker sugeng-marker-${st} ${isSelected ? 'sugeng-marker-selected' : ''}" style="width:54px;height:54px;font-size:15px;">
                ${node.currentVolumePercent}%
              </div>
            </div>
          `,
          iconSize: [54, 54],
          iconAnchor: [27, 27],
        });

        const marker = L.marker(node.coordinates, { icon, keyboard: true, title: `${node.name}: ${node.currentVolumePercent}% (${label})` })
          .addTo(map)
          .bindPopup(
            `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;line-height:1.55;color:#101828;min-width:200px"><p style="margin:0 0 4px;font-family:Archivo,sans-serif;font-weight:800;font-size:15px;letter-spacing:-0.01em">${node.name}</p><p style="margin:0;font-weight:700">Sampah ${node.currentVolumePercent}%: ${label}</p><p style="margin:4px 0 0;color:#344054;font-size:13px">${node.address}</p></div>`
          )
          .on('click', () => onSelectNode(node));

        markersRef.current[node.id] = marker;
      });

      // Rute optimasi armada
      if (showRoute && cvrp.waypoints.length > 0) {
        const latlngs: [number, number][] = cvrp.waypoints.map((wp) => [wp.lat, wp.lng]);
        L.polyline(latlngs, {
          color: '#fffdf8',
          weight: 9,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
        const polyline = L.polyline(latlngs, {
          color: '#E85D04',
          weight: 5,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: '1 7',
        }).addTo(map);
        routePolylineRef.current = polyline;
      }
    };

    renderLayers();
  }, [mapLoaded, nodes, cvrp, selectedNode, showRoute]);

  useEffect(() => {
    if (!mapInstanceRef.current || !selectedNode) return;
    mapInstanceRef.current.flyTo(selectedNode.coordinates, 15, { duration: 1.0 });
  }, [selectedNode]);

  return (
    <div
      className="relative w-full h-full rounded-[10px] overflow-hidden"
      style={{
        minHeight: 480,
        border: '1.5px solid var(--border-strong)',
        boxShadow: 'var(--hard-shadow)',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <div ref={mapContainerRef} className="w-full h-full z-0" style={{ minHeight: 480 }} />

      {/* Legenda peta */}
      <div
        className="absolute top-3 left-3 z-[1000] px-4 py-3 rounded-[10px] text-sm space-y-1.5"
        style={{
          backgroundColor: theme === 'light' ? 'rgba(255,253,248,.97)' : 'rgba(22,27,34,.97)',
          border: '1.5px solid var(--border-strong)',
          boxShadow: 'var(--hard-shadow)',
          color: 'var(--text-primary)',
          maxWidth: 258,
        }}
      >
        <p className="font-display font-extrabold text-sm tracking-tight">PETA TPS · KOTA MAGELANG</p>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white font-display"
            style={{ backgroundColor: '#C1272D', border: '2px solid #101828', fontSize: 11 }}
          >
            80+
          </span>
          Penuh (≥ 80%): segera angkut
        </p>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white font-display"
            style={{ backgroundColor: '#92400e', border: '2px solid #101828', fontSize: 11 }}
          >
            50+
          </span>
          Hampir penuh (50-79%)
        </p>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white font-display"
            style={{ backgroundColor: '#0E7A3D', border: '2px solid #101828', fontSize: 11 }}
          >
            OK
          </span>
          Aman (&lt; 50%)
        </p>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-7 h-7 rounded text-white font-display"
            style={{ backgroundColor: '#0E7A3D', border: '2px solid #101828', fontSize: 10 }}
          >
            DLH
          </span>
          Pool armada (berangkat)
        </p>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-7 h-7 rounded text-white font-display"
            style={{ backgroundColor: '#101828', border: '2px solid #101828', fontSize: 10 }}
          >
            TPA
          </span>
          TPSA Banyuurip (bongkar)
        </p>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span
            aria-hidden
            className="inline-block w-7 h-0"
            style={{ borderTop: '5px solid #E85D04', borderRadius: 2 }}
          />
          Rute armada DLH 03
        </p>
      </div>
    </div>
  );
};
