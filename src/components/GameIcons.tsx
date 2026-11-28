import React, { memo, useId, useState } from 'react';
import {
  Activity,
  Anchor,
  Atom,
  Award,
  Banknote,
  BarChart3,
  BatteryCharging,
  Bell,
  Bird,
  Bot,
  Brain,
  Briefcase,
  Building2,
  Bus,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cloud,
  Coins,
  Compass,
  Cpu,
  Crown,
  Database,
  Dog,
  Droplets,
  Eye,
  Factory,
  Feather,
  Fish,
  Flame,
  FlaskConical,
  Gem,
  Gift,
  Globe,
  GraduationCap,
  Hammer,
  HeartHandshake,
  HeartPulse,
  Home,
  Hospital,
  IdCard,
  Landmark,
  Layers,
  Leaf,
  Lock,
  Mail,
  MessageSquare,
  Orbit,
  Package,
  Palette,
  Plane,
  PlaneTakeoff,
  Rabbit,
  Radio,
  RefreshCw,
  Rocket,
  Scale,
  School,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Ship,
  ShoppingBag,
  ShoppingCart,
  Siren,
  SlidersHorizontal,
  Smile,
  Smartphone,
  Sparkles,
  Sprout,
  Star,
  Stethoscope,
  Store,
  Sun,
  Target,
  TrainFront,
  Trash2,
  Trees,
  TrendingUp,
  Trophy,
  Truck,
  Turtle,
  Users,
  Volume2,
  Vote,
  Warehouse,
  Waves,
  Wheat,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { MAX_RANK, RANKS, RARITY_META, STICKERS } from '../game/constants';
import { flagLargeUrl, flagUrl, sanitizeCountryCode } from '../game/rules';
import type {
  BoosterId,
  NotificationItem,
  PolicyCategoryId,
  SubscriptionTierId,
  TabId,
} from '../game/types';

export const CashCoinIcon: React.FC<{ size?: number; className?: string }> = memo(({ size = 18, className }) => {
  const gradId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill={`url(#${gradId})`} stroke="#FFF3B0" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" stroke="#A66500" strokeOpacity="0.4" strokeWidth="1.2" />
      <path
        d="M12 7v10M9.5 9.5c0-1.1 1.1-1.8 2.5-1.8s2.5.7 2.5 1.8c0 1.2-1.2 1.7-2.5 2-1.3.3-2.5.8-2.5 2 0 1.1 1.1 1.8 2.5 1.8s2.5-.7 2.5-1.8"
        stroke="#5C3600"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id={gradId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE98A" />
          <stop offset="0.55" stopColor="#FFC23D" />
          <stop offset="1" stopColor="#D9820B" />
        </linearGradient>
      </defs>
    </svg>
  );
});

export const GemDiamondIcon: React.FC<{ size?: number; className?: string }> = memo(({ size = 18, className }) => {
  const gradId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6.5 4h11l4 5.5L12 20.5 2.5 9.5 6.5 4z"
        fill={`url(#${gradId})`}
        stroke="#E0F7FF"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M2.5 9.5h19M6.5 4l2.5 5.5L12 20.5l3-11L17.5 4" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.1" strokeLinejoin="round" />
      <defs>
        <linearGradient id={gradId} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B8EFFF" />
          <stop offset="0.5" stopColor="#5CCBFF" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
    </svg>
  );
});

export const TabIcon: React.FC<{ tab: TabId; size?: number }> = ({ tab, size = 18 }) => {
  switch (tab) {
    case 'build':
      return <Hammer size={size} strokeWidth={2.1} />;
    case 'gov':
      return <Landmark size={size} strokeWidth={2.1} />;
    case 'policy':
      return <SlidersHorizontal size={size} strokeWidth={2.1} />;
    case 'rivals':
      return <Users size={size} strokeWidth={2.1} />;
    case 'stickers':
      return <Sparkles size={size} strokeWidth={2.1} />;
    case 'trade':
      return <Gift size={size} strokeWidth={2.1} />;
    case 'quest':
      return <Trophy size={size} strokeWidth={2.1} />;
    case 'shop':
      return <ShoppingBag size={size} strokeWidth={2.1} />;
  }
};

