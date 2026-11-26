import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  CalendarClock,
  CheckCircle2,
  Coins,
  Crown,
  Edit3,
  Globe,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react';
import {
  MAX_PROVINCES,
  PROVINCE_BUDGET_CATEGORIES,
  PROVINCE_COLORS,
  PROVINCE_EXPENSE_AREAS,
  PROVINCE_FLAGS,
  PROVINCE_LEADERBOARD_CATS,
  PROVINCE_UNLOCK_PRICES,
} from '../../game/constants';
import {
  buildProvinceLeaderboardEntries,
  calculateProvinceMaintenance,
  calculateProvinceNationalContribution,
  calculateProvinceOverallScore,
  calculateSingleProvinceGrossPerSec,
  getProvinceUnlockQuote,
  selectBestProvinceLeaderboardEntries,
  totalProvinceBudget,
} from '../../game/province';
import { formatNumber } from '../../game/rules';
import type {
  GameState,
  Province,
  ProvinceBudgetCategory,
  ProvinceCustomizationInput,
  ProvinceLeaderboardCategory,
  ProvinceLeaderboardEntry,
  ProvincesSubTab,
} from '../../game/types';
import { CountryFlag } from '../GameIcons';
import { ProvinceFlag } from '../ProvinceFlag';

interface ProvincesTabProps {
  state: GameState;
  uid: string | null;
  cloudReady: boolean;
  ownerName: string;
  subTab: ProvincesSubTab;
  selectedProvinceId: string;
  serverOffsetMs: number;
  unlockBusy: boolean;
  lbCategory: ProvinceLeaderboardCategory;
  lbEntries: ProvinceLeaderboardEntry[];
  lbLoading: boolean;
  onChangeSubTab: (sub: ProvincesSubTab) => void;
  onSelectProvince: (provId: string) => void;
  onUnlockProvince: (input: ProvinceCustomizationInput) => Promise<boolean>;
  onCustomizeProvince: (provId: string, input: ProvinceCustomizationInput) => Promise<boolean>;
  onAllocateBudget: (provId: string, category: ProvinceBudgetCategory, amount: number) => Promise<boolean>;
  onRebalanceBudget: (
    provId: string,
    fromCat: ProvinceBudgetCategory,
    toCat: ProvinceBudgetCategory,
    amount: number,
  ) => boolean;
  onChangeLbCategory: (cat: ProvinceLeaderboardCategory) => void;
  onRefreshLb: () => void;
  onOpenLogin: () => void;
}

