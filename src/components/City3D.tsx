import React, { memo, useEffect, useRef, useState } from 'react';
import { BUILDINGS } from '../game/constants';
import { formatNumber, gxLevelMult, totalBuildings } from '../game/rules';
import type { GameState } from '../game/types';
import { BuildingIcon, Hammer, RefreshCw } from './GameIcons';

const CSZ: Record<string, number> = {
  farm: 32, solar: 32, water: 28, stadium: 32, airport: 34, port: 30, rail: 30, mine: 28,
  hosp: 24, univ: 26, pow: 26, fact: 28, tech: 22, bank: 22, data: 22, space: 20,
  hydro: 28, stock: 24, evplant: 28, fusion: 24,
  transit: 28, semicon: 24, logistics: 30, quantum: 22,
};

const CHM: Record<string, number> = {
  farm: 0.5, solar: 0.38, water: 0.6, stadium: 0.62, airport: 0.32, port: 0.52, rail: 0.5,
  mine: 0.58, hosp: 0.88, univ: 0.8, pow: 0.9, fact: 0.92, tech: 1.12, bank: 1.2, data: 1.1, space: 1.5,
  hydro: 0.65, stock: 1.15, evplant: 0.95, fusion: 1.45,
  transit: 0.62, semicon: 1.15, logistics: 0.82, quantum: 1.55,
};

interface City3DProps {
  state: GameState;
  visible: boolean;
  burstKey: number;
  onBuildingTap: (clientX?: number, clientY?: number) => void;
}

const MAX_ACTIVE_PARTICLES = 8;

function formatRate(val: number): string {
  if (val >= 1000) return formatNumber(val);
  if (val >= 100) return String(Math.round(val));
  return val.toFixed(1);
}

function mapsEqual(a: Record<string, number> | undefined, b: Record<string, number> | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  for (const d of BUILDINGS) {
    if ((a[d.id] || 0) !== (b[d.id] || 0)) return false;
  }
  return true;
}

