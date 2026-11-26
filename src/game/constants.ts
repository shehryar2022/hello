import type {
  BoosterDef,
  BuildingDef,
  CountryTuple,
  ExecDecisionDef,
  GameState,
  GovDef,
  ProjectType,
  ProjectTypeDef,
  RankDef,
  StickerDef,
  SubscriptionDef,
  TechDef,
} from './types';

export const SAVE_KEY = 'cet_save_v1';
export const TZ = 'Asia/Karachi';
export const DAILY_GIFT_MAX = 15;
export const ACTIVE_WINDOW_MS = 300_000;
export const HEARTBEAT_MS = 120_000;
export const OFFLINE_RATE = 0.2;
export const OFFLINE_CAP_SEC = 1800; // 30 minutes
export const GOV_DAY_SEC = 300;
export const GOV_CHANGE_CD_MS = 86_400_000; // 24 hours
export const PROJECT_STAGES = 3;

export const CRATE_COST_CASH = 100_000;
export const CRATE_CD_MS = 300_000; // 5 minutes
export const CRATE_COST_GEMS = 5;

export const REAL_GDP: Record<string, number> = {
  US: 32642, CN: 21546, DE: 5471, JP: 4342, GB: 4270, IN: 4060, FR: 3550, IT: 2700,
  BR: 2650, CA: 2300, KR: 2200, MX: 2150, AU: 2100, ES: 2050, ID: 1480, SA: 1340,
  TR: 1200, NL: 1150, CH: 1100, PL: 900, AR: 850, SE: 800, BE: 750, TH: 700,
  NG: 650, EG: 600, IR: 550, AT: 500, NO: 480, AE: 460, IL: 440, MY: 420,
  PH: 400, VN: 380, BD: 370, PK: 350, ZA: 340, CO: 330, DK: 320, SG: 300,
  HK: 290, FI: 280, IE: 270,
};

export const GDP_TARGET = 32_642_000;
export const REAL_GDP_SCALED: Record<string, number> = Object.fromEntries(
  Object.entries(REAL_GDP).map(([k, v]) => [k, v * 1000]),
);

