import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';

const app = getApps().length > 0 ? getApp() : initializeApp();
const adminDb = getFirestore(app);
const adminAuth = getAuth(app);

interface ServerRankRule {
  id: number;
  name: string;
  cost: number;
  minGdp: number;
  minBuildings: number;
  minHap: number;
  minTech: number;
}

const MAX_RANK = 25;
const MAX_BUILDING_LEVEL = 50;

const RANK_RULES: Record<number, ServerRankRule> = {
  2: { id: 2, name: 'Citizen', cost: 25_000, minGdp: 40_000, minBuildings: 6, minHap: 50, minTech: 0 },
  3: { id: 3, name: 'Town Founder', cost: 72_000, minGdp: 110_000, minBuildings: 10, minHap: 51, minTech: 0 },
  4: { id: 4, name: 'Entrepreneur', cost: 185_000, minGdp: 280_000, minBuildings: 16, minHap: 52, minTech: 0 },
  5: { id: 5, name: 'Business Owner', cost: 750_000, minGdp: 1_200_000, minBuildings: 24, minHap: 55, minTech: 1 },
  6: { id: 6, name: 'Industrialist', cost: 3_500_000, minGdp: 6_000_000, minBuildings: 36, minHap: 56, minTech: 2 },
  7: { id: 7, name: 'Regional Magnate', cost: 8_200_000, minGdp: 14_500_000, minBuildings: 44, minHap: 57, minTech: 3 },
  8: { id: 8, name: 'Millionaire', cost: 18_000_000, minGdp: 32_000_000, minBuildings: 56, minHap: 58, minTech: 4 },
  9: { id: 9, name: 'Tycoon', cost: 60_000_000, minGdp: 110_000_000, minBuildings: 72, minHap: 60, minTech: 6 },
  10: { id: 10, name: 'Billionaire', cost: 220_000_000, minGdp: 420_000_000, minBuildings: 92, minHap: 62, minTech: 8 },
  11: { id: 11, name: 'Trillionaire Strategist', cost: 520_000_000, minGdp: 980_000_000, minBuildings: 110, minHap: 64, minTech: 10 },
  12: { id: 12, name: 'Economic Leader', cost: 1_100_000_000, minGdp: 2_100_000_000, minBuildings: 130, minHap: 65, minTech: 12 },
  13: { id: 13, name: 'National Legend', cost: 3_500_000_000, minGdp: 7_500_000_000, minBuildings: 155, minHap: 68, minTech: 15 },
  14: { id: 14, name: 'Continental Powerhouse', cost: 9_000_000_000, minGdp: 16_000_000_000, minBuildings: 185, minHap: 70, minTech: 18 },
  15: { id: 15, name: 'Global Magnate', cost: 22_000_000_000, minGdp: 36_000_000_000, minBuildings: 220, minHap: 72, minTech: 21 },
  16: { id: 16, name: 'Sovereign Architect', cost: 55_000_000_000, minGdp: 80_000_000_000, minBuildings: 260, minHap: 74, minTech: 24 },
  17: { id: 17, name: 'World Superpower', cost: 120_000_000_000, minGdp: 175_000_000_000, minBuildings: 305, minHap: 76, minTech: 28 },
  18: { id: 18, name: 'Eternal Chancellor', cost: 260_000_000_000, minGdp: 360_000_000_000, minBuildings: 350, minHap: 78, minTech: 32 },
  19: { id: 19, name: 'Planetary Economist', cost: 480_000_000_000, minGdp: 680_000_000_000, minBuildings: 400, minHap: 79, minTech: 35 },
  20: { id: 20, name: 'Orbital Industrialist', cost: 850_000_000_000, minGdp: 1_200_000_000_000, minBuildings: 455, minHap: 80, minTech: 38 },
  21: { id: 21, name: 'Stellar Hegemon', cost: 1_450_000_000_000, minGdp: 2_100_000_000_000, minBuildings: 515, minHap: 81, minTech: 41 },
  22: { id: 22, name: 'Galactic Sovereign', cost: 2_400_000_000_000, minGdp: 3_500_000_000_000, minBuildings: 580, minHap: 82, minTech: 44 },
  23: { id: 23, name: 'Quantum Architect', cost: 3_900_000_000_000, minGdp: 5_600_000_000_000, minBuildings: 650, minHap: 83, minTech: 46 },
  24: { id: 24, name: 'Cosmic Chancellor', cost: 6_200_000_000_000, minGdp: 8_800_000_000_000, minBuildings: 725, minHap: 84, minTech: 48 },
  25: { id: 25, name: 'Eternal Sovereign', cost: 9_800_000_000_000, minGdp: 14_000_000_000_000, minBuildings: 800, minHap: 85, minTech: 50 },
};

