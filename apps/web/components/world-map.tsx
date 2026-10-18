'use client';
import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { type GeoJSONSource, type Map as MapType } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Crosshair, Layers, Maximize2, Minus, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSignal } from '../lib/store';
import { api } from '../lib/client';
import {
  categoryColors,
  type EventRecord,
  type FeedResponse,
} from '../../../packages/shared/index';
import { countries, countryName } from '../../../packages/shared/countries';
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
export default function WorldMap({
  events,
  onSelect,
  height,
  interactive = true,
}: {
  events: EventRecord[];
  onSelect: (id: string) => void;
  height?: number;
  interactive?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null),
    map = useRef<MapType | null>(null),
    callback = useRef(onSelect);
  callback.current = onSelect;
  const [loaded, setLoaded] = useState(false),
    [error, setError] = useState(''),
    [heat, setHeat] = useState(false),
    [bbox, setBbox] = useState('');
  const { mode, category, source, country, q, hours, asOf, selected } = useSignal();
  const params = new URLSearchParams({ mode, category, source, country, q, pageSize: '500' });
  if (bbox) params.set('bbox', bbox);
  if (hours) params.set('from', new Date(Date.now() - hours * 3600000).toISOString());
  if (asOf) params.set('asOf', asOf);
  const viewport = useQuery<FeedResponse>({
    queryKey: ['events', 'map', params.toString()],
    queryFn: () => api('map/events?' + params),
    enabled: !!bbox && interactive,
    staleTime: 30000,
  });
  const data = interactive ? (viewport.data?.items ?? events) : events;
  useEffect(() => {
    if (!root.current) return;
    let m: MapType;
    try {
      m = new maplibregl.Map({
        container: root.current,
        center: [12, 17],
        zoom: 0.8,
        minZoom: -1,
        maxZoom: 12,
        attributionControl: { compact: true },
        interactive,
        renderWorldCopies: false,
        style: {
          version: 8,
          glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
          sources: {
            countries: { type: 'geojson', data: '/countries.geojson', promoteId: 'ISO_A2_EH' },
            grid: {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: [
                  ...Array.from({ length: 13 }, (_, i) => ({
                    type: 'Feature' as const,
                    properties: {},
                    geometry: {
                      type: 'LineString' as const,
                      coordinates: [
                        [i * 30 - 180, -80],
                        [i * 30 - 180, 80],
                      ],
                    },
                  })),
                  ...Array.from({ length: 6 }, (_, i) => ({
                    type: 'Feature' as const,
                    properties: {},
                    geometry: {
                      type: 'LineString' as const,
                      coordinates: [
                        [-180, i * 30 - 60],
                        [180, i * 30 - 60],
                      ],
                    },
                  })),
                ],
              },
            },
          },
          layers: [
            { id: 'background', type: 'background', paint: { 'background-color': '#0a1420' } },
            {
              id: 'grid',
              type: 'line',
              source: 'grid',
              paint: { 'line-color': '#152436', 'line-width': 0.5 },
            },
            {
              id: 'land',
              type: 'fill',
              source: 'countries',
              paint: { 'fill-color': '#182a3a', 'fill-opacity': 0.9 },
            },
            {
              id: 'news-areas',
              type: 'fill',
              source: 'countries',
              paint: {
                'fill-color': '#38bdf8',
                'fill-opacity': [
                  'case',
                  ['boolean', ['feature-state', 'selected'], false],
                  0.32,
                  ['>', ['coalesce', ['feature-state', 'count'], 0], 0],
                  0.14,
                  0,
                ],
              },
            },
            {
              id: 'borders',
              type: 'line',
              source: 'countries',
              paint: { 'line-color': '#32495c', 'line-width': 0.6 },
            },
          ],
        },
      });
    } catch {
      setError('WebGL is unavailable. Use the event list to explore source records.');
      return;
    }
    map.current = m;
    m.addControl(
      new maplibregl.AttributionControl({
        customAttribution: 'Natural Earth · Public domain',
        compact: true,
      }),
    );
    const move = () => {
      const b = m.getBounds();
      const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
      setBbox(
        [
          clamp(b.getWest(), -180, 180),
          clamp(b.getSouth(), -90, 90),
          clamp(b.getEast(), -180, 180),
          clamp(b.getNorth(), -90, 90),
        ]
          .map((n) => n.toFixed(3))
          .join(','),
      );
    };
    m.on('load', () => {
      m.addLayer({
        id: 'country-labels',
        type: 'symbol',
        source: 'countries',
        minzoom: 1.4,
        layout: {
          'text-field': ['get', 'NAME_EN'],
          'text-font': ['Open Sans Regular'],
          'text-size': 10,
          'text-max-width': 8,
        },
        paint: { 'text-color': '#718ba0', 'text-halo-color': '#10202c', 'text-halo-width': 1 },
      });
      m.addSource('events', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 7,
        clusterRadius: 35,
      });
      m.addLayer({
        id: 'heat',
        type: 'heatmap',
        source: 'events',
        paint: {
          'heatmap-weight': 0.5,
          'heatmap-intensity': 1,
          'heatmap-radius': 35,
          'heatmap-opacity': 0.7,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(56,189,248,0)',
            0.3,
            '#1e5b75',
            0.7,
            '#38bdf8',
            1,
            '#fbbf24',
          ],
        },
        layout: { visibility: 'none' },
      });
      m.addLayer({
        id: 'cluster-halo',
        type: 'circle',
        source: 'events',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#38bdf8',
          'circle-opacity': 0.07,
          'circle-radius': ['step', ['get', 'point_count'], 19, 10, 25, 50, 32],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#235475',
        },
      });
      m.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'events',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#153e55',
          'circle-radius': ['step', ['get', 'point_count'], 12, 10, 17, 50, 23],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#43b9db',
        },
      });
      m.addLayer({
        id: 'point-halo',
        type: 'circle',
        source: 'events',
        filter: ['!', ['has', 'point_count']],
        paint: { 'circle-radius': 12, 'circle-color': ['get', 'color'], 'circle-opacity': 0.1 },
      });
      m.addLayer({
        id: 'points',
        type: 'circle',
        source: 'events',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3.5, 8, 7],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 1,
          'circle-stroke-color': ['get', 'color'],
        },
      });
      m.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'events',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Open Sans Regular'],
          'text-size': 10,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#9edff3' },
      });
      m.on('click', 'points', (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) callback.current(String(id));
      });
      m.on('click', 'news-areas', (event) => {
        if (
          !interactive ||
          m.queryRenderedFeatures(event.point, { layers: ['points', 'clusters'] }).length
        )
          return;
        const feature = event.features?.[0],
          code = feature?.properties?.ISO_A2_EH;
        if (code)
          useSignal.getState().set({ country: useSignal.getState().country === code ? '' : code });
      });
      m.on('idle', () => {
        if (root.current) {
          root.current.dataset.mapReady = 'true';
          root.current.dataset.renderedSignals = String(
            m.queryRenderedFeatures({ layers: ['points', 'clusters'] }).length,
          );
        }
      });
      m.on('click', 'clusters', async (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const z = await (m.getSource('events') as GeoJSONSource).getClusterExpansionZoom(
          Number(f.properties?.cluster_id),
        );
        if (f.geometry.type === 'Point')
          m.easeTo({ center: f.geometry.coordinates as [number, number], zoom: z });
      });
      for (const l of ['points', 'clusters']) {
        m.on('mouseenter', l, () => (m.getCanvas().style.cursor = 'pointer'));
        m.on('mouseleave', l, () => (m.getCanvas().style.cursor = ''));
      }
      m.fitBounds(
        [
          [-179, -57],
          [179, 78],
        ],
        { padding: 20, duration: 0 },
      );
      setLoaded(true);
      move();
    });
    m.on('moveend', move);
    m.on('movestart', () => {
      if (root.current) root.current.dataset.mapReady = 'false';
    });
    m.on('error', (e) => {
      if (e.error.message.includes('countries'))
        setError('Map geography could not load. Event coordinates remain available.');
    });
    const observer = new ResizeObserver(() => m.resize());
    observer.observe(root.current);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
    };
  }, [interactive]);
  useEffect(() => {
    if (!loaded || !map.current) return;
    if (root.current) root.current.dataset.mapReady = 'false';
    const features = data
      .filter((e) => e.longitude !== null && e.latitude !== null)
      .map((e) => ({
        type: 'Feature' as const,
        properties: {
          id: e.id,
          title: e.title,
          color: e.synthetic ? '#a78bfa' : (categoryColors[e.category] ?? '#38bdf8'),
        },
        geometry: { type: 'Point' as const, coordinates: [e.longitude!, e.latitude!] },
      }));
    (map.current.getSource('events') as GeoJSONSource)?.setData({
      type: 'FeatureCollection',
      features,
    });
    const totals = new Map<string, number>();
    for (const record of data)
      for (const code of record.countryCodes ?? []) totals.set(code, (totals.get(code) ?? 0) + 1);
    for (const area of countries)
      map.current.setFeatureState(
        { source: 'countries', id: area.code },
        { count: totals.get(area.code) ?? 0, selected: country === area.code },
      );
  }, [data, loaded, country]);
  useEffect(() => {
    if (!loaded || !map.current) return;
    const code = interactive ? country : events[0]?.countryCodes?.[0];
    const area = countries.find((area) => area.code === code);
    if (area)
      map.current.fitBounds(area.bbox as [number, number, number, number], {
        padding: 45,
        duration: interactive ? 500 : 0,
        maxZoom: 6,
      });
    else if (interactive)
      map.current.fitBounds([-179, -57, 179, 78], { padding: 20, duration: 500 });
  }, [country, loaded, interactive]);
  useEffect(() => {
    if (loaded) map.current?.setLayoutProperty('heat', 'visibility', heat ? 'visible' : 'none');
  }, [heat, loaded]);
  useEffect(() => {
    const e = data.find((x) => x.id === selected);
    if (e && e.latitude !== null && e.longitude !== null)
      map.current?.easeTo({
        center: [e.longitude, e.latitude],
        zoom: Math.max(map.current.getZoom(), 3),
        duration: 700,
      });
  }, [selected]);
  return (
    <div className="map-frame" style={height ? { height } : undefined}>
      <div ref={root} className="map-canvas" aria-label="Interactive world event map" />
      {error && <div className="map-error">{error}</div>}
      <div className="map-coordinate">
        GLOBAL OBSERVATION NETWORK <span>WGS 84 / EPSG:4326</span>
      </div>
      <div className="map-controls">
        <button title="Zoom in" aria-label="Zoom in" onClick={() => map.current?.zoomIn()}>
          <Plus size={17} />
        </button>
        <button title="Zoom out" aria-label="Zoom out" onClick={() => map.current?.zoomOut()}>
          <Minus size={17} />
        </button>
        <button
          title="Reset map"
          aria-label="Reset map"
          onClick={() =>
            map.current?.fitBounds(
              [
                [-179, -57],
                [179, 78],
              ],
              { padding: 20, duration: 500 },
            )
          }
        >
          <Crosshair size={17} />
        </button>
        <button
          title="Toggle heatmap"
          aria-label="Toggle heatmap"
          aria-pressed={heat}
          onClick={() => setHeat(!heat)}
        >
          <Layers size={17} />
        </button>
        <button
          title="Fullscreen map"
          aria-label="Fullscreen map"
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void root.current?.parentElement?.requestFullscreen();
          }}
        >
          <Maximize2 size={17} />
        </button>
      </div>
      <div className="map-legend">
        <span>
          <i style={{ background: '#38bdf8' }} />
          Country news context
        </span>
        <span>
          <i style={{ background: '#fb923c' }} />
          Source-reported points
        </span>
        <span>
          <i style={{ background: '#a78bfa' }} />
          Synthetic exercise
        </span>
      </div>
      <div className="map-count">
        {country ? countryName(country) + ' · ' : ''}
        {data.filter((e) => e.latitude !== null).length} POINTS ·{' '}
        {data.filter((e) => e.latitude === null && e.countryCodes?.length).length} COUNTRY REPORTS
        {viewport.data && viewport.data.total > 500 ? ' · ZOOM TO REFINE' : ''}
      </div>
    </div>
  );
}
