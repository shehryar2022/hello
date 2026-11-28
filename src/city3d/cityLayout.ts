import type { BuildingCategory, ProjectType } from '../game/types';

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
    | 'space'
    | 'refinery'
    | 'mine'
    | 'semicon'
    | 'fusion'
    | 'biosphere'
    | 'arcology'
    | 'spaceport'
    | 'museum'
    | 'bridge';
}

/**
 * Master-planned Part 16 National Metropolis Grid (~336 x 186 world units, 227 building plots + 21 Mega Project monument sites).
 * Districts radiate coherently around the Central Civic Boulevard (x=0, z=0):
 *  - Core Civic, Financial & Commercial Downtown: x in [-30..30], z in [-22..26]
 *  - East Residential, Bourse, Tourism & Arcology Suburbs: x in [46..158], z in [-118..40]
 *  - South Waterfront Harbor, Deep-Sea Ports, Offshore Wind & Mega Project Islands: z in [39..66]
 *  - North & Far-North Health, Edu, AI/Quantum/Semicon, Biosphere & Fusion Grid: x in [-94..94], z in [-134..-38]
 *  - West Industrial, Extraction, Petrochemical, Metallurgy & Energy Belt: x in [-158..-46], z in [-118..40]
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

  // Outer Civic Ring
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

  // Infrastructure Hubs
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
  { id: 'semiconductor_fab', x: 78, z: -86, w: 12, d: 10, zone: 'technology', archetype: 'semicon' },
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

  // ==================== PART 16 — OUTER EAST EXPANSION (12 RESIDENTIAL + 12 COMMERCIAL + 12 SPECIAL/TOURISM + 5 INFRA) ====================
  // East Residential Ring (12 plots)
  { id: 'worker_cottages', x: 110, z: -22, w: 12, d: 10, zone: 'residential', archetype: 'house_small' },
  { id: 'suburban_villas', x: 110, z: -6, w: 12, d: 10, zone: 'residential', archetype: 'luxury_res' },
  { id: 'student_dorm_complex', x: 110, z: -38, w: 12, d: 10, zone: 'residential', archetype: 'apartment' },
  { id: 'transit_oriented_lofts', x: 110, z: 10, w: 12, d: 10, zone: 'residential', archetype: 'res_tower' },
  { id: 'waterfront_condos', x: 110, z: 40, w: 12, d: 10, zone: 'residential', archetype: 'smart_res' },
  { id: 'green_eco_village', x: 126, z: -22, w: 12, d: 10, zone: 'residential', archetype: 'smart_res' },
  { id: 'diplomatic_quarter', x: 126, z: -38, w: 12, d: 10, zone: 'residential', archetype: 'capitol' },
  { id: 'vertical_garden_towers', x: 126, z: -6, w: 12, d: 10, zone: 'residential', archetype: 'arcology' },
  { id: 'tech_talent_township', x: 126, z: -54, w: 12, d: 10, zone: 'residential', archetype: 'smart_res' },
  { id: 'imperial_penthouse_spire', x: 142, z: -6, w: 12, d: 10, zone: 'residential', archetype: 'skyscraper' },
  { id: 'arcology_habitat', x: 142, z: -22, w: 13, d: 10, zone: 'residential', archetype: 'arcology' },
  { id: 'sovereign_sky_citadel', x: 158, z: -6, w: 13, d: 11, zone: 'residential', archetype: 'arcology' },

  // East Commercial, Finance & Tourism Strip (12 plots)
  { id: 'wholesale_bazaar', x: 110, z: 24, w: 12, d: 10, zone: 'commercial', archetype: 'market' },
  { id: 'regional_bank_branch', x: 126, z: 10, w: 12, d: 10, zone: 'commercial', archetype: 'bank' },
  { id: 'logistics_freight_exchange', x: 126, z: 24, w: 12, d: 10, zone: 'commercial', archetype: 'logistics' },
  { id: 'fintech_clearing_hub', x: 142, z: 10, w: 12, d: 10, zone: 'commercial', archetype: 'financial' },
  { id: 'tourism_resort_boardwalk', x: 126, z: 40, w: 13, d: 10, zone: 'commercial', archetype: 'hotel' },
  { id: 'commodities_mercantile', x: 142, z: 24, w: 12, d: 10, zone: 'commercial', archetype: 'trade' },
  { id: 'duty_free_freeport', x: 142, z: 40, w: 13, d: 10, zone: 'commercial', archetype: 'port' },
  { id: 'luxury_atelier_quarter', x: 158, z: 10, w: 12, d: 10, zone: 'commercial', archetype: 'mall' },
  { id: 'sovereign_wealth_hq', x: 158, z: -22, w: 12, d: 10, zone: 'commercial', archetype: 'financial' },
  { id: 'global_ecommerce_campus', x: 142, z: -38, w: 12, d: 10, zone: 'commercial', archetype: 'corporate' },
  { id: 'world_bourse_citadel', x: 158, z: 24, w: 12, d: 10, zone: 'commercial', archetype: 'skyscraper' },
  { id: 'celestial_trade_emporium', x: 158, z: 40, w: 13, d: 11, zone: 'commercial', archetype: 'trade' },

  // East Special Wonders & Cultural Landmarks (12 plots)
  { id: 'heritage_museum', x: 110, z: -54, w: 12, d: 10, zone: 'special', archetype: 'museum' },
  { id: 'opera_performing_arts', x: 110, z: -70, w: 12, d: 10, zone: 'special', archetype: 'museum' },
  { id: 'theme_park_resort', x: 94, z: 40, w: 13, d: 10, zone: 'special', archetype: 'stadium' },
  { id: 'cruise_marina_terminal', x: 158, z: -38, w: 12, d: 10, zone: 'special', archetype: 'port' },
  { id: 'satellite_assembly_hangar', x: 126, z: -70, w: 12, d: 10, zone: 'special', archetype: 'spaceport' },
  { id: 'intl_arbitration_court', x: 142, z: -54, w: 12, d: 10, zone: 'special', archetype: 'capitol' },
  { id: 'olympic_sports_complex', x: 142, z: -70, w: 13, d: 10, zone: 'special', archetype: 'stadium' },
  { id: 'global_bullion_depository', x: 158, z: -54, w: 12, d: 10, zone: 'special', archetype: 'bank' },
  { id: 'reusable_spaceport_pad', x: 158, z: -70, w: 13, d: 11, zone: 'special', archetype: 'spaceport' },
  { id: 'orbital_habitat_gateway', x: 126, z: -86, w: 13, d: 11, zone: 'special', archetype: 'spaceport' },
  { id: 'world_wonder_citadel', x: 142, z: -86, w: 13, d: 11, zone: 'special', archetype: 'monument' },
  { id: 'planetary_diplomacy_nexus', x: 158, z: -86, w: 13, d: 11, zone: 'special', archetype: 'arcology' },

  // ==================== PART 16 — OUTER WEST EXPANSION (12 INDUSTRY + 12 ENERGY + 12 INFRA) ====================
  // West Extraction, Metallurgy & Heavy Industrial Belt (12 plots)
  { id: 'quarry_cement_works', x: -94, z: 24, w: 12, d: 10, zone: 'industry', archetype: 'mine' },
  { id: 'iron_ore_mine', x: -110, z: 24, w: 12, d: 10, zone: 'industry', archetype: 'mine' },
  { id: 'oil_extraction_rig', x: -110, z: 10, w: 12, d: 10, zone: 'industry', archetype: 'mine' },
  { id: 'petrochemical_refinery', x: -126, z: 10, w: 12, d: 10, zone: 'industry', archetype: 'refinery' },
  { id: 'chemical_fertilizer_complex', x: -126, z: 24, w: 12, d: 10, zone: 'industry', archetype: 'refinery' },
  { id: 'heavy_machinery_foundry', x: -110, z: -6, w: 12, d: 10, zone: 'industry', archetype: 'heavy_industry' },
  { id: 'ev_battery_gigafactory', x: -126, z: -6, w: 12, d: 10, zone: 'industry', archetype: 'battery' },
  { id: 'automated_shipyard', x: -110, z: 40, w: 13, d: 10, zone: 'industry', archetype: 'port' },
  { id: 'titanium_metallurgy_hub', x: -142, z: 10, w: 12, d: 10, zone: 'industry', archetype: 'steel_plant' },
  { id: 'lights_out_megafactory', x: -142, z: -6, w: 12, d: 10, zone: 'industry', archetype: 'robotics_plant' },
  { id: 'orbital_composite_foundry', x: -158, z: -6, w: 12, d: 10, zone: 'industry', archetype: 'semicon' },
  { id: 'national_industrial_park', x: -158, z: 10, w: 13, d: 11, zone: 'industry', archetype: 'heavy_industry' },

  // West Energy, Thorium & Fusion Corridor (12 plots)
  { id: 'biomass_digester', x: -110, z: -22, w: 11, d: 10, zone: 'energy', archetype: 'refinery' },
  { id: 'gas_peaker_turbine', x: -126, z: -22, w: 11, d: 10, zone: 'energy', archetype: 'power_station' },
  { id: 'highland_wind_array', x: -142, z: -22, w: 12, d: 10, zone: 'energy', archetype: 'wind' },
  { id: 'concentrated_solar_tower', x: -110, z: -38, w: 12, d: 10, zone: 'energy', archetype: 'solar' },
  { id: 'pumped_hydro_reservoir', x: -126, z: -38, w: 12, d: 10, zone: 'energy', archetype: 'hydro' },
  { id: 'tidal_lagoon_barrage', x: -126, z: 40, w: 13, d: 10, zone: 'energy', archetype: 'hydro' },
  { id: 'green_hydrogen_hub', x: -142, z: -38, w: 12, d: 10, zone: 'energy', archetype: 'refinery' },
  { id: 'gen4_thorium_reactor', x: -110, z: -54, w: 12, d: 10, zone: 'energy', archetype: 'nuclear' },
  { id: 'hvdc_supergrid_hub', x: -126, z: -54, w: 12, d: 10, zone: 'energy', archetype: 'battery' },
  { id: 'tokamak_fusion_pilot', x: -142, z: -54, w: 12, d: 10, zone: 'energy', archetype: 'fusion' },
  { id: 'orbital_rectenna_farm', x: -158, z: -38, w: 12, d: 10, zone: 'energy', archetype: 'solar' },
  { id: 'stellarator_energy_core', x: -158, z: -54, w: 13, d: 11, zone: 'energy', archetype: 'fusion' },

  // West & Far-West Infrastructure Corridors (12 plots)
  { id: 'regional_bus_depot', x: -110, z: -70, w: 11, d: 10, zone: 'infrastructure', archetype: 'transit' },
  { id: 'grain_rail_siding', x: -126, z: -70, w: 12, d: 10, zone: 'infrastructure', archetype: 'railway' },
  { id: 'cable_stayed_bridge', x: -142, z: 24, w: 13, d: 10, zone: 'infrastructure', archetype: 'bridge' },
  { id: 'smart_cold_warehouse', x: -142, z: -70, w: 12, d: 10, zone: 'infrastructure', archetype: 'logistics' },
  { id: 'inland_dry_port', x: -158, z: -22, w: 12, d: 10, zone: 'infrastructure', archetype: 'logistics' },
  { id: 'desalination_aqueduct', x: -142, z: 40, w: 13, d: 10, zone: 'infrastructure', archetype: 'water_plant' },
  { id: 'subsea_fiber_landing', x: -158, z: 40, w: 12, d: 10, zone: 'infrastructure', archetype: 'telecom' },
  { id: 'cargo_mega_hub', x: -158, z: 24, w: 13, d: 10, zone: 'infrastructure', archetype: 'logistics' },
  { id: 'maglev_corridor', x: -110, z: -86, w: 13, d: 10, zone: 'infrastructure', archetype: 'railway' },
  { id: 'autonomous_freight_tunnel', x: -126, z: -86, w: 12, d: 10, zone: 'infrastructure', archetype: 'highway' },
  { id: 'transcontinental_viaduct', x: -142, z: -86, w: 13, d: 10, zone: 'infrastructure', archetype: 'bridge' },
  { id: 'hyperloop_backbone', x: -158, z: -86, w: 13, d: 11, zone: 'infrastructure', archetype: 'railway' },

  // ==================== PART 16 — FAR-NORTH HIGHLANDS & ARCTIC/R&D GRID (48 PLOTS) ====================
  // Agriculture & Biosphere Belt (12 plots: z = -102 west/center + -86/-70 gaps)
  { id: 'irrigation_canal_station', x: -158, z: -70, w: 12, d: 10, zone: 'agriculture', archetype: 'water_plant' },
  { id: 'orchard_horticulture', x: -94, z: -102, w: 12, d: 10, zone: 'agriculture', archetype: 'farm' },
  { id: 'livestock_ranch_co', x: -78, z: -102, w: 12, d: 10, zone: 'agriculture', archetype: 'farm' },
  { id: 'flour_sugar_mill', x: -62, z: -102, w: 12, d: 10, zone: 'agriculture', archetype: 'food_plant' },
  { id: 'organic_fertilizer_coop', x: -46, z: -102, w: 12, d: 10, zone: 'agriculture', archetype: 'greenhouse' },
  { id: 'hydroponic_skyfarm', x: -30, z: -102, w: 12, d: 10, zone: 'agriculture', archetype: 'biosphere' },
  { id: 'seed_genomics_vault', x: -16, z: -102, w: 12, d: 10, zone: 'agriculture', archetype: 'biosphere' },
  { id: 'precision_drone_estate', x: 0, z: -102, w: 12, d: 10, zone: 'agriculture', archetype: 'farm' },
  { id: 'coastal_kelp_biofarm', x: -110, z: -102, w: 12, d: 10, zone: 'agriculture', archetype: 'aquaculture' },
  { id: 'synthetic_protein_lab', x: -126, z: -102, w: 12, d: 10, zone: 'agriculture', archetype: 'lab' },
  { id: 'aeroponic_biosphere', x: -142, z: -102, w: 13, d: 10, zone: 'agriculture', archetype: 'biosphere' },
  { id: 'global_food_ark', x: -158, z: -102, w: 13, d: 11, zone: 'agriculture', archetype: 'biosphere' },

  // Technology, Photonics, Sub-2nm & Quantum Citadel (12 plots)
  { id: 'software_dev_studio', x: 110, z: -86, w: 11, d: 10, zone: 'technology', archetype: 'tech_park' },
  { id: 'silicon_refinery_plant', x: 16, z: -102, w: 12, d: 10, zone: 'technology', archetype: 'semicon' },
  { id: 'chip_packaging_facility', x: 30, z: -102, w: 12, d: 10, zone: 'technology', archetype: 'semicon' },
  { id: 'cloud_edge_exchange', x: 46, z: -102, w: 12, d: 10, zone: 'technology', archetype: 'data_center' },
  { id: 'photonics_optical_lab', x: 62, z: -102, w: 12, d: 10, zone: 'technology', archetype: 'lab' },
  { id: 'drone_autonomy_center', x: 78, z: -102, w: 12, d: 10, zone: 'technology', archetype: 'robotics_plant' },
  { id: 'genomic_biofoundry', x: 94, z: -102, w: 12, d: 10, zone: 'technology', archetype: 'biosphere' },
  { id: 'sub2nm_giga_fab', x: 110, z: -102, w: 13, d: 10, zone: 'technology', archetype: 'semicon' },
  { id: 'exascale_ai_supercluster', x: 126, z: -102, w: 13, d: 10, zone: 'technology', archetype: 'ai_campus' },
  { id: 'sovereign_cyber_command', x: 142, z: -102, w: 12, d: 10, zone: 'technology', archetype: 'cyber_ops' },
  { id: 'cryogenic_quantum_foundry', x: 158, z: -102, w: 13, d: 11, zone: 'technology', archetype: 'fusion' },
  { id: 'singularity_rnd_citadel', x: 46, z: -134, w: 14, d: 11, zone: 'technology', archetype: 'ai_campus' },

  // Healthcare & Education Expansion (12 plots at z = -118)
  { id: 'community_health_clinic', x: 16, z: -118, w: 11, d: 10, zone: 'healthcare_edu', archetype: 'hospital' },
  { id: 'polytechnic_trade_academy', x: 30, z: -118, w: 11, d: 10, zone: 'healthcare_edu', archetype: 'school' },
  { id: 'stem_high_school', x: 46, z: -118, w: 11, d: 10, zone: 'healthcare_edu', archetype: 'school' },
  { id: 'trauma_emergency_hospital', x: 62, z: -118, w: 12, d: 10, zone: 'healthcare_edu', archetype: 'hospital' },
  { id: 'national_library_archive', x: 78, z: -118, w: 12, d: 10, zone: 'healthcare_edu', archetype: 'museum' },
  { id: 'vaccine_biodefense_inst', x: 94, z: -118, w: 12, d: 10, zone: 'healthcare_edu', archetype: 'lab' },
  { id: 'robotic_surgery_center', x: 110, z: -118, w: 12, d: 10, zone: 'healthcare_edu', archetype: 'hospital' },
  { id: 'ai_aerospace_university', x: 126, z: -118, w: 13, d: 10, zone: 'healthcare_edu', archetype: 'university' },
  { id: 'genomic_precision_hospital', x: 142, z: -118, w: 12, d: 10, zone: 'healthcare_edu', archetype: 'hospital' },
  { id: 'global_medical_city', x: 158, z: -118, w: 13, d: 11, zone: 'healthcare_edu', archetype: 'hospital' },
  { id: 'nobel_science_academy', x: 16, z: -134, w: 13, d: 10, zone: 'healthcare_edu', archetype: 'university' },
  { id: 'longevity_wellness_citadel', x: -16, z: -134, w: 13, d: 11, zone: 'healthcare_edu', archetype: 'biosphere' },

  // Public Services, Courts, Conservation & Defense (12 plots at z = -118 west/center + -134)
  { id: 'municipal_recycling_depot', x: -158, z: -118, w: 11, d: 10, zone: 'public_services', archetype: 'water_plant' },
  { id: 'district_courthouse', x: -142, z: -118, w: 11, d: 10, zone: 'public_services', archetype: 'capitol' },
  { id: 'national_park_conservatory', x: -126, z: -118, w: 12, d: 10, zone: 'public_services', archetype: 'biosphere' },
  { id: 'air_quality_scrubbers', x: -110, z: -118, w: 11, d: 10, zone: 'public_services', archetype: 'wind' },
  { id: 'flood_barrier_control', x: -94, z: -118, w: 12, d: 10, zone: 'public_services', archetype: 'hydro' },
  { id: 'supreme_constitutional_court', x: -78, z: -118, w: 12, d: 10, zone: 'public_services', archetype: 'capitol' },
  { id: 'coastal_coastguard_base', x: -62, z: -118, w: 12, d: 10, zone: 'public_services', archetype: 'police' },
  { id: 'national_weather_sat_center', x: -46, z: -118, w: 12, d: 10, zone: 'public_services', archetype: 'telecom' },
  { id: 'civic_transparency_ministry', x: -30, z: -118, w: 12, d: 10, zone: 'public_services', archetype: 'capitol' },
  { id: 'biosphere_eco_sanctuary', x: -16, z: -118, w: 12, d: 10, zone: 'public_services', archetype: 'biosphere' },
  { id: 'planetary_civil_defense_hq', x: 0, z: -118, w: 13, d: 10, zone: 'public_services', archetype: 'cyber_ops' },
  { id: 'world_peace_pavilion', x: -46, z: -134, w: 14, d: 11, zone: 'public_services', archetype: 'monument' },
];

export const PLOT_BY_ID: Record<string, CityPlotDef> = Object.fromEntries(
  CITY_PLOTS.map((p) => [p.id, p]),
);

export interface MegaProjectSlotDef {
  id: ProjectType;
  x: number;
  z: number;
  isIsland: boolean;
  archetype: CityPlotDef['archetype'];
}

export const MEGA_PROJECT_SLOTS: Record<ProjectType, MegaProjectSlotDef> = {
  // 10 Monumental Southern Bay Harbor Islands (z = 66, avoiding bridge at x = 23)
  seawall_shield: { id: 'seawall_shield', x: -152, z: 66, isIsland: true, archetype: 'hydro' },
  trade_canal: { id: 'trade_canal', x: -124, z: 66, isIsland: true, archetype: 'port' },
  intl_trade_corridor: { id: 'intl_trade_corridor', x: -96, z: 66, isIsland: true, archetype: 'trade' },
  mega_hydro: { id: 'mega_hydro', x: -68, z: 66, isIsland: true, archetype: 'hydro' },
  bridge: { id: 'bridge', x: -40, z: 66, isIsland: true, archetype: 'bridge' },
  tourism_dev: { id: 'tourism_dev', x: -12, z: 66, isIsland: true, archetype: 'hotel' },
  intl_fin_district: { id: 'intl_fin_district', x: 48, z: 66, isIsland: true, archetype: 'financial' },
  fusion_grid: { id: 'fusion_grid', x: 76, z: 66, isIsland: true, archetype: 'fusion' },
  agri_modernization: { id: 'agri_modernization', x: 104, z: 66, isIsland: true, archetype: 'biosphere' },
  spaceport: { id: 'spaceport', x: 132, z: 66, isIsland: true, archetype: 'spaceport' },

  // 11 Northern Horizon Ceremonial Ridge Sites (z = -154)
  school: { id: 'school', x: -150, z: -154, isIsland: false, archetype: 'school' },
  hospital: { id: 'hospital', x: -120, z: -154, isIsland: false, archetype: 'hospital' },
  health_transform: { id: 'health_transform', x: -90, z: -154, isIsland: false, archetype: 'hospital' },
  edu_revolution: { id: 'edu_revolution', x: -60, z: -154, isIsland: false, archetype: 'university' },
  highway: { id: 'highway', x: -30, z: -154, isIsland: false, archetype: 'highway' },
  hsr_network: { id: 'hsr_network', x: 0, z: -154, isIsland: false, archetype: 'railway' },
  smart_city: { id: 'smart_city', x: 30, z: -154, isIsland: false, archetype: 'arcology' },
  ai_corridor: { id: 'ai_corridor', x: 60, z: -154, isIsland: false, archetype: 'ai_campus' },
  semicon_program: { id: 'semicon_program', x: 90, z: -154, isIsland: false, archetype: 'semicon' },
  industrial_rev: { id: 'industrial_rev', x: 120, z: -154, isIsland: false, archetype: 'robotics_plant' },
  metro_loop: { id: 'metro_loop', x: 150, z: -154, isIsland: false, archetype: 'transit' },
};

export interface RoadSegmentDef {
  x: number;
  z: number;
  w: number;
  d: number;
  axis: 'x' | 'z';
}

export const CITY_ROADS: RoadSegmentDef[] = [
  // East-West avenues (spanning -166..166)
  { x: 0, z: 2, w: 332, d: 3.4, axis: 'x' },
  { x: 0, z: 17.5, w: 332, d: 3.0, axis: 'x' },
  { x: 0, z: -14, w: 332, d: 3.0, axis: 'x' },
  { x: 0, z: -30, w: 332, d: 3.2, axis: 'x' },
  { x: 0, z: -46, w: 332, d: 2.8, axis: 'x' },
  { x: 0, z: -62, w: 332, d: 2.8, axis: 'x' },
  { x: 0, z: -78, w: 332, d: 2.8, axis: 'x' },
  { x: 0, z: -94, w: 332, d: 2.8, axis: 'x' },
  { x: 0, z: -110, w: 332, d: 2.8, axis: 'x' },
  { x: 0, z: -126, w: 332, d: 2.8, axis: 'x' },
  { x: 0, z: 32.5, w: 332, d: 3.2, axis: 'x' },
  // North-South boulevards (spanning -142..34 -> center z=-54, length=176)
  { x: -8, z: -54, w: 3.2, d: 176, axis: 'z' },
  { x: 8, z: -54, w: 3.2, d: 176, axis: 'z' },
  { x: -23, z: -54, w: 2.8, d: 176, axis: 'z' },
  { x: 23, z: -54, w: 2.8, d: 176, axis: 'z' },
  { x: 38, z: -54, w: 2.8, d: 176, axis: 'z' },
  { x: 54, z: -54, w: 2.8, d: 176, axis: 'z' },
  { x: 70, z: -54, w: 2.8, d: 176, axis: 'z' },
  { x: 86, z: -54, w: 2.8, d: 176, axis: 'z' },
  { x: 102, z: -54, w: 2.8, d: 176, axis: 'z' },
  { x: 118, z: -54, w: 2.8, d: 176, axis: 'z' },
  { x: 134, z: -54, w: 2.8, d: 176, axis: 'z' },
  { x: 150, z: -54, w: 2.8, d: 176, axis: 'z' },
  { x: -38, z: -54, w: 3.0, d: 176, axis: 'z' },
  { x: -54, z: -54, w: 2.8, d: 176, axis: 'z' },
  { x: -70, z: -54, w: 2.8, d: 176, axis: 'z' },
  { x: -86, z: -54, w: 2.8, d: 176, axis: 'z' },
  { x: -102, z: -54, w: 2.8, d: 176, axis: 'z' },
  { x: -118, z: -54, w: 2.8, d: 176, axis: 'z' },
  { x: -134, z: -54, w: 2.8, d: 176, axis: 'z' },
  { x: -150, z: -54, w: 2.8, d: 176, axis: 'z' },
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
  { axis: 'x', coord: 2.75, min: -162, max: 162, dir: 1, speed: 12.5 },
  { axis: 'x', coord: 1.25, min: -162, max: 162, dir: -1, speed: 13.5 },
  { axis: 'x', coord: -13.3, min: -162, max: 162, dir: 1, speed: 10.5 },
  { axis: 'x', coord: -14.7, min: -162, max: 162, dir: -1, speed: 11 },
  { axis: 'x', coord: 18.2, min: -162, max: 162, dir: 1, speed: 9.8 },
  { axis: 'x', coord: -29.3, min: -162, max: 162, dir: -1, speed: 12.2 },
  { axis: 'x', coord: -61.3, min: -162, max: 162, dir: 1, speed: 11.0 },
  { axis: 'x', coord: -93.3, min: -162, max: 162, dir: -1, speed: 11.8 },
  { axis: 'z', coord: -7.25, min: -136, max: 33, dir: 1, speed: 11.5 },
  { axis: 'z', coord: -8.75, min: -136, max: 33, dir: -1, speed: 12 },
  { axis: 'z', coord: 8.75, min: -136, max: 33, dir: 1, speed: 10.8 },
  { axis: 'z', coord: 22.3, min: -136, max: 33, dir: -1, speed: 10.2 },
  { axis: 'z', coord: 38.7, min: -136, max: 33, dir: 1, speed: 9.5 },
  { axis: 'z', coord: 70.7, min: -136, max: 33, dir: -1, speed: 10.4 },
  { axis: 'z', coord: 118.7, min: -136, max: 33, dir: 1, speed: 11.2 },
  { axis: 'z', coord: -37.3, min: -136, max: 33, dir: -1, speed: 11.2 },
  { axis: 'z', coord: -69.3, min: -136, max: 33, dir: 1, speed: 10.6 },
  { axis: 'z', coord: -117.3, min: -136, max: 33, dir: -1, speed: 11.4 },
];
