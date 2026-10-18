'use client';
import { useEffect, useRef } from 'react';
import type { EventRecord } from '../../../packages/shared/index';
export function Charts({ data }: { data: any }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let chart: import('echarts').ECharts | undefined;
    let dead = false;
    void import('echarts').then((e) => {
      if (dead || !root.current) return;
      chart = e.init(root.current, undefined, { renderer: 'svg' });
      chart.setOption({
        backgroundColor: 'transparent',
        textStyle: { fontFamily: 'Arial', color: '#94a3b8' },
        tooltip: { trigger: 'axis' },
        grid: { left: 48, right: 24, bottom: 45, top: 24 },
        xAxis: {
          type: 'category',
          data: data.daily.map((x: any) => x.day.slice(5)),
          axisLine: { lineStyle: { color: '#243247' } },
          axisLabel: { color: '#94a3b8' },
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          splitLine: { lineStyle: { color: '#1b2939' } },
          axisLabel: { color: '#94a3b8' },
        },
        series: [
          {
            type: 'bar',
            data: data.daily.map((x: any) => x.count),
            barMaxWidth: 24,
            itemStyle: { color: '#38bdf8', borderRadius: [3, 3, 0, 0] },
          },
        ],
      });
    });
    const o = new ResizeObserver(() => chart?.resize());
    if (root.current) o.observe(root.current);
    return () => {
      dead = true;
      o.disconnect();
      chart?.dispose();
    };
  }, [data]);
  return (
    <div
      ref={root}
      className="chart"
      role="img"
      aria-label="Daily event counts from the database"
    />
  );
}
export function ConnectionGraph({
  events,
  onSelect,
}: {
  events: EventRecord[];
  onSelect: (id: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let graph: import('cytoscape').Core | undefined;
    let dead = false;
    void import('cytoscape').then(({ default: cy }) => {
      if (dead || !root.current) return;
      const subset = events.slice(0, 50),
        sources = [...new Set(subset.map((e) => e.sourceName))],
        categories = [...new Set(subset.map((e) => e.category))];
      graph = cy({
        container: root.current,
        elements: [
          ...sources.map((s) => ({ data: { id: 's-' + s, label: s, type: 'source' } })),
          ...categories.map((s) => ({ data: { id: 'c-' + s, label: s, type: 'topic' } })),
          ...subset.map((e) => ({
            data: {
              id: e.id,
              label: e.title.length > 32 ? e.title.slice(0, 32) + '…' : e.title,
              type: 'event',
            },
          })),
          ...subset.flatMap((e) => [
            {
              data: {
                id: e.id + '-s',
                source: e.id,
                target: 's-' + e.sourceName,
                label: 'REPORTED_BY',
              },
            },
            {
              data: {
                id: e.id + '-c',
                source: e.id,
                target: 'c-' + e.category,
                label: 'SAME_TOPIC',
              },
            },
          ]),
        ],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#38bdf8',
              label: 'data(label)',
              color: '#acbdce',
              'font-size': 10,
              'text-valign': 'bottom',
              'text-margin-y': 9,
              width: 12,
              height: 12,
            },
          },
          {
            selector: 'node[type="source"]',
            style: { 'background-color': '#818cf8', width: 32, height: 32, 'font-size': 12 },
          },
          {
            selector: 'node[type="topic"]',
            style: { 'background-color': '#34d399', width: 25, height: 25 },
          },
          {
            selector: 'edge',
            style: { width: 1, 'line-color': '#283e52', 'curve-style': 'bezier' },
          },
          {
            selector: ':selected',
            style: { 'background-color': '#fbbf24', 'border-width': 2, 'border-color': '#fff' },
          },
        ],
        layout: {
          name: 'cose',
          animate: false,
          nodeRepulsion: () => 12000,
          idealEdgeLength: () => 100,
        },
        minZoom: 0.2,
        maxZoom: 3,
      });
      graph.on('tap', 'node[type="event"]', (e) => onSelect(e.target.id()));
    });
    return () => {
      dead = true;
      graph?.destroy();
    };
  }, [events, onSelect]);
  return (
    <div ref={root} className="graph" aria-label="Interactive source and topic relationships" />
  );
}