function formatCountdown(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function ordinalSlot(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

export const ProvincesTab: React.FC<ProvincesTabProps> = memo(({
  state,
  uid,
  cloudReady,
  ownerName,
  subTab,
  selectedProvinceId,
  serverOffsetMs,
  unlockBusy,
  lbCategory,
  lbEntries,
  lbLoading,
  onChangeSubTab,
  onSelectProvince,
  onUnlockProvince,
  onCustomizeProvince,
  onAllocateBudget,
  onRebalanceBudget,
  onChangeLbCategory,
  onRefreshLb,
  onOpenLogin,
}) => {
  const provinces = useMemo(
    () => (Array.isArray(state.provinces) ? state.provinces : []),
    [state.provinces],
  );
  const activeProv: Province | undefined = useMemo(
    () => provinces.find((p) => p.id === selectedProvinceId) || provinces[0],
    [provinces, selectedProvinceId],
  );

  // Align clock tick to 1-second boundary from state.t so countdown updates smoothly
  const nowSrv = useMemo(
    () => Math.floor(state.t / 1000) * 1000 + serverOffsetMs,
    [state.t, serverOffsetMs],
  );
  const quote = useMemo(() => getProvinceUnlockQuote(state, nowSrv), [state, nowSrv]);
  const natContrib = useMemo(() => calculateProvinceNationalContribution(state), [state]);

  // Unlock form state (for next Province slot)
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newFlagId, setNewFlagId] = useState(
    () => PROVINCE_FLAGS[(quote.nextSlot - 1) % PROVINCE_FLAGS.length].id,
  );
  const [newColor, setNewColor] = useState(
    () => PROVINCE_COLORS[(quote.nextSlot - 1) % PROVINCE_COLORS.length].hex,
  );
  const [unlockFeedback, setUnlockFeedback] = useState('');

  // Reset suggested flag/color when nextSlot advances
  useEffect(() => {
    setNewFlagId(PROVINCE_FLAGS[(quote.nextSlot - 1) % PROVINCE_FLAGS.length].id);
    setNewColor(PROVINCE_COLORS[(quote.nextSlot - 1) % PROVINCE_COLORS.length].hex);
  }, [quote.nextSlot]);

  // Edit / customize state for active Province
  const [editName, setEditName] = useState(activeProv?.name || '');
  const [editDesc, setEditDesc] = useState(activeProv?.desc || '');
  const [editFlagId, setEditFlagId] = useState(activeProv?.flagId || PROVINCE_FLAGS[0].id);
  const [editColor, setEditColor] = useState(activeProv?.color || PROVINCE_COLORS[0].hex);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (activeProv) {
      setEditName(activeProv.name);
      setEditDesc(activeProv.desc || '');
      setEditFlagId(activeProv.flagId);
      setEditColor(activeProv.color);
    }
  }, [activeProv?.id, activeProv?.name, activeProv?.desc, activeProv?.flagId, activeProv?.color]);

  // Budget allocator custom amount + intra-province rebalance controls
  const [allocCategory, setAllocCategory] = useState<ProvinceBudgetCategory>('infrastructure');
  const [allocAmtRaw, setAllocAmtRaw] = useState('10000');
  const [allocBusy, setAllocBusy] = useState(false);
  const [rebalFrom, setRebalFrom] = useState<ProvinceBudgetCategory>('industry');
  const [rebalTo, setRebalTo] = useState<ProvinceBudgetCategory>('healthcare');
  const [rebalAmtRaw, setRebalAmtRaw] = useState('5000');

  const parsedAllocAmt = Math.max(0, Math.floor(Number(allocAmtRaw.replace(/[^0-9]/g, '')) || 0));
  const remainingCashAfterAlloc = Math.max(0, state.cash - parsedAllocAmt);
  const canAffordCustomAlloc = parsedAllocAmt >= 1 && state.cash >= parsedAllocAmt;

  const activeMaint = useMemo(
    () => (activeProv ? calculateProvinceMaintenance(activeProv) : null),
    [activeProv],
  );
  const activeGross = useMemo(
    () => (activeProv ? calculateSingleProvinceGrossPerSec(activeProv) : 0),
    [activeProv],
  );

  // Merge live own provinces into global leaderboard and keep strictly each player's single best province
  const mergedLb = useMemo(() => {
    const localUid = uid || 'offline';
    const localOwner = uid ? ownerName : 'Offline Leader';
    const ownEntries = buildProvinceLeaderboardEntries(
      state,
      localUid,
      localOwner,
      state.country?.[0] || 'PK',
      nowSrv,
    );
    const combined: ProvinceLeaderboardEntry[] = [];
    for (const row of lbEntries) {
      if (row.ownerUid !== localUid) {
        combined.push(row);
      }
    }
    combined.push(...ownEntries);
    return selectBestProvinceLeaderboardEntries(combined, lbCategory);
  }, [lbEntries, lbCategory, state, uid, ownerName, nowSrv]);

  const handleSubmitUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockBusy || quote.maxReached) return;
    setUnlockFeedback('');
    const ok = await onUnlockProvince({
      name: newName,
      desc: newDesc,
      flagId: newFlagId,
      color: newColor,
    });
    if (ok) {
      setNewName('');
      setNewDesc('');
    } else if (!quote.canAfford) {
      setUnlockFeedback('Insufficient Country Cash for this Province.');
    }
  };

  const handleCustomAlloc = async (cat: ProvinceBudgetCategory, amt: number) => {
    if (!activeProv || allocBusy || amt < 1) return;
    setAllocBusy(true);
    try {
      await onAllocateBudget(activeProv.id, cat, amt);
    } finally {
      setAllocBusy(false);
    }
  };

  return (
    <div className="prov-root">
      <div className="subtabs" role="tablist" aria-label="Province sections">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'overview'}
          className={subTab === 'overview' ? 'on' : ''}
          onClick={() => onChangeSubTab('overview')}
          data-testid="prov-sub-overview"
        >
          <Globe size={15} />
          Overview ({provinces.length}/{MAX_PROVINCES})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'manage'}
          className={subTab === 'manage' ? 'on' : ''}
          onClick={() => onChangeSubTab('manage')}
          data-testid="prov-sub-manage"
        >
          <Wallet size={15} />
          Manage & Budget
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'leaderboard'}
          className={subTab === 'leaderboard' ? 'on' : ''}
          onClick={() => onChangeSubTab('leaderboard')}
          data-testid="prov-sub-leaderboard"
        >
          <Trophy size={15} />
          Global Ranks
        </button>
      </div>

      {subTab === 'overview' && (
        <div className="prov-stack">
          {/* Country vs Provinces Treasury & Yield Strip */}
          <div className="prov-summary-grid" data-testid="prov-treasury-summary">
            <div className="prov-stat-tile">
              <small>Country Cash</small>
              <b className="gold" data-testid="prov-country-cash">₨ {formatNumber(state.cash)}</b>
              <span>Available national treasury</span>
            </div>
            <div className="prov-stat-tile">
              <small>Province Reserves</small>
              <b style={{ color: 'var(--cy)' }} data-testid="prov-total-reserves">
                ₨ {formatNumber(natContrib.totalAllocatedBudget)}
              </b>
              <span>Held across {provinces.length} {provinces.length === 1 ? 'Province' : 'Provinces'}</span>
            </div>
            <div className="prov-stat-tile">
              <small>National Net Contribution</small>
              <b className={natContrib.netIncomePerSec >= 0 ? 'ok' : 'bad'}>
                {natContrib.netIncomePerSec >= 0 ? '+' : '−'}₨ {formatNumber(Math.abs(natContrib.netIncomePerSec))}/s
              </b>
              <span>
                Tax +{formatNumber(natContrib.grossIncomePerSec)}/s · Maint −{formatNumber(natContrib.maintenancePerSec)}/s
              </span>
            </div>
            <div className="prov-stat-tile">
              <small>Provinces Happiness Boost</small>
              <b style={{ color: 'var(--mint)' }}>+{natContrib.happinessBonus.toFixed(1)}%</b>
              <span>National morale from well-run regions</span>
            </div>
          </div>

          {/* Global Rotating Weekly Discount Banner */}
          <div className="prov-offer-banner" data-testid="prov-weekly-offer">
            <div className="prov-offer-top">
              <div className="prov-offer-title">
                <Sparkles size={16} color="#ffc23d" />
                <b>
                  Global Weekly Charter Deal · Week {quote.activeOffer.cycleWeek}
                </b>
                <span className="prov-offer-tag">
                  {quote.activeOffer.discountPct}% OFF {ordinalSlot(quote.activeOffer.targetSlot)} Province
                </span>
              </div>
              <span className="prov-offer-timer">
                <CalendarClock size={13} />
                Ends in {formatCountdown(quote.activeOffer.msLeft)}
              </span>
            </div>
            <div className="prov-offer-prices">
              <span>
                Base Price: <s className="dim">₨ {formatNumber(quote.activeOffer.basePrice)}</s>{' '}
                <b className="gold">→ ₨ {formatNumber(quote.activeOffer.discountedPrice)}</b>
              </span>
              <small className="dim">
                Upcoming Next Week: Week {quote.upcomingOffer.cycleWeek} —{' '}
                {ordinalSlot(quote.upcomingOffer.targetSlot)} Province ({quote.upcomingOffer.discountPct}% OFF → ₨{' '}
                {formatNumber(quote.upcomingOffer.discountedPrice)})
              </small>
            </div>
          </div>

          {/* Unlock Next Province Charter Card */}
          {!quote.maxReached ? (
            <form className="prov-unlock-card" onSubmit={handleSubmitUnlock} data-testid="prov-unlock-card">
              <div className="prov-unlock-hdr">
                <div>
                  <h3>
                    Charter {ordinalSlot(quote.nextSlot)} Province
                    {quote.discountApplied && (
                      <span className="prov-deal-badge">{quote.discountPct}% WEEKLY DEAL</span>
                    )}
                  </h3>
                  <small className="dim">
                    Expand national capacity ({quote.ownedCount}/{quote.maxProvinces} owned). Customize identity before founding.
                  </small>
                </div>
                <div className="prov-price-box">
                  <small className="dim">Charter Cost</small>
                  <div className="prov-price-val">
                    {quote.discountApplied && (
                      <s className="price-strike">₨ {formatNumber(quote.basePrice)}</s>
                    )}
                    <b className="gold" data-testid="prov-next-price">
                      {quote.finalPrice === 0 ? 'FREE' : `₨ ${formatNumber(quote.finalPrice)}`}
                    </b>
                  </div>
                </div>
              </div>

              <div className="prov-cash-preview">
                <span>
                  Current Cash: <b>₨ {formatNumber(state.cash)}</b>
                </span>
                <span className={quote.canAfford ? 'ok' : 'bad'} data-testid="prov-remaining-cash">
                  Remaining After Purchase: <b>₨ {formatNumber(quote.remainingCash)}</b>
                </span>
              </div>

              <div className="prov-form-grid">
                <div>
                  <label className="prov-lbl" htmlFor="prov-new-name">Province Name (2–24 chars)</label>
                  <input
                    id="prov-new-name"
                    className="inp"
                    type="text"
                    maxLength={24}
                    required
                    placeholder={`e.g. Northern Heartland`}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    data-testid="prov-new-name-input"
                  />
                </div>
                <div>
                  <label className="prov-lbl" htmlFor="prov-new-desc">Description (optional)</label>
                  <input
                    id="prov-new-desc"
                    className="inp"
                    type="text"
                    maxLength={120}
                    placeholder="Trade hub & civic core"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    data-testid="prov-new-desc-input"
                  />
                </div>
              </div>

              <div className="prov-picker-block">
                <span className="prov-lbl">Select Built-In Flag</span>
                <div className="prov-flag-grid" role="radiogroup" aria-label="Select Province Flag">
                  {PROVINCE_FLAGS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`prov-flag-opt ${newFlagId === f.id ? 'on' : ''}`}
                      onClick={() => setNewFlagId(f.id)}
                      title={f.label}
                      aria-label={f.label}
                      aria-checked={newFlagId === f.id}
                      role="radio"
                    >
                      <ProvinceFlag flagId={f.id} color={newColor} slot={quote.nextSlot} width={44} height={29} />
                      <span>{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="prov-picker-block">
                <span className="prov-lbl">Select Province Color</span>
                <div className="prov-swatch-grid" role="radiogroup" aria-label="Select Province Color">
                  {PROVINCE_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      className={`prov-swatch ${newColor.toLowerCase() === c.hex.toLowerCase() ? 'on' : ''}`}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => setNewColor(c.hex)}
                      title={c.name}
                      aria-label={c.name}
                      aria-checked={newColor.toLowerCase() === c.hex.toLowerCase()}
                      role="radio"
                    />
                  ))}
                </div>
              </div>

              {unlockFeedback && <p className="bad" style={{ margin: '4px 0 8px', fontSize: 12.5 }}>{unlockFeedback}</p>}

              <div className="prov-unlock-foot">
                <button
                  type="submit"
                  className={`btn gold ${!quote.canAfford || unlockBusy ? 'no' : ''}`}
                  disabled={!quote.canAfford || unlockBusy}
                  data-testid="prov-unlock-submit"
                >
                  {quote.canAfford ? <Plus size={16} /> : <Lock size={15} />}
                  {unlockBusy
                    ? 'Chartering Province…'
                    : quote.canAfford
                      ? `Charter ${ordinalSlot(quote.nextSlot)} Province (−₨ ${formatNumber(quote.finalPrice)})`
                      : `Need ₨ ${formatNumber(quote.finalPrice - state.cash)} more`}
                </button>
                <small className="dim">
                  Next schedule tiers:{' '}
                  {PROVINCE_UNLOCK_PRICES.slice(quote.nextSlot)
                    .slice(0, 3)
                    .map((pr, idx) => `#${quote.nextSlot + idx + 1}: ₨ ${formatNumber(pr)}`)
                    .join(' · ') || 'Final slot'}
                </small>
              </div>
            </form>
          ) : (
            <div className="prov-unlock-card prov-max-card" data-testid="prov-max-reached">
              <Crown size={22} color="#ffc23d" />
              <div>
                <b>All {MAX_PROVINCES} National Provinces Chartered!</b>
                <p className="dim" style={{ margin: '2px 0 0', fontSize: 12.5 }}>
                  Allocate budgets across your 10 regions to climb all 6 Global Province Leaderboards.
                </p>
              </div>
            </div>
          )}

          {/* Owned Provinces Grid */}
          <h3 className="f sec">Your Provinces ({provinces.length}/{MAX_PROVINCES})</h3>
          <div className="prov-grid" data-testid="prov-owned-grid">
            {provinces.map((p) => {
              const pMaint = calculateProvinceMaintenance(p).total;
              const pGross = calculateSingleProvinceGrossPerSec(p);
              const pBudget = totalProvinceBudget(p);
              const score = calculateProvinceOverallScore(p);
              return (
                <div
                  key={p.id}
                  className={`prov-card ${activeProv?.id === p.id ? 'selected' : ''}`}
                  style={{ '--prov-accent': p.color } as React.CSSProperties}
                  data-testid={`prov-card-${p.id}`}
                >
                  <div className="prov-card-top">
                    <ProvinceFlag flagId={p.flagId} color={p.color} slot={p.slot} width={52} height={34} />
                    <div className="prov-card-title">
                      <div className="prov-card-name-row">
                        <span className="prov-slot-tag" style={{ borderColor: p.color, color: p.color }}>
                          #{p.slot}
                        </span>
                        <b>{p.name}</b>
                      </div>
                      <small className="dim">{p.desc || 'Chartered Province'}</small>
                    </div>
                    <span className="prov-score-chip" title="Overall Score">
                      {score}/1000
                    </span>
                  </div>

                  <div className="prov-card-metrics">
                    <div>
                      <small>GDP</small>
                      <b>₨ {formatNumber(p.gdp)}</b>
                    </div>
                    <div>
                      <small>Dev Level</small>
                      <b>Lv {p.dev.toFixed(1)}</b>
                    </div>
                    <div>
                      <small>Happiness</small>
                      <b className={p.hap >= 60 ? 'ok' : p.hap < 40 ? 'bad' : ''}>{p.hap.toFixed(0)}%</b>
                    </div>
                    <div>
                      <small>Pop</small>
                      <b>{p.pop.toFixed(1)}M</b>
                    </div>
                    <div>
                      <small>Employment</small>
                      <b>{p.emp.toFixed(0)}%</b>
                    </div>
                    <div>
                      <small>Reserves</small>
                      <b style={{ color: 'var(--cy)' }}>₨ {formatNumber(pBudget)}</b>
                    </div>
                  </div>

                  <div className="prov-card-foot">
                    <span className="dim" style={{ fontSize: 11.5 }}>
                      Net {pGross - pMaint >= 0 ? '+' : '−'}₨ {formatNumber(Math.abs(pGross - pMaint))}/s
                      {' · '}Maint ₨ {formatNumber(pMaint)}/s
                    </span>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => {
                        onSelectProvince(p.id);
                        onChangeSubTab('manage');
                      }}
                    >
                      Manage
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'manage' && activeProv && activeMaint && (
        <div className="prov-stack">
          {/* Province Selector Pills when owning multiple */}
          <div className="prov-selector-strip" role="tablist" aria-label="Select Province to manage">
            {provinces.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`prov-sel-btn ${activeProv.id === p.id ? 'on' : ''}`}
                style={{ '--prov-accent': p.color } as React.CSSProperties}
                onClick={() => onSelectProvince(p.id)}
              >
                <span className="prov-color-dot" style={{ backgroundColor: p.color }} />
                <span>#{p.slot} {p.name}</span>
              </button>
            ))}
          </div>

          {/* Active Province Hero Header & Stats */}
          <div className="prov-manage-hero" style={{ '--prov-accent': activeProv.color } as React.CSSProperties}>
            <div className="prov-manage-head">
              <ProvinceFlag
                flagId={activeProv.flagId}
                color={activeProv.color}
                slot={activeProv.slot}
                width={66}
                height={44}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="prov-card-name-row">
                  <span className="prov-slot-tag" style={{ borderColor: activeProv.color, color: activeProv.color }}>
                    #{activeProv.slot}
                  </span>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{activeProv.name}</h3>
                </div>
                <p className="dim" style={{ margin: '3px 0 0', fontSize: 12.5 }}>
                  {activeProv.desc || 'Chartered Province'}
                </p>
              </div>
              <button
                type="button"
                className="btn sm"
                onClick={() => setEditOpen((v) => !v)}
                data-testid="prov-toggle-edit"
              >
                <Edit3 size={14} />
                {editOpen ? 'Close Edit' : 'Customize'}
              </button>
            </div>

            {editOpen && (
              <form
                className="prov-edit-panel"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await onCustomizeProvince(activeProv.id, {
                    name: editName,
                    desc: editDesc,
                    flagId: editFlagId,
                    color: editColor,
                  });
                  if (ok) setEditOpen(false);
                }}
                data-testid="prov-edit-form"
              >
                <div className="prov-form-grid">
                  <div>
                    <label className="prov-lbl" htmlFor="prov-edit-name">Rename Province</label>
                    <input
                      id="prov-edit-name"
                      className="inp"
                      type="text"
                      maxLength={24}
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      data-testid="prov-edit-name-input"
                    />
                  </div>
                  <div>
                    <label className="prov-lbl" htmlFor="prov-edit-desc">Province Description</label>
                    <input
                      id="prov-edit-desc"
                      className="inp"
                      type="text"
                      maxLength={120}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      data-testid="prov-edit-desc-input"
                    />
                  </div>
                </div>
                <div className="prov-picker-block">
                  <span className="prov-lbl">Change Flag</span>
                  <div className="prov-flag-grid">
                    {PROVINCE_FLAGS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`prov-flag-opt ${editFlagId === f.id ? 'on' : ''}`}
                        onClick={() => setEditFlagId(f.id)}
                        title={f.label}
                      >
                        <ProvinceFlag flagId={f.id} color={editColor} slot={activeProv.slot} width={44} height={29} />
                        <span>{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="prov-picker-block">
                  <span className="prov-lbl">Change Color</span>
                  <div className="prov-swatch-grid">
                    {PROVINCE_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        className={`prov-swatch ${editColor.toLowerCase() === c.hex.toLowerCase() ? 'on' : ''}`}
                        style={{ backgroundColor: c.hex }}
                        onClick={() => setEditColor(c.hex)}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn sm" onClick={() => setEditOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn sm mint" data-testid="prov-edit-save">
                    <CheckCircle2 size={14} /> Save Appearance
                  </button>
                </div>
              </form>
            )}

            <div className="prov-detail-stats">
              <div>
                <small>Province GDP</small>
                <b className="gold">₨ {formatNumber(activeProv.gdp)}</b>
              </div>
              <div>
                <small>Population</small>
                <b>{activeProv.pop.toFixed(2)}M</b>
              </div>
              <div>
                <small>Development</small>
                <b>{activeProv.dev.toFixed(1)} / 100</b>
              </div>
              <div>
                <small>Happiness</small>
                <b className={activeProv.hap >= 60 ? 'ok' : 'bad'}>{activeProv.hap.toFixed(1)}%</b>
              </div>
              <div>
                <small>Employment</small>
                <b>{activeProv.emp.toFixed(1)}%</b>
              </div>
              <div>
                <small>Productivity</small>
                <b>{activeProv.prod.toFixed(0)} / 100</b>
              </div>
              <div>
                <small>Funding Health</small>
                <b className={activeProv.fundingRatio >= 80 ? 'ok' : 'bad'}>{activeProv.fundingRatio}%</b>
              </div>
              <div>
                <small>Tax / Net Yield</small>
                <b className={activeGross - activeMaint.total >= 0 ? 'ok' : 'bad'}>
                  {activeGross - activeMaint.total >= 0 ? '+' : '−'}₨ {formatNumber(Math.abs(activeGross - activeMaint.total))}/s
                </b>
              </div>
            </div>
          </div>

          {/* 6-Category Independent Province Budget Allocator */}
          <div className="prov-section-box" data-testid="prov-budget-section">
            <div className="prov-sec-head">
              <div>
                <h3 className="f sec" style={{ margin: 0 }}>
                  <Coins size={17} color="#ffc23d" /> Province Budget Allocation
                </h3>
                <small className="dim">
                  Transfer funds from Country Cash into independent Province departments to grow sub-levels gradually.
                </small>
              </div>
              <div className="prov-sec-bals">
                <span>Country Cash: <b className="gold">₨ {formatNumber(state.cash)}</b></span>
                <span>Province Reserve: <b style={{ color: 'var(--cy)' }}>₨ {formatNumber(totalProvinceBudget(activeProv))}</b></span>
              </div>
            </div>

            {/* Custom amount allocation bar */}
            <div className="prov-custom-alloc">
              <div className="prov-custom-fields">
                <select
                  className="inp"
                  value={allocCategory}
                  onChange={(e) => setAllocCategory(e.target.value as ProvinceBudgetCategory)}
                  aria-label="Target budget category"
                >
                  {PROVINCE_BUDGET_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  className="inp"
                  type="text"
                  inputMode="numeric"
                  placeholder="Amount (₨)"
                  value={allocAmtRaw}
                  onChange={(e) => setAllocAmtRaw(e.target.value.replace(/[^0-9]/g, ''))}
                  aria-label="Budget allocation amount"
                  data-testid="prov-alloc-amount-input"
                />
                <button
                  type="button"
                  className={`btn sm mint ${!canAffordCustomAlloc || allocBusy ? 'no' : ''}`}
                  disabled={!canAffordCustomAlloc || allocBusy}
                  onClick={() => void handleCustomAlloc(allocCategory, parsedAllocAmt)}
                  data-testid="prov-alloc-submit"
                >
                  Fund Selected
                </button>
              </div>
              <div className="prov-alloc-preview">
                <small className={canAffordCustomAlloc ? 'dim' : 'bad'}>
                  {parsedAllocAmt > 0
                    ? `Remaining Country Cash after allocation: ₨ ${formatNumber(remainingCashAfterAlloc)}`
                    : 'Enter a positive amount to fund a department'}
                </small>
              </div>
            </div>

            {/* 6 Category cards with sub-level meter + quick buttons */}
            <div className="prov-budget-grid">
              {PROVINCE_BUDGET_CATEGORIES.map((cat) => {
                const subLevel = activeProv.lvls[cat.levelKey] ?? 15;
                const reserve = activeProv.budget[cat.id] || 0;
                const quickOpts = [5_000, 50_000, 500_000, 5_000_000];
                return (
                  <div key={cat.id} className="prov-budget-card" data-testid={`prov-bcat-${cat.id}`}>
                    <div className="prov-bcat-head">
                      <div>
                        <b>{cat.label}</b>
                        <small className="dim">{cat.desc}</small>
                      </div>
                      <span className="prov-lvl-badge" style={{ color: cat.color }}>
                        Lv {subLevel.toFixed(1)}
                      </span>
                    </div>
                    <div className="bar" style={{ marginTop: 6 }}>
                      <i style={{ width: `${Math.min(100, subLevel)}%`, '--c': cat.color } as React.CSSProperties} />
                    </div>
                    <div className="prov-bcat-meta">
                      <span>Reserve: <b style={{ color: cat.color }}>₨ {formatNumber(reserve)}</b></span>
                      <span>Cap: 100</span>
                    </div>
                    <div className="prov-quick-row">
                      {quickOpts.map((amt) => {
                        const ok = !allocBusy && state.cash >= amt;
                        return (
                          <button
                            key={amt}
                            type="button"
                            className={`prov-qbtn ${!ok ? 'no' : ''}`}
                            disabled={!ok}
                            onClick={() => void handleCustomAlloc(cat.id, amt)}
                          >
                            +{formatNumber(amt)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Intra-Province Zero-Sum Rebalance */}
            <div className="prov-rebal-box">
              <div className="prov-rebal-title">
                <ArrowRightLeft size={15} color="#5ccbff" />
                <b>Rebalance Within {activeProv.name} (Zero-Sum Transfer)</b>
              </div>
              <div className="prov-rebal-row">
                <select
                  className="inp"
                  value={rebalFrom}
                  onChange={(e) => setRebalFrom(e.target.value as ProvinceBudgetCategory)}
                  aria-label="Rebalance from category"
                >
                  {PROVINCE_BUDGET_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      From: {c.label} (₨ {formatNumber(activeProv.budget[c.id] || 0)})
                    </option>
                  ))}
                </select>
                <select
                  className="inp"
                  value={rebalTo}
                  onChange={(e) => setRebalTo(e.target.value as ProvinceBudgetCategory)}
                  aria-label="Rebalance to category"
                >
                  {PROVINCE_BUDGET_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      To: {c.label}
                    </option>
                  ))}
                </select>
                <input
                  className="inp"
                  type="text"
                  inputMode="numeric"
                  value={rebalAmtRaw}
                  onChange={(e) => setRebalAmtRaw(e.target.value.replace(/[^0-9]/g, ''))}
                  aria-label="Rebalance transfer amount"
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    const amt = Math.max(0, Math.floor(Number(rebalAmtRaw) || 0));
                    onRebalanceBudget(activeProv.id, rebalFrom, rebalTo, amt);
                  }}
                >
                  Transfer
                </button>
              </div>
            </div>
          </div>

          {/* 5-Area Recurring Maintenance Expenses */}
          <div className="prov-section-box" data-testid="prov-maint-section">
            <div className="prov-sec-head">
              <div>
                <h3 className="f sec" style={{ margin: 0 }}>
                  <ShieldCheck size={17} color="#3fe0b0" /> 5-Area Maintenance Expenses
                </h3>
                <small className="dim">
                  Covered first by Province reserves, then surplus cash. Balanced funding sustains growth & happiness.
                </small>
              </div>
              <div>
                <b className="bad">Total: ₨ {formatNumber(activeMaint.total)}/s</b>{' '}
                <small className="dim">(₨ {formatNumber(activeMaint.total * 60)}/min)</small>
              </div>
            </div>
            <div className="prov-maint-grid">
              {PROVINCE_EXPENSE_AREAS.map((area) => {
                const cost = activeMaint[area.id];
                return (
                  <div key={area.id} className="prov-maint-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{area.label}</span>
                      <b>₨ {formatNumber(cost)}/s</b>
                    </div>
                    <div className="bar" style={{ marginTop: 6 }}>
                      <i style={{ width: `${Math.round(area.share * 100 * 2.5)}%`, '--c': area.color } as React.CSSProperties} />
                    </div>
                    <small className="dim">{Math.round(area.share * 100)}% of Province upkeep</small>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transfer & Spend History */}
          {Array.isArray(state.provBudgetLog) && state.provBudgetLog.length > 0 && (
            <div className="prov-section-box">
              <h3 className="f sec" style={{ margin: '0 0 8px' }}>
                <TrendingUp size={16} color="#a58cff" /> Recent Province Treasury Log
              </h3>
              <div className="prov-log-list">
                {[...state.provBudgetLog].reverse().slice(0, 8).map((item, idx) => (
                  <div key={`${item.t}_${idx}`} className="prov-log-row">
                    <span>
                      <b>{item.provName}</b> · {item.kind === 'unlock' ? 'Chartered' : item.kind === 'rebal' ? `Rebalanced ${item.cat.replace('>', ' → ')}` : `Funded ${item.cat}`}
                    </span>
                    <b className={item.kind === 'rebal' ? 'dim' : 'gold'}>
                      {item.amt === 0 ? 'Free' : `₨ ${formatNumber(item.amt)}`}
                    </b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === 'leaderboard' && (
        <div className="prov-stack">
          <div className="prov-lb-head">
            <div className="fchips prov-lb-cats" role="tablist" aria-label="Province leaderboard categories">
              {PROVINCE_LEADERBOARD_CATS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={lbCategory === cat.id}
                  className={`fchip ${lbCategory === cat.id ? 'on' : ''}`}
                  onClick={() => onChangeLbCategory(cat.id)}
                  data-testid={`prov-lb-cat-${cat.id}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn sm"
              onClick={onRefreshLb}
              disabled={lbLoading}
              title="Refresh global Province rankings"
            >
              <RefreshCw size={14} className={lbLoading ? 'spin' : ''} />
              Refresh
            </button>
          </div>

          {!uid && (
            <div className="tradelim">
              <span>Showing your best local Province. Sign in to compete on the global Province leaderboard!</span>
              <button type="button" className="btn sm gold" onClick={onOpenLogin}>
                Sign In
              </button>
            </div>
          )}

          <div
            className="dim"
            style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            data-testid="prov-lb-summary"
          >
            <span>Top Province per player (1 entry per player)</span>
            <span>
              {mergedLb.length} {mergedLb.length === 1 ? 'player' : 'players'} ranked
            </span>
          </div>

          <div className="list" data-testid="prov-leaderboard-list">
            {mergedLb.map((entry, idx) => {
              const rank = idx + 1;
              const isMine = entry.ownerUid === (uid || 'offline');
              let heroMetric = `${entry.overallScore} pts`;
              if (lbCategory === 'gdp') heroMetric = `₨ ${formatNumber(entry.gdp)}`;
              else if (lbCategory === 'hap') heroMetric = `${entry.hap.toFixed(1)}%`;
              else if (lbCategory === 'dev') heroMetric = `Lv ${entry.dev.toFixed(1)}`;
              else if (lbCategory === 'pop') heroMetric = `${entry.pop.toFixed(2)}M`;
              else if (lbCategory === 'emp') heroMetric = `${entry.emp.toFixed(1)}%`;

              return (
                <div
                  key={entry.entryId}
                  className={`row prov-lb-row ${isMine ? 'me' : ''}`}
                  data-testid={`prov-lb-row-${idx}`}
                  data-owner-uid={entry.ownerUid}
                  data-prov-id={entry.provId}
                >
                  <div className={`medal ${rank <= 3 ? `m${rank}` : ''}`}>{rank}</div>
                  <div style={{ minWidth: 0 }}>
                    <h2>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                        <ProvinceFlag
                          flagId={entry.flagId}
                          color={entry.color}
                          slot={entry.slot}
                          width={34}
                          height={23}
                        />
                        <span className="prov-color-dot" style={{ backgroundColor: entry.color }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.name}
                        </span>
                      </span>
                      <span className="prov-lb-owner">
                        <CountryFlag code={entry.countryCode} className="flagimg" />
                        <span>{entry.ownerName}</span>
                      </span>
                    </h2>
                    <p>
                      Score <b className="gold">{entry.overallScore}/1000</b>
                      {' · '}GDP ₨ {formatNumber(entry.gdp)}
                      {' · '}Hap {entry.hap.toFixed(0)}%
                      {' · '}Dev {entry.dev.toFixed(1)}
                      {' · '}Emp {entry.emp.toFixed(0)}%
                      {' · '}Pop {entry.pop.toFixed(1)}M
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <b className="gold" style={{ fontFamily: 'var(--d)', fontSize: 15 }}>
                      {heroMetric}
                    </b>
                    <div className="dim" style={{ fontSize: 11 }}>
                      #{entry.slot} Slot
                    </div>
                  </div>
                </div>
              );
            })}
            {mergedLb.length === 0 && (
              <div className="empty">
                <p className="dim">{cloudReady ? 'No Provinces ranked yet.' : 'Charter a Province to enter!'}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
