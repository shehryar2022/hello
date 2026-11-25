import type {
  BoosterDef,
  BuildingDef,
  CountryTuple,
  GameState,
  GovDef,
  ProjectType,
  ProjectTypeDef,
  RankDef,
  StickerDef,
  SubscriptionDef,
} from './types';

export const SAVE_KEY = 'cet_save_v1';
export const TZ = 'Asia/Karachi';
export const DAILY_GIFT_MAX = 15;
export const ACTIVE_WINDOW_MS = 240_000;
export const HEARTBEAT_MS = 90_000;
export const OFFLINE_RATE = 0.2;
export const OFFLINE_CAP_SEC = 1800; // 30 minutes
export const GOV_DAY_SEC = 300;
export const GOV_CHANGE_CD_MS = 86_400_000; // 24 hours
export const PROJECT_STAGES = 3;

export const CRATE_COST_CASH = 150_000;
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
  { id: 'farm', n: 'Farms', e: '🌾', c: '#37e6a0', cat: 'civic', cost: 250, inc: 0.35, d: 'Feeds people, tiny cash' },
  { id: 'fact', n: 'Factories', e: '🏭', c: '#ff9a1f', cat: 'industry', cost: 1200, inc: 1.8, d: 'Big income, hurts happiness' },
  { id: 'pow', n: 'Power Plants', e: '⚡', c: '#ffc93c', cat: 'industry', cost: 4200, inc: 6, d: '+1.5% building output each' },
  { id: 'tech', n: 'Tech Parks', e: '💻', c: '#3fd2ff', cat: 'tech', cost: 14000, inc: 22, d: 'High income, lifts approval' },
  { id: 'port', n: 'Trade Ports', e: '🚢', c: '#a56bff', cat: 'industry', cost: 48000, inc: 75, d: 'Exports bring gems & stickers' },
  { id: 'bank', n: 'Central Bank', e: '🏦', c: '#ff4fa3', cat: 'tech', cost: 180000, inc: 260, d: 'Top-tier income, huge cost' },
  { id: 'mine', n: 'Mines', e: '⛏️', c: '#c9a06a', cat: 'industry', cost: 2600, inc: 4.5, d: 'Extracts resources, steady cash' },
  { id: 'hosp', n: 'Hospitals', e: '🏥', c: '#7cf0a0', cat: 'civic', cost: 7000, inc: 8, d: 'Better healthcare, +happiness' },
  { id: 'stadium', n: 'Stadiums', e: '🏟️', c: '#ff6bd6', cat: 'civic', cost: 16000, inc: 18, d: 'Entertainment, +happiness' },
  { id: 'airport', n: 'Airports', e: '✈️', c: '#7ec8ff', cat: 'industry', cost: 32000, inc: 52, d: 'Tourism & trade, lifts approval' },
  { id: 'solar', n: 'Solar Farms', e: '☀️', c: '#ffe066', cat: 'civic', cost: 3500, inc: 5.5, d: 'Clean power, +happiness, offsets carbon tax' },
  { id: 'water', n: 'Water Works', e: '💧', c: '#4cc9ff', cat: 'civic', cost: 5200, inc: 6.5, d: 'Clean water, +happiness & population growth' },
  { id: 'univ', n: 'Universities', e: '🎓', c: '#b39dff', cat: 'civic', cost: 22000, inc: 30, d: 'Education hub, +happiness' },
  { id: 'rail', n: 'Railway Hubs', e: '🚄', c: '#ff8a5c', cat: 'industry', cost: 38000, inc: 60, d: 'Trade & population growth' },
  { id: 'data', n: 'Data Centers', e: '🖥️', c: '#5ce1e6', cat: 'tech', cost: 75000, inc: 120, d: 'Digital economy, big income, small happiness hit' },
  { id: 'space', n: 'Space Agency', e: '🚀', c: '#c084fc', cat: 'tech', cost: 400000, inc: 600, d: 'Prestige project, massive income, +happiness' },
  { id: 'hydro', n: 'Hydro Dams', e: '🌊', c: '#2dd4bf', cat: 'civic', cost: 9500, inc: 14, d: 'Clean hydro power, +happiness & steady output' },
  { id: 'stock', n: 'Stock Exchange', e: '📊', c: '#fbbf24', cat: 'tech', cost: 58000, inc: 95, d: 'Capital markets, boosts corporate & trade revenue' },
  { id: 'evplant', n: 'EV Gigafactory', e: '🔋', c: '#4ade80', cat: 'industry', cost: 120000, inc: 195, d: 'Zero-smog clean manufacturing, +happiness' },
  { id: 'fusion', n: 'Fusion Reactor', e: '⚛️', c: '#38bdf8', cat: 'tech', cost: 650000, inc: 980, d: 'Mega clean energy, +2.5% building output each' },
];

