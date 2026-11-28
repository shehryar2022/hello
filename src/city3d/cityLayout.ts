import type { BuildingCategory } from '../game/types';

export interface CityPlotDef {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  rotY?: number;
  zone: Exclude<BuildingCategory, 'all'>;
  archetype:
    | 'farm'
    | 'greenhouse'
    | 'food_plant'
    | 'aquaculture'
    | 'factory_small'
    | 'factory'
    | 'steel_plant'
    | 'auto_factory'
    | 'electronics_factory'
    | 'heavy_industry'
    | 'robotics_plant'
    | 'solar'
    | 'wind'
    | 'power_station'
    | 'hydro'
    | 'nuclear'
    | 'battery'
    | 'road_hub'
    | 'highway'
    | 'railway'
    | 'port'
    | 'airport'
    | 'water_plant'
    | 'logistics'
    | 'telecom'
    | 'house_small'
    | 'apartment'
    | 'res_tower'
    | 'luxury_res'
    | 'smart_res'
    | 'market'
    | 'mall'
    | 'skyscraper'
    | 'corporate'
    | 'trade'
    | 'financial'
    | 'hotel'
    | 'lab'
    | 'tech_park'
    | 'data_center'
    | 'ai_campus'
    | 'cyber_ops'
    | 'telecom_dish'
    | 'school'
    | 'hospital'
    | 'university'
    | 'police'
    | 'fire'
    | 'capitol'
    | 'transit'
    | 'stadium'
    | 'bank'
    | 'convention'
    | 'monument'
    | 'space';
}

/**
 * Master-planned Update 2.0 national city grid (~208 x 146 world units, 107 plots).
 * Districts radiate coherently around the Central Civic Boulevard (x=0, z=0):
 *  - Core Civic, Financial & Commercial Downtown: x in [-30..30], z in [-22..26]
 *  - East Residential Suburbs & Smart Towers: x in [46..94], z in [-22..24]
 *  - South Waterfront Harbor, Deep-Sea Ports, Offshore Wind & Aquaculture: z in [39..41]
 *  - North-East Health, Edu, AI/Quantum Tech & Space Campus: x in [16..94], z in [-86..-38]
 *  - North Rural Valley, Dairy, Grain & Research: x in [-22..30], z in [-86..-54]
 *  - North-West Clean Energy & Nuclear Grid: x in [-94..-32], z in [-86..-54]
 *  - West Industrial, Pharma, Robotics & Aerospace Belt: x in [-94..-46], z in [-38..24]
 */
