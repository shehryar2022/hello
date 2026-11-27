import React, { memo, useId, useState } from 'react';
import {
  Activity,
  Anchor,
  Award,
  Banknote,
  BarChart3,
  Bell,
  Bird,
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
  Dog,
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
  Leaf,
  Lock,
  Mail,
  MessageSquare,
  Orbit,
  Package,
  Plane,
  Rabbit,
  Radio,
  RefreshCw,
  Rocket,
  Scale,
  School,
  Search,
  Server,
  Shield,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Smile,
  Smartphone,
  Sparkles,
  Sprout,
  Star,
  Store,
  Sun,
  Target,
  TrainFront,
  Trash2,
  TrendingUp,
  Trophy,
  Truck,
  Turtle,
  Users,
  Volume2,
  Vote,
  Waves,
  Wheat,
  Wind,
  Wrench,
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
      return <Wheat {...props} />;
    case 'greenhouses':
      return <Sprout {...props} />;
    case 'food_plant':
      return <Package {...props} />;
    // Industry
    case 'small_factory':
    case 'mfg_plant':
    case 'factories':
      return <Factory {...props} />;
    case 'textile_mills':
      return <ShoppingBag {...props} />;
    case 'steel_plants':
    case 'heavy_industry':
      return <Hammer {...props} />;
    case 'auto_factory':
      return <Truck {...props} />;
    case 'electronics_factory':
      return <Cpu {...props} />;
    // Energy
    case 'solar_plants':
      return <Sun {...props} />;
    case 'wind_farms':
      return <Wind {...props} />;
    case 'power_stations':
      return <Zap {...props} />;
    // Infrastructure
    case 'roads':
    case 'highway_network':
      return <Compass {...props} />;
    case 'railways':
      return <TrainFront {...props} />;
    case 'ports':
      return <Anchor {...props} />;
    case 'airports':
      return <Plane {...props} />;
    case 'water_plant':
      return <Waves {...props} />;
    case 'logistics_center':
      return <Truck {...props} />;
    case 'telecom_center':
      return <Radio {...props} />;
    // Residential
    case 'small_housing':
    case 'luxury_residences':
      return <Home {...props} />;
    case 'apartments':
    case 'residential_towers':
    case 'smart_housing':
      return <Building2 {...props} />;
    // Commercial
    case 'markets':
      return <Store {...props} />;
    case 'shopping_centers':
      return <ShoppingCart {...props} />;
    case 'business_districts':
    case 'corporate_tower':
    case 'trade_center':
    case 'financial_center':
    case 'intl_hotel':
      return <Building2 {...props} />;
    // Technology
    case 'research_centers':
    case 'central_lab':
      return <FlaskConical {...props} />;
    case 'tech_parks':
      return <Cpu {...props} />;
    case 'data_centers':
      return <Server {...props} />;
    // Healthcare & Education
    case 'schools':
    case 'training_centers':
      return <BookIconFallback {...props} />;
    case 'hospitals':
    case 'adv_medical':
      return <HeartPulse {...props} />;
    case 'universities':
      return <GraduationCap {...props} />;
    // Public Services
    case 'police_hq':
      return <Shield {...props} />;
    case 'fire_dept':
      return <Flame {...props} />;
    case 'govt_admin':
      return <Landmark {...props} />;
    case 'transit_hub':
      return <Bus {...props} />;
    // Special
    case 'national_stadium':
      return <Trophy {...props} />;
    case 'national_bank':
      return <Banknote {...props} />;
    case 'convention_center':
      return <Globe {...props} />;
    case 'space_center':
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
      return <Waves {...props} />;
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
      return <Anchor {...props} />;
    case 'p_nrg':
      return <Sun {...props} />;
    case 'p_inf':
      return <TrainFront {...props} />;
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
      {safeRank >= 10 && (
        <path
          d="M9.5 19.5l1.5-7 3.5 3 1.5-5 1.5 5 3.5-3 1.5 7h-13z"
          fill={color}
          stroke="#fff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
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
      return <Orbit {...props} />;
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
  Lock,
  Mail,
  MessageSquare,
  Package,
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
  Zap,
};
