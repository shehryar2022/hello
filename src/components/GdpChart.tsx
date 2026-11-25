import React, { useEffect, useRef, useState } from 'react';
import { formatNumber } from '../game/rules';

interface GdpChartProps {
  history: number[];
  currentGdp: number;
}

export const GdpChart: React.FC<GdpChartProps> = ({ history, currentGdp }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rangeIdx, setRangeIdx] = useState<0 | 1 | 2>(2);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const slices = [12, 36, 60] as const;
  const h = history.slice(-slices[rangeIdx]);
  const hasData = h.length >= 2;
  const first = hasData ? h[0] : currentGdp;
  const last = hasData ? h[h.length - 1] : currentGdp;
  const pct = first ? ((last - first) / first) * 100 : 0;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !hasData) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1.5);
    const W = c.clientWidth || 320;
    const H = 220;
    c.width = W * dpr;
    c.height = H * dpr;

    const ctx = c.getContext('2d');
    if (!ctx) return;

    const pl = 8 * dpr;
    const pr = 8 * dpr;
    const pt = 50 * dpr;
    const pb = 10 * dpr;
    const w = c.width;
    const ht = c.height;
    const lo = Math.min(...h);
    const hi = Math.max(...h);
    const sp = hi - lo || Math.max(1, hi * 0.02);
    const mn = lo - sp * 0.12;
    const mx = hi + sp * 0.12;
    const n = h.length;

    const X = (i: number) => pl + (i / (n - 1)) * (w - pl - pr);
    const Y = (v: number) => pt + (1 - (v - mn) / (mx - mn)) * (ht - pt - pb);

    const drawPath = () => {
      ctx.beginPath();
      ctx.moveTo(X(0), Y(h[0]));
      for (let i = 1; i < n; i++) {
        ctx.quadraticCurveTo(X(i - 1), Y(h[i - 1]), (X(i - 1) + X(i)) / 2, (Y(h[i - 1]) + Y(h[i])) / 2);
      }
      ctx.lineTo(X(n - 1), Y(h[n - 1]));
    };

    const s = hoverIdx != null ? Math.max(0, Math.min(n - 1, hoverIdx)) : n - 1;
    ctx.clearRect(0, 0, w, ht);
    const px = X(s);
    const py = Y(h[s]);
    const bw = Math.max(22 * dpr, ((w - pl - pr) / (n - 1)) * 2);

    let g = ctx.createLinearGradient(0, py, 0, ht);
    g.addColorStop(0, 'rgba(255,160,50,.30)');
    g.addColorStop(1, 'rgba(255,160,50,.04)');
    ctx.fillStyle = g;
    ctx.fillRect(px - bw / 2, py, bw, ht - py);

    drawPath();
    ctx.lineTo(X(n - 1), ht);
    ctx.lineTo(X(0), ht);
    ctx.closePath();
    g = ctx.createLinearGradient(0, pt, 0, ht);
    g.addColorStop(0, 'rgba(255,177,61,.32)');
    g.addColorStop(1, 'rgba(255,177,61,0)');
    ctx.fillStyle = g;
    ctx.fill();

    ctx.setLineDash([5 * dpr, 5 * dpr]);
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = dpr;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
    ctx.stroke();
    ctx.setLineDash([]);

    drawPath();
    ctx.strokeStyle = '#ffb13d';
    ctx.lineWidth = 2.2 * dpr;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,138,31,.3)';
    ctx.beginPath();
    ctx.arc(px, py, 9 * dpr, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff8a1f';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.arc(px, py, 5 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const label = `₨ ${formatNumber(h[s])}`;
    ctx.font = `700 ${12 * dpr}px Fredoka, system-ui, sans-serif`;
    const tw = ctx.measureText(label).width + 20 * dpr;
    const th = 26 * dpr;
    const bx = Math.min(w - tw - 4 * dpr, Math.max(4 * dpr, px - tw / 2));
    let by = py - th - 14 * dpr;
    if (by < 2 * dpr) by = py + 16 * dpr;

    ctx.fillStyle = '#ff8a1f';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(bx, by, tw, th, 8 * dpr);
    } else {
      ctx.rect(bx, by, tw, th);
    }
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + tw / 2, by + th / 2 + 0.5 * dpr);
  }, [h, hasData, hoverIdx]);

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!hasData || !canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    const idx = Math.max(0, Math.min(h.length - 1, Math.round(((e.clientX - r.left) / r.width) * (h.length - 1))));
    setHoverIdx(idx);
  };

  return (
    <div className="gdpc">
      <div className="gdpc-h">
        <span className="gdpc-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
          </svg>
        </span>
        GDP history
      </div>
      <div className="gdpc-v">₨ {formatNumber(last)}</div>
      <div className={`gdpc-d ${pct >= 0 ? 'up' : 'dn'}`}>
        <i>
          {pct >= 0 ? '▲ +' : '▼ '}
          {pct.toFixed(1)}%
        </i>
        <span>vs {['1 min ago', '3 min ago', 'session start'][rangeIdx]}</span>
      </div>
      <div className="gdpc-cv">
        <canvas
          ref={canvasRef}
          height={220}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setHoverIdx(null)}
        />
        {!hasData && (
          <p className="dim gdpc-m">Collecting data. Your first points appear in a few seconds.</p>
        )}
      </div>
      <div className="gdpc-r">
        {(['1 min', '3 min', '5 min'] as const).map((lbl, idx) => (
          <button
            key={lbl}
            type="button"
            className={rangeIdx === idx ? 'on' : ''}
            onClick={() => setRangeIdx(idx as 0 | 1 | 2)}
          >
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
};