export const CITY_PLOTS: CityPlotDef[] = [
  // ==================== CIVIC CORE & COMMERCIAL DOWNTOWN ====================
  { id: 'govt_admin', x: 0, z: -6, w: 14, d: 11, zone: 'public_services', archetype: 'capitol' },
  { id: 'national_bank', x: -16, z: -6, w: 11, d: 10, zone: 'special', archetype: 'bank' },
  { id: 'financial_center', x: 16, z: -6, w: 11, d: 11, zone: 'commercial', archetype: 'financial' },
  { id: 'corporate_tower', x: 16, z: 10, w: 11, d: 10, zone: 'commercial', archetype: 'corporate' },
  { id: 'business_districts', x: 0, z: 12, w: 13, d: 11, zone: 'commercial', archetype: 'skyscraper' },
  { id: 'trade_center', x: -16, z: 10, w: 12, d: 10, zone: 'commercial', archetype: 'trade' },

  // Commercial, Hospitality & Arena Strip
  { id: 'intl_hotel', x: -30, z: 10, w: 11, d: 10, zone: 'commercial', archetype: 'hotel' },
  { id: 'shopping_centers', x: -30, z: -6, w: 12, d: 10, zone: 'commercial', archetype: 'mall' },
  { id: 'markets', x: -30, z: 24, w: 11, d: 9, zone: 'commercial', archetype: 'market' },
  { id: 'convention_center', x: -16, z: 24, w: 13, d: 10, zone: 'special', archetype: 'convention' },
  { id: 'national_stadium', x: 16, z: 25, w: 16, d: 13, zone: 'special', archetype: 'stadium' },
  { id: 'transit_hub', x: 0, z: 26, w: 11, d: 9, zone: 'public_services', archetype: 'transit' },

  // Public Safety & Infrastructure Backbone
  { id: 'police_hq', x: -16, z: -22, w: 10, d: 9, zone: 'public_services', archetype: 'police' },
  { id: 'fire_dept', x: 0, z: -22, w: 10, d: 9, zone: 'public_services', archetype: 'fire' },
  { id: 'roads', x: 30, z: 10, w: 10, d: 9, zone: 'infrastructure', archetype: 'road_hub' },
  { id: 'highway_network', x: 30, z: -6, w: 11, d: 10, zone: 'infrastructure', archetype: 'highway' },
  { id: 'railways', x: -30, z: -22, w: 13, d: 9, zone: 'infrastructure', archetype: 'railway' },
  { id: 'telecom_center', x: 16, z: -22, w: 10, d: 9, zone: 'infrastructure', archetype: 'telecom' },

  // New Commercial & Civic Additions (Outer Civic Ring)
  { id: 'corporate_plaza', x: 78, z: -6, w: 11, d: 10, zone: 'commercial', archetype: 'corporate' },
  { id: 'intl_mall', x: 78, z: 10, w: 12, d: 10, zone: 'commercial', archetype: 'mall' },
  { id: 'luxury_boulevard', x: 78, z: 24, w: 12, d: 10, zone: 'commercial', archetype: 'hotel' },
  { id: 'biz_convention', x: 94, z: 10, w: 12, d: 10, zone: 'commercial', archetype: 'convention' },
  { id: 'trading_tower', x: 94, z: -6, w: 11, d: 10, zone: 'commercial', archetype: 'financial' },
  { id: 'civic_admin_center', x: 46, z: 39, w: 11, d: 9, zone: 'public_services', archetype: 'capitol' },
  { id: 'water_management_facility', x: 0, z: -70, w: 11, d: 10, zone: 'public_services', archetype: 'water_plant' },
  { id: 'emergency_response_center', x: -16, z: -70, w: 11, d: 10, zone: 'public_services', archetype: 'fire' },
  { id: 'public_safety_hq', x: -30, z: -70, w: 11, d: 10, zone: 'public_services', archetype: 'police' },
  { id: 'smart_govt_complex', x: 16, z: -70, w: 12, d: 10, zone: 'public_services', archetype: 'capitol' },

  // New Infrastructure Hubs
  { id: 'smart_transit_hub', x: 94, z: 24, w: 11, d: 10, zone: 'infrastructure', archetype: 'transit' },
  { id: 'mega_highway_interchange', x: -46, z: -70, w: 12, d: 10, zone: 'infrastructure', archetype: 'highway' },
  { id: 'hs_railway_station', x: -62, z: -70, w: 12, d: 10, zone: 'infrastructure', archetype: 'railway' },
  { id: 'intl_airport_terminal', x: -46, z: -38, w: 13, d: 10, zone: 'infrastructure', archetype: 'airport' },

  // ==================== RESIDENTIAL SUBURBS & HIGH-RISES (EAST) ====================
  { id: 'small_housing', x: 46, z: 24, w: 12, d: 10, zone: 'residential', archetype: 'house_small' },
  { id: 'apartments', x: 46, z: 10, w: 12, d: 10, zone: 'residential', archetype: 'apartment' },
  { id: 'residential_towers', x: 46, z: -6, w: 12, d: 10, zone: 'residential', archetype: 'res_tower' },
  { id: 'luxury_residences', x: 62, z: 10, w: 12, d: 11, zone: 'residential', archetype: 'luxury_res' },
  { id: 'smart_housing', x: 62, z: -6, w: 12, d: 11, zone: 'residential', archetype: 'smart_res' },
  { id: 'affordable_housing', x: 62, z: 24, w: 12, d: 10, zone: 'residential', archetype: 'house_small' },
  { id: 'premium_housing', x: 78, z: -22, w: 12, d: 10, zone: 'residential', archetype: 'apartment' },
  { id: 'eco_homes', x: 94, z: -22, w: 12, d: 10, zone: 'residential', archetype: 'smart_res' },
  { id: 'smart_apartments', x: 78, z: -38, w: 12, d: 10, zone: 'residential', archetype: 'res_tower' },
  { id: 'senior_living', x: 94, z: -38, w: 12, d: 10, zone: 'residential', archetype: 'house_small' },
  { id: 'luxury_district', x: 78, z: -54, w: 12, d: 10, zone: 'residential', archetype: 'luxury_res' },

  // ==================== HEALTH, EDU, TECH & SPACE CAMPUS (NORTH-EAST) ====================
  { id: 'schools', x: 30, z: -22, w: 11, d: 9, zone: 'healthcare_edu', archetype: 'school' },
  { id: 'training_centers', x: 46, z: -22, w: 11, d: 9, zone: 'healthcare_edu', archetype: 'school' },
  { id: 'hospitals', x: 62, z: -22, w: 12, d: 10, zone: 'healthcare_edu', archetype: 'hospital' },
  { id: 'adv_medical', x: 62, z: -38, w: 12, d: 10, zone: 'healthcare_edu', archetype: 'hospital' },
  { id: 'universities', x: 46, z: -38, w: 13, d: 11, zone: 'healthcare_edu', archetype: 'university' },
  { id: 'specialist_healthcare', x: 30, z: -70, w: 11, d: 10, zone: 'healthcare_edu', archetype: 'hospital' },
  { id: 'national_medical_univ', x: 46, z: -70, w: 12, d: 10, zone: 'healthcare_edu', archetype: 'university' },
  { id: 'intl_edu_campus', x: 62, z: -70, w: 12, d: 10, zone: 'healthcare_edu', archetype: 'university' },
  { id: 'cancer_research_hospital', x: 78, z: -70, w: 12, d: 10, zone: 'healthcare_edu', archetype: 'hospital' },
  { id: 'medtech_institute', x: 94, z: -54, w: 12, d: 10, zone: 'healthcare_edu', archetype: 'lab' },

  { id: 'research_centers', x: 30, z: -38, w: 11, d: 10, zone: 'technology', archetype: 'lab' },
  { id: 'tech_parks', x: 30, z: -54, w: 12, d: 10, zone: 'technology', archetype: 'tech_park' },
  { id: 'data_centers', x: 46, z: -54, w: 11, d: 10, zone: 'technology', archetype: 'data_center' },
  { id: 'central_lab', x: 16, z: -38, w: 11, d: 10, zone: 'technology', archetype: 'lab' },
  { id: 'biotech_incubator', x: 94, z: -70, w: 11, d: 10, zone: 'technology', archetype: 'lab' },
  { id: 'cybersec_ops_center', x: 30, z: -86, w: 11, d: 10, zone: 'technology', archetype: 'cyber_ops' },
  { id: 'national_data_center', x: 46, z: -86, w: 11, d: 10, zone: 'technology', archetype: 'data_center' },
  { id: 'ai_research_campus', x: 62, z: -86, w: 12, d: 10, zone: 'technology', archetype: 'ai_campus' },
  { id: 'semiconductor_fab', x: 78, z: -86, w: 12, d: 10, zone: 'technology', archetype: 'electronics_factory' },
  { id: 'quantum_lab', x: 94, z: -86, w: 12, d: 10, zone: 'technology', archetype: 'ai_campus' },

  // ==================== SPECIAL LANDMARKS & NATIONAL FLAGSHIPS ====================
  { id: 'space_center', x: 62, z: -54, w: 13, d: 12, zone: 'special', archetype: 'space' },
  { id: 'national_space_center', x: 16, z: -86, w: 13, d: 11, zone: 'special', archetype: 'space' },
  { id: 'grand_national_monument', x: 0, z: -86, w: 12, d: 11, zone: 'special', archetype: 'monument' },
  { id: 'intl_expo_complex', x: -16, z: -86, w: 12, d: 10, zone: 'special', archetype: 'convention' },
  { id: 'world_trade_pavilion', x: -30, z: -86, w: 12, d: 10, zone: 'special', archetype: 'trade' },
  { id: 'intel_research_facility', x: -46, z: -86, w: 12, d: 10, zone: 'special', archetype: 'cyber_ops' },
  { id: 'mega_innovation_district', x: -62, z: -86, w: 12, d: 10, zone: 'special', archetype: 'ai_campus' },

  // ==================== AGRICULTURE & GREEN VALLEY (NORTH-CENTER) ====================
  { id: 'farms', x: -16, z: -54, w: 13, d: 11, zone: 'agriculture', archetype: 'farm' },
  { id: 'greenhouses', x: 0, z: -54, w: 12, d: 10, zone: 'agriculture', archetype: 'greenhouse' },
  { id: 'food_plant', x: 16, z: -54, w: 11, d: 10, zone: 'agriculture', archetype: 'food_plant' },
  { id: 'water_plant', x: 0, z: -38, w: 11, d: 10, zone: 'infrastructure', archetype: 'water_plant' },
  { id: 'dairy_plant', x: -78, z: -86, w: 11, d: 10, zone: 'agriculture', archetype: 'food_plant' },
  { id: 'automated_farm_complex', x: -94, z: -86, w: 12, d: 10, zone: 'agriculture', archetype: 'farm' },
  { id: 'commercial_greenhouse', x: -78, z: -70, w: 12, d: 10, zone: 'agriculture', archetype: 'greenhouse' },
  { id: 'agri_research_center', x: -94, z: -70, w: 11, d: 10, zone: 'agriculture', archetype: 'greenhouse' },
  { id: 'grain_mega_complex', x: -78, z: -54, w: 12, d: 10, zone: 'agriculture', archetype: 'farm' },

  // ==================== ENERGY RIDGE & POWER CORRIDOR (NORTH-WEST) ====================
  { id: 'solar_plants', x: -32, z: -54, w: 12, d: 11, zone: 'energy', archetype: 'solar' },
  { id: 'wind_farms', x: -48, z: -54, w: 12, d: 11, zone: 'energy', archetype: 'wind' },
  { id: 'power_stations', x: -63, z: -54, w: 11, d: 11, zone: 'energy', archetype: 'power_station' },
  { id: 'adv_solar_station', x: -94, z: -54, w: 12, d: 10, zone: 'energy', archetype: 'solar' },
  { id: 'battery_mega_facility', x: -94, z: -38, w: 11, d: 10, zone: 'energy', archetype: 'battery' },
  { id: 'hydro_plant', x: -78, z: -38, w: 12, d: 10, zone: 'energy', archetype: 'hydro' },
  { id: 'nuclear_research_power', x: -62, z: -38, w: 12, d: 10, zone: 'energy', archetype: 'nuclear' },
  { id: 'geothermal_plant', x: -94, z: -22, w: 11, d: 10, zone: 'energy', archetype: 'power_station' },

  // ==================== AIRPORT & AVIATION HUB (NORTH-WEST TARMAC) ====================
  { id: 'airports', x: -24, z: -38, w: 22, d: 11, zone: 'infrastructure', archetype: 'airport' },

  // ==================== INDUSTRIAL & MANUFACTURING BELT (WEST) ====================
  { id: 'small_factory', x: -46, z: -22, w: 11, d: 9, zone: 'industry', archetype: 'factory_small' },
  { id: 'textile_mills', x: -62, z: -22, w: 12, d: 10, zone: 'industry', archetype: 'factory_small' },
  { id: 'factories', x: -46, z: -6, w: 12, d: 10, zone: 'industry', archetype: 'factory' },
  { id: 'mfg_plant', x: -62, z: -6, w: 12, d: 10, zone: 'industry', archetype: 'factory' },
  { id: 'steel_plants', x: -62, z: 10, w: 13, d: 11, zone: 'industry', archetype: 'steel_plant' },
  { id: 'auto_factory', x: -46, z: 10, w: 12, d: 10, zone: 'industry', archetype: 'auto_factory' },
  { id: 'electronics_factory', x: -46, z: 24, w: 12, d: 10, zone: 'industry', archetype: 'electronics_factory' },
  { id: 'heavy_industry', x: -62, z: 24, w: 13, d: 11, zone: 'industry', archetype: 'heavy_industry' },
  { id: 'pharma_factory', x: -78, z: -22, w: 11, d: 10, zone: 'industry', archetype: 'lab' },
  { id: 'steel_complex', x: -78, z: -6, w: 12, d: 10, zone: 'industry', archetype: 'steel_plant' },
  { id: 'auto_mfg_plant', x: -78, z: 10, w: 12, d: 10, zone: 'industry', archetype: 'auto_factory' },
  { id: 'elec_mfg_plant', x: -78, z: 24, w: 12, d: 10, zone: 'industry', archetype: 'electronics_factory' },
  { id: 'robotics_facility', x: -94, z: -6, w: 12, d: 10, zone: 'industry', archetype: 'robotics_plant' },
  { id: 'aerospace_works', x: -94, z: 10, w: 12, d: 10, zone: 'industry', archetype: 'factory' },

  // ==================== WATERFRONT HARBOR, MARINE & OFFSHORE (SOUTH COAST) ====================
  { id: 'logistics_center', x: -46, z: 39, w: 13, d: 10, zone: 'infrastructure', archetype: 'logistics' },
  { id: 'ports', x: -18, z: 41, w: 20, d: 12, zone: 'infrastructure', archetype: 'port' },
  { id: 'deep_sea_port', x: -66, z: 41, w: 16, d: 11, zone: 'infrastructure', archetype: 'port' },
  { id: 'aquaculture_hub', x: -90, z: 40, w: 14, d: 10, zone: 'agriculture', archetype: 'aquaculture' },
  { id: 'offshore_wind', x: 78, z: 41, w: 14, d: 10, zone: 'energy', archetype: 'wind' },
  // Note: x=6, 23, 38, 54 at z=39..40 are reserved for the 4 Diamond Esplanade Landmarks; x=94, z=24 is smart_transit_hub.
  // Place extra waterfront industrial plot cleanly on West Harbor:
  // Wait — check (x: -94, z: 24) is unused above! Let's check total count:
  // Let's keep count exact — 107 plots total! Wait: let's check our count carefully below.
];