export const BuildingIcon: React.FC<{ id: string; size?: number; color?: string }> = ({
  id,
  size = 24,
  color = 'currentColor',
}) => {
  const props = { size, strokeWidth: 2, color };
  switch (id) {
    // Agriculture
    case 'farms':
    case 'grain_mega_complex':
      return <Wheat {...props} />;
    case 'greenhouses':
    case 'commercial_greenhouse':
    case 'agri_research_center':
      return <Sprout {...props} />;
    case 'food_plant':
    case 'dairy_plant':
      return <Package {...props} />;
    case 'automated_farm_complex':
      return <Truck {...props} />;
    case 'aquaculture_hub':
      return <Fish {...props} />;
    // Industry
    case 'small_factory':
    case 'mfg_plant':
    case 'factories':
      return <Factory {...props} />;
    case 'textile_mills':
      return <ShoppingBag {...props} />;
    case 'steel_plants':
    case 'steel_complex':
    case 'heavy_industry':
      return <Hammer {...props} />;
    case 'auto_factory':
    case 'auto_mfg_plant':
      return <Truck {...props} />;
    case 'electronics_factory':
    case 'elec_mfg_plant':
      return <Cpu {...props} />;
    case 'pharma_factory':
      return <FlaskConical {...props} />;
    case 'robotics_facility':
      return <Bot {...props} />;
    case 'aerospace_works':
      return <PlaneTakeoff {...props} />;
    // Energy
    case 'solar_plants':
    case 'adv_solar_station':
      return <Sun {...props} />;
    case 'wind_farms':
    case 'offshore_wind':
      return <Wind {...props} />;
    case 'hydro_plant':
      return <Waves {...props} />;
    case 'nuclear_research_power':
      return <Atom {...props} />;
    case 'battery_mega_facility':
      return <BatteryCharging {...props} />;
    case 'geothermal_plant':
      return <Flame {...props} />;
    case 'power_stations':
      return <Zap {...props} />;
    // Infrastructure
    case 'roads':
    case 'highway_network':
    case 'mega_highway_interchange':
      return <Compass {...props} />;
    case 'railways':
    case 'hs_railway_station':
      return <TrainFront {...props} />;
    case 'ports':
    case 'deep_sea_port':
      return <Anchor {...props} />;
    case 'airports':
    case 'intl_airport_terminal':
      return <Plane {...props} />;
    case 'water_plant':
      return <Waves {...props} />;
    case 'logistics_center':
      return <Warehouse {...props} />;
    case 'telecom_center':
      return <Radio {...props} />;
    case 'smart_transit_hub':
      return <Bus {...props} />;
    // Residential
    case 'small_housing':
    case 'luxury_residences':
    case 'premium_housing':
    case 'affordable_housing':
      return <Home {...props} />;
    case 'eco_homes':
    case 'senior_living':
      return <Trees {...props} />;
    case 'apartments':
    case 'residential_towers':
    case 'smart_housing':
    case 'smart_apartments':
    case 'luxury_district':
      return <Building2 {...props} />;
    // Commercial
    case 'markets':
      return <Store {...props} />;
    case 'shopping_centers':
    case 'intl_mall':
    case 'luxury_boulevard':
      return <ShoppingCart {...props} />;
    case 'trading_tower':
      return <TrendingUp {...props} />;
    case 'biz_convention':
      return <Globe {...props} />;
    case 'business_districts':
    case 'corporate_tower':
    case 'corporate_plaza':
    case 'trade_center':
    case 'financial_center':
    case 'intl_hotel':
      return <Building2 {...props} />;
    // Technology
    case 'research_centers':
    case 'central_lab':
    case 'biotech_incubator':
      return <FlaskConical {...props} />;
    case 'tech_parks':
    case 'semiconductor_fab':
      return <Cpu {...props} />;
    case 'data_centers':
    case 'national_data_center':
      return <Database {...props} />;
    case 'ai_research_campus':
      return <Brain {...props} />;
    case 'cybersec_ops_center':
      return <ShieldCheck {...props} />;
    case 'quantum_lab':
      return <Orbit {...props} />;
    // Healthcare & Education
    case 'schools':
    case 'training_centers':
      return <BookIconFallback {...props} />;
    case 'hospitals':
    case 'adv_medical':
    case 'cancer_research_hospital':
      return <HeartPulse {...props} />;
    case 'specialist_healthcare':
    case 'medtech_institute':
      return <Stethoscope {...props} />;
    case 'universities':
    case 'national_medical_univ':
    case 'intl_edu_campus':
      return <GraduationCap {...props} />;
    // Public Services
    case 'police_hq':
    case 'public_safety_hq':
      return <Shield {...props} />;
    case 'fire_dept':
      return <Flame {...props} />;
    case 'emergency_response_center':
      return <Siren {...props} />;
    case 'water_management_facility':
      return <Droplets {...props} />;
    case 'govt_admin':
    case 'smart_govt_complex':
    case 'civic_admin_center':
      return <Landmark {...props} />;
    case 'transit_hub':
      return <Bus {...props} />;
    // Special
    case 'national_stadium':
      return <Trophy {...props} />;
    case 'national_bank':
      return <Banknote {...props} />;
    case 'convention_center':
    case 'intl_expo_complex':
    case 'world_trade_pavilion':
      return <Globe {...props} />;
    case 'grand_national_monument':
    case 'mega_innovation_district':
      return <Crown {...props} />;
    case 'intel_research_facility':
      return <Eye {...props} />;
    case 'space_center':
    case 'national_space_center':
      return <Rocket {...props} />;
    default:
      return <Building2 {...props} />;
  }
};