const BUILDING_COSTS: Record<string, { cost: number; inc: number; jobs: number }> = {
  farms: { cost: 150, inc: 0.9, jobs: 12 },
  greenhouses: { cost: 950, inc: 3.8, jobs: 18 },
  food_plant: { cost: 3_800, inc: 13.5, jobs: 34 },
  textile_mills: { cost: 1_100, inc: 4.5, jobs: 42 },
  factories: { cost: 5_500, inc: 21, jobs: 68 },
  steel_plants: { cost: 28_000, inc: 94, jobs: 115 },
  solar_plants: { cost: 2_800, inc: 8.2, jobs: 16 },
  wind_farms: { cost: 12_000, inc: 33, jobs: 26 },
  power_stations: { cost: 52_000, inc: 136, jobs: 58 },
  roads: { cost: 2_200, inc: 6.8, jobs: 28 },
  railways: { cost: 22_000, inc: 68, jobs: 72 },
  ports: { cost: 68_000, inc: 205, jobs: 120 },
  airports: { cost: 210_000, inc: 585, jobs: 185 },
  markets: { cost: 650, inc: 2.5, jobs: 24 },
  shopping_centers: { cost: 16_000, inc: 52, jobs: 82 },
  business_districts: { cost: 145_000, inc: 430, jobs: 210 },
  research_centers: { cost: 38_000, inc: 102, jobs: 64 },
  tech_parks: { cost: 115_000, inc: 335, jobs: 145 },
  data_centers: { cost: 340_000, inc: 1_060, jobs: 95 },
  training_centers: { cost: 4_200, inc: 12, jobs: 38 },
  hospitals: { cost: 19_500, inc: 48, jobs: 96 },
  universities: { cost: 88_000, inc: 225, jobs: 135 },
  small_housing: { cost: 220, inc: 0.7, jobs: 4 },
  apartments: { cost: 2_600, inc: 6.4, jobs: 14 },
  residential_towers: { cost: 24_000, inc: 54, jobs: 32 },
  luxury_residences: { cost: 165_000, inc: 375, jobs: 65 },
  smart_housing: { cost: 620_000, inc: 1_320, jobs: 95 },
  corporate_tower: { cost: 420_000, inc: 1_120, jobs: 240 },
  trade_center: { cost: 1_250_000, inc: 3_150, jobs: 360 },
  financial_center: { cost: 3_400_000, inc: 8_200, jobs: 420 },
  intl_hotel: { cost: 92_000, inc: 248, jobs: 115 },
  small_factory: { cost: 520, inc: 2.1, jobs: 22 },
  mfg_plant: { cost: 14_500, inc: 48, jobs: 88 },
  auto_factory: { cost: 185_000, inc: 540, jobs: 220 },
  electronics_factory: { cost: 540_000, inc: 1_520, jobs: 210 },
  heavy_industry: { cost: 1_950_000, inc: 5_100, jobs: 340 },
  water_plant: { cost: 7_800, inc: 19, jobs: 26 },
  highway_network: { cost: 46_000, inc: 128, jobs: 84 },
  logistics_center: { cost: 310_000, inc: 860, jobs: 195 },
  telecom_center: { cost: 880_000, inc: 2_380, jobs: 140 },
  schools: { cost: 900, inc: 2.2, jobs: 20 },
  adv_medical: { cost: 480_000, inc: 1_050, jobs: 240 },
  central_lab: { cost: 1_550_000, inc: 3_950, jobs: 175 },
  police_hq: { cost: 11_000, inc: 22, jobs: 64 },
  fire_dept: { cost: 8_500, inc: 17, jobs: 52 },
  govt_admin: { cost: 65_000, inc: 145, jobs: 120 },
  transit_hub: { cost: 34_000, inc: 88, jobs: 90 },
  national_stadium: { cost: 290_000, inc: 760, jobs: 180 },
  national_bank: { cost: 2_600_000, inc: 6_800, jobs: 260 },
  convention_center: { cost: 4_800_000, inc: 11_800, jobs: 340 },
  space_center: { cost: 9_500_000, inc: 23_500, jobs: 420 },
  // Update 2.0 buildings (+56)
  premium_housing: { cost: 38_000, inc: 86, jobs: 28 },
  smart_apartments: { cost: 195_000, inc: 425, jobs: 48 },
  affordable_housing: { cost: 7_500, inc: 17, jobs: 16 },
  luxury_district: { cost: 1_180_000, inc: 2_650, jobs: 110 },
  eco_homes: { cost: 88_000, inc: 195, jobs: 34 },
  senior_living: { cost: 420_000, inc: 890, jobs: 84 },
  intl_mall: { cost: 76_000, inc: 215, jobs: 130 },
  biz_convention: { cost: 295_000, inc: 820, jobs: 205 },
  trading_tower: { cost: 1_900_000, inc: 4_850, jobs: 310 },
  luxury_boulevard: { cost: 680_000, inc: 1_780, jobs: 245 },
  corporate_plaza: { cost: 26_000, inc: 78, jobs: 95 },
  auto_mfg_plant: { cost: 390_000, inc: 1_120, jobs: 260 },
  pharma_factory: { cost: 245_000, inc: 710, jobs: 165 },
  steel_complex: { cost: 125_000, inc: 375, jobs: 185 },
  elec_mfg_plant: { cost: 860_000, inc: 2_380, jobs: 240 },
  robotics_facility: { cost: 2_850_000, inc: 7_450, jobs: 190 },
  aerospace_works: { cost: 5_600_000, inc: 14_200, jobs: 360 },
  offshore_wind: { cost: 96_000, inc: 245, jobs: 42 },
  adv_solar_station: { cost: 28_000, inc: 76, jobs: 30 },
  hydro_plant: { cost: 240_000, inc: 615, jobs: 78 },
  nuclear_research_power: { cost: 1_250_000, inc: 3_150, jobs: 145 },
  battery_mega_facility: { cost: 480_000, inc: 1_220, jobs: 72 },
  geothermal_plant: { cost: 3_400_000, inc: 8_400, jobs: 165 },
  intl_airport_terminal: { cost: 920_000, inc: 2_480, jobs: 290 },
  hs_railway_station: { cost: 175_000, inc: 495, jobs: 140 },
  mega_highway_interchange: { cost: 84_000, inc: 235, jobs: 105 },
  deep_sea_port: { cost: 520_000, inc: 1_450, jobs: 245 },
  smart_transit_hub: { cost: 38_000, inc: 108, jobs: 86 },
  automated_farm_complex: { cost: 64_000, inc: 182, jobs: 54 },
  agri_research_center: { cost: 165_000, inc: 445, jobs: 92 },
  dairy_plant: { cost: 18_500, inc: 54, jobs: 58 },
  commercial_greenhouse: { cost: 112_000, inc: 310, jobs: 76 },
  grain_mega_complex: { cost: 340_000, inc: 920, jobs: 110 },
  aquaculture_hub: { cost: 760_000, inc: 2_050, jobs: 155 },
  ai_research_campus: { cost: 2_400_000, inc: 6_350, jobs: 220 },
  national_data_center: { cost: 640_000, inc: 1_780, jobs: 125 },
  semiconductor_fab: { cost: 4_200_000, inc: 10_800, jobs: 310 },
  cybersec_ops_center: { cost: 220_000, inc: 615, jobs: 135 },
  quantum_lab: { cost: 7_800_000, inc: 19_600, jobs: 240 },
  biotech_incubator: { cost: 72_000, inc: 198, jobs: 84 },
  national_medical_univ: { cost: 215_000, inc: 520, jobs: 175 },
  cancer_research_hospital: { cost: 980_000, inc: 2_320, jobs: 290 },
  intl_edu_campus: { cost: 360_000, inc: 890, jobs: 210 },
  medtech_institute: { cost: 1_550_000, inc: 3_750, jobs: 245 },
  specialist_healthcare: { cost: 48_000, inc: 118, jobs: 112 },
  emergency_response_center: { cost: 135_000, inc: 310, jobs: 155 },
  smart_govt_complex: { cost: 460_000, inc: 1_120, jobs: 220 },
  public_safety_hq: { cost: 245_000, inc: 560, jobs: 185 },
  water_management_facility: { cost: 52_000, inc: 126, jobs: 78 },
  civic_admin_center: { cost: 22_000, inc: 52, jobs: 76 },
  national_space_center: { cost: 14_500_000, inc: 35_200, jobs: 510 },
  intl_expo_complex: { cost: 6_400_000, inc: 15_800, jobs: 390 },
  intel_research_facility: { cost: 19_000_000, inc: 45_500, jobs: 440 },
  grand_national_monument: { cost: 1_150_000, inc: 2_850, jobs: 165 },
  mega_innovation_district: { cost: 32_000_000, inc: 76_000, jobs: 640 },
  world_trade_pavilion: { cost: 8_200_000, inc: 20_400, jobs: 420 },
};