export const PLOT_BY_ID: Record<string, CityPlotDef> = Object.fromEntries(
  CITY_PLOTS.map((p) => [p.id, p]),
);

export interface RoadSegmentDef {
  x: number;
  z: number;
  w: number;
  d: number;
  axis: 'x' | 'z';
}

export const CITY_ROADS: RoadSegmentDef[] = [
  // East-West avenues (spanning -102..102)
  { x: 0, z: 2, w: 204, d: 3.4, axis: 'x' },
  { x: 0, z: 17.5, w: 204, d: 3.0, axis: 'x' },
  { x: 0, z: -14, w: 204, d: 3.0, axis: 'x' },
  { x: 0, z: -30, w: 204, d: 3.2, axis: 'x' },
  { x: 0, z: -46, w: 204, d: 2.8, axis: 'x' },
  { x: 0, z: -62, w: 204, d: 2.8, axis: 'x' },
  { x: 0, z: -78, w: 204, d: 2.8, axis: 'x' },
  { x: 0, z: 32.5, w: 200, d: 3.2, axis: 'x' },
  // North-South boulevards (spanning -92..34 -> center z=-29, length=126)
  { x: -8, z: -29, w: 3.2, d: 126, axis: 'z' },
  { x: 8, z: -29, w: 3.2, d: 126, axis: 'z' },
  { x: -23, z: -29, w: 2.8, d: 126, axis: 'z' },
  { x: 23, z: -29, w: 2.8, d: 126, axis: 'z' },
  { x: 38, z: -29, w: 2.8, d: 126, axis: 'z' },
  { x: 54, z: -29, w: 2.8, d: 126, axis: 'z' },
  { x: 70, z: -29, w: 2.8, d: 126, axis: 'z' },
  { x: 86, z: -29, w: 2.8, d: 126, axis: 'z' },
  { x: -38, z: -29, w: 3.0, d: 126, axis: 'z' },
  { x: -54, z: -29, w: 2.8, d: 126, axis: 'z' },
  { x: -70, z: -29, w: 2.8, d: 126, axis: 'z' },
  { x: -86, z: -29, w: 2.8, d: 126, axis: 'z' },
];