const BookIconFallback: React.FC<{ size: number; strokeWidth: number; color: string }> = (props) => (
  <School {...props} />
);

export const InfraIcon: React.FC<{ id: string; size?: number }> = ({ id, size = 24 }) => {
  const props = { size, strokeWidth: 2 };
  switch (id) {
    case 'parl':
      return <Landmark {...props} />;
    case 'gov':
      return <Building2 {...props} />;
    case 'hosp':
    case 'hospital':
      return <Hospital {...props} />;
    case 'sch':
    case 'school':
      return <School {...props} />;
    case 'road':
    case 'highway':
      return <Compass {...props} />;
    case 'hway':
      return <Wrench {...props} />;
    case 'bridge':
    case 'seawall_shield':
      return <Waves {...props} />;
    case 'spaceport':
      return <Rocket {...props} />;
    case 'fusion_grid':
      return <Atom {...props} />;
    case 'metro_loop':
      return <TrainFront {...props} />;
    case 'ai_corridor':
      return <Brain {...props} />;
    case 'trade_canal':
      return <Ship {...props} />;
    default:
      return <Landmark {...props} />;
  }
};

export const GovTypeIcon: React.FC<{ id: string; size?: number }> = ({ id, size = 18 }) => {
  const props = { size, strokeWidth: 2 };
  switch (id) {
    case 'tech':
      return <FlaskConical {...props} />;
    case 'wlf':
      return <HeartHandshake {...props} />;
    case 'ind':
      return <Factory {...props} />;
    default:
      return <Landmark {...props} />;
  }
};

