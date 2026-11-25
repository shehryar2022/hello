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

export type CountryTuple = [code: string, name: string, realGdp?: number];

export interface BuildingDef {
  id: string;
  n: string;
  e: string;
  c: string;
  cost: number;
  inc: number;
  d: string;
}

export interface RankDef {
  id: number;
  n: string;
  e: string;
  c: string;
  cost: number;
}

export type BoosterFxType = 'income25' | 'income50' | 'income75' | 'tax15x' | 'hap10';

export interface BoosterDef {
  id: string;
  n: string;
  e: string;
  tier: 'common' | 'rare';
  cost: number;
  cd: number; // cooldown seconds
  dur: number; // duration seconds (0 for instant / next-collect)
  d: string;
  fx: BoosterFxType;
  isIncomeBoost?: boolean;
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
  periodLabel: 'Daily' | 'Weekly' | 'Monthly';
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
  rd: number;
  green: number;
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