export interface VehicleLaneDef {
  axis: 'x' | 'z';
  coord: number;
  min: number;
  max: number;
  dir: 1 | -1;
  speed: number;
}

export const VEHICLE_LANES: VehicleLaneDef[] = [
  { axis: 'x', coord: 2.75, min: -98, max: 98, dir: 1, speed: 12 },
  { axis: 'x', coord: 1.25, min: -98, max: 98, dir: -1, speed: 13.5 },
  { axis: 'x', coord: -13.3, min: -98, max: 98, dir: 1, speed: 10.5 },
  { axis: 'x', coord: -14.7, min: -98, max: 98, dir: -1, speed: 11 },
  { axis: 'x', coord: 18.2, min: -98, max: 98, dir: 1, speed: 9.8 },
  { axis: 'x', coord: -29.3, min: -98, max: 98, dir: -1, speed: 12.2 },
  { axis: 'x', coord: -61.3, min: -98, max: 98, dir: 1, speed: 11.0 },
  { axis: 'z', coord: -7.25, min: -88, max: 33, dir: 1, speed: 11.5 },
  { axis: 'z', coord: -8.75, min: -88, max: 33, dir: -1, speed: 12 },
  { axis: 'z', coord: 8.75, min: -88, max: 33, dir: 1, speed: 10.8 },
  { axis: 'z', coord: 22.3, min: -88, max: 33, dir: -1, speed: 10.2 },
  { axis: 'z', coord: 38.7, min: -88, max: 33, dir: 1, speed: 9.5 },
  { axis: 'z', coord: 70.7, min: -88, max: 33, dir: -1, speed: 10.4 },
  { axis: 'z', coord: -37.3, min: -88, max: 33, dir: -1, speed: 11.2 },
  { axis: 'z', coord: -69.3, min: -88, max: 33, dir: 1, speed: 10.6 },
];
