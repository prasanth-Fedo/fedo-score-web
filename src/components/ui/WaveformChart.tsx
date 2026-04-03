"use client";

import { useRef, useEffect } from "react";

interface WaveformChartProps {
  data: number[];
  color?: string;
  fillColor?: string;
  gridColor?: string;
  height?: number;
  className?: string;
}

export default function WaveformChart({
  data,
  color = "#FB923C",
  fillColor = "rgba(251,146,60,0.12)",
  gridColor = "#F5EDE0",
  height = 160,
  className = "",
}: WaveformChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const pad = { top: 12, bottom: 12, left: 0, right: 0 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();
    }

    const xStep = plotW / (data.length - 1);

    // Fill gradient
    const grad = ctx.createLinearGradient(0, pad.top, 0, height);
    grad.addColorStop(0, fillColor);
    grad.addColorStop(1, "rgba(251,146,60,0)");

    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + plotH);
    data.forEach((v, i) => {
      const x = pad.left + i * xStep;
      const y = pad.top + (1 - (v - min) / range) * plotH;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + (data.length - 1) * xStep, pad.top + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Signal line
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = pad.left + i * xStep;
      const y = pad.top + (1 - (v - min) / range) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.stroke();
  }, [data, color, fillColor, gridColor, height]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full ${className}`}
      style={{ height }}
    />
  );
}