export const BUILDINGS: BuildingDef[] = [
  { id: 'farm', n: 'Farms', e: '🌾', c: '#37e6a0', cat: 'civic', cost: 200, inc: 0.6, d: 'Starter food & +happiness' },
  { id: 'fact', n: 'Factories', e: '🏭', c: '#ff9a1f', cat: 'industry', cost: 1000, inc: 2.4, d: 'Strong early cash, hurts happiness' },
  { id: 'pow', n: 'Power Plants', e: '⚡', c: '#ffc93c', cat: 'industry', cost: 4500, inc: 8.8, d: '+1.5% building output each' },
  { id: 'tech', n: 'Tech Parks', e: '💻', c: '#3fd2ff', cat: 'tech', cost: 14500, inc: 30, d: 'Digital tax boost, lifts approval' },
  { id: 'port', n: 'Trade Ports', e: '🚢', c: '#a56bff', cat: 'industry', cost: 50000, inc: 108, d: 'Exports bring gems & stickers' },
  { id: 'bank', n: 'Central Bank', e: '🏦', c: '#ff4fa3', cat: 'tech', cost: 185000, inc: 450, d: 'Elite finance powerhouse' },
  { id: 'mine', n: 'Mines', e: '⛏️', c: '#c9a06a', cat: 'industry', cost: 2400, inc: 5.4, d: 'Extracts resources, steady cash' },
  { id: 'hosp', n: 'Hospitals', e: '🏥', c: '#7cf0a0', cat: 'civic', cost: 7500, inc: 14, d: 'Better healthcare, +happiness' },
  { id: 'stadium', n: 'Stadiums', e: '🏟️', c: '#ff6bd6', cat: 'civic', cost: 17500, inc: 33, d: 'Entertainment, +happiness & tourism' },
  { id: 'airport', n: 'Airports', e: '✈️', c: '#7ec8ff', cat: 'industry', cost: 32000, inc: 66, d: 'Tourism & trade, lifts approval' },
  { id: 'solar', n: 'Solar Farms', e: '☀️', c: '#ffe066', cat: 'civic', cost: 3500, inc: 7.2, d: 'Clean power, +happiness, offsets carbon tax' },
  { id: 'water', n: 'Water Works', e: '💧', c: '#4cc9ff', cat: 'civic', cost: 5400, inc: 10.5, d: 'Clean water, +happiness & population growth' },
  { id: 'univ', n: 'Universities', e: '🎓', c: '#b39dff', cat: 'civic', cost: 23000, inc: 46, d: 'Education hub, +happiness' },
  { id: 'rail', n: 'Railway Hubs', e: '🚄', c: '#ff8a5c', cat: 'industry', cost: 40000, inc: 84, d: 'Trade & population growth' },
  { id: 'data', n: 'Data Centers', e: '🖥️', c: '#5ce1e6', cat: 'tech', cost: 80000, inc: 182, d: 'Digital economy, big income, small happiness hit' },
  { id: 'space', n: 'Space Agency', e: '🚀', c: '#c084fc', cat: 'tech', cost: 380000, inc: 960, d: 'Prestige project, massive income, +happiness' },
  { id: 'hydro', n: 'Hydro Dams', e: '🌊', c: '#2dd4bf', cat: 'civic', cost: 10000, inc: 20, d: 'Clean hydro power, +happiness & steady output' },
  { id: 'stock', n: 'Stock Exchange', e: '📊', c: '#fbbf24', cat: 'tech', cost: 62000, inc: 138, d: 'Capital markets, boosts corporate & trade revenue' },
  { id: 'evplant', n: 'EV Gigafactory', e: '🔋', c: '#4ade80', cat: 'industry', cost: 125000, inc: 295, d: 'Zero-smog clean manufacturing, +happiness' },
  { id: 'fusion', n: 'Fusion Reactor', e: '⚛️', c: '#38bdf8', cat: 'tech', cost: 650000, inc: 1750, d: 'Mega clean energy, +2.5% building output each' },
  { id: 'transit', n: 'Metro Transit', e: '🚇', c: '#22d3ee', cat: 'civic', cost: 28000, inc: 58, d: 'City metro lines, +happiness & +population growth' },
  { id: 'semicon', n: 'Semiconductor Fab', e: '🔬', c: '#818cf8', cat: 'tech', cost: 260000, inc: 650, d: 'Precision chips lift tech & digital output' },
  { id: 'logistics', n: 'Logistics Mega-Hub', e: '📦', c: '#fb923c', cat: 'industry', cost: 480000, inc: 1260, d: 'Automated freight boosts trade & import duties' },
  { id: 'quantum', n: 'Quantum Lab', e: '🛰️', c: '#e879f9', cat: 'tech', cost: 1200000, inc: 3400, d: 'Next-gen computing, +happiness & +2% tech synergy' },
];

export const RANKS: RankDef[] = [
  { id: 0, n: 'No Rank', e: '', c: '#a79fd0', cost: 0 },
  { id: 1, n: 'Bronze Baron', e: '🥉', c: '#cd7f32', cost: 400_000 },
  { id: 2, n: 'Silver Sovereign', e: '🥈', c: '#c0c8d8', cost: 1_000_000 },
  { id: 3, n: 'Gold Emperor', e: '🥇', c: '#ffd700', cost: 2_500_000 },
  { id: 4, n: 'Platinum King', e: '💍', c: '#e2e8f0', cost: 6_000_000 },
  { id: 5, n: 'Diamond Deity', e: '💎', c: '#67e8f9', cost: 14_000_000 },
  { id: 6, n: 'Cosmic Overlord', e: '🌌', c: '#e879f9', cost: 32_000_000 },
  { id: 7, n: 'Astral Viceroy', e: '🌠', c: '#818cf8', cost: 70_000_000 },
  { id: 8, n: 'Imperial Titan', e: '🛡️', c: '#fb923c', cost: 150_000_000 },
  { id: 9, n: 'Grand Chancellor', e: '⚜️', c: '#34d399', cost: 320_000_000 },
  { id: 10, n: 'Global Hegemon', e: '👑', c: '#f43f5e', cost: 650_000_000 },
];

export const MAX_RANK = RANKS.length - 1;

/**
 * Balanced, limited shop boosters with high-average pricing:
 * - Only 1 shop income multiplier booster can be active at a time (no stacking).
 * - Multipliers & durations are capped (+25%, +50%, +75%).
 * - Tax Surge gives +35% bonus capped at 2 min of unboosted base income.
 */