const SERVER_COSMETICS: Record<string, { diamonds: number; coins: number; reqRank: number }> = {
  // Frames
  frame_neon: { diamonds: 12, coins: 0, reqRank: 1 },
  frame_rainbow: { diamonds: 18, coins: 0, reqRank: 1 },
  frame_galaxy: { diamonds: 22, coins: 0, reqRank: 1 },
  frame_aurora: { diamonds: 24, coins: 0, reqRank: 1 },
  frame_lightning: { diamonds: 34, coins: 0, reqRank: 3 },
  frame_royal_gold: { diamonds: 38, coins: 250_000, reqRank: 4 },
  frame_holographic: { diamonds: 42, coins: 0, reqRank: 1 },
  frame_diamond_crystal: { diamonds: 46, coins: 400_000, reqRank: 4 },
  frame_legendary: { diamonds: 62, coins: 1_000_000, reqRank: 5 },
  frame_seasonal: { diamonds: 54, coins: 0, reqRank: 1 },
  // Name effects
  nfx_animated_grad: { diamonds: 12, coins: 0, reqRank: 1 },
  nfx_rainbow: { diamonds: 16, coins: 0, reqRank: 1 },
  nfx_neon: { diamonds: 18, coins: 0, reqRank: 1 },
  nfx_electric: { diamonds: 24, coins: 0, reqRank: 1 },
  nfx_royal_gold: { diamonds: 30, coins: 200_000, reqRank: 3 },
  nfx_holographic: { diamonds: 36, coins: 0, reqRank: 1 },
  nfx_diamond: { diamonds: 42, coins: 350_000, reqRank: 4 },
  nfx_legendary: { diamonds: 56, coins: 900_000, reqRank: 5 },
  nfx_crimson_blaze: { diamonds: 65, coins: 0, reqRank: 1 },
  nfx_emerald_pulse: { diamonds: 80, coins: 0, reqRank: 1 },
  nfx_amber_ledger: { diamonds: 95, coins: 0, reqRank: 1 },
  nfx_frost_crystal: { diamonds: 115, coins: 0, reqRank: 1 },
  nfx_cobalt_laser: { diamonds: 135, coins: 0, reqRank: 1 },
  nfx_obsidian_silver: { diamonds: 160, coins: 0, reqRank: 1 },
  nfx_solar_flare: { diamonds: 195, coins: 0, reqRank: 3 },
  nfx_amethyst_royal: { diamonds: 230, coins: 0, reqRank: 3 },
  nfx_rose_velvet: { diamonds: 265, coins: 0, reqRank: 4 },
  nfx_titanium_chrome: { diamonds: 290, coins: 0, reqRank: 4 },
  nfx_cyber_glitch: { diamonds: 340, coins: 0, reqRank: 5 },
  nfx_plasma_wave: { diamonds: 395, coins: 0, reqRank: 6 },
  nfx_starlight_serif: { diamonds: 480, coins: 0, reqRank: 8 },
  nfx_imperial_prism: { diamonds: 565, coins: 0, reqRank: 10 },
  // Leaderboard row styles
  lb_silver_edge: { diamonds: 55, coins: 0, reqRank: 1 },
  lb_jade_flow: { diamonds: 75, coins: 0, reqRank: 1 },
  lb_amber_beacon: { diamonds: 90, coins: 0, reqRank: 1 },
  lb_cyan_scan: { diamonds: 115, coins: 0, reqRank: 1 },
  lb_emerald_glow: { diamonds: 140, coins: 0, reqRank: 1 },
  lb_indigo_wave: { diamonds: 165, coins: 0, reqRank: 1 },
  lb_ruby_pulse: { diamonds: 190, coins: 0, reqRank: 3 },
  lb_royal_shimmer: { diamonds: 225, coins: 0, reqRank: 3 },
  lb_gold_sweep: { diamonds: 260, coins: 0, reqRank: 4 },
  lb_plasma_rail: { diamonds: 295, coins: 0, reqRank: 5 },
  lb_aurora_ribbon: { diamonds: 335, coins: 0, reqRank: 5 },
  lb_diamond_glint: { diamonds: 385, coins: 0, reqRank: 6 },
  lb_prism_border: { diamonds: 430, coins: 0, reqRank: 7 },
  lb_starlight_trail: { diamonds: 475, coins: 0, reqRank: 9 },
  lb_imperial_crest: { diamonds: 530, coins: 0, reqRank: 10 },
  lb_nova_aura: { diamonds: 595, coins: 0, reqRank: 12 },
  // Themes
  theme_midnight_galaxy: { diamonds: 0, coins: 0, reqRank: 1 },
  theme_ocean_blue: { diamonds: 14, coins: 0, reqRank: 1 },
  theme_cyber_neon: { diamonds: 16, coins: 0, reqRank: 1 },
  theme_dark_luxury: { diamonds: 22, coins: 0, reqRank: 1 },
  theme_aurora_nights: { diamonds: 24, coins: 0, reqRank: 1 },
  theme_emerald_kingdom: { diamonds: 25, coins: 0, reqRank: 1 },
  theme_crimson_empire: { diamonds: 26, coins: 0, reqRank: 1 },
  theme_sunset_paradise: { diamonds: 28, coins: 0, reqRank: 1 },
  theme_royal_gold: { diamonds: 34, coins: 300_000, reqRank: 1 },
  theme_diamond_crystal: { diamonds: 38, coins: 450_000, reqRank: 1 },
  theme_imperial_obsidian: { diamonds: 145, coins: 0, reqRank: 1 },
  theme_sapphire_monarch: { diamonds: 220, coins: 0, reqRank: 1 },
  theme_jade_dynasty: { diamonds: 265, coins: 0, reqRank: 1 },
  theme_solar_eclipse: { diamonds: 360, coins: 0, reqRank: 5 },
  theme_platinum_vault: { diamonds: 520, coins: 0, reqRank: 8 },
  // Card & UI FX animations
  anim_soft_glow: { diamonds: 55, coins: 0, reqRank: 1 },
  anim_ripple_veil: { diamonds: 85, coins: 0, reqRank: 1 },
  anim_backdrop: { diamonds: 115, coins: 0, reqRank: 1 },
  anim_pulse_grid: { diamonds: 140, coins: 0, reqRank: 1 },
  anim_borders: { diamonds: 175, coins: 0, reqRank: 2 },
  anim_sparkles: { diamonds: 235, coins: 0, reqRank: 2 },
  anim_aurora_curtain: { diamonds: 285, coins: 0, reqRank: 3 },
  anim_celebration: { diamonds: 355, coins: 0, reqRank: 4 },
  anim_celestial_orbit: { diamonds: 465, coins: 0, reqRank: 5 },
  anim_sovereign_nova: { diamonds: 585, coins: 0, reqRank: 6 },
  anim_glass_sheen: { diamonds: 65, coins: 0, reqRank: 1 },
  anim_horizon_scan: { diamonds: 125, coins: 0, reqRank: 1 },
  anim_gold_filigree: { diamonds: 210, coins: 0, reqRank: 3 },
  anim_prism_lattice: { diamonds: 325, coins: 0, reqRank: 4 },
  anim_quantum_ripple: { diamonds: 495, coins: 0, reqRank: 7 },
  anim_apex_crown: { diamonds: 599, coins: 0, reqRank: 10 },
  // Exclusive Badges
  badge_diamond_member: { diamonds: 15, coins: 0, reqRank: 1 },
  badge_royal_member: { diamonds: 24, coins: 0, reqRank: 1 },
  badge_legendary_builder: { diamonds: 26, coins: 0, reqRank: 3 },
  badge_elite_governor: { diamonds: 34, coins: 0, reqRank: 4 },
  badge_galaxy_explorer: { diamonds: 38, coins: 0, reqRank: 1 },
  badge_premium_founder: { diamonds: 58, coins: 800_000, reqRank: 6 },
  badge_civic_architect: { diamonds: 70, coins: 0, reqRank: 1 },
  badge_trade_envoy: { diamonds: 130, coins: 0, reqRank: 1 },
  badge_quantum_pioneer: { diamonds: 240, coins: 0, reqRank: 4 },
  badge_space_director: { diamonds: 350, coins: 0, reqRank: 7 },
  badge_grand_chancellor: { diamonds: 470, coins: 0, reqRank: 10 },
  badge_eternal_sovereign: { diamonds: 580, coins: 0, reqRank: 14 },
  // Achievement Showcase FX
  achfx_emerald_ribbon: { diamonds: 75, coins: 0, reqRank: 1 },
  achfx_cyan_seal: { diamonds: 135, coins: 0, reqRank: 1 },
  achfx_gold_wreath: { diamonds: 230, coins: 0, reqRank: 3 },
  achfx_diamond_burst: { diamonds: 345, coins: 0, reqRank: 5 },
  achfx_aurora_banner: { diamonds: 460, coins: 0, reqRank: 8 },
  achfx_sovereign_crest: { diamonds: 575, coins: 0, reqRank: 12 },
  // Profile / Card Vignettes
  pvfx_velvet_vignette: { diamonds: 85, coins: 0, reqRank: 1 },
  pvfx_crystal_refraction: { diamonds: 150, coins: 0, reqRank: 1 },
  pvfx_telemetry_grid: { diamonds: 255, coins: 0, reqRank: 3 },
  pvfx_imperial_amber: { diamonds: 375, coins: 0, reqRank: 5 },
  pvfx_nebula_depth: { diamonds: 490, coins: 0, reqRank: 9 },
  pvfx_sovereign_radiance: { diamonds: 590, coins: 0, reqRank: 12 },
  // Diamond Landmarks
  asset_aurora_obelisk: { diamonds: 26, coins: 120_000, reqRank: 1 },
  asset_royal_fleet: { diamonds: 32, coins: 220_000, reqRank: 1 },
  asset_diamond_spire: { diamonds: 45, coins: 500_000, reqRank: 3 },
  asset_crystal_vault: { diamonds: 56, coins: 1_200_000, reqRank: 5 },
  asset_solar_monolith: { diamonds: 120, coins: 350_000, reqRank: 1 },
  asset_quantum_spire: { diamonds: 225, coins: 900_000, reqRank: 4 },
  asset_imperial_pavilion: { diamonds: 340, coins: 2_500_000, reqRank: 6 },
  asset_celestial_observatory: { diamonds: 465, coins: 6_000_000, reqRank: 9 },
  asset_sovereign_colossus: { diamonds: 580, coins: 15_000_000, reqRank: 12 },
};

