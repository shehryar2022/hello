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
    | 'factory_small'
    | 'factory'
    | 'steel_plant'
    | 'auto_factory'
    | 'electronics_factory'
    | 'heavy_industry'
    | 'solar'
    | 'wind'
    | 'power_station'
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
    | 'space';
}

/**
 * Master-planned national city coordinates (~176 x 146 world units).
 * Districts radiate coherently around the Central Civic Boulevard (x=0, z=0):
 *  - Core Civic & Financial Downtown: x in [-26..26], z in [-20..22]
 *  - Residential Suburbs & High-Rises: East (x in [28..64], z in [-36..26])
 *  - Commercial Malls, Convention & Hotel Strip: Central-West (x in [-44..-24], z in [-16..26])
 *  - Waterfront Harbor, Ports & Coastal Transit: South (z in [30..48])
 *  - Health, Edu, Tech & Space Campus: North-East (x in [8..66], z in [-60..-32])
 *  - Industrial & Manufacturing Belt: West (x in [-72..-48], z in [-38..34])
 *  - Clean Energy Ridge & Power Grid: North-West Ridge (x in [-64..-26], z in [-62..-40])
 *  - Airport & Aviation Corridor: Far North-West (x in [-68..-28], z in [-34..-20])
 *  - Rural Valley & Greenhouses: Far North & East Valley (x in [-22..24], z in [-62..-42])
 */
export const CITY_PLOTS: CityPlotDef[] = [
  // Civic Core & Capitol Center (x=0, z=0 area)
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

  // Residential Suburbs & High-Rise Districts (East)
  { id: 'small_housing', x: 46, z: 24, w: 12, d: 10, zone: 'residential', archetype: 'house_small' },
  { id: 'apartments', x: 46, z: 10, w: 12, d: 10, zone: 'residential', archetype: 'apartment' },
  { id: 'residential_towers', x: 46, z: -6, w: 12, d: 10, zone: 'residential', archetype: 'res_tower' },
  { id: 'luxury_residences', x: 62, z: 10, w: 12, d: 11, zone: 'residential', archetype: 'luxury_res' },
  { id: 'smart_housing', x: 62, z: -6, w: 12, d: 11, zone: 'residential', archetype: 'smart_res' },

  // Health, Education, Research & Space Campus (North-East)
  { id: 'schools', x: 30, z: -22, w: 11, d: 9, zone: 'healthcare_edu', archetype: 'school' },
  { id: 'training_centers', x: 46, z: -22, w: 11, d: 9, zone: 'healthcare_edu', archetype: 'school' },
  { id: 'hospitals', x: 62, z: -22, w: 12, d: 10, zone: 'healthcare_edu', archetype: 'hospital' },
  { id: 'adv_medical', x: 62, z: -38, w: 12, d: 10, zone: 'healthcare_edu', archetype: 'hospital' },
  { id: 'universities', x: 46, z: -38, w: 13, d: 11, zone: 'healthcare_edu', archetype: 'university' },
  { id: 'research_centers', x: 30, z: -38, w: 11, d: 10, zone: 'technology', archetype: 'lab' },
  { id: 'tech_parks', x: 30, z: -54, w: 12, d: 10, zone: 'technology', archetype: 'tech_park' },
  { id: 'data_centers', x: 46, z: -54, w: 11, d: 10, zone: 'technology', archetype: 'data_center' },
  { id: 'central_lab', x: 16, z: -38, w: 11, d: 10, zone: 'technology', archetype: 'lab' },
  { id: 'space_center', x: 62, z: -54, w: 13, d: 12, zone: 'special', archetype: 'space' },

  // Agriculture & Rural Green Valley (North-Center)
  { id: 'farms', x: -16, z: -54, w: 14, d: 11, zone: 'agriculture', archetype: 'farm' },
  { id: 'greenhouses', x: 0, z: -54, w: 12, d: 10, zone: 'agriculture', archetype: 'greenhouse' },
  { id: 'food_plant', x: 16, z: -54, w: 11, d: 10, zone: 'agriculture', archetype: 'food_plant' },
  { id: 'water_plant', x: 0, z: -38, w: 11, d: 10, zone: 'infrastructure', archetype: 'water_plant' },

  // Energy Ridge & Power Corridor (North-West)
  { id: 'solar_plants', x: -34, z: -54, w: 14, d: 11, zone: 'energy', archetype: 'solar' },
  { id: 'wind_farms', x: -52, z: -54, w: 14, d: 11, zone: 'energy', archetype: 'wind' },
  { id: 'power_stations', x: -68, z: -54, w: 13, d: 11, zone: 'energy', archetype: 'power_station' },

  // Airport & Aviation Hub (North-West Tarmac)
  { id: 'airports', x: -24, z: -38, w: 22, d: 11, zone: 'infrastructure', archetype: 'airport' },

  // Industrial & Manufacturing Belt (West)
  { id: 'small_factory', x: -46, z: -22, w: 11, d: 9, zone: 'industry', archetype: 'factory_small' },
  { id: 'textile_mills', x: -62, z: -22, w: 12, d: 10, zone: 'industry', archetype: 'factory_small' },
  { id: 'factories', x: -46, z: -6, w: 12, d: 10, zone: 'industry', archetype: 'factory' },
  { id: 'mfg_plant', x: -62, z: -6, w: 12, d: 10, zone: 'industry', archetype: 'factory' },
  { id: 'steel_plants', x: -62, z: 10, w: 13, d: 11, zone: 'industry', archetype: 'steel_plant' },
  { id: 'auto_factory', x: -46, z: 10, w: 12, d: 10, zone: 'industry', archetype: 'auto_factory' },
  { id: 'electronics_factory', x: -46, z: 24, w: 12, d: 10, zone: 'industry', archetype: 'electronics_factory' },
  { id: 'heavy_industry', x: -62, z: 24, w: 13, d: 11, zone: 'industry', archetype: 'heavy_industry' },

  // Waterfront Harbor & Logistics (South Coast, facing sea at z > 46)
  { id: 'logistics_center', x: -46, z: 39, w: 14, d: 10, zone: 'infrastructure', archetype: 'logistics' },
  { id: 'ports', x: -18, z: 41, w: 20, d: 12, zone: 'infrastructure', archetype: 'port' },
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
  // East-West avenues
  { x: 0, z: 2, w: 152, d: 3.4, axis: 'x' },
  { x: 0, z: 17.5, w: 152, d: 3.0, axis: 'x' },
  { x: 0, z: -14, w: 152, d: 3.0, axis: 'x' },
  { x: 0, z: -30, w: 152, d: 3.2, axis: 'x' },
  { x: 0, z: -46, w: 152, d: 2.8, axis: 'x' },
  { x: 0, z: 32.5, w: 148, d: 3.2, axis: 'x' },
  // North-South boulevards
  { x: -8, z: -12, w: 3.2, d: 96, axis: 'z' },
  { x: 8, z: -12, w: 3.2, d: 96, axis: 'z' },
  { x: -23, z: -12, w: 2.8, d: 96, axis: 'z' },
  { x: 23, z: -12, w: 2.8, d: 96, axis: 'z' },
  { x: 38, z: -12, w: 2.8, d: 94, axis: 'z' },
  { x: 54, z: -12, w: 2.8, d: 94, axis: 'z' },
  { x: -38, z: -12, w: 3.0, d: 96, axis: 'z' },
  { x: -54, z: -12, w: 2.8, d: 94, axis: 'z' },
];