export const BOOSTERS: BoosterDef[] = [
  {
    id: 'quick_profit',
    n: 'Quick Profit',
    e: '💹',
    tier: 'common',
    cost: 120_000,
    cd: 300,
    dur: 120,
    d: '+25% income for 2 min (1 income boost at a time)',
    fx: 'income25',
    isIncomeBoost: true,
  },
  {
    id: 'tax_surge',
    n: 'Tax Surge',
    e: '💰',
    tier: 'common',
    cost: 180_000,
    cd: 300,
    dur: 0,
    d: '+35% bonus on next tax collect (capped at 2 min base income)',
    fx: 'tax15x',
  },
  {
    id: 'happy_days',
    n: 'Happy Days',
    e: '😊',
    tier: 'common',
    cost: 95_000,
    cd: 300,
    dur: 0,
    d: '+15 happiness instantly',
    fx: 'hap10',
  },
  {
    id: 'civic_rally',
    n: 'Civic Rally',
    e: '🏛️',
    tier: 'common',
    cost: 160_000,
    cd: 450,
    dur: 0,
    d: '+10 happiness & +12% approval instantly',
    fx: 'rally',
  },
  {
    id: 'golden_treasury',
    n: 'Treasury Rush',
    e: '👑',
    tier: 'rare',
    cost: 650_000,
    cd: 2400,
    dur: 240,
    d: '+50% income for 4 min (1 income boost at a time)',
    fx: 'income50',
    isIncomeBoost: true,
  },
  {
    id: 'boom_surge',
    n: 'Boom Surge',
    e: '🚀',
    tier: 'rare',
    cost: 850_000,
    cd: 2400,
    dur: 120,
    d: '+75% income for 2 min (1 income boost at a time)',
    fx: 'income75',
    isIncomeBoost: true,
  },
];

/**
 * Economy-balanced national subscriptions (5M - 500M rates, modest perks + weekly random discount):
 * Modest convenience perks so core building & policy choices remain primary.
 */
export const SUBSCRIPTIONS: SubscriptionDef[] = [
  {
    id: 'daily',
    n: 'Daily Pass',
    e: '📅',
    periodLabel: 'Daily',
    cost: 5_000_000,
    durMs: 86_400_000,
    incomeMult: 1.04,
    discountRate: 0.03,
    projectSpeedMult: 1.05,
    dailyCash: 200_000,
    dailyGems: 0,
    d: '+4% income, 3% build/upgrade discount, +5% project speed, ₨ 200K/day',
  },
  {
    id: 'weekly',
    n: 'Weekly Charter',
    e: '📆',
    periodLabel: 'Weekly',
    cost: 65_000_000,
    durMs: 7 * 86_400_000,
    incomeMult: 1.08,
    discountRate: 0.06,
    projectSpeedMult: 1.1,
    dailyCash: 900_000,
    dailyGems: 1,
    d: '+8% income, 6% build/upgrade discount, +10% project speed, ₨ 900K + 1 gem/day',
  },
  {
    id: 'monthly',
    n: 'Monthly Sovereignty',
    e: '💳',
    periodLabel: 'Monthly',
    cost: 500_000_000,
    durMs: 30 * 86_400_000,
    incomeMult: 1.12,
    discountRate: 0.1,
    projectSpeedMult: 1.15,
    dailyCash: 3_500_000,
    dailyGems: 2,
    d: '+12% income, 10% build/upgrade discount, +15% project speed, ₨ 3.5M + 2 gems/day',
  },
];

export const TECH_TREE: TechDef[] = [
  {
    id: 'smart_grid',
    n: 'Smart Power Grid',
    cat: 'infra',
    cost: 250_000,
    reqBuildings: 8,
    d: 'Automated transmission & sensors lift national productivity.',
    effectLabel: '+4% income · −20% govt decay',
  },
  {
    id: 'eco_catalysis',
    n: 'Eco Catalysis',
    cat: 'civic',
    cost: 750_000,
    reqBuildings: 15,
    d: 'Clean industrial scrubbers cut factory smog across every district.',
    effectLabel: '−30% factory unhappiness · +2 hap',
  },
  {
    id: 'healthcare_act',
    n: 'Universal Care Act',
    cat: 'civic',
    cost: 1_800_000,
    reqBuildings: 22,
    d: 'Nationwide clinics improve workforce morale and hospital output.',
    effectLabel: '+5 target happiness · +25% Hospital hap',
  },
  {
    id: 'auto_customs',
    n: 'Automated Customs',
    cat: 'economy',
    cost: 4_500_000,
    reqBuildings: 30,
    d: 'Digital port manifests speed up freight and rare export drops.',
    effectLabel: '+8% Trade Port drop chance · +3% income',
  },
  {
    id: 'civil_corps',
    n: 'Civil Engineering Corps',
    cat: 'infra',
    cost: 9_000_000,
    reqBuildings: 38,
    d: 'Permanent public works crews lower construction & repair costs.',
    effectLabel: '−5% build/repair cost · +15% project speed',
  },
  {
    id: 'sovereign_vault',
    n: 'Sovereign Reserve',
    cat: 'economy',
    cost: 22_000_000,
    reqBuildings: 48,
    d: 'Deepens central treasury vaults to store more uncollected tax.',
    effectLabel: '40m Tax Pool cap (up from 30m) · +4% income',
  },
];

