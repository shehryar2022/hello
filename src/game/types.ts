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
export type GovtSubTab = 'infra' | 'projects' | 'decisions' | 'research' | 'stats';

export type CountryTuple = [code: string, name: string, realGdp?: number];

export type BuildingCategory =
  | 'all'
  | 'residential'
  | 'commercial'
  | 'industry'
  | 'energy'
  | 'infrastructure'
  | 'agriculture'
  | 'technology'
  | 'healthcare_edu'
  | 'public_services'
  | 'special';

export type ExcludeAllBuildingCategory = Exclude<BuildingCategory, 'all'>;

export interface BuildingDef {
  id: string;
  n: string;
  e: string;
  c: string;
  cat: ExcludeAllBuildingCategory;
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
  reqTech?: string;
  capacity?: number; // Housing beds / civic service capacity
  demolishRefundPct?: number;
  d: string;
}

export type BuildingPolicyId =
  | 'standard'
  | 'overtime_shift'
  | 'eco_operation'
  | 'automated_floor'
  | 'apprenticeship_crew'
  | 'premium_service'
  | 'civic_subsidy';

export interface BuildingPolicyDef {
  id: BuildingPolicyId;
  name: string;
  desc: string;
  applyCost: number;
  categories: ExcludeAllBuildingCategory[];
  incompatibleWith?: BuildingPolicyId[];
  incomeMult: number;
  maintMult: number;
  jobsMult: number;
  energyMult: number;
  hapDelta: number;
  pros: string[];
  cons: string[];
}

export interface NationalDecisionDef {
  id: string;
  name: string;
  e: string;
  cost: number;
  cdSec: number;
  reqRank: number;
  reqBuildings: number;
  cashDeltaPctGross?: number; // bounded instant cash return
  hapDelta: number;
  apprDelta: number;
  taxPoolBoostSec?: number;
  infraRepairBoost?: number;
  gemsDelta?: number;
  desc: string;
  tradeoff: string;
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
  housingCapacity: number;
  housingRatio: number;
  publicSafetyScore: number;
  pollutionLevel: number;
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
  sectorIncome: Record<ExcludeAllBuildingCategory, number>;
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

export type CityTimeMode = 'auto' | 'day' | 'sunset' | 'night';
export type CityWeatherMode = 'clear' | 'overcast' | 'rain';
export type CameraPresetMode = 'free' | 'aerial' | 'closeup';

export type GraphicsPresetId = 'low' | 'medium' | 'high' | 'ultra' | 'custom';
export type FpsTargetOption = 20 | 30 | 45 | 60 | 90 | 120 | 'auto';
export type ShadowQuality = 'off' | 'low' | 'medium' | 'high';
export type AntiAliasingMode = 'off' | 'fxaa' | 'msaa';
export type TextureQuality = 'low' | 'medium' | 'high';
export type DensityLevel = 'off' | 'low' | 'medium' | 'high';

export interface GraphicsSettings {
  preset: GraphicsPresetId;
  fpsTarget: FpsTargetOption;
  shadowQuality: ShadowQuality;
  antiAliasing: AntiAliasingMode;
  textureQuality: TextureQuality;
  renderScale: number; // 0.5 .. 1.5
  viewDistance: 'near' | 'medium' | 'far';
  ambientOcclusion: boolean;
  reflections: boolean;
  particles: boolean;
  trafficDensity: DensityLevel;
  pedestrianDensity: DensityLevel;
  weatherEffects: boolean;
  dayNightCycle: boolean;
  bloom: boolean;
  motionBlur: boolean;
  adaptiveOptimization: boolean;
}

export interface RuntimePerfStats {
  fps: number;
  avgFps: number;
  frameTimeMs: number;
  webglActive: boolean;
  isSoftwareGl: boolean;
  rendererName: string;
  effectiveScale: number;
  pixelRatio: number;
  activePreset: GraphicsPresetId;
  adaptiveActive: boolean;
  adaptiveStepDown: number;
  drawCalls: number;
  triangles: number;
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
  // Extended national simulation fields (round-tripped cleanly via localStorage & provBudgetLog cloud pack)
  bPolicies?: Record<string, BuildingPolicyId>;
  achievements?: Record<string, number>;
  weeklyDay?: string;
  weeklyClaimed?: Record<string, number>;
  decisionsCd?: Record<string, number>;
  cityTimeMode?: CityTimeMode;
  cityWeather?: CityWeatherMode;
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

export type LeaderboardMode =
  | 'overall'
  | 'netWorth'
  | 'buildingDev'
  | 'production'
  | 'contribution'
  | 'weekly'
  | 'monthly';

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

export interface AchievementDef {
  id: string;
  n: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  cat: 'economy' | 'city' | 'civic' | 'diplomacy';
  desc: string;
  f: (s: GameState) => number;
  goal: number;
  rewardGems: number;
  rewardCash: number;
}
