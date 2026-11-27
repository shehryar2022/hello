export type TabId =
  | 'build'
  | 'gov'
  | 'policy'
  | 'rivals'
  | 'stickers'
  | 'trade'
  | 'quest'
  | 'shop';

export type PlayersSubTab = 'lb' | 'chat' | 'dm';
export type GiftsSubTab = 'in' | 'out' | 'hist' | 'find';
export type ShopSubTab = 'rank' | 'sub' | 'boost';
export type GovtSubTab = 'infra' | 'projects' | 'research' | 'stats';

export type CountryTuple = [code: string, name: string, realGdp?: number];

export type BuildingCategory =
  | 'all'
  | 'agriculture'
  | 'industry'
  | 'energy'
  | 'infrastructure'
  | 'commercial'
  | 'technology'
  | 'healthcare_edu';

export interface BuildingDef {
  id: string;
  n: string;
  e: string;
  c: string;
  cat: Exclude<BuildingCategory, 'all'>;
  cost: number;
  costScale: number;
  buildSec: number;
  inc: number;
  maint: number;
  jobs: number;
  energy: number; // +MW generated or -MW consumed
  hapDelta: number;
  reqRank: number;
  reqBuildings?: number;
  d: string;
}

export interface RankDef {
  id: number;
  n: string;
  e: string;
  c: string;
  cost: number;
  minGdp: number;
  minBuildings: number;
  minHap: number;
  minTech: number;
  incomeBonusPct: number;
  d: string;
}

export type BoosterId =
  | 'prod_boost'
  | 'income_boost'
  | 'build_speed_boost'
  | 'research_boost'
  | 'tax_boost'
  | 'emp_boost'
  | 'growth_boost';

export interface BoosterDef {
  id: BoosterId;
  n: string;
  e: string;
  tier: 'common' | 'rare';
  cost: number;
  cd: number; // cooldown seconds
  dur: number; // duration seconds (0 for next-collect instant trigger)
  dailyLimit: number;
  effectLabel: string;
  d: string;
  isIncomeBoost?: boolean;
}

export type PolicyCategoryId =
  | 'p_tax'
  | 'p_ind'
  | 'p_agr'
  | 'p_edu'
  | 'p_hlth'
  | 'p_emp'
  | 'p_trd'
  | 'p_nrg'
  | 'p_inf';

export interface PolicyOptionDef {
  stance: 0 | 1 | 2;
  label: string;
  cost: number;
  pros: string[];
  cons: string[];
  summary: string;
}

export interface PolicyCategoryDef {
  id: PolicyCategoryId;
  name: string;
  desc: string;
  options: [PolicyOptionDef, PolicyOptionDef, PolicyOptionDef];
}

export interface ConstructionSlot {
  buildingId: string;
  qty: number;
  finishAt: number;
  totalSec: number;
}

export interface EconomySnapshot {
  gross: number;
  net: number;
  buildingGross: number;
  maintCost: number;
  salaryCost: number;
  welfareCost: number;
  energySupply: number;
  energyDemand: number;
  energyRatio: number;
  energyFactor: number;
  jobsCreated: number;
  laborPool: number;
  employmentRate: number;
  inflationRate: number;
  inflationDrag: number;
  tradeExportBonus: number;
  tradeImportDrag: number;
  consumerDemandMult: number;
  prodMult: number;
  buildSpeedMult: number;
  researchCostMult: number;
  researchSpeedMult: number;
  realGdp: number;
  sectorIncome: Record<Exclude<BuildingCategory, 'all'>, number>;
}

export type TechCategory = 'economy' | 'civic' | 'infra';

export interface TechDef {
  id: string;
  n: string;
  cat: TechCategory;
  cost: number;
  reqBuildings: number;
  d: string;
  effectLabel: string;
}

export interface ExecDecisionOption {
  label: string;
  hint: string;
  variant?: 'gold' | 'mint' | 'red' | '';
}

export interface ExecDecisionDef {
  id: string;
  title: string;
  summary: string;
  options: [ExecDecisionOption, ExecDecisionOption];
}

export interface StickerDef {
  id: string;
  n: string;
  e: string;
  r: 1 | 2 | 3;
}

export interface GovDef {
  id: string;
  n: string;
  e: string;
  cost: number;
  inc: number;
  wel: number;
  d: string;
}

export interface GovExpensesReport {
  sal: number;
  el: number;
  inf: number;
  total: number;
  paid: number;
  n: number;
  t: number;
}

