"use client";

import { useRef, useEffect } from "react";
import type { RunnerShape, RunnerColor } from "@/lib/types";
import { RUNNER_SHAPES, RUNNER_COLORS } from "@/lib/types";

interface RunnerCustomizerProps {
  shape: RunnerShape;
  color: RunnerColor | string;
  onShapeChange: (s: RunnerShape) => void;
  onColorChange: (c: string) => void;
}

const SHAPE_LABELS: Record<RunnerShape, string> = {
  diamond: "◇",
  triangle: "△",
  hexagon: "⬡",
  cross: "✚",
  star: "★",
  circle: "●",
  square: "■",
  pentagon: "⬠",
};

function ShapePreview({ shape, color, size = 20 }: { shape: RunnerShape; color: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = size * 2; // retina
    canvas.width = s;
    canvas.height = s;
    ctx.clearRect(0, 0, s, s);

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;

    const cx = s / 2;
    const cy = s / 2;
    const r = s * 0.35;

    ctx.beginPath();
    switch (shape) {
      case "diamond":
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r, cy);
        break;
      case "triangle":
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r * 0.87, cy + r * 0.5);
        ctx.lineTo(cx - r * 0.87, cy + r * 0.5);
        break;
      case "hexagon":
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 2;
          ctx[i === 0 ? "moveTo" : "lineTo"](cx + r * Math.cos(a), cy + r * Math.sin(a));
        }
        break;
      case "pentagon":
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
          ctx[i === 0 ? "moveTo" : "lineTo"](cx + r * Math.cos(a), cy + r * Math.sin(a));
        }
        break;
      case "star": {
        const inner = r * 0.4;
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI / 5) * i - Math.PI / 2;
          const rad = i % 2 === 0 ? r : inner;
          ctx[i === 0 ? "moveTo" : "lineTo"](cx + rad * Math.cos(a), cy + rad * Math.sin(a));
        }
        break;
      }
      case "cross":
        ctx.moveTo(cx - r * 0.3, cy - r);
        ctx.lineTo(cx + r * 0.3, cy - r);
        ctx.lineTo(cx + r * 0.3, cy - r * 0.3);
        ctx.lineTo(cx + r, cy - r * 0.3);
        ctx.lineTo(cx + r, cy + r * 0.3);
        ctx.lineTo(cx + r * 0.3, cy + r * 0.3);
        ctx.lineTo(cx + r * 0.3, cy + r);
        ctx.lineTo(cx - r * 0.3, cy + r);
        ctx.lineTo(cx - r * 0.3, cy + r * 0.3);
        ctx.lineTo(cx - r, cy + r * 0.3);
        ctx.lineTo(cx - r, cy - r * 0.3);
        ctx.lineTo(cx - r * 0.3, cy - r * 0.3);
        break;
      case "circle":
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        break;
      case "square":
      default:
        ctx.rect(cx - r, cy - r, r * 2, r * 2);
        break;
    }
    ctx.closePath();
    ctx.fill();
  }, [shape, color, size]);

  return <canvas ref={canvasRef} width={size * 2} height={size * 2} style={{ width: size, height: size }} />;
}

export function RunnerCustomizer({ shape, color, onShapeChange, onColorChange }: RunnerCustomizerProps) {
  return (
    <div>
      {/* Shape selector */}
      <div className="flex gap-1 mb-2">
        {RUNNER_SHAPES.map((s) => (
          <button key={s} onClick={() => onShapeChange(s)}
            className={`w-7 h-7 flex items-center justify-center rounded-sm border transition-all ${
              shape === s
                ? "border-cyan bg-cyan/10"
                : "border-border hover:border-border-bright"
            }`}
            title={s}
          >
            <ShapePreview shape={s} color={shape === s ? color : "#4a4a5e"} size={14} />
          </button>
        ))}
      </div>

      {/* Color selector */}
      <div className="flex gap-1">
        {RUNNER_COLORS.map((c) => (
          <button key={c} onClick={() => onColorChange(c)}
            className={`w-7 h-7 rounded-sm border transition-all flex items-center justify-center ${
              color === c
                ? "border-white/50 scale-110"
                : "border-border hover:border-border-bright"
            }`}
          >
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: c, boxShadow: color === c ? `0 0 8px ${c}` : "none" }} />
          </button>
        ))}
      </div>
    </div>
  );
}