const SERVER_REWARD_CAPS = {
  dailySlotDiamonds: [1, 2, 2, 3, 6] as const,
  dailySlotCoins: [1_500, 4_500, 12_000, 30_000, 75_000] as const,
  weeklyDiamonds: {
    wk_build_60: 5,
    wk_housing_80: 3,
    wk_policy_3: 2,
    wk_fuse_3: 3,
    wk_hap_80: 4,
    wk_tech_4: 6,
    wk_trade_3: 4,
    wk_upg_10: 5,
    wk_pol_6: 3,
    wk_proj_2: 5,
  } as Record<string, number>,
  achievements: {
    ach_city_15: { gems: 1, cash: 15_000 },
    ach_city_75: { gems: 3, cash: 250_000 },
    ach_city_200: { gems: 6, cash: 2_500_000 },
    ach_city_350: { gems: 8, cash: 25_000_000 },
    ach_cash_1m: { gems: 2, cash: 50_000 },
    ach_cash_100m: { gems: 5, cash: 5_000_000 },
    ach_rank_5: { gems: 3, cash: 500_000 },
    ach_rank_15: { gems: 10, cash: 50_000_000 },
    ach_civic_hap: { gems: 2, cash: 150_000 },
    ach_civic_tech: { gems: 4, cash: 1_500_000 },
    ach_stk_25: { gems: 5, cash: 1_000_000 },
    ach_streak_14: { gems: 4, cash: 500_000 },
    ach_city_500: { gems: 12, cash: 50_000_000 },
    ach_city_800: { gems: 16, cash: 150_000_000 },
    ach_upg_10: { gems: 3, cash: 120_000 },
    ach_upg_25: { gems: 6, cash: 2_500_000 },
    ach_upg_50: { gems: 18, cash: 100_000_000 },
    ach_sectors_10: { gems: 4, cash: 400_000 },
    ach_cash_1b: { gems: 8, cash: 40_000_000 },
    ach_cash_50b: { gems: 15, cash: 500_000_000 },
    ach_rank_20: { gems: 14, cash: 150_000_000 },
    ach_rank_25: { gems: 25, cash: 1_000_000_000 },
    ach_tech_15: { gems: 4, cash: 750_000 },
    ach_tech_30: { gems: 8, cash: 12_000_000 },
    ach_tech_50: { gems: 20, cash: 250_000_000 },
    ach_pol_10: { gems: 4, cash: 500_000 },
    ach_trade_5: { gems: 3, cash: 250_000 },
    ach_trade_25: { gems: 7, cash: 8_000_000 },
    ach_trade_rev_50m: { gems: 10, cash: 15_000_000 },
    ach_stk_50: { gems: 10, cash: 10_000_000 },
    ach_pop_200: { gems: 6, cash: 4_000_000 },
    ach_hap_95: { gems: 8, cash: 5_000_000 },
  } as Record<string, { gems: number; cash: number }>,
  milestones: {
    m_first_bldg: 1,
    m_cash_1m: 2,
    m_builders_25: 3,
    m_infra_5: 3,
    m_infra_25: 6,
    m_stk_10: 4,
    m_rank_4: 5,
    m_tech_3: 4,
    m_gdp_100m: 6,
    m_rank_10: 8,
    m_rank_15: 10,
    m_rank_25: 25,
  } as Record<string, number>,
};