export const EXEC_DECISIONS: ExecDecisionDef[] = [
  {
    id: 'tech_expo',
    title: 'Global Tech Expo',
    summary: 'International innovators want to host a summit in your capital this quarter.',
    options: [
      { label: 'Sponsor Pavilion', hint: 'Spend cash · +8% Happiness, +6% Approval & +1 Gem', variant: 'mint' },
      { label: 'Levy Booth Fees', hint: '+Cash windfall · −4% Happiness', variant: 'gold' },
    ],
  },
  {
    id: 'grid_crunch',
    title: 'Peak Energy Demand',
    summary: 'Summer factories are straining the national grid during peak hours.',
    options: [
      { label: 'Subsidize Clean Grid', hint: 'Spend cash · +6% Happiness & +12% Infra condition', variant: 'mint' },
      { label: 'Industrial Surcharge', hint: '+Cash windfall · −5% Happiness & −4% Approval', variant: 'gold' },
    ],
  },
  {
    id: 'port_backlog',
    title: 'Port Freight Surge',
    summary: 'Container ships are queued outside your main trade terminals.',
    options: [
      { label: 'Fast-Track Customs', hint: 'Spend cash · +1 Sticker & +5% Approval', variant: 'mint' },
      { label: 'Emergency Tariffs', hint: '+Cash windfall · −3% Happiness', variant: 'gold' },
    ],
  },
  {
    id: 'green_bonds',
    title: 'Sovereign Green Bond',
    summary: 'Institutional investors offer to back clean transit and city parks.',
    options: [
      { label: 'Co-Fund Parks', hint: 'Spend cash · +10% Happiness & Tax Pool boost', variant: 'mint' },
      { label: 'Capture Brokerage Fee', hint: '+Cash windfall · −3% Approval', variant: 'gold' },
    ],
  },
  {
    id: 'tourism_wave',
    title: 'World Heritage Week',
    summary: 'Record tourist arrivals present a choice for your treasury.',
    options: [
      { label: 'Free Cultural Pass', hint: 'Spend cash · +7% Happiness, +7% Approval', variant: 'mint' },
      { label: 'Peak Tourist Tax', hint: '+Cash windfall · −4% Happiness', variant: 'gold' },
    ],
  },
];

export const COUNTRIES: CountryTuple[] = [
  ['PK', 'Pakistan', 350], ['US', 'United States', 32642], ['GB', 'United Kingdom', 4270],
  ['CA', 'Canada', 2300], ['IN', 'India', 4060], ['BD', 'Bangladesh', 370],
  ['SA', 'Saudi Arabia', 1340], ['AE', 'UAE', 460], ['TR', 'Turkey', 1200],
  ['DE', 'Germany', 5471], ['FR', 'France', 3550], ['IT', 'Italy', 2700],
  ['ES', 'Spain', 2050], ['BR', 'Brazil', 2650], ['MX', 'Mexico', 2150],
  ['JP', 'Japan', 4342], ['KR', 'South Korea', 2200], ['CN', 'China', 21546],
  ['ID', 'Indonesia', 1480], ['MY', 'Malaysia', 420], ['EG', 'Egypt', 600],
  ['NG', 'Nigeria', 650], ['ZA', 'South Africa', 340], ['AU', 'Australia', 2100],
  ['NZ', 'New Zealand', 250], ['RU', 'Russia', 2860], ['NL', 'Netherlands', 1150],
  ['SE', 'Sweden', 800], ['NO', 'Norway', 480], ['PL', 'Poland', 900],
  ['AR', 'Argentina', 850], ['PH', 'Philippines', 400], ['VN', 'Vietnam', 380],
  ['TH', 'Thailand', 700], ['IR', 'Iran', 550], ['IQ', 'Iraq', 250],
  ['QA', 'Qatar', 220], ['KW', 'Kuwait', 180], ['AF', 'Afghanistan', 20],
  ['LK', 'Sri Lanka', 80],
];