export const BoosterIcon: React.FC<{ id: BoosterId | string; size?: number }> = ({ id, size = 24 }) => {
  const props = { size, strokeWidth: 2 };
  switch (id) {
    case 'prod_boost':
      return <Factory {...props} />;
    case 'income_boost':
      return <TrendingUp {...props} />;
    case 'build_speed_boost':
      return <Hammer {...props} />;
    case 'research_boost':
      return <FlaskConical {...props} />;
    case 'tax_boost':
      return <Coins {...props} />;
    case 'emp_boost':
      return <Briefcase {...props} />;
    case 'growth_boost':
      return <Rocket {...props} />;
    default:
      return <Zap {...props} />;
  }
};

export const PolicyCategoryIcon: React.FC<{ id: PolicyCategoryId | string; size?: number }> = ({ id, size = 18 }) => {
  const props = { size, strokeWidth: 2 };
  switch (id) {
    case 'p_tax':
      return <Coins {...props} />;
    case 'p_ind':
      return <Factory {...props} />;
    case 'p_agr':
      return <Wheat {...props} />;
    case 'p_edu':
      return <GraduationCap {...props} />;
    case 'p_hlth':
      return <HeartPulse {...props} />;
    case 'p_emp':
      return <Briefcase {...props} />;
    case 'p_trd':
    case 'p_mar':
      return <Anchor {...props} />;
    case 'p_nrg':
      return <Sun {...props} />;
    case 'p_inf':
      return <TrainFront {...props} />;
    case 'p_ai':
      return <Brain {...props} />;
    case 'p_fin':
      return <Banknote {...props} />;
    case 'p_def':
    case 'p_dig':
      return <ShieldCheck {...props} />;
    case 'p_env':
      return <Leaf {...props} />;
    case 'p_urb':
    case 'p_hou':
      return <Building2 {...props} />;
    case 'p_sci':
      return <FlaskConical {...props} />;
    case 'p_tou':
      return <Globe {...props} />;
    case 'p_res':
      return <Warehouse {...props} />;
    default:
      return <SlidersHorizontal {...props} />;
  }
};

export const SubIcon: React.FC<{ tier: SubscriptionTierId; size?: number }> = ({ tier, size = 24 }) => {
  if (tier === 'daily') return <Clock size={size} strokeWidth={2} />;
  if (tier === 'weekly') return <CalendarDays size={size} strokeWidth={2} />;
  return <Crown size={size} strokeWidth={2} />;
};

export const PolicyIcon: React.FC<{ k: string; size?: number }> = ({ k, size = 16 }) => {
  const props = { size, strokeWidth: 2 };
  switch (k) {
    case 'tax':
      return <Coins {...props} />;
    case 'fuel':
      return <Flame {...props} />;
    case 'carbon':
      return <Leaf {...props} />;
    case 'luxury':
      return <Gem {...props} />;
    case 'corp':
      return <Building2 {...props} />;
    case 'gst':
      return <ShoppingBag {...props} />;
    case 'prop':
      return <Landmark {...props} />;
    case 'duty':
      return <Anchor {...props} />;
    case 'tourism':
      return <Plane {...props} />;
    case 'digital':
      return <Cpu {...props} />;
    case 'wealth':
      return <Scale {...props} />;
    case 'wel':
      return <HeartPulse {...props} />;
    case 'edu':
      return <GraduationCap {...props} />;
    case 'rd':
      return <FlaskConical {...props} />;
    case 'green':
      return <Sun {...props} />;
    case 'transitSub':
      return <Bus {...props} />;
    default:
      return <SlidersHorizontal {...props} />;
  }
};

