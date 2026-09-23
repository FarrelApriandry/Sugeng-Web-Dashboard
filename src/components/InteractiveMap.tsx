import React, { useEffect, useRef, useState } from 'react';
import type { TPSNode, CVRPSolution } from '../data/dummyData';
import { POOL_DEPOT, TPSA_BANYUURIP } from '../data/dummyData';
import { Navigation, AlertTriangle, Radio } from 'lucide-react';

interface Props {
  nodes: TPSNode[];
  cvrp: CVRPSolution;
  selectedNode: TPSNode | null;
  onSelectNode: (node: TPSNode) => void;
  showRoute: boolean;
}

export const InteractiveMap: React.FC<Props> = ({
  nodes,
  cvrp,
  selectedNode,
  onSelectNode,
  showRoute,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const routePolylineRef = useRef<any>(null);
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

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Dark Matter CartoDB tiles for industrial geospatial feel
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

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

      // 1. Depot Marker
      const depotIcon = L.divIcon({
        className: 'custom-depot',
        html: `
          <div class="flex items-center justify-center w-8 h-8 rounded-[6px] bg-[#3B82F6] text-white font-bold text-xs border border-blue-400 shadow-lg">
            🚛
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const depotMarker = L.marker(POOL_DEPOT.coordinates, { icon: depotIcon })
        .addTo(map)
        .bindPopup(`<div style="color:#0B0F14"><strong style="color:#3B82F6">${POOL_DEPOT.name}</strong><br/><span style="font-size:11px">${POOL_DEPOT.address}</span></div>`);
      markersRef.current['depot'] = depotMarker;

      // 2. Landfill Marker
      const landfillIcon = L.divIcon({
        className: 'custom-landfill',
        html: `
          <div class="flex items-center justify-center w-8 h-8 rounded-[6px] bg-purple-600 text-white font-bold text-xs border border-purple-400 shadow-lg">
            🏭
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const landfillMarker = L.marker(TPSA_BANYUURIP.coordinates, { icon: landfillIcon })
        .addTo(map)
        .bindPopup(`<div style="color:#0B0F14"><strong style="color:#9333EA">${TPSA_BANYUURIP.name}</strong><br/><span style="font-size:11px">${TPSA_BANYUURIP.address}</span></div>`);
      markersRef.current['landfill'] = landfillMarker;

      // 3. TPS Markers
      nodes.forEach((node) => {
        const isCritical = node.currentVolumePercent >= 80 || node.gasStatusMQ135 === 'Tinggi (Bau Busuk)';
        const isWarning = node.currentVolumePercent >= 50 && node.currentVolumePercent < 80;

        let bg = 'bg-[#22C55E]';
        let border = 'border-emerald-400';
        if (isCritical) {
          bg = 'bg-[#EF4444] critical-pulse';
          border = 'border-red-400';
        } else if (isWarning) {
          bg = 'bg-[#F59E0B]';
          border = 'border-amber-400';
        }

        const isSelected = selectedNode?.id === node.id;

        const icon = L.divIcon({
          className: 'tps-marker',
          html: `
            <div class="relative group cursor-pointer">
              <div class="flex items-center justify-center w-9 h-9 rounded-[6px] ${bg} text-white font-mono text-[11px] font-bold border ${isSelected ? 'ring-2 ring-white scale-110' : border} shadow-md">
                ${node.currentVolumePercent}%
              </div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker(node.coordinates, { icon })
          .addTo(map)
          .on('click', () => onSelectNode(node));

        markersRef.current[node.id] = marker;
      });

      // 4. CVRP Polyline
      if (showRoute && cvrp.waypoints.length > 0) {
        const latlngs: [number, number][] = cvrp.waypoints.map(wp => [wp.lat, wp.lng]);
        const polyline = L.polyline(latlngs, {
          color: '#3B82F6',
          weight: 3,
          opacity: 0.8,
          dashArray: '6, 6',
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
    <div className="relative w-full h-full min-h-[460px] lg:min-h-[580px] rounded-[8px] overflow-hidden border border-[#202832] bg-[#11161D]">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Legend Overlay */}
      <div className="absolute top-3 left-3 z-[1000] bg-[#171D25]/95 backdrop-blur-sm border border-[#202832] px-3 py-2 rounded-[6px] text-xs space-y-1.5 shadow-lg">
        <div className="flex items-center gap-2 font-mono font-medium text-[#E6EDF3]">
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
          GIS MAP // MAGELANG
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-1 text-[10px] text-[#9AA6B2]">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#EF4444]"></span> Critical (≥80%)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span> Warning (50-79%)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#22C55E]"></span> Optimal (&lt;50%)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span> Depot DLH</span>
        </div>
      </div>
    </div>
  );
};