export const STICKERS: StickerDef[] = [
  { id: 'bee', n: 'Worker Bee', e: '🐝', r: 1 },
  { id: 'ram', n: 'Chart Ram', e: '🐏', r: 1 },
  { id: 'crab', n: 'Sideways Crab', e: '🦀', r: 1 },
  { id: 'camel', n: 'Silk Camel', e: '🐫', r: 1 },
  { id: 'bull', n: 'Market Bull', e: '🐂', r: 1 },
  { id: 'bear', n: 'Crash Bear', e: '🐻', r: 1 },
  { id: 'horse', n: 'Freight Horse', e: '🐎', r: 1 },
  { id: 'wolf', n: 'Wolf Trader', e: '🐺', r: 1 },
  { id: 'mouse', n: 'Bank Mouse', e: '🐭', r: 1 },
  { id: 'rabbit', n: 'Fast Rabbit', e: '🐰', r: 1 },
  { id: 'frog', n: 'Lucky Frog', e: '🐸', r: 1 },
  { id: 'ant', n: 'Busy Ant', e: '🐜', r: 1 },
  { id: 'lion', n: 'Golden Lion', e: '🦁', r: 2 },
  { id: 'falcon', n: 'Sky Falcon', e: '🦅', r: 2 },
  { id: 'owl', n: 'Night Owl Banker', e: '🦉', r: 2 },
  { id: 'shark', n: 'Loan Shark', e: '🦈', r: 2 },
  { id: 'ele', n: 'Industry Elephant', e: '🐘', r: 2 },
  { id: 'panda', n: 'Bamboo Diplomat', e: '🐼', r: 2 },
  { id: 'whale', n: 'Trade Whale', e: '🐋', r: 2 },
  { id: 'peacock', n: 'Royal Peacock', e: '🦚', r: 2 },
  { id: 'tiger', n: 'Export Tiger', e: '🐯', r: 2 },
  { id: 'octo', n: 'Market Octopus', e: '🐙', r: 2 },
  { id: 'fox', n: 'Crafty Fox', e: '🦊', r: 2 },
  { id: 'gor', n: 'Bank Gorilla', e: '🦍', r: 2 },
  { id: 'dragon', n: 'GDP Dragon', e: '🐉', r: 3 },
  { id: 'phoenix', n: 'Phoenix Economy', e: '🔥', r: 3 },
  { id: 'uni', n: 'Unicorn Startup', e: '🦄', r: 3 },
  { id: 'crown', n: 'Crown Reserve', e: '👑', r: 3 },
  { id: 'rocket', n: 'Rocket Growth', e: '🚀', r: 3 },
  { id: 'dia', n: 'Diamond Standard', e: '💎', r: 3 },
  { id: 'turtle', n: 'Steady Turtle', e: '🐢', r: 1 },
  { id: 'dove', n: 'Peace Dove', e: '🕊️', r: 1 },
  { id: 'pegasus', n: 'Sky Pegasus', e: '🪽', r: 2 },
  { id: 'sphinx', n: 'Vault Sphinx', e: '🗿', r: 2 },
  { id: 'atlas', n: 'Golden Atlas', e: '🌍', r: 3 },
  { id: 'nebula', n: 'Nebula Sovereign', e: '🌌', r: 3 },
];

export const RARITY_META: Record<number, [string, string]> = {
  1: ['Common', '#9d95dc'],
  2: ['Rare', '#3fd2ff'],
  3: ['Ultra Rare', '#ffc93c'],
};

export const DAILY_REWARDS = [
  { c: 300, g: 0, e: 0 },
  { c: 800, g: 1, e: 0 },
  { c: 1800, g: 2, e: 0 },
  { c: 4500, g: 3, e: 0 },
  { c: 10000, g: 5, e: 0 },
  { c: 22000, g: 8, e: 1 },
  { c: 60000, g: 12, e: 1 },
];

export const GOVS: GovDef[] = [
  { id: 'rep', n: 'Republic', e: '🏛️', cost: 0, inc: 1, wel: 1, d: 'Balanced, default government' },
  { id: 'tech', n: 'Technocracy', e: '🧪', cost: 4_000_000, inc: 1.1, wel: 1, d: '+10% income' },
  { id: 'wlf', n: 'Welfare State', e: '🤝', cost: 10_000_000, inc: 1.07, wel: 0.72, d: '+7% income, 28% cheaper policy spending' },
  { id: 'ind', n: 'Industrial State', e: '🏭', cost: 32_000_000, inc: 1.16, wel: 1, d: '+16% income' },
];