const City3DInner: React.FC<City3DProps> = ({ state, visible, burstKey, onBuildingTap }) => {
  const skyRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, sx: 0, o0: 0, t0: 0, off: 0 });
  const prevLevelsRef = useRef<Record<string, number>>({});
  const [popId, setPopId] = useState<string | null>(null);
  const [risingIds, setRisingIds] = useState<Record<string, boolean>>({});
  const [rotated, setRotated] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [tip, setTip] = useState<{ id: string; text: string; x: number; y: number; open: boolean }>({
    id: '',
    text: '',
    x: 0,
    y: 0,
    open: false,
  });
  const tipTimerRef = useRef<number | null>(null);
  const activeParticlesRef = useRef(0);
  const particleTimersRef = useRef<Set<number>>(new Set());
  const buildingRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rotRafRef = useRef<number | null>(null);

  const animEnabled = !!state.set.anim;

  const applyRotation = (rz: number) => {
    if (cityRef.current) {
      cityRef.current.style.setProperty('--rz', `${rz}deg`);
    }
  };

  useEffect(() => {
    applyRotation(-35 + dragRef.current.off);
  }, [visible, animEnabled]);

  useEffect(() => {
    const timers = particleTimersRef.current;
    return () => {
      if (rotRafRef.current !== null) cancelAnimationFrame(rotRafRef.current);
      if (tipTimerRef.current) window.clearTimeout(tipTimerRef.current);
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      activeParticlesRef.current = 0;
    };
  }, []);

  const spawnParticle = (cls: 'coin' | 'puff', buildingEl: Element | null, text?: string) => {
    const city = cityRef.current;
    if (!city || !buildingEl) return;
    if (activeParticlesRef.current >= MAX_ACTIVE_PARTICLES) return;
    const style = (buildingEl as HTMLElement).style;
    const k = document.createElement('b');
    k.className = cls;
    if (text) k.textContent = text;
    k.style.setProperty('--x', style.getPropertyValue('--x'));
    k.style.setProperty('--y', style.getPropertyValue('--y'));
    k.style.setProperty('--s', style.getPropertyValue('--s'));
    const h = parseInt(style.getPropertyValue('--h') || '10', 10);
    k.style.setProperty('--z0', `${h + 14}px`);
    city.appendChild(k);
    activeParticlesRef.current += 1;
    const tid = window.setTimeout(() => {
      particleTimersRef.current.delete(tid);
      k.remove();
      activeParticlesRef.current = Math.max(0, activeParticlesRef.current - 1);
    }, 2000);
    particleTimersRef.current.add(tid);
  };

  const bRef = useRef(state.b);
  bRef.current = state.b;

  useEffect(() => {
    if (!visible || !animEnabled) return;
    const coinTimer = window.setInterval(() => {
      if (document.hidden || !cityRef.current || document.body.classList.contains('modal-open')) return;
      const activeIds = Object.keys(bRef.current).filter((id) => (bRef.current[id] || 0) > 0);
      if (!activeIds.length) return;
      const pickId = activeIds[Math.floor(Math.random() * activeIds.length)];
      spawnParticle('coin', buildingRefs.current[pickId] || null, '₨');
    }, 2200);

    const puffTimer = window.setInterval(() => {
      if (document.hidden || !cityRef.current || document.body.classList.contains('modal-open')) return;
      const emitterIds = ['fact', 'pow', 'mine'].filter((id) => (bRef.current[id] || 0) > 0);
      if (!emitterIds.length) return;
      const pickId = emitterIds[Math.floor(Math.random() * emitterIds.length)];
      if (Math.random() < 0.7) {
        spawnParticle('puff', buildingRefs.current[pickId] || null);
      }
    }, 1500);

    return () => {
      window.clearInterval(coinTimer);
      window.clearInterval(puffTimer);
    };
  }, [visible, animEnabled]);

  useEffect(() => {
    if (burstKey <= 0 || !visible || !animEnabled || !cityRef.current) return;
    const activeIds = Object.keys(bRef.current)
      .filter((id) => (bRef.current[id] || 0) > 0)
      .slice(0, 6);
    const timers: number[] = [];
    activeIds.forEach((id, idx) => {
      const tid = window.setTimeout(() => {
        spawnParticle('coin', buildingRefs.current[id] || null, '₨');
      }, idx * 70);
      timers.push(tid);
    });
    return () => {
      for (const tid of timers) window.clearTimeout(tid);
    };
  }, [burstKey, visible, animEnabled]);

  useEffect(() => {
    const prev = prevLevelsRef.current;
    const newlyBuilt: string[] = [];
    const nextPrev: Record<string, number> = {};
    for (const d of BUILDINGS) {
      const curCount = state.b[d.id] || 0;
      nextPrev[d.id] = curCount;
      if (prev[d.id] !== undefined && curCount > prev[d.id]) {
        newlyBuilt.push(d.id);
      }
    }
    prevLevelsRef.current = nextPrev;

    if (newlyBuilt.length > 0 && newlyBuilt.length <= 2) {
      setRisingIds((cur) => {
        const next = { ...cur };
        for (const id of newlyBuilt) next[id] = true;
        return next;
      });
      const timer = window.setTimeout(() => {
        setRisingIds((cur) => {
          const next = { ...cur };
          for (const id of newlyBuilt) delete next[id];
          return next;
        });
      }, 850);
      return () => window.clearTimeout(timer);
    }
  }, [state.b]);

  if (!visible) return null;

  const totalRows = Math.ceil(BUILDINGS.length / 5);
  const gap = totalRows > 4 ? 38 : 42;
  const builtTotal = totalBuildings(state);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.sky-reset')) return;
    dragRef.current.active = true;
    dragRef.current.sx = e.clientX;
    dragRef.current.t0 = Date.now();
    dragRef.current.o0 = dragRef.current.off;
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture error
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.off = dragRef.current.o0 + (e.clientX - dragRef.current.sx) * 0.6;
    if (Math.abs(dragRef.current.off) > 4 && !rotated) setRotated(true);
    if (rotRafRef.current === null) {
      rotRafRef.current = requestAnimationFrame(() => {
        rotRafRef.current = null;
        applyRotation(-35 + dragRef.current.off);
      });
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (rotRafRef.current !== null) {
      cancelAnimationFrame(rotRafRef.current);
      rotRafRef.current = null;
      applyRotation(-35 + dragRef.current.off);
    }
    setDragging(false);
    if (
      e.type !== 'pointerup' ||
      Math.abs(e.clientX - dragRef.current.sx) > 7 ||
      Date.now() - dragRef.current.t0 > 450
    ) {
      return;
    }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const b = el?.closest('.bd') as HTMLElement | null;
    if (!b || !skyRef.current) return;
    const id = b.dataset.id;
    const def = BUILDINGS.find((x) => x.id === id);
    if (!def) return;
    const lvl = state.b[def.id] || 0;
    setPopId(null);
    requestAnimationFrame(() => setPopId(def.id));
    onBuildingTap(e.clientX, e.clientY);

    const r = skyRef.current.getBoundingClientRect();
    const mult = gxLevelMult(state, def.id);
    setTip({
      id: def.id,
      text: `${def.n} · Lv ${lvl}${lvl ? ` · +${formatRate(def.inc * lvl * mult)}/s` : ' · not built'}`,
      x: Math.max(85, Math.min(r.width - 85, e.clientX - r.left)),
      y: Math.max(44, e.clientY - r.top),
      open: true,
    });
    if (tipTimerRef.current) window.clearTimeout(tipTimerRef.current);
    tipTimerRef.current = window.setTimeout(() => {
      setTip((prev) => ({ ...prev, open: false }));
    }, 2200);
  };

  const handleResetView = (e: React.MouseEvent) => {
    e.stopPropagation();
    dragRef.current.off = 0;
    setRotated(false);
    applyRotation(-35);
  };

  const cityClass = `city${animEnabled && !dragging && !rotated ? ' sway' : ''}`;

  return (
    <div
      className="sky"
      ref={skyRef}
      data-testid="city-3d"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      {rotated && (
        <button type="button" className="sky-reset" onClick={handleResetView} title="Reset camera angle">
          <RefreshCw size={11} />
          <span>Reset view</span>
        </button>
      )}

      <div className={cityClass} ref={cityRef}>
        <i className="road" style={{ left: -124, top: -1, width: 248, height: 2 }} />
        <i className="road" style={{ left: -124, top: -43, width: 248, height: 2 }} />
        <i className="road" style={{ left: -124, top: 41, width: 248, height: 2 }} />
        <i className="road" style={{ top: -108, left: 21, width: 2, height: 216 }} />
        <i className="car" style={{ left: 0, top: -2, animation: 'carx 5.5s linear infinite' }} />
        <i className="car cb" style={{ left: 0, top: -44, animation: 'carx 7.5s linear infinite reverse' }} />
        <i className="car" style={{ left: 22, top: 0, width: 4, height: 8, animation: 'cary 6.5s linear infinite' }} />

        {BUILDINGS.map((d, i) => {
          const l = state.b[d.id] || 0;
          const col = i % 5;
          const row = Math.floor(i / 5);
          const sz = CSZ[d.id] || 26;
          const cx = (col - 2) * gap;
          const cy = (row - (totalRows - 1) / 2) * gap;
          const x = Math.round(cx - sz / 2);
          const y = Math.round(cy - sz / 2);
          const h = l ? Math.max(8, Math.round((8 + Math.min(l, 40) * 2.6) * (CHM[d.id] || 0.8))) : 2;
          const cls = `bd${l ? '' : ' empty'}${risingIds[d.id] ? ' up' : ''}${popId === d.id ? ' pop' : ''}${h > 62 ? ' tall' : ''}`;
          return (
            <div
              key={d.id}
              ref={(el) => {
                buildingRefs.current[d.id] = el;
              }}
              className={cls}
              data-id={d.id}
              style={
                {
                  '--x': `${x}px`,
                  '--y': `${y}px`,
                  '--s': `${sz}px`,
                  '--h': `${h}px`,
                  '--c': d.c,
                  '--i': i,
                } as React.CSSProperties
              }
            >
              <i className="fT" />
              <i className="fS" />
              <i className="fN" />
              <i className="fE" />
              <i className="fW" />
              {l > 0 && (
                <b className="em3">
                  <BuildingIcon id={d.id} size={13} color="#fff" />
                </b>
              )}
            </div>
          );
        })}
      </div>

      <div className={`ctip${tip.open ? ' on' : ''}`} style={{ left: tip.x, top: tip.y }}>
        {tip.id && <BuildingIcon id={tip.id} size={14} color="#ffc23d" />}
        <span>{tip.text}</span>
      </div>
      {builtTotal === 0 && (
        <span className="dim-hint">
          <Hammer size={13} color="#ffc23d" />
          <span>Build your first farm below</span>
        </span>
      )}
    </div>
  );
};

export const City3D = memo(City3DInner, (prev, next) => {
  return (
    prev.visible === next.visible &&
    prev.burstKey === next.burstKey &&
    prev.state.set.anim === next.state.set.anim &&
    mapsEqual(prev.state.b, next.state.b) &&
    mapsEqual(prev.state.gx?.lvl, next.state.gx?.lvl)
  );
});
