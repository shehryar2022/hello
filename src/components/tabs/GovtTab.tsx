import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  BUILDING_CATEGORIES,
  BUILDINGS,
  DIPLOMACY_PARTNERS_16,
  DIPLOMACY_TREATIES_16,
  GOV_DAY_SEC,
  GX_GOV_BUILDINGS,
  GX_PROJECT_TYPES,
  GX_ROADS,
  MAX_BUILDING_LEVEL,
  NATIONAL_DECISIONS,
  PRODUCTION_CHAINS_16,
  PROJECT_STAGES,
  RESOURCE_CATALOG_16,
  TECH_CATEGORY_META,
  TECH_TREE,
  TRADE_GOODS,
  TRADE_MILESTONES,
  TRADE_PARTNERS,
} from '../../game/constants';
import {
  canAdvanceLocalMegaProjectStage,
  canClaimLocalMegaProjectStageMilestone,
  canEnactNationalDecision,
  canStartBuildingUpgrade,
  canStartLocalMegaProject,
  canStartResearch,
  canStartTradeContract,
  computeEconomySnapshot,
  computeNationalDevelopmentIndex,
  computeNationalStability,
  computeResourceEcosystem,
  computeWorkforceMetrics,
  formatNumber,
  getActiveDynamicEvent,
  getBondLimits,
  getBuildingUpgradeQuote,
  getDevelopmentDiscount,
  getDiplomacyBonuses,
  getDiplomacyState,
  getIntlTradeCapacity,
  getLocalMegaProjectStageQuote,
  getProjectSpeedMult,
  getRecommendedTech,
  getResearchCostMult,
  getTechLevel,
  getTradeGoodQuote,
  getUpgradeQueue,
  gxAverageCondition,
  gxRepairCost,
  hasTech,
  MAX_CONCURRENT_LOCAL_PROJECTS,
  MAX_UPGRADE_QUEUE,
  techCount,
  totalBuildings,
} from '../../game/rules';
import type {
  BuildingCategory,
  GameState,
  GovtSubTab,
  GovProject,
  ProjectType,
  TechCategory,
  TradeGoodId,
} from '../../game/types';
import { GdpChart } from '../GdpChart';
import {
  BarChart3,
  Bell,
  BuildingIcon,
  CashCoinIcon,
  CheckCircle2,
  Clock,
  Coins,
  FlaskConical,
  GemDiamondIcon,
  Globe,
  Hammer,
  InfraIcon,
  Landmark,
  Lock,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
} from '../GameIcons';

function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function conditionColor(c: number): string {
  return c >= 70 ? '#3fe0b0' : c >= 40 ? '#ffc23d' : '#ff6fa5';
}