export const WORLD_EVENTS = [
  { n: 'Economic Boom', e: '📈', m: 1.4 },
  { n: 'Tech Breakthrough', e: '🛰️', m: 1.3 },
  { n: 'Trade Festival', e: '🎪', m: 1.25 },
  { n: 'Bumper Harvest', e: '🌾', m: 1.2 },
];

export const EV_SLOT_MS = 1_800_000;
export const EV_LEN_MS = 600_000;

export const GX_GOV_BUILDINGS: Array<[string, string, string, number]> = [
  ['parl', 'Parliament', '🏛️', 1.5],
  ['gov', 'Government Offices', '🏢', 1],
  ['hosp', 'Public Hospitals', '🏥', 1.2],
  ['sch', 'Public Schools', '🏫', 0.8],
];

export const GX_ROADS: Array<[string, string, string, number]> = [
  ['road', 'City Roads', '🛣️', 0.9],
  ['hway', 'Highways', '🚧', 1.4],
];

export const GX_LEVEL_MULTS = [1, 1.3, 1.7, 2.2, 3];
export const GX_UPGRADE_MULTS = [1, 2, 4, 8];

export const GX_PROJECT_TYPES: Record<ProjectType, ProjectTypeDef> = {
  school: { n: 'School Complex', e: '🏫', cost: 12000, dur: 300000, dl: 1440, pb: 0.01, ph: 1 },
  hospital: { n: 'General Hospital', e: '🏥', cost: 60000, dur: 600000, dl: 2880, pb: 0.02, ph: 2 },
  bridge: { n: 'River Bridge', e: '🌉', cost: 250000, dur: 1200000, dl: 4320, pb: 0.03, ph: 1 },
  highway: { n: 'National Highway', e: '🛣️', cost: 1000000, dur: 2400000, dl: 5760, pb: 0.05, ph: 1.5 },
};

export interface PolicyPreset {
  id: 'balanced' | 'revenue' | 'welfare';
  label: string;
  desc: string;
  values: Partial<Record<keyof GameState, number>>;
}

export const POLICY_PRESETS: PolicyPreset[] = [
  {
    id: 'balanced',
    label: 'Balanced Growth',
    desc: 'Zero tax evasion with steady revenue and upbeat citizens',
    values: {
      tax: 15, fuel: 0, carbon: 2, luxury: 4, corp: 5, gst: 2,
      prop: 0, duty: 2, tourism: 3, digital: 3, wealth: 3, wel: 18, edu: 12, rd: 8, green: 6, transitSub: 8,
    },
  },
  {
    id: 'revenue',
    label: 'High Revenue',
    desc: 'Pushes tax yield near peak before evasion drags it down',
    values: {
      tax: 22, fuel: 3, carbon: 0, luxury: 3, corp: 0, gst: 0,
      prop: 0, duty: 5, tourism: 6, digital: 6, wealth: 8, wel: 10, edu: 10, rd: 10, green: 2, transitSub: 4,
    },
  },
  {
    id: 'welfare',
    label: 'Citizen Bliss',
    desc: 'High happiness, approval & green subsidies for long-term stability',
    values: {
      tax: 12, fuel: 0, carbon: 2, luxury: 4, corp: 5, gst: 2,
      prop: 0, duty: 3, tourism: 3, digital: 3, wealth: 6, wel: 32, edu: 20, rd: 15, green: 20, transitSub: 16,
    },
  },
];

export const TAB_META: Record<
  import('./types').TabId,
  { emoji: string; label: string; subtitle: string }
> = {
  build: { emoji: '🏗️', label: 'Build', subtitle: 'Grow your economy' },
  gov: { emoji: '🏛️', label: 'Govt', subtitle: 'Infrastructure, projects & research' },
  policy: { emoji: '📌', label: 'Policy', subtitle: 'Taxes, welfare and government' },
  rivals: { emoji: '📢', label: 'Players', subtitle: 'Live GDP rankings & chat' },
  stickers: { emoji: '🪪', label: 'Stickers', subtitle: 'Collect, fuse, crates & gift' },
  trade: { emoji: '💱', label: 'Gifts', subtitle: 'Send and receive gifts' },
  quest: { emoji: '📅', label: 'Quests', subtitle: "Daily goals & milestones" },
  shop: { emoji: '💳', label: 'Shop', subtitle: 'Ranks, subscriptions & boosters' },
};