export const RankEmblem: React.FC<{ rank: number; size?: number; className?: string }> = ({
  rank,
  size = 24,
  className,
}) => {
  const safeRank = Math.max(1, Math.min(MAX_RANK, Math.floor(rank || 1)));
  const def = RANKS[safeRank] || RANKS[1];
  const color = def.c || '#94a3b8';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-label={def.n}
    >
      <title>{def.n}</title>
      <path
        d="M16 2.5L27 7.5v8.2c0 6.5-4.7 11.7-11 13.8C9.7 27.4 5 22.2 5 15.7V7.5L16 2.5z"
        fill="#19133a"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M16 5.5L24 9.2v6.3c0 4.9-3.4 8.9-8 10.6-4.6-1.7-8-5.7-8-10.6V9.2L16 5.5z"
        fill={color}
        fillOpacity="0.18"
      />
      {safeRank <= 3 && (
        <path
          d="M11 18l5-6.5L21 18l-5 3.2L11 18z"
          fill={color}
          stroke="#fff"
          strokeOpacity="0.55"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      )}
      {safeRank >= 4 && safeRank <= 6 && (
        <path
          d="M16 9l2.1 4.2 4.6.7-3.3 3.2.8 4.6-4.2-2.2-4.2 2.2.8-4.6-3.3-3.2 4.6-.7L16 9z"
          fill={color}
          stroke="#fff"
          strokeOpacity="0.6"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
      )}
      {safeRank >= 7 && safeRank <= 9 && (
        <>
          <circle cx="16" cy="15.5" r="5" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.6" />
          <path d="M16 10.5v10M11 15.5h10" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
      {safeRank >= 10 && safeRank <= 16 && (
        <path
          d="M9.5 19.5l1.5-7 3.5 3 1.5-5 1.5 5 3.5-3 1.5 7h-13z"
          fill={color}
          stroke="#fff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      )}
      {safeRank >= 17 && (
        <>
          <circle cx="16" cy="15.5" r="7.2" stroke={color} strokeOpacity="0.65" strokeWidth="1.1" strokeDasharray="2 2" />
          <path
            d="M9.5 19.5l1.5-7 3.5 3 1.5-5 1.5 5 3.5-3 1.5 7h-13z"
            fill={color}
            stroke="#fff"
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="8.5" r="1.4" fill="#fff" />
        </>
      )}
    </svg>
  );
};

function stickerIconElement(id: string, color: string, size: number) {
  const props = { size, strokeWidth: 2, color };
  switch (id) {
    case 'bee':
    case 'ant':
      return <Sprout {...props} />;
    case 'crab':
    case 'octo':
      return <Waves {...props} />;
    case 'ram':
    case 'bull':
      return <TrendingUp {...props} />;
    case 'bear':
      return <Shield {...props} />;
    case 'camel':
    case 'horse':
      return <Compass {...props} />;
    case 'wolf':
    case 'fox':
      return <Dog {...props} />;
    case 'mouse':
    case 'rabbit':
      return <Rabbit {...props} />;
    case 'frog':
      return <Leaf {...props} />;
    case 'lion':
    case 'tiger':
      return <Award {...props} />;
    case 'falcon':
    case 'owl':
    case 'peacock':
      return <Bird {...props} />;
    case 'shark':
    case 'whale':
      return <Fish {...props} />;
    case 'ele':
      return <Factory {...props} />;
    case 'panda':
      return <HeartHandshake {...props} />;
    case 'gor':
      return <Award {...props} />;
    case 'dragon':
      return <Flame {...props} />;
    case 'phoenix':
      return <Feather {...props} />;
    case 'uni':
      return <Sparkles {...props} />;
    case 'crown':
      return <Crown {...props} />;
    case 'rocket':
      return <Rocket {...props} />;
    case 'dia':
      return <Gem {...props} />;
    case 'turtle':
      return <Turtle {...props} />;
    case 'dove':
      return <Bird {...props} />;
    case 'pegasus':
      return <Feather {...props} />;
    case 'sphinx':
      return <Landmark {...props} />;
    case 'atlas':
      return <Globe {...props} />;
    case 'nebula':
    case 'qubit':
      return <Orbit {...props} />;
    case 'scepter':
    case 'throne':
    case 'tiara':
      return <Crown {...props} />;
    case 'sigil':
    case 'aegis':
      return <ShieldCheck {...props} />;
    case 'bullion':
    case 'ledger':
      return <Coins {...props} />;
    case 'vault_key':
    case 'penthouse':
      return <Building2 {...props} />;
    case 'ticker':
      return <Bell {...props} />;
    case 'arch':
    case 'torch':
      return <Landmark {...props} />;
    case 'olive':
      return <Leaf {...props} />;
    case 'chip':
      return <Cpu {...props} />;
    case 'neural':
      return <Brain {...props} />;
    case 'drone':
    case 'shuttle':
    case 'lunar_base':
    case 'mars_rover':
    case 'rx_rocket_launch':
      return <Rocket {...props} />;
    case 'wings':
      return <PlaneTakeoff {...props} />;
    case 'compass':
    case 'comet':
      return <Compass {...props} />;
    case 'yacht':
      return <Ship {...props} />;
    case 'chronograph':
      return <Clock {...props} />;
    case 'champagne':
    case 'rx_spark':
    case 'rx_applause':
      return <Sparkles {...props} />;
    case 'laurel':
      return <Trophy {...props} />;
    case 'eternal_star':
    case 'v2_horizon_seal':
      return <Star {...props} />;
    case 'rx_boom':
      return <Flame {...props} />;
    case 'v2_founder_prism':
      return <Gem {...props} />;
    default:
      return <Star {...props} />;
  }
}

export const StickerArt: React.FC<{ id: string; size?: number }> = ({ id, size = 34 }) => {
  const def = STICKERS.find((s) => s.id === id);
  const rarity = def?.r || 1;
  const [, color] = RARITY_META[rarity];

  return (
    <span
      className="stk-badge"
      style={{
        width: size + 16,
        height: size + 16,
        borderRadius: 16,
        display: 'inline-grid',
        placeItems: 'center',
        background: `radial-gradient(circle at 30% 25%, ${color}44, ${color}14 70%, #171238)`,
        border: `1.5px solid ${color}88`,
        boxShadow: rarity === 3 ? `0 0 14px ${color}44` : undefined,
      }}
      aria-hidden="true"
    >
      {stickerIconElement(id, color, size * 0.72)}
    </span>
  );
};

export const CountryFlag: React.FC<{
  code?: string;
  alt?: string;
  large?: boolean;
  className?: string;
}> = ({ code, alt, large = false, className = 'flagimg' }) => {
  const [failed, setFailed] = useState(false);
  const clean = sanitizeCountryCode(code);
  const src = clean ? (large ? flagLargeUrl(clean) : flagUrl(clean)) : '';

  if (!src || failed) {
    return (
      <span
        className={className}
        style={{
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(135deg, #3b3180, #231a54)',
          color: '#d9d0ff',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.04em',
        }}
        title={alt || clean || 'Nation'}
      >
        {clean || <Globe size={14} />}
      </span>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt || clean}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
};

export const NotifIcon: React.FC<{ type: NotificationItem['type']; size?: number }> = ({ type, size = 18 }) => {
  switch (type) {
    case 'dm':
      return <Mail size={size} color="#5ccbff" />;
    case 'new_offer':
      return <Gift size={size} color="#ffc23d" />;
    case 'accepted':
      return <CheckCircle2 size={size} color="#3fe0b0" />;
    case 'rejected':
      return <Shield size={size} color="#ff6fa5" />;
    default:
      return <Clock size={size} color="#b9afe2" />;
  }
};

export {
  Activity,
  Award,
  Banknote,
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cloud,
  Coins,
  Compass,
  Cpu,
  Crown,
  Eye,
  Factory,
  Flame,
  FlaskConical,
  Gem,
  Gift,
  Globe,
  Hammer,
  HeartPulse,
  Home,
  IdCard,
  Landmark,
  Layers,
  Lock,
  Mail,
  MessageSquare,
  Package,
  Palette,
  RefreshCw,
  Rocket,
  Search,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Smile,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Users,
  Volume2,
  Vote,
  Waves,
  Wheat,
  Wrench,
  X,
  Zap,
};