export interface GovExtensionState {
  cond: Record<string, number>;
  lvl: Record<string, number>;
  acc: number;
  blk: number;
  pb: number;
  ph: number;
  log: string[];
  exp: GovExpensesReport | null;
}

export interface ActiveEffects {
  incomeBoostEnd?: number;
  incomeBoostMult?: number;
  incomeBoostId?: string;
  taxSurge?: number;
}

export type SubscriptionTierId = 'daily' | 'weekly' | 'monthly';

export interface SubscriptionDef {
  id: SubscriptionTierId;
  n: string;
  e: string;
  periodLabel: '2 Hours' | '3 Days' | '7 Days';
  durationLabel: string;
  currency: 'coins';
  cost: number;
  durMs: number;
  incomeMult: number;
  discountRate: number;
  projectSpeedMult: number;
  dailyCash: number;
  dailyGems: number;
  d: string;
}

export interface SubscriptionState {
  tier?: SubscriptionTierId;
  exp?: number;
  lastClaimDay?: string;
}

export interface SubPromoState {
  weekKey?: string;
  tier?: SubscriptionTierId;
  pct?: number;
  exp?: number;
}

export interface SettingsState {
  sfx: number;
  vib: number;
  anim: number;
}

export interface GameState {
  cash: number;
  gems: number;
  taxPool: number;
  day: number;
  b: Record<string, number>;
  tax: number;
  wel: number;
  hap: number;
  appr: number;
  pop: number;
  boost: number;
  claimed: Record<string, number>;
  milestones?: Record<string, number>;
  crateCd?: number;
  t: number;
  ev: number;
  edu: number;
  hist: number[];
  country: CountryTuple;
  stk: Record<string, number>;
  streak: number;
  lastDaily: number;
  set: SettingsState;
  fuel: number;
  carbon: number;
  luxury: number;
  corp: number;
  gst: number;
  prop: number;
  duty: number;
  tourism: number;
  digital: number;
  wealth: number;
  rd: number;
  green: number;
  transitSub: number;
  questDay: string;
  questIds: number[];
  rank: number;
  activeFx: ActiveEffects;
  boosterCd: Record<string, number>;
  fused: number;
  gov: string;
  govT: number;
  gx: GovExtensionState;
  sub?: SubscriptionState;
  subPromo?: SubPromoState;
  tech?: Record<string, number>;
}

export interface PlayerStats {
  buildings: number;
  completedTrades: number;
  tradesSent: number;
  tradesReceived: number;
  cashTraded: number;
  gemsTraded: number;
}

export interface PlayerProfile {
  id: string;
  username: string;
  usernameLower: string;
  countryCode: string;
  countryName: string;
  gdp: number;
  cash: number;
  gems: number;
  level: number;
  rank: number;
  subTier?: SubscriptionTierId | '';
  subExp?: number;
  lastSeen?: unknown;
  seen?: number;
  stats: PlayerStats;
  createdAt?: unknown;
}

export interface WalletData {
  cash: number;
  gems: number;
  stk: Record<string, number>;
  rev: number;
  sid?: string;
}

export type TradeStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';

export interface TradeOffer {
  id: string;
  from: string;
  to: string;
  fromName: string;
  toName: string;
  fromCountry: string;
  toCountry: string;
  participants: string[];
  offerCash: number;
  offerGems: number;
  offerStk: Record<string, number>;
  reqCash: number;
  reqGems: number;
  reqStk: Record<string, number>;
  message: string;
  status: TradeStatus;
  refunded: boolean;
  createdMs: number;
  expMs: number;
  resMs: number;
}

export interface NotificationItem {
  id: string;
  type: 'dm' | 'new_offer' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  text: string;
  tradeId?: string | null;
  read: boolean;
  from: string;
  fromName?: string;
  fromCc?: string;
  ms: number;
}

export type ProjectType = 'school' | 'hospital' | 'bridge' | 'highway';

export interface ProjectTypeDef {
  n: string;
  e: string;
  cost: number;
  dur: number;
  dl: number;
  pb: number;
  ph: number;
}

export interface GovProject {
  id: string;
  uid: string;
  type: ProjectType;
  t: ProjectTypeDef;
  paid: number;
  progressMs: number;
  status: 'active' | 'done' | 'failed';
  claimed: boolean;
  st: number;
  dl: number;
  rs: number;
  pending?: boolean;
}

export interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  cc: string;
  rank: number;
  text: string;
  ms: number;
}

export interface DmRecipient {
  uid: string;
  name: string;
  cc: string;
}

export interface QuestDef {
  id: string;
  t: string;
  f: (s: GameState, ctx?: { rank: number }) => number;
  g: number;
  r: number;
}