interface GovtTabProps {
  state: GameState;
  subTab: GovtSubTab;
  uid: string | null;
  projects: GovProject[];
  liveProjectProgress: Record<string, number>;
  serverOffsetMs: number;
  isUserActive: boolean;
  onChangeSubTab: (sub: GovtSubTab) => void;
  onFixInfra: (key: string, full: boolean) => void;
  onUpgradeBuilding: (id: string) => void;
  onStartProject: (type: ProjectType) => void;
  onPayProjectStage: (projectId: string) => void;
  onUnlockTech: (techId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onStartResearch?: (techId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onStartLocalMegaProject?: (type: ProjectType) => void;
  onAdvanceLocalMegaProjectStage?: (projectId: string) => void;
  onClaimLocalMegaProjectStageMilestone?: (projectId: string) => void;
  onClaimLocalMegaProject?: (projectId: string) => void;
  onStartTradeContract?: (
    goodId: TradeGoodId,
    partner: string,
    direction: 'export' | 'import',
    units: number,
  ) => void;
  onClaimTradeMilestone?: (milestoneId: string) => void;
  onEnactDecision?: (decisionId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onBorrowBond?: (amount: number) => void;
  onRepayBond?: (amount: number) => void;
  onSendEnvoy?: (partnerCode: string) => void;
  onSignTreaty?: (treatyId: string) => void;
  onResolveDynamicEvent?: (choiceIdx: 0 | 1) => void;
}

export const GovtTab: React.FC<GovtTabProps> = memo(({
  state,
  subTab,
  uid,
  projects,
  liveProjectProgress,
  serverOffsetMs,
  isUserActive,
  onChangeSubTab,
  onFixInfra,
  onUpgradeBuilding,
  onStartProject,
  onPayProjectStage,
  onUnlockTech,
  onStartResearch,
  onStartLocalMegaProject,
  onAdvanceLocalMegaProjectStage,
  onClaimLocalMegaProjectStageMilestone,
  onClaimLocalMegaProject,
  onStartTradeContract,
  onClaimTradeMilestone,
  onEnactDecision,
  onBorrowBond,
  onRepayBond,
  onSendEnvoy,
  onSignTreaty,
  onResolveDynamicEvent,
}) => {
  const gx = state.gx;
  const gbAvg = useMemo(() => gxAverageCondition(state, GX_GOV_BUILDINGS), [state]);
  const rdAvg = useMemo(() => gxAverageCondition(state, GX_ROADS), [state]);
  const exp = gx.exp;
  const builtBuildings = useMemo(() => BUILDINGS.filter((d) => (state.b[d.id] || 0) > 0), [state.b]);
  const nowSrv = (state.t || Date.now()) + serverOffsetMs;
  const activeCount = useMemo(() => projects.filter((p) => p.status === 'active').length, [projects]);
  const localMegaProjects = state.megaProjects || [];
  const activeLocalProjectsCount = useMemo(
    () => localMegaProjects.filter((p) => !p.claimed).length,
    [localMegaProjects],
  );
  const disc = useMemo(() => getDevelopmentDiscount(state, nowSrv), [state, nowSrv]);
  const projSpeed = useMemo(() => getProjectSpeedMult(state, nowSrv), [state, nowSrv]);
  const researchCostMult = useMemo(() => getResearchCostMult(state, nowSrv), [state, nowSrv]);
  const researchedCount = useMemo(() => techCount(state), [state]);
  const readyTechCount = useMemo(
    () => TECH_TREE.filter((t) => canStartResearch(state, t.id, nowSrv).ok).length,
    [state, nowSrv],
  );
  const readyDecisionCount = useMemo(
    () => NATIONAL_DECISIONS.filter((d) => canEnactNationalDecision(state, d, nowSrv).ok).length,
    [state, nowSrv],
  );
  const activeTradeContracts = useMemo(
    () => (state.intlTrade?.contracts || []).filter((c) => !c.completed),
    [state.intlTrade?.contracts],
  );
  const upgQueue = useMemo(() => getUpgradeQueue(state), [state]);
  const techRec = useMemo(() => getRecommendedTech(state), [state]);
  const ownedBuildings = useMemo(() => totalBuildings(state), [state]);
  const activeDynEv = useMemo(() => getActiveDynamicEvent(state, nowSrv), [state, nowSrv]);
  const econSnap = useMemo(
    () => (subTab === 'stats' || subTab === 'ecosystem' ? computeEconomySnapshot(state, { nowMs: nowSrv }) : null),
    [state, subTab, nowSrv],
  );

  const [techCat, setTechCat] = useState<'all' | TechCategory>('all');
  const [techSearch, setTechSearch] = useState<string>('');
  const [techStatus, setTechStatus] = useState<'all' | 'ready' | 'unlocked'>('all');
  const [tradePartner, setTradePartner] = useState<string>(TRADE_PARTNERS[0]?.code || 'AE');
  const [tradeUnits, setTradeUnits] = useState<number>(5);
  const [tradeSearch, setTradeSearch] = useState<string>('');
  const [upgSearch, setUpgSearch] = useState<string>('');

  const dismissStorageKey = `cet_cleared_proj_${uid || 'offline'}`;
  const [hiddenPastIds, setHiddenPastIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(dismissStorageKey);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(dismissStorageKey);
      setHiddenPastIds(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setHiddenPastIds([]);
    }
  }, [dismissStorageKey]);

  const pastProjects = projects.filter(
    (p) => p.status !== 'active' && !hiddenPastIds.includes(p.id),
  );

  const handleClearPast = () => {
    const nextIds = Array.from(
      new Set([...hiddenPastIds, ...projects.filter((p) => p.status !== 'active').map((p) => p.id)]),
    );
    setHiddenPastIds(nextIds);
    try {
      localStorage.setItem(dismissStorageKey, JSON.stringify(nextIds.slice(-80)));
    } catch {
      // Ignore storage quota errors
    }
  };

  return (
    <div>
      <div className="subtabs">
        <button type="button" className={subTab === 'infra' ? 'on' : ''} onClick={() => onChangeSubTab('infra')}>
          <Landmark size={14} />
          <span>Infra &amp; Upgrades</span>
        </button>
        <button type="button" className={subTab === 'decisions' ? 'on' : ''} onClick={() => onChangeSubTab('decisions')}>
          <Zap size={14} />
          <span>Decisions</span>
          {readyDecisionCount > 0 && <em>{readyDecisionCount}</em>}
        </button>
        <button type="button" className={subTab === 'projects' ? 'on' : ''} onClick={() => onChangeSubTab('projects')}>
          <Hammer size={14} />
          <span>Projects</span>
          {activeCount + activeLocalProjectsCount > 0 && <em>{activeCount + activeLocalProjectsCount}</em>}
        </button>
        <button type="button" className={subTab === 'research' ? 'on' : ''} onClick={() => onChangeSubTab('research')}>
          <FlaskConical size={14} />
          <span>Research Lab</span>
          {readyTechCount > 0 && <em>{readyTechCount}</em>}
        </button>
        <button type="button" className={subTab === 'intl_trade' ? 'on' : ''} onClick={() => onChangeSubTab('intl_trade')}>
          <Globe size={14} />
          <span>Intl Trade</span>
          {activeTradeContracts.length > 0 && <em>{activeTradeContracts.length}</em>}
        </button>
        <button type="button" className={subTab === 'ecosystem' ? 'on' : ''} onClick={() => onChangeSubTab('ecosystem')}>
          <Coins size={14} />
          <span>Ecosystem</span>
          {activeDynEv && !activeDynEv.active.resolved && <em>!</em>}
        </button>
        <button type="button" className={subTab === 'stats' ? 'on' : ''} onClick={() => onChangeSubTab('stats')}>
          <BarChart3 size={14} />
          <span>Economy Stats</span>
        </button>
      </div>

      {(disc > 0 || projSpeed > 1) && (
        <div className="tradelim">
          <span>
            <Sparkles size={14} color="#3fe0b0" />
            National Bonuses Active
          </span>
          <b className="ok">
            −{Math.round(disc * 100)}% build/repair · ×{projSpeed.toFixed(2)} project speed
          </b>
        </div>
      )}

      {subTab === 'infra' && (
        <>
          <div className="gxc">
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Coins size={15} color="#ffc23d" />
              <b>Daily Government Expenses</b>{' '}
              <span className="dim">
                · next in <b>{Math.max(0, GOV_DAY_SEC - Math.floor(gx.acc))}s</b> of active play
              </span>
            </p>
            {exp ? (
              <p className="dim">
                Day {exp.n}: Salaries ₨ {formatNumber(exp.sal)} · Electricity ₨ {formatNumber(exp.el)} · Infrastructure ₨{' '}
                {formatNumber(exp.inf)}
                <br />
                <b>Total ₨ {formatNumber(exp.total)}</b> (paid ₨ {formatNumber(exp.paid)})
              </p>
            ) : (
              <p className="dim">
                First report arrives after one government day (5 min active play). Salaries 3% + electricity 1.5% +
                infrastructure 1.5% of daily gross income.
              </p>
            )}
            <p className="dim">
              Buildings avg {Math.round(gbAvg)}% · Transport efficiency {Math.round(92 + (8 * rdAvg) / 100)}% ·{' '}
              {gx.blk > 0 ? 'Blackout −15% income' : 'Power OK'}
              {gx.pb > 0 ? ` · Projects bonus +${(gx.pb * 100).toFixed(0)}% income` : ''}
            </p>
          </div>

      <div className="gxh">
        <Landmark size={15} color="#ffc23d" />
        <span>Government Buildings</span>
      </div>
      <p className="dim" style={{ marginBottom: 8 }}>
        Renovation costs depend only on <b>20% of your building development</b> (temporary boosters never inflate repairs).
      </p>
      <div className="list g2">
        {GX_GOV_BUILDINGS.map(([key, name]) => {
          const cond = gx.cond[key] ?? 100;
          const col = conditionColor(cond);
          const c20 = gxRepairCost(state, key, false, nowSrv);
          const cFull = gxRepairCost(state, key, true, nowSrv);
          const needsFix = cond < 99.5;
          return (
            <div key={key} className="row" style={{ '--c': col } as React.CSSProperties}>
              <div className="em">
                <InfraIcon id={key} size={22} />
              </div>
              <div>
                <h2>
                  {name}
                  <span className="lv">{Math.round(cond)}%</span>
                </h2>
                <p>{cond < 40 ? 'Poor — hurts income & happiness' : 'Condition'}</p>
                <div className="gxm">
                  <b style={{ width: `${Math.round(cond)}%`, background: col }} />
                </div>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <button
                  type="button"
                  className={`btn sm ${needsFix && state.cash >= c20 ? 'mint' : 'no'}`}
                  disabled={!needsFix || state.cash < c20}
                  onClick={() => onFixInfra(key, false)}
                >
                  {needsFix ? `+20% ₨ ${formatNumber(c20)}` : '+20%'}
                </button>
                <button
                  type="button"
                  className={`btn sm ${needsFix && state.cash >= cFull ? 'gold' : 'no'}`}
                  disabled={!needsFix || state.cash < cFull}
                  onClick={() => onFixInfra(key, true)}
                >
                  {needsFix ? `Renovate ₨ ${formatNumber(cFull)}` : 'Full'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="gxh">
        <Wrench size={15} color="#5ccbff" />
        <span>Roads &amp; Highways</span>
      </div>
      <div className="list g2">
        {GX_ROADS.map(([key, name]) => {
          const cond = gx.cond[key] ?? 100;
          const col = conditionColor(cond);
          const c20 = gxRepairCost(state, key, false, nowSrv);
          const cFull = gxRepairCost(state, key, true, nowSrv);
          const needsFix = cond < 99.5;
          return (
            <div key={key} className="row" style={{ '--c': col } as React.CSSProperties}>
              <div className="em">
                <InfraIcon id={key} size={22} />
              </div>
              <div>
                <h2>
                  {name}
                  <span className="lv">{Math.round(cond)}%</span>
                </h2>
                <p>Low condition cuts transport efficiency &amp; business income</p>
                <div className="gxm">
                  <b style={{ width: `${Math.round(cond)}%`, background: col }} />
                </div>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <button
                  type="button"
                  className={`btn sm ${needsFix && state.cash >= c20 ? 'mint' : 'no'}`}
                  disabled={!needsFix || state.cash < c20}
                  onClick={() => onFixInfra(key, false)}
                >
                  {needsFix ? `+20% ₨ ${formatNumber(c20)}` : '+20%'}
                </button>
                <button
                  type="button"
                  className={`btn sm ${needsFix && state.cash >= cFull ? 'gold' : 'no'}`}
                  disabled={!needsFix || state.cash < cFull}
                  onClick={() => onFixInfra(key, true)}
                >
                  {needsFix ? `Repair all ₨ ${formatNumber(cFull)}` : 'Full'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="gxh">
        <TrendingUp size={15} color="#3fe0b0" />
        <span>Building Upgrades (Level 1–{MAX_BUILDING_LEVEL})</span>
      </div>
      <div className="tradelim" style={{ marginBottom: 10 }}>
        <span>
          <Clock size={14} color="#5ccbff" />
          Active Upgrade Queue ({upgQueue.length}/{MAX_UPGRADE_QUEUE})
        </span>
        <b>5 Tiers · Diminishing Returns</b>
      </div>

      {upgQueue.length > 0 && (
        <div className="gxc" style={{ marginBottom: 10 }} data-testid="upgrade-queue-panel">
          {upgQueue.map((slot) => {
            const bDef = BUILDINGS.find((b) => b.id === slot.buildingId);
            const leftMs = Math.max(0, slot.finishAt - nowSrv);
            const pct = Math.max(5, Math.min(100, Math.round(100 - (leftMs / Math.max(1000, slot.totalSec * 1000)) * 100)));
            return (
              <div key={`${slot.buildingId}_${slot.toLevel}`} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <b>
                    {bDef?.n || slot.buildingId} · Lv {slot.fromLevel} → {slot.toLevel}
                  </b>
                  <span style={{ color: '#5ccbff' }}>{Math.ceil(leftMs / 1000)}s left</span>
                </div>
                <div className="gxm">
                  <b style={{ width: `${pct}%`, background: '#5ccbff' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {builtBuildings.length ? (
        <>
          <div style={{ marginBottom: 10 }}>
            <input
              type="search"
              className="inp"
              value={upgSearch}
              onChange={(e) => setUpgSearch(e.target.value)}
              placeholder="Filter owned buildings to upgrade…"
              aria-label="Filter owned buildings for upgrades"
              style={{ marginBottom: 0, padding: '7px 10px', fontSize: 12.5 }}
            />
          </div>
          <div className="list g2" data-testid="building-upgrades-list">
            {builtBuildings
              .filter((d) => !upgSearch.trim() || d.n.toLowerCase().includes(upgSearch.trim().toLowerCase()))
              .map((d) => {
                const quote = getBuildingUpgradeQuote(state, d.id, nowSrv);
                if (!quote) return null;
                const check = canStartBuildingUpgrade(state, d.id, nowSrv);
                const queued = upgQueue.find((q) => q.buildingId === d.id);
                const leftSec = queued ? Math.max(0, Math.ceil((queued.finishAt - nowSrv) / 1000)) : 0;
                const progressPct = Math.round((quote.curLevel / MAX_BUILDING_LEVEL) * 100);
                return (
                  <div key={d.id} className="row" style={{ '--c': quote.tier.color } as React.CSSProperties}>
                    <div className="em">
                      <BuildingIcon id={d.id} size={22} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2>
                        <span>{d.n}</span>
                        <span className="lv" style={{ borderColor: quote.tier.color, color: quote.tier.color }}>
                          Lv {quote.curLevel}/{MAX_BUILDING_LEVEL}
                        </span>
                      </h2>
                      <p>
                        {quote.tier.label} · Output ×{quote.curMult.toFixed(2)}
                        {!quote.isMax ? ` → ×${quote.nextMult.toFixed(2)} (${formatDuration(quote.durSec * 1000)})` : ' (MAX)'}
                      </p>
                      <div className="bmeta" style={{ marginTop: 2 }}>
                        <span style={{ color: 'var(--mint)' }}>
                          ₨ {formatNumber(quote.curStats.incPerSec * 60)}/m{!quote.isMax ? ` → ${formatNumber(quote.nextStats.incPerSec * 60)}/m` : ''}
                        </span>
                        <span>
                          Jobs {quote.curStats.jobs}{!quote.isMax ? ` → ${quote.nextStats.jobs}` : ''}
                        </span>
                      </div>
                      <div className="gxm">
                        <b style={{ width: `${progressPct}%`, background: quote.tier.color }} />
                      </div>
                    </div>
                    {quote.isMax ? (
                      <span className="lv" style={{ borderColor: 'var(--mint)', color: 'var(--mint)' }}>
                        MAX
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={`btn sm ${check.ok ? 'mint' : 'no'}`}
                        disabled={!check.ok}
                        title={check.reason || `Upgrade ${d.n} to Lv ${quote.nextLevel}`}
                        onClick={() => onUpgradeBuilding(d.id)}
                      >
                        {queued ? `Upgrading ${leftSec}s` : `Lv ${quote.nextLevel} · ₨ ${formatNumber(quote.cost)}`}
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </>
      ) : (
        <p className="dim">Buy buildings in the Build tab first.</p>
      )}

      {(state.upgHist || []).length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary className="dim" style={{ cursor: 'pointer', fontSize: 12.5 }}>
            Upgrade History ({(state.upgHist || []).length})
          </summary>
          <div className="gxc" style={{ marginTop: 8 }}>
            {(state.upgHist || []).slice(0, 12).map((h, i) => (
              <p key={`${h.buildingId}_${h.atMs}_${i}`} className="dim">
                <b>{h.name}</b>: Lv {h.fromLevel} → Lv {h.toLevel} (₨ {formatNumber(h.cost)})
              </p>
            ))}
          </div>
        </details>
      )}
        </>
      )}

      {subTab === 'projects' && (
        <>
          <div className="gxh" style={{ marginTop: 4 }}>
            <Hammer size={15} color="#a58cff" />
            <span>National Mega Projects ({Object.keys(GX_PROJECT_TYPES).length} Projects)</span>
          </div>
          <p className="dim" style={{ marginBottom: 10 }}>
            Launch strategic sovereign mega projects (max {MAX_CONCURRENT_LOCAL_PROJECTS} active solo projects). Completing each grants permanent income, happiness, Coins, and Diamonds, with balanced operating maintenance.
          </p>

          {localMegaProjects.filter((p) => !p.claimed).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {localMegaProjects
                .filter((p) => !p.claimed)
                .map((mp) => {
                  const def = GX_PROJECT_TYPES[mp.type];
                  const quote = getLocalMegaProjectStageQuote(state, mp, nowSrv);
                  const msCheck = canClaimLocalMegaProjectStageMilestone(state, mp.id, nowSrv);
                  const advCheck = canAdvanceLocalMegaProjectStage(state, mp.id, nowSrv);
                  const isFinalReady = quote.currentStage >= quote.totalStages && quote.stageFinished;
                  const leftMs = Math.max(0, mp.finishAt - nowSrv);
                  const pct = quote.stageFinished
                    ? 100
                    : Math.max(4, Math.min(100, Math.round(((mp.totalSec * 1000 - leftMs) / Math.max(1000, mp.totalSec * 1000)) * 100)));
                  const claimedStage = mp.milestoneClaimedStage ?? 0;
                  const rCoins = Math.max(0, def?.rewardCoins || 0);
                  const rGems = Math.max(0, def?.rewardGems || 0);
                  const alreadyCoins = (claimedStage >= 1 ? Math.floor(rCoins * 0.25) : 0) + (claimedStage >= 2 ? Math.floor(rCoins * 0.3) : 0);
                  const alreadyGems = (claimedStage >= 1 ? Math.floor(rGems * 0.25) : 0) + (claimedStage >= 2 ? Math.floor(rGems * 0.3) : 0);
                  const remCoins = Math.max(0, rCoins - alreadyCoins);
                  const remGems = Math.max(0, rGems - alreadyGems);
                  return (
                    <div key={mp.id} className="gxc" data-testid={`mega-project-active-${mp.type}`}>
                      <p style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <InfraIcon id={mp.type} size={16} />
                          <b>{def?.n || mp.type}</b>
                          <span className="lv" data-testid={`mega-project-stage-${mp.type}`}>
                            Stage {quote.currentStage}/{quote.totalStages}
                          </span>
                        </span>
                        <span style={{ color: isFinalReady ? '#3fe0b0' : '#5ccbff', fontSize: 12 }}>
                          {isFinalReady
                            ? 'Ready to Claim!'
                            : quote.stageFinished
                              ? `Stage ${quote.currentStage} Complete!`
                              : `${formatDuration(leftMs)} left (${pct}%)`}
                        </span>
                      </p>
                      <div className="gxm">
                        <b style={{ width: `${pct}%`, background: quote.stageFinished ? '#3fe0b0' : '#7c5cff' }} />
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {msCheck.ok && onClaimLocalMegaProjectStageMilestone && (
                          <button
                            type="button"
                            className="btn sm mint"
                            data-testid={`mega-project-milestone-${mp.type}`}
                            onClick={() => onClaimLocalMegaProjectStageMilestone(mp.id)}
                          >
                            <Sparkles size={13} />
                            <span>
                              Claim Stage {msCheck.stage} Milestone (+₨ {formatNumber(msCheck.coinsAdded)} &amp; +{msCheck.gemsAdded} 💎)
                            </span>
                          </button>
                        )}
                        {quote.nextStage !== null && quote.stageFinished && onAdvanceLocalMegaProjectStage && (
                          <button
                            type="button"
                            className={`btn sm ${advCheck.ok ? 'gold' : 'no'}`}
                            disabled={!advCheck.ok}
                            title={advCheck.reason}
                            data-testid={`mega-project-advance-${mp.type}`}
                            onClick={() => onAdvanceLocalMegaProjectStage(mp.id)}
                          >
                            Advance Stage {advCheck.nextStage} · ₨ {formatNumber(advCheck.cost)} ({formatDuration(advCheck.durSec * 1000)})
                          </button>
                        )}
                        {isFinalReady && onClaimLocalMegaProject && (
                          <button
                            type="button"
                            className="btn sm gold"
                            data-testid={`mega-project-claim-${mp.type}`}
                            onClick={() => onClaimLocalMegaProject(mp.id)}
                          >
                            <Sparkles size={13} />
                            <span>
                              Claim Final +₨ {formatNumber(remCoins)} &amp; +{remGems} Diamonds
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          <div className="list g2" data-testid="mega-projects-catalog">
            {(Object.keys(GX_PROJECT_TYPES) as ProjectType[]).map((k) => {
              const def = GX_PROJECT_TYPES[k];
              const check = canStartLocalMegaProject(state, k, nowSrv);
              const isCompletedCount = localMegaProjects.filter((p) => p.type === k && p.claimed).length;
              return (
                <div key={k} className="row" style={{ '--c': '#a58cff' } as React.CSSProperties}>
                  <div className="em">
                    <InfraIcon id={k} size={22} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2>
                      <span>{def.n}</span>
                      {isCompletedCount > 0 && <span className="lv">Built ×{isCompletedCount}</span>}
                    </h2>
                    <p>{def.desc || 'National strategic construction project.'}</p>
                    <div className="bmeta">
                      <span>Stage 1: ₨ {formatNumber(check.cost)} ({formatDuration(check.durSec * 1000)})</span>
                      <span>Total ({PROJECT_STAGES} Stages): ₨ {formatNumber(check.totalCost)} · {formatDuration(check.totalDurSec * 1000)}</span>
                      {def.reqRank && <span>Rank {def.reqRank}+</span>}
                      {def.minJobs && <span>{formatNumber(def.minJobs)} Jobs</span>}
                      {def.minEnergySupply && <span>{def.minEnergySupply} MW</span>}
                      {def.maintPerSec && <span>Maint −₨ {formatNumber(def.maintPerSec)}/s</span>}
                      {def.sectors?.length && <span style={{ color: '#c4b8ff' }}>{def.sectors.join(' · ')}</span>}
                      <span style={{ color: 'var(--mint)' }}>+{Math.round(def.pb * 100)}% Inc · +{def.ph} Hap</span>
                      {def.rewardGems && <span style={{ color: 'var(--cy)' }}>+{def.rewardGems} Diamonds</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn sm ${check.ok ? 'gold' : 'no'}`}
                    disabled={!check.ok || !onStartLocalMegaProject}
                    title={check.reason || `Launch ${def.n}`}
                    onClick={() => onStartLocalMegaProject?.(k)}
                  >
                    {check.ok ? `Launch Stage 1 · ₨ ${formatNumber(check.cost)}` : check.reason || 'Locked'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="gxh" style={{ marginTop: 14 }}>
            <Landmark size={15} color="#5ccbff" />
            <span>Online Sovereign Stage Contracts</span>
          </div>
      <p className="dim" style={{ marginBottom: 10 }}>
        Pay in {PROJECT_STAGES} stages while signed in. Construction advances while online &amp; active (24h–96h deadlines; 75% refund if missed). Max 3 active.
      </p>

      {!uid ? (
        <p className="dim" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Lock size={14} /> Sign in for cloud-tracked multi-stage contracts.
        </p>
      ) : (
        <>
          {projects
            .filter((p) => p.status === 'active')
            .slice()
            .sort((a, b) => b.st - a.st)
            .map((p) => {
              const capMs = Math.floor((p.t.dur * p.paid) / PROJECT_STAGES);
              const liveMs = Math.max(p.progressMs, liveProjectProgress[p.id] ?? p.progressMs);
              const effectiveMs = Math.min(p.t.dur, Math.min(capMs, liveMs));
              const pct = Math.round((effectiveMs / p.t.dur) * 100);
              const invested = Math.ceil(p.t.cost / PROJECT_STAGES) * p.paid;
              const stageCost = Math.ceil(p.t.cost / PROJECT_STAGES);
              const stageCapReached = effectiveMs >= capMs && p.paid < PROJECT_STAGES;
              const statusText = p.pending
                ? 'Starting…'
                : stageCapReached
                  ? `Stage ${p.paid}/${PROJECT_STAGES} complete — invest next stage`
                  : isUserActive
                    ? 'Building'
                    : 'Paused';

              return (
                <div key={p.id} className="gxc">
                  <p style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <InfraIcon id={p.type} size={16} />
                    <b>{p.t.n}</b> · {statusText}
                  </p>
                  <div className="gxm">
                    <b style={{ width: `${pct}%`, background: '#7c5cff' }} />
                  </div>
                  <p className="dim">
                    Progress {pct}% · Invested ₨ {formatNumber(invested)} / ₨ {formatNumber(p.t.cost)} · Stage{' '}
                    {p.paid}/{PROJECT_STAGES}
                    <br />
                    <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    <b>{formatDuration(p.dl - nowSrv)}</b> left
                  </p>
                  {p.paid < PROJECT_STAGES && (
                    <button
                      type="button"
                      className={`btn sm ${state.cash >= stageCost ? 'mint' : 'no'}`}
                      disabled={state.cash < stageCost}
                      onClick={() => onPayProjectStage(p.id)}
                    >
                      <Zap size={13} />
                      <span>Invest stage {p.paid + 1} · ₨ {formatNumber(stageCost)}</span>
                    </button>
                  )}
                </div>
              );
            })}

          <div className="list g2">
            {(Object.keys(GX_PROJECT_TYPES) as ProjectType[]).map((k) => {
              const def = GX_PROJECT_TYPES[k];
              const stageCost = Math.ceil(def.cost / PROJECT_STAGES);
              const canStart = activeCount < 3 && state.cash >= stageCost;
              return (
                <div key={k} className="row" style={{ '--c': '#7c5cff' } as React.CSSProperties}>
                  <div className="em">
                    <InfraIcon id={k} size={22} />
                  </div>
                  <div>
                    <h2>
                      {def.n}
                      <span className="lv">₨ {formatNumber(def.cost)}</span>
                    </h2>
                    <p>
                      Build {formatDuration(def.dur)} · Deadline {formatDuration(def.dl * 60_000)} · Reward +40% cash
                      &amp; permanent bonus
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`btn sm ${canStart ? 'mint' : 'no'}`}
                    disabled={!canStart}
                    onClick={() => onStartProject(k)}
                  >
                    {activeCount >= 3 ? 'Max 3 active' : `Start · ₨ ${formatNumber(stageCost)}`}
                  </button>
                </div>
              );
            })}
          </div>

          {pastProjects.length > 0 && (
            <details style={{ marginTop: 10 }}>
              <summary className="dim" style={{ cursor: 'pointer', fontSize: 13 }}>
                Past projects ({pastProjects.length})
              </summary>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                  <button type="button" className="btn sm" onClick={handleClearPast}>
                    Clear past
                  </button>
                </div>
                {pastProjects
                  .slice()
                  .sort((a, b) => b.st - a.st)
                  .slice(0, 8)
                  .map((p) => {
                    const invested = Math.ceil(p.t.cost / PROJECT_STAGES) * p.paid;
                    const pct = Math.round((Math.min(p.t.dur, p.progressMs) / p.t.dur) * 100);
                    return (
                      <div key={p.id} className="gxc">
                        <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <InfraIcon id={p.type} size={15} />
                          <b>{p.t.n}</b> · {p.status === 'done' ? <CheckCircle2 size={14} color="#3fe0b0" /> : 'Failed'}
                        </p>
                        <p className="dim">
                          Progress {pct}% · Invested ₨ {formatNumber(invested)} / ₨ {formatNumber(p.t.cost)} · Stage{' '}
                          {p.paid}/{PROJECT_STAGES}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </details>
          )}
        </>
      )}

      {gx.log.length > 0 && (
        <>
          <div className="gxh">
            <Bell size={15} color="#ffc23d" />
            <span>Recent notices</span>
          </div>
          <div className="gxc">
            {gx.log.map((m, idx) => (
              <p key={`${m}-${gx.log.length - idx}`} className="dim">
                {m}
              </p>
            ))}
          </div>
        </>
      )}
        </>
      )}

      {subTab === 'research' && (
        <div data-testid="research-lab-view">
          <div className="tradelim">
            <span>
              <FlaskConical size={14} color="#5ccbff" />
              National Research Doctrines ({TECH_CATEGORY_META.length} Disciplines)
            </span>
            <b>
              {researchedCount} / {TECH_TREE.length} Unlocked · {ownedBuildings} Buildings
              {researchCostMult < 1 ? ` · −${Math.round((1 - researchCostMult) * 100)}% cost` : ''}
            </b>
          </div>

          {state.resQueue && state.resQueue.techId && (() => {
            const qDef = TECH_TREE.find((t) => t.id === state.resQueue?.techId);
            const leftMs = Math.max(0, state.resQueue.finishAt - nowSrv);
            const totalMs = Math.max(1000, state.resQueue.totalSec * 1000);
            const pct = Math.max(5, Math.min(100, Math.round(100 - (leftMs / totalMs) * 100)));
            return (
              <div className="gxc" style={{ marginBottom: 10 }} data-testid="active-research-banner">
                <p style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span>
                    <FlaskConical size={14} color="#5ccbff" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    <b>Researching: {qDef?.n || state.resQueue.techId}</b>
                  </span>
                  <span style={{ color: '#5ccbff', fontWeight: 700 }}>{Math.ceil(leftMs / 1000)}s left</span>
                </p>
                <div className="gxm">
                  <b style={{ width: `${pct}%`, background: '#5ccbff' }} />
                </div>
              </div>
            );
          })()}

          <div className="build-tools" style={{ marginBottom: 8 }}>
            <div className="build-search-wrap">
              <input
                type="search"
                className="inp build-search-inp"
                placeholder={`Search all ${TECH_TREE.length} research upgrades…`}
                aria-label="Search technologies"
                value={techSearch}
                onChange={(e) => setTechSearch(e.target.value)}
              />
            </div>
            <div className="qty-toggle" role="group" aria-label="Filter research status">
              <button type="button" className={techStatus === 'all' ? 'on' : ''} onClick={() => setTechStatus('all')}>
                All
              </button>
              <button type="button" className={techStatus === 'ready' ? 'on' : ''} onClick={() => setTechStatus('ready')}>
                Ready ({readyTechCount})
              </button>
              <button type="button" className={techStatus === 'unlocked' ? 'on' : ''} onClick={() => setTechStatus('unlocked')}>
                Active ({researchedCount})
              </button>
            </div>
          </div>

          <div className="fchips" style={{ marginBottom: 10 }} role="tablist" aria-label="Research disciplines">
            <button
              type="button"
              className={`fchip ${techCat === 'all' ? 'on' : ''}`}
              onClick={() => setTechCat('all')}
            >
              All ({TECH_TREE.length})
            </button>
            {TECH_CATEGORY_META.map((cat) => {
              const cnt = TECH_TREE.filter((t) => t.cat === cat.id && hasTech(state, t.id)).length;
              const tot = TECH_TREE.filter((t) => t.cat === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`fchip ${techCat === cat.id ? 'on' : ''}`}
                  onClick={() => setTechCat(cat.id)}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <small style={{ opacity: 0.75, marginLeft: 4 }}>
                    {cnt}/{tot}
                  </small>
                </button>
              );
            })}
          </div>

          <div className="list g2">
            {TECH_TREE.filter((t) => {
              if (techCat !== 'all' && t.cat !== techCat) return false;
              const tq = techSearch.trim().toLowerCase();
              if (tq && !t.n.toLowerCase().includes(tq) && !t.d.toLowerCase().includes(tq) && !t.effectLabel.toLowerCase().includes(tq)) {
                return false;
              }
              const curLvl = getTechLevel(state, t.id);
              if (techStatus === 'unlocked' && curLvl <= 0) return false;
              if (techStatus === 'ready' && !canStartResearch(state, t.id, nowSrv).ok) return false;
              return true;
            }).map((t) => {
              const curLvl = getTechLevel(state, t.id);
              const maxLvl = Math.max(1, t.maxLevel ?? 1);
              const unlocked = curLvl > 0;
              const mastered = curLvl >= maxLvl;
              const isResearching = state.resQueue?.techId === t.id;
              const check = canStartResearch(state, t.id, nowSrv);
              const meta = TECH_CATEGORY_META.find((m) => m.id === t.cat);
              const catColor = meta?.color || '#5ccbff';
              const metReq = ownedBuildings >= t.reqBuildings;
              const reqLabName = t.reqLabBuilding
                ? BUILDINGS.find((b) => b.id === t.reqLabBuilding)?.n || t.reqLabBuilding
                : '';
              const metLab = !t.reqLabBuilding || (state.b[t.reqLabBuilding] || 0) > 0;
              const recReason = !mastered ? techRec[t.id] : undefined;
              const researchHandler = onStartResearch || onUnlockTech;
              return (
                <div
                  key={t.id}
                  className={`row${recReason ? ' rec-card' : ''}`}
                  style={{ '--c': mastered ? '#3fe0b0' : catColor } as React.CSSProperties}
                >
                  <div className="em">
                    {mastered ? <CheckCircle2 size={22} color="#3fe0b0" /> : <span style={{ fontSize: 20 }}>{meta?.icon || '🧪'}</span>}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2>
                      <span>{t.n}</span>
                      <span className="lv" style={{ borderColor: mastered ? 'var(--mint)' : catColor, color: mastered ? 'var(--mint)' : catColor, background: 'rgba(255,255,255,0.06)' }}>
                        {meta?.label || t.cat.toUpperCase()}
                      </span>
                      {maxLvl > 1 && (
                        <span className="lv" style={{ borderColor: unlocked ? 'var(--mint)' : 'rgba(255,255,255,0.2)', color: unlocked ? 'var(--mint)' : 'var(--mu)' }}>
                          Lv {curLvl}/{maxLvl}
                        </span>
                      )}
                      {recReason && (
                        <span className="rec-badge">
                          <Sparkles size={10} />
                          <span>{recReason}</span>
                        </span>
                      )}
                    </h2>
                    <p>
                      {t.d} <b style={{ color: '#e6dcff' }}>{t.effectLabel}</b>
                    </p>
                    {!mastered && (
                      <div className="bmeta" style={{ marginTop: 2 }}>
                        <span className={metReq ? 'ok' : 'bad'}>
                          {ownedBuildings}/{t.reqBuildings} Bldgs
                        </span>
                        {reqLabName && (
                          <span className={metLab ? 'ok' : 'bad'}>
                            Lab: {reqLabName}{metLab ? ' ✓' : ''}
                          </span>
                        )}
                        {t.reqRank && <span>Rank {t.reqRank}+</span>}
                        <span>{formatDuration((check.durSec || t.durSec) * 1000)}</span>
                        {t.unlocksBuildings?.length ? (
                          <span style={{ color: 'var(--gold)' }}>Unlocks {t.unlocksBuildings.length} building(s)</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {mastered ? (
                    <span className="lv" style={{ borderColor: 'var(--mint)', color: 'var(--mint)', background: 'rgba(63,224,176,0.14)' }}>
                      {maxLvl > 1 ? `Max Lv ${maxLvl}` : 'Active'}
                    </span>
                  ) : isResearching ? (
                    <span className="lv" style={{ borderColor: 'var(--cy)', color: 'var(--cy)', background: 'rgba(92,203,255,0.14)' }}>
                      {Math.max(0, Math.ceil(((state.resQueue?.finishAt || nowSrv) - nowSrv) / 1000))}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={`btn sm ${check.ok ? 'gold' : 'no'}`}
                      disabled={!check.ok}
                      title={check.reason}
                      onClick={(e) => researchHandler(t.id, e)}
                    >
                      {curLvl > 0 ? `Lv ${curLvl + 1} · ` : ''}₨ {formatNumber(check.cost)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'intl_trade' && (() => {
        const cap = getIntlTradeCapacity(state);
        const intl = state.intlTrade || {
          contracts: [],
          completedCount: 0,
          exportRevenue: 0,
          importSpend: 0,
          milestonesClaimed: {},
        };
        const partnerObj = TRADE_PARTNERS.find((p) => p.code === tradePartner) || TRADE_PARTNERS[0];
        const clampedUnits = Math.max(1, Math.min(cap.maxUnitsPerOrder, tradeUnits));
        const importBuffLeft = intl.importBuffUntil && intl.importBuffUntil > nowSrv
          ? Math.ceil((intl.importBuffUntil - nowSrv) / 1000)
          : 0;
        const dipBonus = getDiplomacyBonuses(state);
        const stockMap = state.resources?.stock || {};
        const tq = tradeSearch.trim().toLowerCase();
        const visibleGoods = TRADE_GOODS.filter(
          (g) => !tq || g.name.toLowerCase().includes(tq) || g.effectLabel.toLowerCase().includes(tq),
        );
        return (
          <div data-testid="intl-trade-view">
            <div className="tradelim">
              <span>
                <Globe size={14} color="#5ccbff" />
                International Trade Corridor ({TRADE_GOODS.length} Commodities)
              </span>
              <b>
                Slots {activeTradeContracts.length}/{cap.maxConcurrent} · Freight {cap.dailyVolumeUsed}/{cap.dailyVolumeCap}
                {dipBonus.tradeBonusPct > 0 ? ` · +${dipBonus.tradeBonusPct}% Treaties` : ''}
              </b>
            </div>

            <div className="econ-stats" style={{ marginBottom: 10 }}>
              <div className="econ-tile">
                <small>Completed Contracts</small>
                <b style={{ color: 'var(--gold)' }}>{intl.completedCount || 0}</b>
                <span>Max {cap.maxUnitsPerOrder} units / order</span>
              </div>
              <div className="econ-tile">
                <small>Export Revenue</small>
                <b style={{ color: 'var(--mint)' }}>₨ {formatNumber(intl.exportRevenue || 0)}</b>
                <span>Dispatch fee 22% upfront</span>
              </div>
              <div className="econ-tile">
                <small>Import Spend</small>
                <b style={{ color: 'var(--cy)' }}>₨ {formatNumber(intl.importSpend || 0)}</b>
                <span>{importBuffLeft > 0 ? `Supply Buff ${importBuffLeft}s` : 'Imports grant morale & supply buff'}</span>
              </div>
            </div>

            <div className="gxc" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <b>Trade Partner ({partnerObj.name} · ×{partnerObj.tariffBias.toFixed(2)} export)</b>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[1, 5, 10, 20].map((u) => (
                    <button
                      key={u}
                      type="button"
                      className={`fchip ${clampedUnits === Math.min(cap.maxUnitsPerOrder, u) ? 'on' : ''}`}
                      onClick={() => setTradeUnits(Math.min(cap.maxUnitsPerOrder, u))}
                    >
                      {Math.min(cap.maxUnitsPerOrder, u)} units
                    </button>
                  ))}
                </div>
              </div>
              <div className="fchips" style={{ marginBottom: 8 }}>
                {TRADE_PARTNERS.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    className={`fchip ${tradePartner === p.code ? 'on' : ''}`}
                    onClick={() => setTradePartner(p.code)}
                  >
                    <span>{p.code} · {p.name}</span>
                  </button>
                ))}
              </div>
              <input
                type="search"
                className="inp"
                placeholder={`Filter all ${TRADE_GOODS.length} commodities…`}
                aria-label="Filter trade commodities"
                value={tradeSearch}
                onChange={(e) => setTradeSearch(e.target.value)}
                style={{ marginBottom: 0, padding: '7px 10px', fontSize: 12.5 }}
              />
            </div>

            {activeTradeContracts.length > 0 && (
              <div className="gxc" style={{ marginBottom: 10 }} data-testid="active-trade-contracts">
                <p style={{ marginBottom: 6 }}><b>Active Freight Shipments</b></p>
                {activeTradeContracts.map((c) => {
                  const good = TRADE_GOODS.find((g) => g.id === c.goodId);
                  const leftMs = Math.max(0, c.finishAt - nowSrv);
                  const pct = Math.max(5, Math.min(100, Math.round(100 - (leftMs / Math.max(1000, c.durSec * 1000)) * 100)));
                  return (
                    <div key={c.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                        <span>
                          {good?.icon} <b>{c.direction.toUpperCase()}</b> {c.units} {good?.unitLabel || 'units'} ({c.partner})
                        </span>
                        <span style={{ color: c.direction === 'export' ? '#3fe0b0' : '#5ccbff' }}>
                          {Math.ceil(leftMs / 1000)}s · {c.direction === 'export' ? `+₨ ${formatNumber(c.totalValue)}` : 'Supply Buff'}
                        </span>
                      </div>
                      <div className="gxm">
                        <b style={{ width: `${pct}%`, background: c.direction === 'export' ? '#3fe0b0' : '#5ccbff' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="list g2" data-testid="trade-goods-grid">
              {visibleGoods.map((g) => {
                const quote = getTradeGoodQuote(g.id, state, nowSrv);
                const expCheck = canStartTradeContract(state, g.id, tradePartner, 'export', clampedUnits, nowSrv);
                const impCheck = canStartTradeContract(state, g.id, tradePartner, 'import', clampedUnits, nowSrv);
                const heldQty = Math.round((Number(stockMap[g.id]) || 0) * 10) / 10;
                return (
                  <div key={g.id} className="row" style={{ '--c': quote.unlocked ? '#3fe0b0' : '#a58cff' } as React.CSSProperties}>
                    <div className="em" style={{ fontSize: 22 }}>{g.icon}</div>
                    <div style={{ minWidth: 0 }}>
                      <h2>
                        <span>{g.name}</span>
                        <span className="lv" style={{ color: quote.demandTrendPct >= 0 ? 'var(--mint)' : 'var(--pink)' }}>
                          {quote.demandTrendPct >= 0 ? `+${quote.demandTrendPct}%` : `${quote.demandTrendPct}%`} Market
                        </span>
                      </h2>
                      <p>{g.effectLabel}</p>
                      <div className="bmeta">
                        <span style={{ color: 'var(--mint)' }}>Export ₨ {formatNumber(expCheck.unitPrice || quote.exportPrice)}/{g.unitLabel}</span>
                        <span style={{ color: 'var(--cy)' }}>Import ₨ {formatNumber(quote.importPrice)}/{g.unitLabel}</span>
                        <span>Stock: {heldQty} {g.unitLabel}</span>
                        {!quote.unlocked && <span style={{ color: 'var(--pink)' }}>Rank {g.minRank}+</span>}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <button
                        type="button"
                        className={`btn sm ${expCheck.ok ? 'mint' : 'no'}`}
                        disabled={!expCheck.ok || !onStartTradeContract}
                        title={expCheck.reason || `Fee ₨ ${formatNumber(expCheck.upfrontCost)} → Return ₨ ${formatNumber(expCheck.expectedPayout)}`}
                        onClick={() => onStartTradeContract?.(g.id, tradePartner, 'export', clampedUnits)}
                      >
                        {expCheck.ok ? `Export (${clampedUnits})` : expCheck.reason || 'Locked'}
                      </button>
                      <button
                        type="button"
                        className={`btn sm ${impCheck.ok ? 'gold' : 'no'}`}
                        disabled={!impCheck.ok || !onStartTradeContract}
                        title={impCheck.reason || `Import cost ₨ ${formatNumber(impCheck.upfrontCost)}`}
                        onClick={() => onStartTradeContract?.(g.id, tradePartner, 'import', clampedUnits)}
                      >
                        {impCheck.ok ? `Import (${clampedUnits})` : 'Import'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="gxh" style={{ marginTop: 14 }}>
              <Sparkles size={15} color="#ffc23d" />
              <span>International Trade Milestones</span>
            </div>
            <div className="list g2">
              {TRADE_MILESTONES.map((tm) => {
                const claimed = Boolean(intl.milestonesClaimed?.[tm.id]);
                const ready = !claimed && (intl.completedCount || 0) >= tm.count;
                return (
                  <div key={tm.id} className="row" style={{ '--c': claimed ? '#3fe0b0' : '#ffc23d' } as React.CSSProperties}>
                    <div className="em">
                      {claimed ? <CheckCircle2 size={20} color="#3fe0b0" /> : <Globe size={20} color="#ffc23d" />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2>{tm.label}</h2>
                      <div className="bmeta">
                        <span style={{ color: 'var(--gold)' }}>
                          +₨ {formatNumber(tm.rewardCoins)} <CashCoinIcon size={11} />
                        </span>
                        <span style={{ color: 'var(--cy)' }}>
                          +{tm.rewardGems} <GemDiamondIcon size={11} />
                        </span>
                      </div>
                    </div>
                    {claimed ? (
                      <span className="lv" style={{ borderColor: 'var(--mint)', color: 'var(--mint)' }}>Claimed</span>
                    ) : (
                      <button
                        type="button"
                        className={`btn sm ${ready ? 'gold' : 'no'}`}
                        disabled={!ready || !onClaimTradeMilestone}
                        onClick={() => onClaimTradeMilestone?.(tm.id)}
                      >
                        {ready ? 'Claim' : `${intl.completedCount || 0}/${tm.count}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {subTab === 'decisions' && (
        <div data-testid="cabinet-decisions-view">
          <div className="tradelim">
            <span>
              <Zap size={14} color="#ffc23d" />
              National Cabinet Decisions
            </span>
            <b>{NATIONAL_DECISIONS.length} Executive Mandates</b>
          </div>
          <div className="gxc" style={{ marginBottom: 10 }}>
            <p className="dim">
              Enact timed national directives with real treasury, grid, tax pool, and citizen morale tradeoffs.
            </p>
          </div>
          <div className="list g2">
            {NATIONAL_DECISIONS.map((dec) => {
              const check = canEnactNationalDecision(state, dec, nowSrv);
              return (
                <div
                  key={dec.id}
                  className="row"
                  style={{ '--c': check.ok ? '#3fe0b0' : '#a58cff' } as React.CSSProperties}
                >
                  <div className="em">
                    <Landmark size={22} color={check.ok ? '#3fe0b0' : '#a58cff'} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2>
                      <span>{dec.name}</span>
                      <span className="lv">Rank {dec.reqRank}+ · {dec.reqBuildings} Bldgs</span>
                    </h2>
                    <p>{dec.desc}</p>
                    <div className="bmeta">
                      <span>Cooldown {Math.round(dec.cdSec / 60)}m</span>
                      {dec.hapDelta !== 0 && (
                        <span style={{ color: dec.hapDelta > 0 ? 'var(--mint)' : 'var(--pink)' }}>
                          {dec.hapDelta > 0 ? `+${dec.hapDelta}` : dec.hapDelta}% Hap
                        </span>
                      )}
                      {dec.apprDelta !== 0 && (
                        <span style={{ color: dec.apprDelta > 0 ? 'var(--cy)' : 'var(--pink)' }}>
                          {dec.apprDelta > 0 ? `+${dec.apprDelta}` : dec.apprDelta}% Appr
                        </span>
                      )}
                      {dec.gemsDelta && <span style={{ color: 'var(--gold)' }}>+{dec.gemsDelta} Diamonds</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn sm ${check.ok ? 'gold' : 'no'}`}
                    disabled={!check.ok || !onEnactDecision}
                    title={check.reason || dec.tradeoff}
                    onClick={(e) => onEnactDecision?.(dec.id, e)}
                  >
                    {check.cdLeftSec > 0
                      ? `${check.cdLeftSec}s CD`
                      : dec.cost > 0
                        ? `₨ ${formatNumber(dec.cost)}`
                        : 'Enact Free'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'ecosystem' && econSnap && (() => {
        const ecoRes = computeResourceEcosystem(state);
        const wf = computeWorkforceMetrics(state, econSnap.jobsCreated, state.hap || 60);
        const stability = econSnap.stabilityScore ?? computeNationalStability(state, econSnap.energyRatio, econSnap.inflationRate, econSnap.realGdp);
        const ndi = computeNationalDevelopmentIndex(state, stability);
        const bondLimits = getBondLimits(state, econSnap.realGdp, stability);
        const dipState = getDiplomacyState(state);
        const dipBonus = getDiplomacyBonuses(state);
        const envoyCost = Math.max(15_000, Math.round(15_000 * Math.pow(1.35, Math.max(0, (state.rank || 1) - 1))));
        const borrowTiers = [
          Math.max(10_000, Math.round(bondLimits.availableHeadroom * 0.1)),
          Math.max(25_000, Math.round(bondLimits.availableHeadroom * 0.25)),
        ].filter((amt, idx, arr) => amt > 0 && amt <= bondLimits.availableHeadroom && arr.indexOf(amt) === idx);
        const stockMap = state.resources?.stock || {};

        return (
          <div data-testid="ecosystem-finance-view">
            <div className="tradelim" style={{ marginBottom: 10 }}>
              <span>
                <Coins size={14} color="#ffc23d" />
                National Economic Ecosystem &amp; Sovereign Finance
              </span>
              <b>
                NDI {ndi} · Stability {Math.round(stability)}% · FDI +{dipBonus.fdiBonusPct}%
              </b>
            </div>

            {activeDynEv ? (
              <div className="gxc" data-testid="dynamic-event-banner" style={{ marginBottom: 12, borderColor: activeDynEv.active.resolved ? 'rgba(63,224,176,0.4)' : 'rgba(255,194,61,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 18 }}>{activeDynEv.def.e}</span>
                    <b>{activeDynEv.def.title}</b>
                    <span className="lv" style={{ color: activeDynEv.active.resolved ? 'var(--mint)' : '#ffc23d' }}>
                      {activeDynEv.active.resolved ? 'Mitigated' : 'Active Crisis / Opportunity'}
                    </span>
                  </span>
                  <span style={{ color: '#5ccbff', fontSize: 12, fontWeight: 700 }}>
                    {formatDuration(Math.max(0, activeDynEv.active.expiresAt - nowSrv))} left
                  </span>
                </div>
                <p className="dim" style={{ marginBottom: 8 }}>
                  {activeDynEv.def.desc} (Income ×{activeDynEv.def.incomeMult.toFixed(2)} · Energy ×{activeDynEv.def.energyMult.toFixed(2)} · Trade ×{activeDynEv.def.tradeMult.toFixed(2)})
                </p>
                {!activeDynEv.active.resolved && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {activeDynEv.def.choices.map((ch, idx) => {
                      const estCost = Math.min(Math.floor((state.cash || 0) * 0.5), Math.max(1_000, Math.round((state.cash || 0) * ch.costPctCash)));
                      const canAfford = (state.cash || 0) >= estCost;
                      return (
                        <button
                          key={ch.label}
                          type="button"
                          className={`btn sm ${canAfford ? (idx === 0 ? 'gold' : 'mint') : 'no'}`}
                          disabled={!canAfford || !onResolveDynamicEvent}
                          title={ch.summary}
                          onClick={() => onResolveDynamicEvent?.(idx as 0 | 1)}
                        >
                          {ch.label} (₨ {formatNumber(estCost)})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="gxc" style={{ marginBottom: 12 }}>
                <p className="dim">
                  Macro Climate: <b>Stable Equilibrium</b> — Dynamic national macro events occur periodically once your city grows past 5 buildings.
                </p>
              </div>
            )}

            <div className="econ-stats" style={{ marginBottom: 12 }}>
              <div className="econ-tile">
                <small>Skilled Labor Balance</small>
                <b style={{ color: wf.skilledRatio >= 0.98 ? 'var(--mint)' : 'var(--gold)' }}>
                  ×{wf.skilledRatio.toFixed(2)} Eff
                </b>
                <span>{formatNumber(wf.skilledSupply)} supply / {formatNumber(wf.skilledJobs)} skilled jobs</span>
              </div>
              <div className="econ-tile">
                <small>Healthcare &amp; Migration</small>
                <b style={{ color: 'var(--cy)' }}>×{wf.healthcareProductivity.toFixed(2)} Health</b>
                <span>Net migration {wf.migrationRate >= 0 ? `+${wf.migrationRate}` : wf.migrationRate}M / cycle</span>
              </div>
              <div className="econ-tile">
                <small>Resource Chains &amp; Storage</small>
                <b style={{ color: ecoRes.resourceMult >= 1 ? 'var(--mint)' : 'var(--pink)' }}>
                  {ecoRes.activeChains}/5 Chains · ×{ecoRes.resourceMult.toFixed(2)}
                </b>
                <span>
                  {formatNumber(ecoRes.storageUsed)} / {formatNumber(ecoRes.storageCap)} stored · {ecoRes.shortages.length} shortages
                </span>
              </div>
              <div className="econ-tile">
                <small>National Development Index</small>
                <b style={{ color: 'var(--gold)' }}>{ndi} NDI</b>
                <span>Stability {Math.round(stability)}% · Diplomatic Rep {dipState.rep}</span>
              </div>
            </div>

            <div className="gxh">
              <Coins size={15} color="#ffc23d" />
              <span>Sovereign Bonds &amp; National Debt</span>
            </div>
            <div className="gxc" style={{ marginBottom: 12 }} data-testid="sovereign-bonds-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <span>
                  Active Debt: <b style={{ color: bondLimits.currentDebt > 0 ? '#ff8ea8' : 'var(--mint)' }}>₨ {formatNumber(bondLimits.currentDebt)}</b> / Ceiling ₨ {formatNumber(bondLimits.maxDebt)}
                </span>
                <span className="dim">
                  Coupon <b>{bondLimits.annualInterestPct}% APR</b> · Service −₨ {bondLimits.interestPerSec < 100 ? bondLimits.interestPerSec.toFixed(2) : formatNumber(bondLimits.interestPerSec)}/s · Headroom <b>₨ {formatNumber(bondLimits.availableHeadroom)}</b>
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {borrowTiers.map((amt) => (
                  <button
                    key={`borrow-${amt}`}
                    type="button"
                    className="btn sm gold"
                    disabled={!onBorrowBond || bondLimits.availableHeadroom < amt}
                    onClick={() => onBorrowBond?.(amt)}
                  >
                    Issue Bond +₨ {formatNumber(amt)}
                  </button>
                ))}
                {bondLimits.currentDebt > 0 && (
                  <>
                    <button
                      type="button"
                      className={`btn sm ${state.cash >= Math.max(1, Math.round(bondLimits.currentDebt * 0.25)) ? 'mint' : 'no'}`}
                      disabled={!onRepayBond || state.cash < Math.max(1, Math.round(bondLimits.currentDebt * 0.25))}
                      onClick={() => onRepayBond?.(Math.max(1, Math.round(bondLimits.currentDebt * 0.25)))}
                    >
                      Repay 25% (₨ {formatNumber(Math.max(1, Math.round(bondLimits.currentDebt * 0.25)))})
                    </button>
                    <button
                      type="button"
                      className={`btn sm ${state.cash >= bondLimits.currentDebt ? 'mint' : 'no'}`}
                      disabled={!onRepayBond || state.cash < bondLimits.currentDebt}
                      onClick={() => onRepayBond?.(bondLimits.currentDebt)}
                    >
                      Retire All Debt (₨ {formatNumber(bondLimits.currentDebt)})
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="gxh">
              <Zap size={15} color="#3fe0b0" />
              <span>Industrial Production Chains ({ecoRes.activeChains}/5 Active)</span>
            </div>
            <div className="list g2" style={{ marginBottom: 12 }}>
              {PRODUCTION_CHAINS_16.map((ch) => {
                const pr = ecoRes.production;
                const isRunning =
                  ch.id === 'chain_oil_fuel'
                    ? (pr.oil || 0) > 0.5 && (pr.fuel || 0) > 0.8
                    : ch.id === 'chain_steel_construction'
                      ? (pr.iron_ore || 0) > 0.5 && (pr.steel || 0) > 0.5
                      : ch.id === 'chain_grain_food'
                        ? (pr.grain || 0) > 1.5 && (pr.food || 0) > 1.5
                        : ch.id === 'chain_silicon_semicon'
                          ? (pr.silicon || 0) > 0.3 && (pr.semiconductors || 0) > 0.3
                          : (pr.chemicals || 0) > 0.5 && ((pr.fertilizers || 0) > 0.4 || (pr.pharmaceuticals || 0) > 0.4);
                return (
                  <div key={ch.id} className="row" style={{ '--c': isRunning ? '#3fe0b0' : '#6c688a' } as React.CSSProperties}>
                    <div className="em">{isRunning ? <CheckCircle2 size={20} color="#3fe0b0" /> : <Clock size={20} color="#9e96c7" />}</div>
                    <div style={{ minWidth: 0 }}>
                      <h2>
                        <span>{ch.name}</span>
                        <span className="lv" style={{ color: isRunning ? 'var(--mint)' : 'var(--mu)' }}>
                          {isRunning ? 'Active' : 'Idle'}
                        </span>
                      </h2>
                      <p>{ch.effectLabel}</p>
                      <div className="bmeta">
                        <span>{ch.steps.join(' → ')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="gxh">
              <BarChart3 size={15} color="#5ccbff" />
              <span>National Resource Ledger ({RESOURCE_CATALOG_16.length} Resources)</span>
            </div>
            <div className="econ-stats" style={{ marginBottom: 12 }}>
              {RESOURCE_CATALOG_16.map((rm) => {
                const netVal = ecoRes.net[rm.id] || 0;
                const stockVal = Math.round((Number(stockMap[rm.id]) || 0) * 10) / 10;
                const isShort = ecoRes.shortages.includes(rm.id);
                return (
                  <div key={rm.id} className="econ-tile">
                    <small>{rm.icon} {rm.name}</small>
                    <b style={{ color: isShort ? '#ff7bb0' : netVal >= 0 ? 'var(--mint)' : '#ffc23d' }}>
                      {netVal >= 0 ? `+${netVal.toFixed(1)}` : netVal.toFixed(1)}/s
                    </b>
                    <span>
                      Stock {stockVal} {rm.unit} {isShort ? '· Shortage' : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="gxh">
              <Globe size={15} color="#5ccbff" />
              <span>International Diplomacy &amp; Bilateral Treaties</span>
            </div>
            <div className="list g2" style={{ marginBottom: 10 }} data-testid="diplomacy-partners-list">
              {DIPLOMACY_PARTNERS_16.map((dp) => {
                const rel = Math.round(dipState.relations[dp.code] ?? dp.baseRelation);
                const canAfford = (state.cash || 0) >= envoyCost && rel < 100;
                return (
                  <div key={dp.code} className="row" style={{ '--c': '#5ccbff' } as React.CSSProperties}>
                    <div className="em" style={{ fontSize: 22 }}>{dp.flag}</div>
                    <div style={{ minWidth: 0 }}>
                      <h2>
                        <span>{dp.name}</span>
                        <span className="lv">{rel}/100 Rel</span>
                      </h2>
                      <p>Focus: {dp.specialty} (×{dp.tariffBias.toFixed(2)} tariff bias)</p>
                      <div className="gxm">
                        <b style={{ width: `${rel}%`, background: rel >= 70 ? '#3fe0b0' : '#5ccbff' }} />
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`btn sm ${canAfford ? 'mint' : 'no'}`}
                      disabled={!canAfford || !onSendEnvoy}
                      onClick={() => onSendEnvoy?.(dp.code)}
                    >
                      {rel >= 100 ? 'Max' : `Envoy · ₨ ${formatNumber(envoyCost)}`}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="list g2" data-testid="diplomacy-treaties-list">
              {DIPLOMACY_TREATIES_16.map((tr) => {
                const signed = dipState.treaties.includes(tr.id);
                const partnerRel = Math.round(dipState.relations[tr.partnerCode] ?? 50);
                const eligible =
                  !signed &&
                  (state.rank || 1) >= tr.minRank &&
                  partnerRel >= tr.minRelation &&
                  (state.cash || 0) >= tr.signCost;
                return (
                  <div key={tr.id} className="row" style={{ '--c': signed ? '#3fe0b0' : '#a58cff' } as React.CSSProperties}>
                    <div className="em">
                      {signed ? <CheckCircle2 size={20} color="#3fe0b0" /> : <Landmark size={20} color="#a58cff" />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2>
                        <span>{tr.name}</span>
                        <span className="lv">{tr.partnerCode}</span>
                      </h2>
                      <p>{tr.desc}</p>
                      <div className="bmeta">
                        <span style={{ color: 'var(--mint)' }}>+{tr.fdiBonusPct}% FDI · +{tr.tradeBonusPct}% Trade</span>
                        <span>Rank {tr.minRank}+ · Rel {partnerRel}/{tr.minRelation}</span>
                      </div>
                    </div>
                    {signed ? (
                      <span className="lv" style={{ borderColor: 'var(--mint)', color: 'var(--mint)' }}>Active</span>
                    ) : (
                      <button
                        type="button"
                        className={`btn sm ${eligible ? 'gold' : 'no'}`}
                        disabled={!eligible || !onSignTreaty}
                        onClick={() => onSignTreaty?.(tr.id)}
                      >
                        Sign · ₨ {formatNumber(tr.signCost)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {subTab === 'stats' && econSnap && (
        <div data-testid="economy-stats-view">
          <div className="econ-stats">
            <div className="econ-tile">
              <small>Real National GDP</small>
              <b style={{ color: 'var(--gold)' }}>₨ {formatNumber(econSnap.realGdp)}</b>
              <span>Backed by capital, flow &amp; human capital</span>
            </div>
            <div className="econ-tile">
              <small>Net Income / min</small>
              <b style={{ color: 'var(--mint)' }}>₨ {formatNumber(econSnap.net * 60)}</b>
              <span>Gross ₨ {formatNumber(econSnap.buildingGross * 60)}/m</span>
            </div>
            <div className="econ-tile">
              <small>Operating Costs / min</small>
              <b style={{ color: 'var(--pink)' }}>
                −₨ {formatNumber((econSnap.maintCost + econSnap.salaryCost + econSnap.welfareCost) * 60)}
              </b>
              <span>
                Maint {formatNumber(econSnap.maintCost * 60)} · Wages {formatNumber(econSnap.salaryCost * 60)}
              </span>
            </div>
            <div className="econ-tile">
              <small>Power Grid Balance</small>
              <b style={{ color: econSnap.energyRatio >= 1 ? 'var(--mint)' : 'var(--pink)' }}>
                {econSnap.energySupply} / {econSnap.energyDemand} MW
              </b>
              <span>Grid efficiency ×{econSnap.energyFactor.toFixed(2)}</span>
            </div>
            <div className="econ-tile">
              <small>National Employment</small>
              <b style={{ color: econSnap.employmentRate >= 0.65 ? 'var(--mint)' : 'var(--gold)' }}>
                {Math.round(econSnap.employmentRate * 100)}%
              </b>
              <span>
                {formatNumber(econSnap.jobsCreated)} / {formatNumber(econSnap.laborPool)} jobs filled
              </span>
            </div>
            <div className="econ-tile">
              <small>Housing &amp; Safety</small>
              <b style={{ color: econSnap.housingRatio >= 0.9 ? 'var(--mint)' : 'var(--gold)' }}>
                {Math.round(econSnap.housingRatio * 100)}% Housing
              </b>
              <span>
                Cap {formatNumber(econSnap.housingCapacity)}M · Safety {Math.round(econSnap.publicSafetyScore)}%
              </span>
            </div>
            <div className="econ-tile">
              <small>Inflation &amp; Trade</small>
              <b style={{ color: econSnap.inflationRate <= 3.5 ? 'var(--mint)' : 'var(--gold)' }}>
                {econSnap.inflationRate.toFixed(1)}% CPI
              </b>
              <span>
                Export +{Math.round(econSnap.tradeExportBonus * 100)}% · Pollution {Math.round(econSnap.pollutionLevel)}%
              </span>
            </div>
          </div>

          <GdpChart history={state.hist} currentGdp={econSnap.realGdp} />

          <div className="gxc" style={{ marginTop: 12 }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <BarChart3 size={15} color="#5ccbff" />
              <b>Sector Output Breakdown (per min)</b>
            </p>
            <div className="sector-bars">
              {(() => {
                const cats = BUILDING_CATEGORIES.filter((c) => c.id !== 'all') as Array<{
                  id: Exclude<BuildingCategory, 'all'>;
                  label: string;
                }>;
                const colors: Record<Exclude<BuildingCategory, 'all'>, string> = {
                  residential: '#60e6c8',
                  commercial: '#f472b6',
                  industry: '#ff9a1f',
                  energy: '#ffe066',
                  infrastructure: '#60a5fa',
                  agriculture: '#37e6a0',
                  technology: '#3fd2ff',
                  healthcare_edu: '#a78bfa',
                  public_services: '#93c5fd',
                  special: '#fbbf24',
                };
                const maxVal = Math.max(
                  1,
                  ...cats.map((c) => (econSnap.sectorIncome[c.id] || 0) * 60),
                );
                return cats.map((c) => {
                  const perMin = (econSnap.sectorIncome[c.id] || 0) * 60;
                  const pct = Math.max(0, Math.min(100, Math.round((perMin / maxVal) * 100)));
                  return (
                    <div key={c.id} className="sector-row">
                      <div className="sector-row-top">
                        <span>{c.label}</span>
                        <b style={{ color: colors[c.id] }}>₨ {formatNumber(perMin)}/m</b>
                      </div>
                      <div className="sector-track">
                        <b style={{ width: `${perMin > 0 ? Math.max(3, pct) : 0}%`, background: colors[c.id] }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  if (
    prev.serverOffsetMs !== next.serverOffsetMs ||
    prev.subTab !== next.subTab ||
    prev.uid !== next.uid ||
    prev.projects !== next.projects ||
    prev.isUserActive !== next.isUserActive ||
    prev.onChangeSubTab !== next.onChangeSubTab ||
    prev.onFixInfra !== next.onFixInfra ||
    prev.onUpgradeBuilding !== next.onUpgradeBuilding ||
    prev.onStartProject !== next.onStartProject ||
    prev.onPayProjectStage !== next.onPayProjectStage ||
    prev.onUnlockTech !== next.onUnlockTech ||
    prev.onStartResearch !== next.onStartResearch ||
    prev.onStartLocalMegaProject !== next.onStartLocalMegaProject ||
    prev.onAdvanceLocalMegaProjectStage !== next.onAdvanceLocalMegaProjectStage ||
    prev.onClaimLocalMegaProjectStageMilestone !== next.onClaimLocalMegaProjectStageMilestone ||
    prev.onClaimLocalMegaProject !== next.onClaimLocalMegaProject ||
    prev.onStartTradeContract !== next.onStartTradeContract ||
    prev.onClaimTradeMilestone !== next.onClaimTradeMilestone ||
    prev.onEnactDecision !== next.onEnactDecision ||
    prev.onBorrowBond !== next.onBorrowBond ||
    prev.onRepayBond !== next.onRepayBond ||
    prev.onSendEnvoy !== next.onSendEnvoy ||
    prev.onSignTreaty !== next.onSignTreaty ||
    prev.onResolveDynamicEvent !== next.onResolveDynamicEvent
  ) {
    return false;
  }
  const p = prev.state;
  const n = next.state;
  if (
    p.cash !== n.cash ||
    p.b !== n.b ||
    p.tech !== n.tech ||
    p.techLvls !== n.techLvls ||
    p.pol !== n.pol ||
    p.sub !== n.sub ||
    p.rank !== n.rank ||
    p.boosterCd !== n.boosterCd ||
    p.decisionsCd !== n.decisionsCd ||
    p.upgQueue !== n.upgQueue ||
    p.upgHist !== n.upgHist ||
    p.resQueue !== n.resQueue ||
    p.intlTrade !== n.intlTrade ||
    p.megaProjects !== n.megaProjects ||
    p.resources !== n.resources ||
    p.finance !== n.finance ||
    p.diplomacy !== n.diplomacy ||
    p.dynEvent !== n.dynEvent ||
    p.gx.lvl !== n.gx.lvl ||
    p.gx.cond !== n.gx.cond ||
    p.gx.blk !== n.gx.blk ||
    p.gx.pb !== n.gx.pb ||
    p.gx.exp !== n.gx.exp ||
    p.gx.log !== n.gx.log
  ) {
    return false;
  }
  const pNow = (p.t || 0) + prev.serverOffsetMs;
  const nNow = (n.t || 0) + next.serverOffsetMs;
  const pSubActive = !!(p.sub?.tier && (p.sub?.exp || 0) > pNow);
  const nSubActive = !!(n.sub?.tier && (n.sub?.exp || 0) > nNow);
  if (pSubActive !== nSubActive) return false;
  if (prev.subTab === 'infra') {
    if ((n.upgQueue?.length || 0) > 0 || (p.upgQueue?.length || 0) > 0) {
      return Math.floor(pNow / 1000) === Math.floor(nNow / 1000);
    }
    return Math.floor(p.gx.acc || 0) === Math.floor(n.gx.acc || 0);
  }
  if (prev.subTab === 'decisions') {
    return Math.floor(pNow / 1000) === Math.floor(nNow / 1000);
  }
  if (prev.subTab === 'research') {
    if (n.resQueue || p.resQueue) {
      return Math.floor(pNow / 1000) === Math.floor(nNow / 1000);
    }
    return true;
  }
  if (prev.subTab === 'intl_trade') {
    if ((n.intlTrade?.contracts?.length || 0) > 0 || (p.intlTrade?.contracts?.length || 0) > 0 || (n.intlTrade?.importBuffUntil || 0) > nNow) {
      return Math.floor(pNow / 1000) === Math.floor(nNow / 1000);
    }
    return true;
  }
  if (prev.subTab === 'ecosystem') {
    if ((n.dynEvent && (n.dynEvent.expiresAt || 0) > nNow) || (p.dynEvent && (p.dynEvent.expiresAt || 0) > pNow)) {
      return Math.floor(pNow / 1000) === Math.floor(nNow / 1000);
    }
    return true;
  }
  if (prev.subTab === 'projects') {
    if ((n.megaProjects?.some((mp) => mp.status === 'active') || p.megaProjects?.some((mp) => mp.status === 'active')) && Math.floor(pNow / 1000) !== Math.floor(nNow / 1000)) {
      return false;
    }
    return prev.liveProjectProgress === next.liveProjectProgress;
  }
  if (prev.subTab === 'stats') {
    return (
      p.hist === n.hist &&
      Math.round(p.hap) === Math.round(n.hap) &&
      Math.round(p.pop) === Math.round(n.pop) &&
      p.gov === n.gov &&
      p.tax === n.tax &&
      p.activeFx === n.activeFx &&
      p.boost === n.boost
    );
  }
  return true;
});