export interface VehicleLaneDef {
  axis: 'x' | 'z';
  coord: number; // z if axis==='x', x if axis==='z'
  min: number;
  max: number;
  dir: 1 | -1;
  speed: number;
}

export const VEHICLE_LANES: VehicleLaneDef[] = [
  { axis: 'x', coord: 2.75, min: -70, max: 70, dir: 1, speed: 12 },
  { axis: 'x', coord: 1.25, min: -70, max: 70, dir: -1, speed: 13.5 },
  { axis: 'x', coord: -13.3, min: -70, max: 70, dir: 1, speed: 10.5 },
  { axis: 'x', coord: -14.7, min: -70, max: 70, dir: -1, speed: 11 },
  { axis: 'x', coord: 18.2, min: -70, max: 70, dir: 1, speed: 9.8 },
  { axis: 'x', coord: -29.3, min: -70, max: 70, dir: -1, speed: 12.2 },
  { axis: 'z', coord: -7.25, min: -58, max: 33, dir: 1, speed: 11.5 },
  { axis: 'z', coord: -8.75, min: -58, max: 33, dir: -1, speed: 12 },
  { axis: 'z', coord: 8.75, min: -58, max: 33, dir: 1, speed: 10.8 },
  { axis: 'z', coord: 22.3, min: -58, max: 33, dir: -1, speed: 10.2 },
  { axis: 'z', coord: 38.7, min: -58, max: 33, dir: 1, speed: 9.5 },
  { axis: 'z', coord: -37.3, min: -58, max: 33, dir: -1, speed: 11.2 },
];
