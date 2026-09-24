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

const TILE_URL: Record<Props['theme'], string> = {
  // P1: mode terang memakai basemap terang agar terbaca di siang hari/outdoor
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
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

      // Kontrol zoom besar di kanan bawah — mudah ditekan
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

      // 1. Pool DLH — kotak biru berlabel "DLH" (bukan emoji)
      const depotIcon = L.divIcon({
        className: 'custom-depot',
        html: `
          <div style="display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:12px;background:#1d4ed8;color:#fff;font-weight:800;font-size:14px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);font-family:Inter,sans-serif;" title="Pool DLH Kota Magelang">
            DLH
          </div>
        `,
        iconSize: [52, 52],
        iconAnchor: [26, 26],
      });
      const depotMarker = L.marker(POOL_DEPOT.coordinates, { icon: depotIcon, keyboard: true })
        .addTo(map)
        .bindPopup(
          `<div style="font-size:15px;line-height:1.5;color:#0f172a"><strong>${POOL_DEPOT.name}</strong><br/><span>${POOL_DEPOT.address}</span><br/><span>Tempat berangkat armada</span></div>`
        );
      markersRef.current['depot'] = depotMarker;

      // 2. TPSA Banyuurip — kotak ungu berlabel "TPA"
      const landfillIcon = L.divIcon({
        className: 'custom-landfill',
        html: `
          <div style="display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:12px;background:#7e22ce;color:#fff;font-weight:800;font-size:14px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);font-family:Inter,sans-serif;" title="TPSA Banyuurip">
            TPA
          </div>
        `,
        iconSize: [52, 52],
        iconAnchor: [26, 26],
      });
      const landfillMarker = L.marker(TPSA_BANYUURIP.coordinates, { icon: landfillIcon, keyboard: true })
        .addTo(map)
        .bindPopup(
          `<div style="font-size:15px;line-height:1.5;color:#0f172a"><strong>${TPSA_BANYUURIP.name}</strong><br/><span>${TPSA_BANYUURIP.address}</span><br/><span>Tempat bongkar muatan</span></div>`
        );
      markersRef.current['landfill'] = landfillMarker;

      // 3. Marker TPS — lingkaran besar 52px, angka 15px, bentuk + label (tak hanya warna)
      nodes.forEach((node) => {
        const st = statusOf(node);
        const bg = st === 'critical' ? '#dc2626' : st === 'warning' ? '#d97706' : '#15803d';
        const badge = st === 'critical' ? '⚠' : st === 'warning' ? '!' : '✓';
        const label = st === 'critical' ? 'Penuh, segera angkut' : st === 'warning' ? 'Hampir penuh' : 'Aman';
        const isSelected = selectedNode?.id === node.id;

        const icon = L.divIcon({
          className: 'tps-marker',
          html: `
            <div title="${node.name} — ${node.currentVolumePercent}% (${label})" style="position:relative;cursor:pointer;">
              <div class="${st === 'critical' ? 'critical-pulse' : ''}" style="display:flex;align-items:center;justify-content:center;width:54px;height:54px;border-radius:50%;background:${bg};color:#fff;font-weight:800;font-size:15px;border:${isSelected ? '4px solid #1d4ed8' : '3px solid #fff'};box-shadow:0 2px 8px rgba(0,0,0,.35);font-family:'JetBrains Mono',monospace;">
                ${node.currentVolumePercent}%
              </div>
              <div style="position:absolute;bottom:-6px;right:-6px;width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid ${bg};color:${bg};font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1;">${badge}</div>
            </div>
          `,
          iconSize: [54, 54],
          iconAnchor: [27, 27],
        });

        const marker = L.marker(node.coordinates, { icon, keyboard: true, title: `${node.name} — ${node.currentVolumePercent}% (${label})` })
          .addTo(map)
          .bindPopup(
            `<div style="font-size:15px;line-height:1.5;color:#0f172a"><strong>${node.name}</strong><br/><span>Sampah ${node.currentVolumePercent}% — ${label}</span><br/><span style="font-size:13px">${node.address}</span></div>`
          )
          .on('click', () => onSelectNode(node));

        markersRef.current[node.id] = marker;
      });

      // 4. Rute armada — garis lebih tebal agar terlihat di layar kecil
      if (showRoute && cvrp.waypoints.length > 0) {
        const latlngs: [number, number][] = cvrp.waypoints.map((wp) => [wp.lat, wp.lng]);
        const polyline = L.polyline(latlngs, {
          color: '#1d4ed8',
          weight: 5,
          opacity: 0.9,
          lineCap: 'round',
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
      className="relative w-full h-full rounded-[10px] overflow-hidden border"
      style={{
        minHeight: 480,
        borderColor: 'var(--border-strong)',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <div ref={mapContainerRef} className="w-full h-full z-0" style={{ minHeight: 480 }} />

      {/* Legenda Bahasa Indonesia, teks ≥13px, ikon + label */}
      <div
        className="absolute top-3 left-3 z-[1000] px-4 py-3 rounded-lg text-sm space-y-1.5 shadow-lg border"
        style={{
          backgroundColor: theme === 'light' ? 'rgba(255,255,255,.96)' : 'rgba(17,22,29,.96)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-primary)',
          maxWidth: 250,
        }}
      >
        <p className="font-extrabold text-sm">Peta TPS Kota Magelang</p>
        <p className="flex items-center gap-2 text-sm">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white font-extrabold"
            style={{ backgroundColor: '#dc2626', fontSize: 13 }}
          >
            ⚠
          </span>
          Penuh (≥ 80%) — segera angkut
        </p>
        <p className="flex items-center gap-2 text-sm">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white font-extrabold"
            style={{ backgroundColor: '#d97706', fontSize: 13 }}
          >
            !
          </span>
          Hampir penuh (50–79%)
        </p>
        <p className="flex items-center gap-2 text-sm">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white font-extrabold"
            style={{ backgroundColor: '#15803d', fontSize: 13 }}
          >
            ✓
          </span>
          Aman (&lt; 50%)
        </p>
        <p className="flex items-center gap-2 text-sm">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-6 h-6 rounded text-white font-extrabold"
            style={{ backgroundColor: '#1d4ed8', fontSize: 13 }}
          >
            DLH
          </span>
          Pool armada (berangkat)
        </p>
        <p className="flex items-center gap-2 text-sm">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-6 h-6 rounded text-white font-extrabold"
            style={{ backgroundColor: '#7e22ce', fontSize: 13 }}
          >
            TPA
          </span>
          TPSA Banyuurip (bongkar)
        </p>
      </div>
    </div>
  );
};
