"use client";

import { useRef, useEffect } from "react";

interface PSDChartProps {
  psd: number[];
  peakBpm?: number;
  height?: number;
  className?: string;
}

export default function PSDChart({
  psd,
  peakBpm,
  height = 160,
  className = "",
}: PSDChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || psd.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const pad = { top: 12, bottom: 24, left: 0, right: 0 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    // Only show 30-200 BPM range (indices ~proportional)
    const minBpm = 30;
    const maxBpm = 200;
    const bpmRange = maxBpm - minBpm;
    const startIdx = Math.floor((minBpm / maxBpm) * psd.length);
    const endIdx = Math.min(psd.length, Math.ceil((maxBpm / maxBpm) * psd.length));
    const sliced = psd.slice(startIdx, endIdx);

    if (sliced.length < 2) return;

    const max = Math.max(...sliced);
    const barW = plotW / sliced.length;

    // Bars
    sliced.forEach((v, i) => {
      const barH = (v / (max || 1)) * plotH;
      const x = pad.left + i * barW;
      const y = pad.top + plotH - barH;
      ctx.fillStyle = "rgba(14,165,233,0.3)";
      ctx.fillRect(x, y, Math.max(barW - 1, 1), barH);
    });

    // Envelope line
    ctx.beginPath();
    sliced.forEach((v, i) => {
      const x = pad.left + i * barW + barW / 2;
      const y = pad.top + (1 - v / (max || 1)) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#0EA5E9";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Peak BPM indicator
    if (peakBpm && peakBpm >= minBpm && peakBpm <= maxBpm) {
      const peakX = pad.left + ((peakBpm - minBpm) / bpmRange) * plotW;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#22C55E";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(peakX, pad.top);
      ctx.lineTo(peakX, pad.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#22C55E";
      ctx.font = "11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`${peakBpm} BPM`, peakX, pad.top + plotH + 14);
    }

    // X-axis labels
    ctx.fillStyle = "#C4AD8F";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    [60, 100, 140, 180].forEach((bpm) => {
      if (bpm < minBpm || bpm > maxBpm) return;
      const x = pad.left + ((bpm - minBpm) / bpmRange) * plotW;
      ctx.fillText(`${bpm}`, x, height - 2);
    });
  }, [psd, peakBpm, height]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full ${className}`}
      style={{ height }}
    />
  );
}