export const RANKS: RankDef[] = [
  { id: 0, n: 'No Rank', e: '', c: '#a79fd0', cost: 0 },
  { id: 1, n: 'Bronze Baron', e: '🥉', c: '#cd7f32', cost: 250_000 },
  { id: 2, n: 'Silver Sovereign', e: '🥈', c: '#c0c8d8', cost: 600_000 },
  { id: 3, n: 'Gold Emperor', e: '🥇', c: '#ffd700', cost: 1_500_000 },
  { id: 4, n: 'Platinum King', e: '💍', c: '#e2e8f0', cost: 3_500_000 },
  { id: 5, n: 'Diamond Deity', e: '💎', c: '#67e8f9', cost: 8_000_000 },
  { id: 6, n: 'Cosmic Overlord', e: '🌌', c: '#e879f9', cost: 18_000_000 },
  { id: 7, n: 'Astral Viceroy', e: '🌠', c: '#818cf8', cost: 45_000_000 },
  { id: 8, n: 'Imperial Titan', e: '🛡️', c: '#fb923c', cost: 100_000_000 },
  { id: 9, n: 'Grand Chancellor', e: '⚜️', c: '#34d399', cost: 250_000_000 },
  { id: 10, n: 'Global Hegemon', e: '👑', c: '#f43f5e', cost: 600_000_000 },
];

export const MAX_RANK = RANKS.length - 1;

/**
 * Balanced, limited shop boosters:
 * - Only 1 shop income multiplier booster can be active at a time (no stacking).
 * - Multipliers & durations are capped (+25%, +50%, +75%).
 * - Tax Surge gives +35% bonus capped at 2 min of unboosted base income (never massive instant payouts).
 */
export const BOOSTERS: BoosterDef[] = [
  {
    id: 'quick_profit',
    n: 'Quick Profit',
    e: '💹',
    tier: 'common',
    cost: 250_000,
    cd: 300,
    dur: 90,
    d: '+25% income for 90s (1 income boost at a time)',
    fx: 'income25',
    isIncomeBoost: true,
  },
  {
    id: 'tax_surge',
    n: 'Tax Surge',
    e: '💰',
    tier: 'common',
    cost: 250_000,
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
    cost: 250_000,
    cd: 300,
    dur: 0,
    d: '+10 happiness instantly',
    fx: 'hap10',
  },
  {
    id: 'boom_surge',
    n: 'Boom Surge',
    e: '🚀',
    tier: 'rare',
    cost: 1_000_000,
    cd: 3600,
    dur: 120,
    d: '+75% income for 2 min (1 income boost at a time)',
    fx: 'income75',
    isIncomeBoost: true,
  },
  {
    id: 'golden_treasury',
    n: 'Treasury Rush',
    e: '👑',
    tier: 'rare',
    cost: 1_000_000,
    cd: 3600,
    dur: 240,
    d: '+50% income for 4 min (1 income boost at a time)',
    fx: 'income50',
    isIncomeBoost: true,
  },
];