const ALL_TECH_IDS = new Set([
  'smart_grid',
  'eco_catalysis',
  'healthcare_act',
  'auto_customs',
  'civil_corps',
  'sovereign_vault',
  'ai_analytics',
  'ai_logistics',
  'neural_foundation',
  'ai_grid_orchestration',
  'agi_economics',
  'cobots_assembly',
  'warehouse_drones',
  'servo_robotics',
  'autonomous_construction',
  'lean_tooling',
  'composite_alloys',
  'euv_lithography',
  'nano_fabrication',
  'perovskite_pv',
  'solid_state_storage',
  'smr_reactors',
  'fusion_confinement',
  'telemedicine_grid',
  'genomic_screening',
  'mrna_therapeutics',
  'longevity_biomed',
  'digital_classrooms',
  'apprentice_guilds',
  'stem_fellowships',
  'global_faculty',
  'lifelong_reskilling',
  'drip_irrigation',
  'precision_agronomy',
  'cold_chain_silos',
  'crispr_yields',
  'vertical_biome',
  'leo_satellites',
  'reusable_boosters',
  'orbital_launch',
  'lunar_logistics',
  'orbital_solar_beam',
  'instant_rails',
  'digital_treasury',
  'quantum_ledger',
  'zero_trust_gov',
  'grid_intrusion_shield',
  'fin_fraud_sentinel',
  'quantum_cryptography',
  'sovereign_cyber_dome',
]);

async function verifyBearerUid(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'https://pakora-tab.web.app',
  'https://pakora-tab.firebaseapp.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
]);

