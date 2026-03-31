/**
 * Sparkline Component
 * Mini line chart sin ejes ni labels para KPIs
 * Renderizado con SVG puro para mejor rendimiento
 */

'use client';

import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 30,
  color,
  trend = 'stable',
  className = '',
}: SparklineProps) {
  const path = useMemo(() => {
    if (data.length < 2) return '';

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; // Evitar división por 0

    // Padding para que la línea no toque los bordes
    const padding = 2;
    const effectiveHeight = height - padding * 2;
    const effectiveWidth = width - padding * 2;

    // Calcular puntos
    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * effectiveWidth;
      const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
      return { x, y };
    });

    // Construir path SVG
    const pathData = points.reduce((acc, point, index) => {
      if (index === 0) {
        return `M ${point.x},${point.y}`;
      }
      return `${acc} L ${point.x},${point.y}`;
    }, '');

    return pathData;
  }, [data, width, height]);

  // Color automático según trend si no se especifica
  const strokeColor = useMemo(() => {
    if (color) return color;

    if (trend === 'up') return 'rgb(34, 197, 94)'; // green-500
    if (trend === 'down') return 'rgb(239, 68, 68)'; // red-500
    return 'rgb(156, 163, 175)'; // gray-400
  }, [color, trend]);

  if (data.length < 2) {
    return null;
  }

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Punto final (opcional, para destacar el último valor) */}
      {data.length > 0 && (
        <circle
          cx={width - 2}
          cy={
            2 +
            (height - 4) -
            ((data[data.length - 1] - Math.min(...data)) /
              (Math.max(...data) - Math.min(...data) || 1)) *
              (height - 4)
          }
          r="2"
          fill={strokeColor}
        />
      )}
    </svg>
  );
}

/**
 * SparklineBar Component
 * Mini bar chart para visualización alternativa
 */
interface SparklineBarProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function SparklineBar({
  data,
  width = 80,
  height = 30,
  color = 'rgb(148, 163, 184)', // slate-400
  className = '',
}: SparklineBarProps) {
  const max = Math.max(...data, 1); // Evitar división por 0
  const barWidth = width / data.length;
  const gap = 1;

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      {data.map((value, index) => {
        const barHeight = (value / max) * height;
        const x = index * barWidth;
        const y = height - barHeight;

        return (
          <rect
            key={index}
            x={x + gap / 2}
            y={y}
            width={barWidth - gap}
            height={barHeight}
            fill={color}
            rx="1"
          />
        );
      })}
    </svg>
  );
}