/**
 * Economy-balanced national subscriptions:
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
    dailyCash: 150_000,
    dailyGems: 0,
    d: '+4% income, 3% build/upgrade discount, +5% project speed, ₨ 150K/day',
  },
  {
    id: 'weekly',
    n: 'Weekly Charter',
    e: '📆',
    periodLabel: 'Weekly',
    cost: 50_000_000,
    durMs: 7 * 86_400_000,
    incomeMult: 1.08,
    discountRate: 0.06,
    projectSpeedMult: 1.1,
    dailyCash: 600_000,
    dailyGems: 1,
    d: '+8% income, 6% build/upgrade discount, +10% project speed, ₨ 600K + 1 gem/day',
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
    dailyCash: 2_500_000,
    dailyGems: 2,
    d: '+12% income, 10% build/upgrade discount, +15% project speed, ₨ 2.5M + 2 gems/day',
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
];

export const RARITY_META: Record<number, [string, string]> = {
  1: ['Common', '#9d95dc'],
  2: ['Rare', '#3fd2ff'],
  3: ['Ultra Rare', '#ffc93c'],
};

export const DAILY_REWARDS = [
  { c: 200, g: 0, e: 0 },
  { c: 600, g: 1, e: 0 },
  { c: 1500, g: 2, e: 0 },
  { c: 4000, g: 3, e: 0 },
  { c: 9000, g: 5, e: 0 },
  { c: 20000, g: 8, e: 1 },
  { c: 50000, g: 12, e: 1 },
];

export const GOVS: GovDef[] = [
  { id: 'rep', n: 'Republic', e: '🏛️', cost: 0, inc: 1, wel: 1, d: 'Balanced, default government' },
  { id: 'tech', n: 'Technocracy', e: '🧪', cost: 5_000_000, inc: 1.1, wel: 1, d: '+10% income' },
  { id: 'wlf', n: 'Welfare State', e: '🤝', cost: 15_000_000, inc: 1.05, wel: 0.8, d: '+5% income, 20% cheaper welfare' },
  { id: 'ind', n: 'Industrial State', e: '🏭', cost: 40_000_000, inc: 1.15, wel: 1, d: '+15% income' },
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
      prop: 0, duty: 3, tourism: 3, digital: 4, wel: 18, edu: 12, rd: 8, green: 6,
    },
  },
  {
    id: 'revenue',
    label: 'High Revenue',
    desc: 'Pushes tax yield near peak before evasion drags it down',
    values: {
      tax: 22, fuel: 3, carbon: 0, luxury: 3, corp: 0, gst: 0,
      prop: 0, duty: 5, tourism: 6, digital: 6, wel: 10, edu: 10, rd: 10, green: 2,
    },
  },
  {
    id: 'welfare',
    label: 'Citizen Bliss',
    desc: 'High happiness, approval & green subsidies for long-term stability',
    values: {
      tax: 12, fuel: 0, carbon: 2, luxury: 4, corp: 5, gst: 2,
      prop: 0, duty: 3, tourism: 3, digital: 3, wel: 32, edu: 20, rd: 15, green: 20,
    },
  },
];

export const TAB_META: Record<
  import('./types').TabId,
  { emoji: string; label: string; subtitle: string }
> = {
  build: { emoji: '🏗️', label: 'Build', subtitle: 'Grow your economy' },
  gov: { emoji: '🏛️', label: 'Govt', subtitle: 'Infrastructure, upgrades & projects' },
  policy: { emoji: '📌', label: 'Policy', subtitle: 'Taxes, welfare and government' },
  rivals: { emoji: '📢', label: 'Players', subtitle: 'Live GDP rankings & chat' },
  stickers: { emoji: '🪪', label: 'Stickers', subtitle: 'Collect, fuse, crates & gift' },
  trade: { emoji: '💱', label: 'Gifts', subtitle: 'Send and receive gifts' },
  quest: { emoji: '📅', label: 'Quests', subtitle: "Daily goals & milestones" },
  shop: { emoji: '💳', label: 'Shop', subtitle: 'Ranks, subscriptions & boosters' },
};