function getAllowedOrigins(): Set<string> {
  const extra = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (extra.length === 0) return DEFAULT_ALLOWED_ORIGINS;
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra]);
}

function setCors(
  req: { headers: { origin?: string } },
  res: { setHeader: (k: string, v: string) => void },
): boolean {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
  const allowed = getAllowedOrigins();
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (!origin) return true;
  if (allowed.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    return true;
  }
  return false;
}

function serverDayKey(nowMs = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(nowMs));
}

function unpackV2Extension(saveData: Record<string, unknown>): Record<string, unknown> | null {
  const rawLog = saveData.provBudgetLog;
  if (!Array.isArray(rawLog)) return null;
  const v2Chunks = rawLog
    .filter((entry): entry is string => typeof entry === 'string' && entry.startsWith('v2:'))
    .map((entry) => entry.slice(3));
  if (v2Chunks.length === 0) return null;
  try {
    const parsed = JSON.parse(v2Chunks.join(''));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function getBuildingLevelMultiplier(lvl: number): number {
  const clamped = Math.max(1, Math.min(MAX_BUILDING_LEVEL, Math.floor(Number(lvl) || 1)));
  if (clamped <= 1) return 1;
  return Math.round((1 + 0.18 * Math.pow(clamped - 1, 0.7)) * 1000) / 1000;
}

function computeServerNationalMetrics(saveData: Record<string, unknown>, walletCash: number) {
  const baseB = (saveData.b && typeof saveData.b === 'object' ? saveData.b : {}) as Record<string, unknown>;
  const gx = (saveData.gx && typeof saveData.gx === 'object' ? saveData.gx : {}) as Record<string, unknown>;
  const baseLvlMap = (gx.lvl && typeof gx.lvl === 'object' ? gx.lvl : {}) as Record<string, unknown>;
  const baseTechMap = (saveData.tech && typeof saveData.tech === 'object' ? saveData.tech : {}) as Record<string, unknown>;
  const v2 = unpackV2Extension(saveData);

  const b: Record<string, number> = {};
  for (const [k, v] of Object.entries(baseB)) {
    b[k] = Math.max(0, Math.min(10_000, Math.floor(Number(v) || 0)));
  }
  if (v2?.ob && typeof v2.ob === 'object') {
    for (const [k, v] of Object.entries(v2.ob as Record<string, unknown>)) {
      b[k] = Math.max(b[k] || 0, Math.max(0, Math.min(10_000, Math.floor(Number(v) || 0))));
    }
  }

  const lvlMap: Record<string, number> = {};
  for (const [k, v] of Object.entries(baseLvlMap)) {
    lvlMap[k] = Math.max(1, Math.min(MAX_BUILDING_LEVEL, Math.floor(Number(v) || 1)));
  }
  if (v2?.ol && typeof v2.ol === 'object') {
    for (const [k, v] of Object.entries(v2.ol as Record<string, unknown>)) {
      lvlMap[k] = Math.max(lvlMap[k] || 1, Math.max(1, Math.min(MAX_BUILDING_LEVEL, Math.floor(Number(v) || 1))));
    }
  }

  const unlockedTechs = new Set<string>();
  for (const [k, v] of Object.entries(baseTechMap)) {
    if (ALL_TECH_IDS.has(k) && Number(v) > 0) unlockedTechs.add(k);
  }
  if (Array.isArray(v2?.ot)) {
    for (const k of v2.ot) {
      if (typeof k === 'string' && ALL_TECH_IDS.has(k)) unlockedTechs.add(k);
    }
  }

  const topRank = Math.max(1, Math.min(MAX_RANK, Math.floor(Number(saveData.rank) || 1)));
  const packedRank = Math.max(1, Math.min(MAX_RANK, Math.floor(Number(v2?.r) || 1)));
  const currentRank = Math.max(topRank, packedRank);

  let buildingsTotal = 0;
  let capitalEquity = 0;
  let jobsCreated = 0;
  let baseFlow = 2;

  for (const [id, spec] of Object.entries(BUILDING_COSTS)) {
    const count = Math.max(0, Math.min(10_000, Math.floor(Number(b[id]) || 0)));
    if (count <= 0) continue;
    buildingsTotal += count;
    const lvl = Math.max(1, Math.min(MAX_BUILDING_LEVEL, Math.floor(Number(lvlMap[id]) || 1)));
    const lvlMult = getBuildingLevelMultiplier(lvl);
    capitalEquity += spec.cost * count * (1 + Math.pow(lvl - 1, 0.72) * 0.42) * 1.15;
    jobsCreated += spec.jobs * count * (1 + (lvl - 1) * 0.04);
    baseFlow += spec.inc * count * lvlMult;
  }

  const techCount = unlockedTechs.size;
  const safeFlow = Math.max(0, baseFlow);
  const pop = Math.max(1, Math.min(100_000, Number(saveData.pop) || 48));
  const hap = Math.max(0, Math.min(100, Number(saveData.hap) || 0));
  const humanCapital = pop * 220 + jobsCreated * 45 + techCount * 140_000;
  const treasuryComponent = Math.min(1e12, Math.max(0, walletCash) * 0.35);
  const realGdp = Math.max(
    1000,
    Math.min(1e13, Math.floor(capitalEquity + safeFlow * 180 + humanCapital + treasuryComponent)),
  );

  return { buildingsTotal, techCount, hap, realGdp, currentRank };
}

/**
 * Server-authoritative National Rank Promotion endpoint (Ranks 2..25).
 */
export const verifyNationalRankPromotion = onRequest(async (req, res) => {
  const corsAllowed = setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(corsAllowed ? 204 : 403).send('');
    return;
  }
  if (!corsAllowed) {
    res.status(403).json({ ok: false, error: 'ORIGIN_NOT_ALLOWED' });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const uid = await verifyBearerUid(req.headers.authorization);
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = (req.body || {}) as { targetRank?: unknown; sid?: unknown };
  const targetRank = Math.floor(Number(body.targetRank));
  const sid = String(body.sid ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const rule = RANK_RULES[targetRank];
  if (!rule) {
    res.status(400).json({ ok: false, error: 'INVALID_RANK' });
    return;
  }

  try {
    const out = await adminDb.runTransaction(async (tx) => {
      const saveRef = adminDb.doc(`saves/${uid}`);
      const walletRef = adminDb.doc(`players/${uid}/private/wallet`);
      const playerRef = adminDb.doc(`players/${uid}`);

      const [saveSnap, walletSnap, playerSnap] = await Promise.all([
        tx.get(saveRef),
        tx.get(walletRef),
        tx.get(playerRef),
      ]);

      if (!saveSnap.exists || !walletSnap.exists || !playerSnap.exists) {
        throw new Error('PLAYER_NOT_READY');
      }

      const saveData = (saveSnap.data()?.save || {}) as Record<string, unknown>;
      const walletCash = Math.max(0, Math.floor(Number(walletSnap.data()?.cash || 0)));
      const metrics = computeServerNationalMetrics(saveData, walletCash);

      if (targetRank !== metrics.currentRank + 1) {
        throw new Error('RANK_ORDER_INVALID');
      }

      if (metrics.realGdp < rule.minGdp) throw new Error('INSUFFICIENT_GDP');
      if (metrics.buildingsTotal < rule.minBuildings) throw new Error('INSUFFICIENT_BUILDINGS');
      if (metrics.hap < rule.minHap) throw new Error('INSUFFICIENT_HAPPINESS');
      if (metrics.techCount < rule.minTech) throw new Error('INSUFFICIENT_TECHS');
      if (walletCash < rule.cost) throw new Error('INSUFFICIENT_CASH');

      const nextCash = walletCash - rule.cost;
      const prevRev = Math.max(1, Math.floor(Number(walletSnap.data()?.rev || 1)));
      const nextRev = Math.min(1e9, prevRev + 1);
      const nextMetrics = computeServerNationalMetrics(saveData, nextCash);

      tx.update(walletRef, {
        cash: nextCash,
        rev: nextRev,
        sid: sid || walletSnap.data()?.sid || 'fn',
        t: FieldValue.serverTimestamp(),
      });

      tx.update(playerRef, {
        cash: nextCash,
        gdp: nextMetrics.realGdp,
        rank: targetRank,
        lastSeen: FieldValue.serverTimestamp(),
      });

      tx.update(saveRef, {
        'save.cash': nextCash,
        'save.rank': targetRank,
        'save.t': Date.now(),
      });

      return {
        rank: targetRank,
        rankName: rule.name,
        nextCash,
        walletRev: nextRev,
        gdp: nextMetrics.realGdp,
      };
    });

    res.status(200).json({ ok: true, ...out });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'RANK_PROMOTION_FAILED';
    const status = msg === 'PLAYER_NOT_READY' ? 409 : 400;
    res.status(status).json({ ok: false, error: msg });
  }
});

/**
 * Server-authoritative Diamond Exclusives cosmetic purchase endpoint.
 */
export const verifyCosmeticPurchase = onRequest(async (req, res) => {
  const corsAllowed = setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(corsAllowed ? 204 : 403).send('');
    return;
  }
  if (!corsAllowed) {
    res.status(403).json({ ok: false, error: 'ORIGIN_NOT_ALLOWED' });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const uid = await verifyBearerUid(req.headers.authorization);
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = (req.body || {}) as { itemId?: unknown; sid?: unknown };
  const itemId = String(body.itemId ?? '').trim();
  const sid = String(body.sid ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const spec = SERVER_COSMETICS[itemId];
  if (!spec || spec.diamonds <= 0) {
    res.status(400).json({ ok: false, error: 'UNKNOWN_COSMETIC_ITEM' });
    return;
  }

  try {
    const out = await adminDb.runTransaction(async (tx) => {
      const saveRef = adminDb.doc(`saves/${uid}`);
      const walletRef = adminDb.doc(`players/${uid}/private/wallet`);
      const playerRef = adminDb.doc(`players/${uid}`);
      const receiptRef = adminDb.doc(`players/${uid}/cosmeticReceipts/${itemId}`);

      const [saveSnap, walletSnap, playerSnap, receiptSnap] = await Promise.all([
        tx.get(saveRef),
        tx.get(walletRef),
        tx.get(playerRef),
        tx.get(receiptRef),
      ]);

      if (!saveSnap.exists || !walletSnap.exists || !playerSnap.exists) {
        throw new Error('PLAYER_NOT_READY');
      }
      if (receiptSnap.exists) {
        throw new Error('ALREADY_OWNED');
      }

      const saveData = (saveSnap.data()?.save || {}) as Record<string, unknown>;
      const curRank = computeServerNationalMetrics(saveData, 0).currentRank;
      if (curRank < spec.reqRank) throw new Error('RANK_LOCKED');

      const wCash = Math.max(0, Math.floor(Number(walletSnap.data()?.cash || 0)));
      const wGems = Math.max(0, Math.floor(Number(walletSnap.data()?.gems || 0)));
      if (wGems < spec.diamonds) throw new Error('INSUFFICIENT_DIAMONDS');
      if (spec.coins > 0 && wCash < spec.coins) throw new Error('INSUFFICIENT_COINS');

      const nextGems = wGems - spec.diamonds;
      const nextCash = wCash - spec.coins;
      const prevRev = Math.max(1, Math.floor(Number(walletSnap.data()?.rev || 1)));
      const nextRev = Math.min(1e9, prevRev + 1);

      tx.set(receiptRef, {
        itemId,
        diamondsPaid: spec.diamonds,
        coinsPaid: spec.coins,
        purchasedAt: FieldValue.serverTimestamp(),
      });
      tx.update(walletRef, {
        cash: nextCash,
        gems: nextGems,
        rev: nextRev,
        sid: sid || walletSnap.data()?.sid || 'fn',
        t: FieldValue.serverTimestamp(),
      });
      tx.update(playerRef, {
        cash: nextCash,
        gems: nextGems,
        lastSeen: FieldValue.serverTimestamp(),
      });
      tx.update(saveRef, {
        'save.cash': nextCash,
        'save.gems': nextGems,
        'save.t': Date.now(),
      });

      return { itemId, nextCash, nextGems, walletRev: nextRev };
    });

    res.status(200).json({ ok: true, ...out });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'COSMETIC_PURCHASE_FAILED';
    const status = msg === 'PLAYER_NOT_READY' ? 409 : 400;
    res.status(status).json({ ok: false, error: msg });
  }
});

/**
 * Server-authoritative reward claim ledger to block duplicate farming/claims.
 */
export const verifyRewardClaim = onRequest(async (req, res) => {
  const corsAllowed = setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(corsAllowed ? 204 : 403).send('');
    return;
  }
  if (!corsAllowed) {
    res.status(403).json({ ok: false, error: 'ORIGIN_NOT_ALLOWED' });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const uid = await verifyBearerUid(req.headers.authorization);
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = (req.body || {}) as { kind?: unknown; rewardId?: unknown; periodKey?: unknown; sid?: unknown };
  const kind = String(body.kind ?? '').trim();
  const rewardId = String(body.rewardId ?? '').trim().slice(0, 64);
  const sid = String(body.sid ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const todayKey = serverDayKey(Date.now());

  if (!['daily_slot', 'weekly_mission', 'achievement', 'milestone'].includes(kind)) {
    res.status(400).json({ ok: false, error: 'INVALID_REWARD_KIND' });
    return;
  }

  try {
    const out = await adminDb.runTransaction(async (tx) => {
      const saveRef = adminDb.doc(`saves/${uid}`);
      const walletRef = adminDb.doc(`players/${uid}/private/wallet`);
      const playerRef = adminDb.doc(`players/${uid}`);
      const ledgerId = kind === 'daily_slot'
        ? `daily_${todayKey}`
        : kind === 'weekly_mission'
          ? `weekly_${String(body.periodKey || todayKey).replace(/[^a-zA-Z0-9_-]/g, '')}_${rewardId}`
          : `${kind}_${rewardId}`;
      const ledgerRef = adminDb.doc(`players/${uid}/rewardClaims/${ledgerId}`);

      const [saveSnap, walletSnap, playerSnap, ledgerSnap] = await Promise.all([
        tx.get(saveRef),
        tx.get(walletRef),
        tx.get(playerRef),
        tx.get(ledgerRef),
      ]);

      if (!saveSnap.exists || !walletSnap.exists || !playerSnap.exists) {
        throw new Error('PLAYER_NOT_READY');
      }
      if (ledgerSnap.exists) {
        throw new Error('ALREADY_CLAIMED');
      }

      const saveData = (saveSnap.data()?.save || {}) as Record<string, unknown>;
      let addGems = 0;
      let addCash = 0;

      if (kind === 'daily_slot') {
        const slotIdx = Math.max(0, Math.min(4, Math.floor(Number(rewardId) || 1) - 1));
        addGems = SERVER_REWARD_CAPS.dailySlotDiamonds[slotIdx];
        addCash = SERVER_REWARD_CAPS.dailySlotCoins[slotIdx];
      } else if (kind === 'weekly_mission') {
        const g = SERVER_REWARD_CAPS.weeklyDiamonds[rewardId];
        if (!g) throw new Error('UNKNOWN_WEEKLY_MISSION');
        addGems = g;
      } else if (kind === 'achievement') {
        const ach = SERVER_REWARD_CAPS.achievements[rewardId];
        if (!ach) throw new Error('UNKNOWN_ACHIEVEMENT');
        addGems = ach.gems;
        addCash = ach.cash;
      } else if (kind === 'milestone') {
        const g = SERVER_REWARD_CAPS.milestones[rewardId];
        if (!g) throw new Error('UNKNOWN_MILESTONE');
        addGems = g;
      }

      const wCash = Math.max(0, Math.floor(Number(walletSnap.data()?.cash || 0)));
      const wGems = Math.max(0, Math.floor(Number(walletSnap.data()?.gems || 0)));
      const nextCash = Math.min(1e13, wCash + addCash);
      const nextGems = Math.min(1e9, wGems + addGems);
      const prevRev = Math.max(1, Math.floor(Number(walletSnap.data()?.rev || 1)));
      const nextRev = Math.min(1e9, prevRev + 1);
      const nextMetrics = computeServerNationalMetrics(saveData, nextCash);

      tx.set(ledgerRef, {
        kind,
        rewardId,
        gemsAdded: addGems,
        cashAdded: addCash,
        claimedAt: FieldValue.serverTimestamp(),
      });
      tx.update(walletRef, {
        cash: nextCash,
        gems: nextGems,
        rev: nextRev,
        sid: sid || walletSnap.data()?.sid || 'fn',
        t: FieldValue.serverTimestamp(),
      });
      tx.update(playerRef, {
        cash: nextCash,
        gems: nextGems,
        gdp: nextMetrics.realGdp,
        lastSeen: FieldValue.serverTimestamp(),
      });

      return { kind, rewardId, gemsAdded: addGems, cashAdded: addCash, nextCash, nextGems, walletRev: nextRev };
    });

    res.status(200).json({ ok: true, ...out });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'REWARD_CLAIM_FAILED';
    const status = msg === 'PLAYER_NOT_READY' ? 409 : 400;
    res.status(status).json({ ok: false, error: msg });
  }
});
