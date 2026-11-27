import { MIN_RANK } from './constants';
import type {
  CosmeticBundleDef,
  CosmeticCategory,
  CosmeticItemDef,
  CosmeticRarity,
  DiamondAssetDef,
  EquippedCosmetics,
  GameState,
  GameThemeId,
} from './types';

export const PROFILE_FRAMES: CosmeticItemDef[] = [
  {
    id: 'frame_neon',
    name: 'Neon Glow Frame',
    category: 'profile_effect',
    rarity: 'Rare',
    diamondsCost: 12,
    previewTag: 'Cyber Pulse',
    icon: '💠',
    desc: 'Crisp electric cyan-violet neon rim with soft outer halo.',
    accentColor: '#3fd2ff',
    secondaryColor: '#a855f7',
  },
  {
    id: 'frame_rainbow',
    name: 'Rainbow Animated Frame',
    category: 'profile_effect',
    rarity: 'Epic',
    diamondsCost: 18,
    previewTag: 'Prismatic Loop',
    icon: '🌈',
    desc: 'Continuously rotating full-spectrum chromatic ring.',
    accentColor: '#ff4ecd',
    secondaryColor: '#37e6a0',
  },
  {
    id: 'frame_galaxy',
    name: 'Galaxy Orbit Frame',
    category: 'profile_effect',
    rarity: 'Epic',
    diamondsCost: 22,
    previewTag: 'Deep Nebula',
    icon: '🌌',
    desc: 'Starfield indigo-magenta orbital shimmer around your avatar.',
    accentColor: '#9b6dff',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'frame_aurora',
    name: 'Aurora Borealis Frame',
    category: 'profile_effect',
    rarity: 'Epic',
    diamondsCost: 24,
    previewTag: 'Polar Wave',
    icon: '✨',
    desc: 'Flowing emerald, teal, and violet polar light curtains.',
    accentColor: '#37e6a0',
    secondaryColor: '#22d3ee',
  },
  {
    id: 'frame_lightning',
    name: 'Electric Lightning Frame',
    category: 'profile_effect',
    rarity: 'Legendary',
    diamondsCost: 34,
    reqRank: 3,
    previewTag: 'Storm Arc',
    icon: '⚡',
    desc: 'High-voltage crackling plasma border with surge flashes.',
    accentColor: '#60a5fa',
    secondaryColor: '#facc15',
  },
  {
    id: 'frame_royal_gold',
    name: 'Royal Gold Frame',
    category: 'profile_effect',
    rarity: 'Legendary',
    diamondsCost: 38,
    coinsCost: 250_000,
    reqRank: 4,
    previewTag: 'Imperial Crest',
    icon: '👑',
    desc: 'Burnished 24K sovereign gold filigree with warm luster.',
    accentColor: '#ffc93c',
    secondaryColor: '#f59e0b',
  },
  {
    id: 'frame_holographic',
    name: 'Holographic Prism Frame',
    category: 'profile_effect',
    rarity: 'Legendary',
    diamondsCost: 42,
    previewTag: 'Iridescent',
    icon: '🪩',
    desc: 'Refractive holographic foil rim that shifts hues smoothly.',
    accentColor: '#67e8f9',
    secondaryColor: '#f472b6',
  },
  {
    id: 'frame_diamond_crystal',
    name: 'Diamond Crystal Frame',
    category: 'profile_effect',
    rarity: 'Legendary',
    diamondsCost: 46,
    coinsCost: 400_000,
    reqRank: 4,
    previewTag: 'Faceted Gleam',
    icon: '💎',
    desc: 'Ice-cut crystalline facets radiating diamond glint.',
    accentColor: '#7ee8ff',
    secondaryColor: '#e0f2fe',
  },
  {
    id: 'frame_legendary',
    name: 'Legendary Sovereign Frame',
    category: 'profile_effect',
    rarity: 'Legendary',
    diamondsCost: 62,
    coinsCost: 1_000_000,
    reqRank: 5,
    previewTag: 'Apex Crown',
    icon: '🔥',
    desc: 'Solar gold & cosmic violet double-halo with animated crest.',
    accentColor: '#fbbf24',
    secondaryColor: '#c084fc',
  },
  {
    id: 'frame_seasonal',
    name: 'Solstice Celebration Frame',
    category: 'profile_effect',
    rarity: 'Exclusive',
    diamondsCost: 54,
    previewTag: 'Seasonal Drop',
    icon: '🎆',
    desc: 'Limited seasonal celebration ring with rose-gold starlight.',
    accentColor: '#fb7185',
    secondaryColor: '#fde047',
    limitedLabel: 'Seasonal Exclusive',
  },
];

export const NAME_EFFECTS: CosmeticItemDef[] = [
  {
    id: 'nfx_animated_grad',
    name: 'Animated Gradient Name',
    category: 'name_effect',
    rarity: 'Rare',
    diamondsCost: 12,
    previewTag: 'Silky Flow',
    icon: '🌊',
    desc: 'Smooth ocean-to-amethyst flowing gradient nameplate.',
    accentColor: '#3fd2ff',
    secondaryColor: '#a56bff',
  },
  {
    id: 'nfx_rainbow',
    name: 'Rainbow Spectrum Name',
    category: 'name_effect',
    rarity: 'Epic',
    diamondsCost: 16,
    previewTag: 'Prism Type',
    icon: '🌈',
    desc: 'Vibrant gliding rainbow spectrum lettering across chat & ranks.',
    accentColor: '#f472b6',
    secondaryColor: '#37e6a0',
  },
  {
    id: 'nfx_neon',
    name: 'Neon Glow Name',
    category: 'name_effect',
    rarity: 'Epic',
    diamondsCost: 18,
    previewTag: 'Cyber Lit',
    icon: '💠',
    desc: 'Crisp luminous cyan nameplate with soft neon text bloom.',
    accentColor: '#22d3ee',
    secondaryColor: '#818cf8',
  },
  {
    id: 'nfx_electric',
    name: 'Electric Surge Name',
    category: 'name_effect',
    rarity: 'Epic',
    diamondsCost: 24,
    previewTag: 'High Voltage',
    icon: '⚡',
    desc: 'Cobalt and lightning-gold shimmer across your leader name.',
    accentColor: '#60a5fa',
    secondaryColor: '#fde047',
  },
  {
    id: 'nfx_royal_gold',
    name: 'Royal Gold Name',
    category: 'name_effect',
    rarity: 'Legendary',
    diamondsCost: 30,
    coinsCost: 200_000,
    reqRank: 3,
    previewTag: 'Sovereign Ink',
    icon: '👑',
    desc: 'Metallic gold foil sweep reserved for distinguished leaders.',
    accentColor: '#ffc93c',
    secondaryColor: '#fef08a',
  },
  {
    id: 'nfx_holographic',
    name: 'Holographic Shimmer Name',
    category: 'name_effect',
    rarity: 'Legendary',
    diamondsCost: 36,
    previewTag: 'Holo Sheen',
    icon: '🪩',
    desc: 'Pearl-iridescent pastel shine visible across every leaderboard.',
    accentColor: '#a5f3fc',
    secondaryColor: '#f9a8d4',
  },
  {
    id: 'nfx_diamond',
    name: 'Diamond Shine Name',
    category: 'name_effect',
    rarity: 'Legendary',
    diamondsCost: 42,
    coinsCost: 350_000,
    reqRank: 4,
    previewTag: 'Crystal Spark',
    icon: '💎',
    desc: 'Faceted ice-diamond text glint with subtle specular sweep.',
    accentColor: '#7ee8ff',
    secondaryColor: '#ffffff',
  },
  {
    id: 'nfx_legendary',
    name: 'Legendary Aura Name',
    category: 'name_effect',
    rarity: 'Exclusive',
    diamondsCost: 56,
    coinsCost: 900_000,
    reqRank: 5,
    previewTag: 'Grand Master',
    icon: '⚜️',
    desc: 'Imperial gold-violet gradient with radiant aura glow.',
    accentColor: '#fbbf24',
    secondaryColor: '#e879f9',
    limitedLabel: 'Prestige Tier',
  },
];

export const THEME_ITEMS: CosmeticItemDef[] = [
  {
    id: 'theme_midnight_galaxy',
    name: 'Midnight Galaxy',
    category: 'theme',
    rarity: 'Rare',
    diamondsCost: 0,
    themeId: 'midnight_galaxy',
    isDefaultFree: true,
    previewTag: 'Classic Default',
    icon: '🌌',
    desc: 'Signature deep-space indigo & royal violet command interface.',
    accentColor: '#9b6dff',
    secondaryColor: '#3fd2ff',
  },
  {
    id: 'theme_ocean_blue',
    name: 'Ocean Blue',
    category: 'theme',
    rarity: 'Rare',
    diamondsCost: 14,
    themeId: 'ocean_blue',
    previewTag: 'Deep Marine',
    icon: '🌊',
    desc: 'Abyssal sapphire surfaces with crisp aqua maritime highlights.',
    accentColor: '#38bdf8',
    secondaryColor: '#2dd4bf',
  },
  {
    id: 'theme_cyber_neon',
    name: 'Cyber Neon',
    category: 'theme',
    rarity: 'Rare',
    diamondsCost: 16,
    themeId: 'cyber_neon',
    previewTag: 'Synth Grid',
    icon: '⚡',
    desc: 'High-contrast obsidian slate accented by neon magenta & cyan.',
    accentColor: '#00e5ff',
    secondaryColor: '#ff3dc8',
  },
  {
    id: 'theme_dark_luxury',
    name: 'Dark Luxury',
    category: 'theme',
    rarity: 'Epic',
    diamondsCost: 22,
    themeId: 'dark_luxury',
    previewTag: 'Obsidian Silk',
    icon: '🖤',
    desc: 'Ultra-clean carbon charcoal panels with warm champagne trim.',
    accentColor: '#e2c275',
    secondaryColor: '#94a3b8',
  },
  {
    id: 'theme_aurora_nights',
    name: 'Aurora Nights',
    category: 'theme',
    rarity: 'Epic',
    diamondsCost: 24,
    themeId: 'aurora_nights',
    previewTag: 'Nordic Sky',
    icon: '🌠',
    desc: 'Subarctic midnight slate illuminated by emerald aurora gradients.',
    accentColor: '#34d399',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'theme_emerald_kingdom',
    name: 'Emerald Kingdom',
    category: 'theme',
    rarity: 'Epic',
    diamondsCost: 25,
    themeId: 'emerald_kingdom',
    previewTag: 'Jade Reserve',
    icon: '💚',
    desc: 'Rich forest-emerald surfaces paired with gilded mint accents.',
    accentColor: '#10b981',
    secondaryColor: '#fbbf24',
  },
  {
    id: 'theme_crimson_empire',
    name: 'Crimson Empire',
    category: 'theme',
    rarity: 'Epic',
    diamondsCost: 26,
    themeId: 'crimson_empire',
    previewTag: 'Imperial Ruby',
    icon: '❤️',
    desc: 'Velvet garnet command panels with fiery amber & ruby highlights.',
    accentColor: '#fb7185',
    secondaryColor: '#f59e0b',
  },
  {
    id: 'theme_sunset_paradise',
    name: 'Sunset Paradise',
    category: 'theme',
    rarity: 'Exclusive',
    diamondsCost: 28,
    themeId: 'sunset_paradise',
    previewTag: 'Golden Dusk',
    icon: '🌅',
    desc: 'Warm twilight plum glasswork with tangerine & coral twilight hues.',
    accentColor: '#fb923c',
    secondaryColor: '#f472b6',
    limitedLabel: 'Scenic Edition',
  },
  {
    id: 'theme_royal_gold',
    name: 'Royal Gold',
    category: 'theme',
    rarity: 'Legendary',
    diamondsCost: 34,
    coinsCost: 300_000,
    themeId: 'royal_gold',
    previewTag: 'Sovereign Vault',
    icon: '👑',
    desc: 'Deep royal obsidian adorned with radiant sovereign gold trim.',
    accentColor: '#ffc93c',
    secondaryColor: '#f59e0b',
  },
  {
    id: 'theme_diamond_crystal',
    name: 'Diamond Crystal',
    category: 'theme',
    rarity: 'Legendary',
    diamondsCost: 38,
    coinsCost: 450_000,
    themeId: 'diamond_crystal',
    previewTag: 'Crystalline Ice',
    icon: '💎',
    desc: 'Frosted glacier-navy surfaces with brilliant diamond-cyan facets.',
    accentColor: '#7ee8ff',
    secondaryColor: '#a5b4fc',
  },
];

export const PREMIUM_ANIMATIONS: CosmeticItemDef[] = [
  {
    id: 'anim_soft_glow',
    name: 'Soft Ambient Glow',
    category: 'animation',
    rarity: 'Basic',
    diamondsCost: 55,
    previewTag: 'Gentle Pulse',
    icon: '🕯️',
    desc: 'Adds a clean, soothing atmospheric glow around your Commander Profile card.',
    accentColor: '#94a3b8',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'anim_ripple_veil',
    name: 'Horizon Silk Shimmer',
    category: 'animation',
    rarity: 'Basic',
    diamondsCost: 85,
    previewTag: 'Silk Sweep',
    icon: '🌊',
    desc: 'Brushes a subtle horizon light sweep across your identity header & badges.',
    accentColor: '#38bdf8',
    secondaryColor: '#67e8f9',
  },
  {
    id: 'anim_backdrop',
    name: 'Profile Backdrop Aura',
    category: 'animation',
    rarity: 'Uncommon',
    diamondsCost: 115,
    previewTag: 'Ambient Halo',
    icon: '🌀',
    desc: 'Enriches your Executive Header & Profile cards with an animated dual-tone aura halo.',
    accentColor: '#818cf8',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'anim_pulse_grid',
    name: 'Cyber Pulse Trim',
    category: 'animation',
    rarity: 'Uncommon',
    diamondsCost: 140,
    previewTag: 'Harmonic Frame',
    icon: '💠',
    desc: 'Synchronizes a rhythmic cybernetic edge pulse around your command identity.',
    accentColor: '#34d399',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'anim_borders',
    name: 'Glowing Card Borders',
    category: 'animation',
    rarity: 'Rare',
    diamondsCost: 175,
    reqRank: 2,
    previewTag: 'Luminance Trim',
    icon: '✨',
    desc: 'Projects a traveling crystalline luminance beam along your command card perimeter.',
    accentColor: '#3fd2ff',
    secondaryColor: '#c084fc',
  },
  {
    id: 'anim_sparkles',
    name: 'Floating Diamond Sparkles',
    category: 'animation',
    rarity: 'Epic',
    diamondsCost: 235,
    reqRank: 2,
    previewTag: 'Starlight Drift',
    icon: '💎',
    desc: 'Suspends rising crystalline starlight facets across your profile & showcase banner.',
    accentColor: '#7ee8ff',
    secondaryColor: '#fde047',
  },
  {
    id: 'anim_aurora_curtain',
    name: 'Aurora Borealis Curtain',
    category: 'animation',
    rarity: 'Epic',
    diamondsCost: 285,
    reqRank: 3,
    previewTag: 'Polar Ribbons',
    icon: '🌌',
    desc: 'Drapes shimmering multi-band polar aurora ribbons over your Sovereign Identity.',
    accentColor: '#2dd4bf',
    secondaryColor: '#a855f7',
  },
  {
    id: 'anim_celebration',
    name: 'Imperial Unlock Fanfare',
    category: 'animation',
    rarity: 'Legendary',
    diamondsCost: 355,
    reqRank: 4,
    previewTag: 'Celebration FX',
    icon: '🎆',
    desc: 'Illuminates your card with golden crown rays & upgrades unlock celebrations with prism confetti.',
    accentColor: '#ffc93c',
    secondaryColor: '#f472b6',
  },
  {
    id: 'anim_celestial_orbit',
    name: 'Celestial Starlight Orbit',
    category: 'animation',
    rarity: 'Mythic',
    diamondsCost: 465,
    reqRank: 5,
    previewTag: 'Astral Rings',
    icon: '🪐',
    desc: 'Surrounds your avatar & profile showcase with counter-rotating mythic orbital rings and star flares.',
    accentColor: '#f472b6',
    secondaryColor: '#7ee8ff',
  },
  {
    id: 'anim_sovereign_nova',
    name: 'Sovereign Diamond Nova',
    category: 'animation',
    rarity: 'Ultra Exclusive',
    diamondsCost: 585,
    reqRank: 6,
    previewTag: 'Apex Prism FX',
    icon: '👑',
    desc: 'Apex multi-layered prismatic supernova aura, crystalline lattice & diamond stardust cascade.',
    accentColor: '#fde047',
    secondaryColor: '#fb7185',
    limitedLabel: 'Apex FX',
  },
];

export const EXCLUSIVE_BADGES: CosmeticItemDef[] = [
  {
    id: 'badge_diamond_member',
    name: 'Diamond Member',
    category: 'badge',
    rarity: 'Rare',
    diamondsCost: 15,
    previewTag: 'Diamond Crest',
    icon: '💎',
    desc: 'Displays the official Diamond Member insignia beside your name.',
    accentColor: '#7ee8ff',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'badge_royal_member',
    name: 'Royal Member',
    category: 'badge',
    rarity: 'Epic',
    diamondsCost: 24,
    previewTag: 'Crown Seal',
    icon: '👑',
    desc: 'Marks your nation with the Royal Sovereign crest across rankings & chat.',
    accentColor: '#ffc93c',
    secondaryColor: '#f59e0b',
  },
  {
    id: 'badge_legendary_builder',
    name: 'Legendary Builder',
    category: 'badge',
    rarity: 'Epic',
    diamondsCost: 26,
    reqRank: 3,
    previewTag: 'Master Architect',
    icon: '🏗️',
    desc: 'Honors monumental skyline mastery in Leaderboard & Player Cards.',
    accentColor: '#37e6a0',
    secondaryColor: '#3fd2ff',
  },
  {
    id: 'badge_elite_governor',
    name: 'Elite Governor',
    category: 'badge',
    rarity: 'Legendary',
    diamondsCost: 34,
    reqRank: 4,
    previewTag: 'High Council',
    icon: '🏛️',
    desc: 'Prestigious governance seal for high-approval statesmen.',
    accentColor: '#c084fc',
    secondaryColor: '#f472b6',
  },
  {
    id: 'badge_galaxy_explorer',
    name: 'Galaxy Explorer',
    category: 'badge',
    rarity: 'Legendary',
    diamondsCost: 38,
    previewTag: 'Astral Voyager',
    icon: '🌌',
    desc: 'Star-charted emblem shining on Global Chat & profile showcases.',
    accentColor: '#818cf8',
    secondaryColor: '#22d3ee',
  },
  {
    id: 'badge_premium_founder',
    name: 'Premium Founder',
    category: 'badge',
    rarity: 'Exclusive',
    diamondsCost: 58,
    coinsCost: 800_000,
    reqRank: 6,
    previewTag: 'Founder Vault',
    icon: '⚜️',
    desc: 'Collector-grade gilded fleur-de-lis reserved for Apex Founders.',
    accentColor: '#fde047',
    secondaryColor: '#e879f9',
    limitedLabel: 'Collector Crest',
  },
];

export const DIAMOND_ASSETS: DiamondAssetDef[] = [
  {
    id: 'asset_aurora_obelisk',
    name: 'Aurora Cultural Obelisk',
    category: 'diamond_asset',
    rarity: 'Epic',
    diamondsCost: 26,
    coinsCost: 120_000,
    previewTag: '3D Landmark · +1.5% Inc',
    icon: '🗼',
    desc: 'Luminous crystalline obelisk erected in your 3D capital plaza (+1.5% Income, +1.5 Happiness).',
    accentColor: '#37e6a0',
    secondaryColor: '#38bdf8',
    incomePctBonus: 1.5,
    hapBonus: 1.5,
    tradeBonusPct: 0,
  },
  {
    id: 'asset_royal_fleet',
    name: 'Sovereign Prestige Arch',
    category: 'diamond_asset',
    rarity: 'Exclusive',
    diamondsCost: 32,
    coinsCost: 220_000,
    previewTag: '3D Monument · +4% Trade',
    icon: '⛩️',
    desc: 'Ceremonial triumphal avenue boosting global trade prestige in 3D (+4% Trade Export, +1.0 Happiness).',
    accentColor: '#ffc93c',
    secondaryColor: '#fb7185',
    incomePctBonus: 1.0,
    hapBonus: 1.0,
    tradeBonusPct: 4,
    limitedLabel: 'Dual Currency',
  },
  {
    id: 'asset_diamond_spire',
    name: 'Diamond Sovereign Spire',
    category: 'diamond_asset',
    rarity: 'Legendary',
    diamondsCost: 45,
    coinsCost: 500_000,
    reqRank: 3,
    previewTag: '3D Wonder · +2% Inc',
    icon: '💎',
    desc: 'Faceted crystalline skyscraper crowning your 3D skyline (+2.0% Income, +1.5 Happiness).',
    accentColor: '#7ee8ff',
    secondaryColor: '#9b6dff',
    incomePctBonus: 2.0,
    hapBonus: 1.5,
    tradeBonusPct: 2,
  },
  {
    id: 'asset_crystal_vault',
    name: 'Crystal Exchange Pavilion',
    category: 'diamond_asset',
    rarity: 'Legendary',
    diamondsCost: 56,
    coinsCost: 1_200_000,
    reqRank: 5,
    previewTag: '3D Citadel · +2.5% Inc',
    icon: '🏛️',
    desc: 'Grand diamond-domed reserve pavilion anchored in your 3D capital (+2.5% Income, +1.0 Happiness).',
    accentColor: '#c084fc',
    secondaryColor: '#7ee8ff',
    incomePctBonus: 2.5,
    hapBonus: 1.0,
    tradeBonusPct: 3,
  },
];

export const ALL_COSMETIC_ITEMS: CosmeticItemDef[] = [
  ...PROFILE_FRAMES,
  ...NAME_EFFECTS,
  ...THEME_ITEMS,
  ...PREMIUM_ANIMATIONS,
  ...EXCLUSIVE_BADGES,
  ...DIAMOND_ASSETS,
];

export const COSMETIC_BY_ID = new Map<string, CosmeticItemDef>(
  ALL_COSMETIC_ITEMS.map((item) => [item.id, item]),
);

export const VALID_COSMETIC_ID_SET = new Set<string>(ALL_COSMETIC_ITEMS.map((i) => i.id));
export const VALID_THEME_ID_SET = new Set<GameThemeId>(
  THEME_ITEMS.map((t) => t.themeId!).filter(Boolean),
);

export const COSMETIC_BUNDLES: CosmeticBundleDef[] = [
  {
    id: 'bundle_cyber_horizon',
    name: 'Cyber Neon Suite',
    rarity: 'Epic',
    diamondsCost: 155,
    itemIds: ['frame_neon', 'nfx_neon', 'theme_cyber_neon', 'anim_borders'],
    badgeText: 'Save 30%',
    desc: 'Neon Glow Frame, Neon Name Effect, Cyber Neon Theme & Glowing Borders.',
    accentColor: '#00e5ff',
    secondaryColor: '#ff3dc8',
  },
  {
    id: 'bundle_galaxy_sovereign',
    name: 'Midnight Cosmos Collection',
    rarity: 'Legendary',
    diamondsCost: 68,
    itemIds: ['frame_galaxy', 'nfx_animated_grad', 'badge_galaxy_explorer', 'theme_aurora_nights'],
    badgeText: 'Best Value',
    desc: 'Galaxy Frame, Animated Gradient Name, Galaxy Explorer Badge & Aurora Nights Theme.',
    accentColor: '#9b6dff',
    secondaryColor: '#34d399',
  },
  {
    id: 'bundle_royal_imperial',
    name: 'Imperial Gold Collection',
    rarity: 'Legendary',
    diamondsCost: 92,
    coinsCost: 400_000,
    itemIds: ['frame_royal_gold', 'nfx_royal_gold', 'badge_royal_member', 'theme_royal_gold'],
    badgeText: 'Royal Vault',
    desc: 'Complete 24K Royal Gold identity set: Frame, Name Effect, Badge & Royal Gold Theme.',
    accentColor: '#ffc93c',
    secondaryColor: '#f59e0b',
  },
  {
    id: 'bundle_diamond_prestige',
    name: 'Diamond Prestige Vault',
    rarity: 'Exclusive',
    diamondsCost: 265,
    coinsCost: 750_000,
    itemIds: [
      'frame_diamond_crystal',
      'nfx_diamond',
      'badge_diamond_member',
      'theme_diamond_crystal',
      'anim_sparkles',
    ],
    badgeText: 'Flagship Set',
    desc: 'Signature crystalline collection with Diamond Frame, Name, Badge, Theme & Sparkles.',
    accentColor: '#7ee8ff',
    secondaryColor: '#c084fc',
  },
];

export const RARITY_COLORS: Record<CosmeticRarity, { text: string; border: string; bg: string }> = {
  Basic: {
    text: '#cbd5e1',
    border: 'rgba(148, 163, 184, 0.4)',
    bg: 'rgba(148, 163, 184, 0.14)',
  },
  Uncommon: {
    text: '#6ee7b7',
    border: 'rgba(52, 211, 153, 0.45)',
    bg: 'rgba(52, 211, 153, 0.14)',
  },
  Rare: {
    text: '#67e8f9',
    border: 'rgba(63, 210, 255, 0.48)',
    bg: 'rgba(63, 210, 255, 0.15)',
  },
  Epic: {
    text: '#d8b4fe',
    border: 'rgba(168, 85, 247, 0.52)',
    bg: 'rgba(168, 85, 247, 0.17)',
  },
  Legendary: {
    text: '#fde047',
    border: 'rgba(255, 201, 60, 0.58)',
    bg: 'rgba(255, 201, 60, 0.17)',
  },
  Mythic: {
    text: '#f9a8d4',
    border: 'rgba(244, 114, 182, 0.6)',
    bg: 'rgba(236, 72, 153, 0.18)',
  },
  Exclusive: {
    text: '#fda4af',
    border: 'rgba(251, 113, 133, 0.58)',
    bg: 'rgba(251, 113, 133, 0.18)',
  },
  'Ultra Exclusive': {
    text: '#fef08a',
    border: 'rgba(250, 204, 21, 0.72)',
    bg: 'rgba(245, 158, 11, 0.22)',
  },
};

export function raritySlug(rarity: CosmeticRarity): string {
  return rarity.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function getCosmeticDef(id?: string): CosmeticItemDef | undefined {
  if (!id) return undefined;
  return COSMETIC_BY_ID.get(id);
}

export function getOwnedCosmeticsSet(s: GameState): Set<string> {
  const owned = new Set<string>(['theme_midnight_galaxy']);
  if (Array.isArray(s.cos)) {
    for (const id of s.cos) {
      if (VALID_COSMETIC_ID_SET.has(id)) {
        owned.add(id);
      }
    }
  }
  return owned;
}

export function isCosmeticOwned(s: GameState, itemId: string): boolean {
  const def = COSMETIC_BY_ID.get(itemId);
  if (!def) return false;
  if (def.isDefaultFree) return true;
  return Array.isArray(s.cos) && s.cos.includes(itemId);
}

export function isThemeOwned(s: GameState, themeId: GameThemeId): boolean {
  if (themeId === 'midnight_galaxy') return true;
  const item = THEME_ITEMS.find((t) => t.themeId === themeId);
  return item ? isCosmeticOwned(s, item.id) : false;
}

export function getEquippedCosmetics(s: GameState): EquippedCosmetics {
  const owned = getOwnedCosmeticsSet(s);
  const raw = s.cosEq || {};
  return {
    frame: raw.frame && owned.has(raw.frame) ? raw.frame : undefined,
    nameEffect: raw.nameEffect && owned.has(raw.nameEffect) ? raw.nameEffect : undefined,
    badge: raw.badge && owned.has(raw.badge) ? raw.badge : undefined,
    anim: raw.anim && owned.has(raw.anim) ? raw.anim : undefined,
  };
}

export function getActiveThemeId(s: GameState): GameThemeId {
  const t = s.theme;
  if (t && VALID_THEME_ID_SET.has(t) && isThemeOwned(s, t)) {
    return t;
  }
  return 'midnight_galaxy';
}

export function canBuyCosmeticItem(
  s: GameState,
  itemId: string,
): { ok: boolean; reason?: string; diamondsCost: number; coinsCost: number } {
  const def = COSMETIC_BY_ID.get(itemId);
  if (!def) return { ok: false, reason: 'Unknown exclusive item', diamondsCost: 0, coinsCost: 0 };
  if (isCosmeticOwned(s, itemId)) {
    return { ok: false, reason: 'Already owned', diamondsCost: def.diamondsCost, coinsCost: def.coinsCost || 0 };
  }
  const rankNow = Math.max(MIN_RANK, Math.floor(Number(s.rank) || MIN_RANK));
  if (def.reqRank && rankNow < def.reqRank) {
    return {
      ok: false,
      reason: `Requires Rank ${def.reqRank}`,
      diamondsCost: def.diamondsCost,
      coinsCost: def.coinsCost || 0,
    };
  }
  const safeGems = Number.isFinite(s.gems) ? Math.max(0, Math.floor(s.gems)) : 0;
  const safeCash = Number.isFinite(s.cash) ? Math.max(0, Math.floor(s.cash)) : 0;
  const dCost = Math.max(0, Math.floor(def.diamondsCost));
  const cCost = Math.max(0, Math.floor(def.coinsCost || 0));
  if (safeGems < dCost) {
    return { ok: false, reason: `Need ${dCost} Diamonds`, diamondsCost: dCost, coinsCost: cCost };
  }
  if (cCost > 0 && safeCash < cCost) {
    return { ok: false, reason: 'Not enough Coins', diamondsCost: dCost, coinsCost: cCost };
  }
  return { ok: true, diamondsCost: dCost, coinsCost: cCost };
}

export function slotForCategory(category: CosmeticCategory): keyof EquippedCosmetics | null {
  switch (category) {
    case 'profile_effect':
      return 'frame';
    case 'name_effect':
      return 'nameEffect';
    case 'badge':
      return 'badge';
    case 'animation':
      return 'anim';
    default:
      return null;
  }
}

export function applyBuyCosmeticItem(
  s: GameState,
  itemId: string,
  autoEquip = true,
): { ok: boolean; state: GameState; item?: CosmeticItemDef; reason?: string } {
  const check = canBuyCosmeticItem(s, itemId);
  const def = COSMETIC_BY_ID.get(itemId);
  if (!check.ok || !def) {
    return { ok: false, state: s, reason: check.reason };
  }
  const safeGems = Math.max(0, Math.floor(Number(s.gems) || 0));
  const safeCash = Math.max(0, Number(s.cash) || 0);
  const prevOwned = Array.isArray(s.cos) ? s.cos.filter((x) => VALID_COSMETIC_ID_SET.has(x)) : [];
  const nextOwned = prevOwned.includes(def.id) ? prevOwned : [...prevOwned, def.id];

  let nextEq = { ...(s.cosEq || {}) };
  let nextTheme = s.theme;
  if (autoEquip) {
    const slot = slotForCategory(def.category);
    if (slot) nextEq = { ...nextEq, [slot]: def.id };
    if (def.category === 'theme' && def.themeId) nextTheme = def.themeId;
  }

  return {
    ok: true,
    item: def,
    state: {
      ...s,
      gems: Math.max(0, safeGems - check.diamondsCost),
      cash: Math.max(0, safeCash - check.coinsCost),
      cos: nextOwned,
      cosEq: nextEq,
      theme: nextTheme,
    },
  };
}

export function formatCoinsCompact(amount: number): string {
  const v = Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0));
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `${Number.isInteger(m) ? m : Number(m.toFixed(2))}M`;
  }
  if (v >= 10_000) {
    const k = v / 1_000;
    return `${Number.isInteger(k) ? k : Number(k.toFixed(1))}K`;
  }
  return v.toLocaleString('en-US');
}

export function getRarityWeight(rarity: CosmeticRarity): number {
  switch (rarity) {
    case 'Ultra Exclusive':
      return 8;
    case 'Exclusive':
      return 7;
    case 'Mythic':
      return 6;
    case 'Legendary':
      return 5;
    case 'Epic':
      return 4;
    case 'Rare':
      return 3;
    case 'Uncommon':
      return 2;
    case 'Basic':
    default:
      return 1;
  }
}

export function getRarityStars(rarity: CosmeticRarity): number {
  switch (rarity) {
    case 'Ultra Exclusive':
      return 7;
    case 'Mythic':
    case 'Exclusive':
      return 6;
    case 'Legendary':
      return 5;
    case 'Epic':
      return 4;
    case 'Rare':
      return 3;
    case 'Uncommon':
      return 2;
    case 'Basic':
    default:
      return 1;
  }
}

const COSMETIC_INDEX_MAP = new Map<string, number>(
  ALL_COSMETIC_ITEMS.map((item, idx) => [item.id, idx]),
);

export function getCosmeticCatalogIndex(id: string): number {
  return COSMETIC_INDEX_MAP.get(id) ?? 0;
}

export function getBundleValueSummary(
  s: GameState,
  bundleId: string,
): {
  bundle?: CosmeticBundleDef;
  individualDiamondsTotal: number;
  individualCoinsTotal: number;
  bundleDiamondsPrice: number;
  bundleCoinsPrice: number;
  savedDiamonds: number;
  savedCoins: number;
  savingsPct: number;
  unownedDiamondsSum: number;
  unownedCoinsSum: number;
} {
  const bundle = COSMETIC_BUNDLES.find((b) => b.id === bundleId);
  if (!bundle) {
    return {
      individualDiamondsTotal: 0,
      individualCoinsTotal: 0,
      bundleDiamondsPrice: 0,
      bundleCoinsPrice: 0,
      savedDiamonds: 0,
      savedCoins: 0,
      savingsPct: 0,
      unownedDiamondsSum: 0,
      unownedCoinsSum: 0,
    };
  }
  const owned = getOwnedCosmeticsSet(s);
  let individualDiamondsTotal = 0;
  let individualCoinsTotal = 0;
  let unownedDiamondsSum = 0;
  let unownedCoinsSum = 0;
  for (const id of bundle.itemIds) {
    const def = COSMETIC_BY_ID.get(id);
    if (!def) continue;
    const d = Math.max(0, def.diamondsCost || 0);
    const c = Math.max(0, def.coinsCost || 0);
    individualDiamondsTotal += d;
    individualCoinsTotal += c;
    if (!owned.has(id)) {
      unownedDiamondsSum += d;
      unownedCoinsSum += c;
    }
  }
  const bundleDiamondsPrice = Math.max(0, bundle.diamondsCost || 0);
  const bundleCoinsPrice = Math.max(0, bundle.coinsCost || 0);
  const savedDiamonds = Math.max(0, individualDiamondsTotal - bundleDiamondsPrice);
  const savedCoins = Math.max(0, individualCoinsTotal - bundleCoinsPrice);
  const savingsPct =
    individualDiamondsTotal > 0
      ? Math.round((savedDiamonds / individualDiamondsTotal) * 100)
      : 0;
  return {
    bundle,
    individualDiamondsTotal,
    individualCoinsTotal,
    bundleDiamondsPrice,
    bundleCoinsPrice,
    savedDiamonds,
    savedCoins,
    savingsPct,
    unownedDiamondsSum,
    unownedCoinsSum,
  };
}

export function getBundlePurchaseQuote(s: GameState, bundleId: string): {
  bundle?: CosmeticBundleDef;
  unownedItemIds: string[];
  alreadyOwnedCount: number;
  diamondsCost: number;
  coinsCost: number;
  allOwned: boolean;
} {
  const bundle = COSMETIC_BUNDLES.find((b) => b.id === bundleId);
  if (!bundle) {
    return { unownedItemIds: [], alreadyOwnedCount: 0, diamondsCost: 0, coinsCost: 0, allOwned: true };
  }
  const owned = getOwnedCosmeticsSet(s);
  const unownedItemIds = bundle.itemIds.filter((id) => !owned.has(id));
  const alreadyOwnedCount = bundle.itemIds.length - unownedItemIds.length;
  if (unownedItemIds.length === 0) {
    return {
      bundle,
      unownedItemIds: [],
      alreadyOwnedCount,
      diamondsCost: 0,
      coinsCost: 0,
      allOwned: true,
    };
  }
  const val = getBundleValueSummary(s, bundleId);
  const ratio = unownedItemIds.length / bundle.itemIds.length;
  const rawDiamonds = Math.max(1, Math.ceil(bundle.diamondsCost * ratio));
  const rawCoins = bundle.coinsCost ? Math.max(0, Math.ceil(bundle.coinsCost * ratio)) : 0;
  const diamondsCost = val.unownedDiamondsSum > 0 ? Math.min(val.unownedDiamondsSum, rawDiamonds) : rawDiamonds;
  const coinsCost = val.unownedCoinsSum > 0 ? Math.min(val.unownedCoinsSum, rawCoins) : rawCoins;
  return {
    bundle,
    unownedItemIds,
    alreadyOwnedCount,
    diamondsCost,
    coinsCost,
    allOwned: false,
  };
}

export function canBuyCosmeticBundle(
  s: GameState,
  bundleId: string,
): { ok: boolean; reason?: string; diamondsCost: number; coinsCost: number } {
  const quote = getBundlePurchaseQuote(s, bundleId);
  if (!quote.bundle) return { ok: false, reason: 'Unknown collection', diamondsCost: 0, coinsCost: 0 };
  if (quote.allOwned) return { ok: false, reason: 'Full collection already owned', diamondsCost: 0, coinsCost: 0 };
  const safeGems = Number.isFinite(s.gems) ? Math.max(0, Math.floor(s.gems)) : 0;
  const safeCash = Number.isFinite(s.cash) ? Math.max(0, Math.floor(s.cash)) : 0;
  if (safeGems < quote.diamondsCost) {
    return {
      ok: false,
      reason: `Need ${quote.diamondsCost} Diamonds`,
      diamondsCost: quote.diamondsCost,
      coinsCost: quote.coinsCost,
    };
  }
  if (quote.coinsCost > 0 && safeCash < quote.coinsCost) {
    return {
      ok: false,
      reason: 'Not enough Coins',
      diamondsCost: quote.diamondsCost,
      coinsCost: quote.coinsCost,
    };
  }
  return { ok: true, diamondsCost: quote.diamondsCost, coinsCost: quote.coinsCost };
}

export function applyBuyCosmeticBundle(
  s: GameState,
  bundleId: string,
  autoEquip = true,
): { ok: boolean; state: GameState; unlockedIds: string[]; bundle?: CosmeticBundleDef; reason?: string } {
  const check = canBuyCosmeticBundle(s, bundleId);
  const quote = getBundlePurchaseQuote(s, bundleId);
  if (!check.ok || !quote.bundle) {
    return { ok: false, state: s, unlockedIds: [], reason: check.reason };
  }
  const safeGems = Math.max(0, Math.floor(Number(s.gems) || 0));
  const safeCash = Math.max(0, Number(s.cash) || 0);
  const nextOwned = new Set<string>(Array.isArray(s.cos) ? s.cos.filter((x) => VALID_COSMETIC_ID_SET.has(x)) : []);
  for (const id of quote.unownedItemIds) {
    nextOwned.add(id);
  }
  const nextEq = { ...(s.cosEq || {}) };
  let nextTheme = s.theme;
  if (autoEquip) {
    for (const id of quote.unownedItemIds) {
      const def = COSMETIC_BY_ID.get(id);
      if (!def) continue;
      const slot = slotForCategory(def.category);
      if (slot) nextEq[slot] = def.id;
      if (def.category === 'theme' && def.themeId) nextTheme = def.themeId;
    }
  }
  return {
    ok: true,
    unlockedIds: quote.unownedItemIds,
    bundle: quote.bundle,
    state: {
      ...s,
      gems: Math.max(0, safeGems - check.diamondsCost),
      cash: Math.max(0, safeCash - check.coinsCost),
      cos: Array.from(nextOwned),
      cosEq: nextEq,
      theme: nextTheme,
    },
  };
}

export function applyEquipCosmetic(
  s: GameState,
  slot: keyof EquippedCosmetics,
  itemId: string | null,
): { ok: boolean; state: GameState; reason?: string } {
  if (!itemId) {
    const nextEq = { ...(s.cosEq || {}) };
    delete nextEq[slot];
    return { ok: true, state: { ...s, cosEq: nextEq } };
  }
  const def = COSMETIC_BY_ID.get(itemId);
  if (!def || slotForCategory(def.category) !== slot) {
    return { ok: false, state: s, reason: 'Invalid cosmetic slot' };
  }
  if (!isCosmeticOwned(s, itemId)) {
    return { ok: false, state: s, reason: 'Unlock this cosmetic first' };
  }
  return {
    ok: true,
    state: {
      ...s,
      cosEq: { ...(s.cosEq || {}), [slot]: itemId },
    },
  };
}

export function applySelectTheme(
  s: GameState,
  themeId: GameThemeId,
): { ok: boolean; state: GameState; reason?: string } {
  if (!VALID_THEME_ID_SET.has(themeId)) {
    return { ok: false, state: s, reason: 'Unknown theme' };
  }
  if (!isThemeOwned(s, themeId)) {
    return { ok: false, state: s, reason: 'Unlock this theme first' };
  }
  return {
    ok: true,
    state: {
      ...s,
      theme: themeId,
    },
  };
}

export function getDiamondAssetBonuses(s: GameState): {
  incomeMult: number;
  hapBonus: number;
  tradeBonus: number;
  ownedAssetIds: string[];
} {
  const owned = Array.isArray(s.cos) ? s.cos : [];
  let incPct = 0;
  let hapBonus = 0;
  let tradePct = 0;
  const ownedAssetIds: string[] = [];
  for (const asset of DIAMOND_ASSETS) {
    if (owned.includes(asset.id)) {
      ownedAssetIds.push(asset.id);
      incPct += asset.incomePctBonus;
      hapBonus += asset.hapBonus;
      tradePct += asset.tradeBonusPct;
    }
  }
  // Balanced anti-pay-to-win caps
  return {
    incomeMult: 1 + Math.min(0.08, incPct / 100),
    hapBonus: Math.min(6, hapBonus),
    tradeBonus: Math.min(0.1, tradePct / 100),
    ownedAssetIds,
  };
}

export function sanitizeCosmeticIdField(id: unknown): string {
  if (typeof id !== 'string') return '';
  const clean = id.trim();
  return /^[a-z0-9_]{0,36}$/.test(clean) ? clean : '';
}

export type DxCategoryFilter = 'all' | 'bundle' | CosmeticCategory;
export type DxRarityFilter = 'all' | CosmeticRarity;
export type DxPriceFilter = 'all' | 'diamonds_only' | 'dual_currency' | 'under_50' | 'under_200';
export type DxOwnershipFilter = 'all' | 'available' | 'owned' | 'unowned' | 'rank_locked';
export type DxSortBy = 'recommended' | 'price_asc' | 'price_desc' | 'rarity' | 'newest';

export interface DxFilterOptions {
  category?: DxCategoryFilter;
  search?: string;
  rarity?: DxRarityFilter;
  price?: DxPriceFilter;
  ownership?: DxOwnershipFilter;
  sortBy?: DxSortBy;
}

export interface CosmeticPreviewLoadout {
  frame?: string;
  nameEffect?: string;
  badge?: string;
  anim?: string;
  themeId?: GameThemeId;
  landmarkId?: string;
  focusItemId?: string;
}

export function hasActivePreview(loadout: CosmeticPreviewLoadout): boolean {
  return Boolean(
    loadout.frame ||
      loadout.nameEffect ||
      loadout.badge ||
      loadout.anim ||
      loadout.themeId ||
      loadout.landmarkId ||
      loadout.focusItemId,
  );
}

export function isItemActiveInPreviewLoadout(
  loadout: CosmeticPreviewLoadout,
  item: CosmeticItemDef,
): boolean {
  if (item.category === 'profile_effect') return loadout.frame === item.id;
  if (item.category === 'name_effect') return loadout.nameEffect === item.id;
  if (item.category === 'badge') return loadout.badge === item.id;
  if (item.category === 'animation') return loadout.anim === item.id;
  if (item.category === 'theme') return Boolean(item.themeId && loadout.themeId === item.themeId);
  if (item.category === 'diamond_asset') return loadout.landmarkId === item.id;
  return false;
}

function pickFallbackFocusId(next: CosmeticPreviewLoadout): string | undefined {
  if (next.landmarkId) return next.landmarkId;
  if (next.frame) return next.frame;
  if (next.nameEffect) return next.nameEffect;
  if (next.badge) return next.badge;
  if (next.anim) return next.anim;
  if (next.themeId) {
    const t = THEME_ITEMS.find((x) => x.themeId === next.themeId);
    if (t) return t.id;
  }
  return undefined;
}

export function toggleItemInPreviewLoadout(
  prev: CosmeticPreviewLoadout,
  item: CosmeticItemDef | null,
): CosmeticPreviewLoadout {
  if (!item) return {};
  const next: CosmeticPreviewLoadout = { ...prev };
  const active = isItemActiveInPreviewLoadout(prev, item);

  if (item.category === 'profile_effect') {
    if (active) delete next.frame;
    else next.frame = item.id;
  } else if (item.category === 'name_effect') {
    if (active) delete next.nameEffect;
    else next.nameEffect = item.id;
  } else if (item.category === 'badge') {
    if (active) delete next.badge;
    else next.badge = item.id;
  } else if (item.category === 'animation') {
    if (active) delete next.anim;
    else next.anim = item.id;
  } else if (item.category === 'theme' && item.themeId) {
    if (active) delete next.themeId;
    else next.themeId = item.themeId;
  } else if (item.category === 'diamond_asset') {
    if (active) delete next.landmarkId;
    else next.landmarkId = item.id;
  }

  if (active) {
    if (prev.focusItemId === item.id) {
      const fallback = pickFallbackFocusId(next);
      if (fallback) next.focusItemId = fallback;
      else delete next.focusItemId;
    }
  } else {
    next.focusItemId = item.id;
  }
  return next;
}

export function resolveEffectiveCosmeticPreview(
  s: GameState,
  loadout: CosmeticPreviewLoadout,
): {
  frame?: string;
  nameEffect?: string;
  badge?: string;
  anim?: string;
  themeId: GameThemeId;
  landmarkId?: string;
  focusItem: CosmeticItemDef | null;
  previewCount: number;
} {
  const eq = getEquippedCosmetics(s);
  const activeTheme = getActiveThemeId(s);
  const focusItem = loadout.focusItemId ? COSMETIC_BY_ID.get(loadout.focusItemId) || null : null;
  const previewKeys = [
    loadout.frame,
    loadout.nameEffect,
    loadout.badge,
    loadout.anim,
    loadout.themeId,
    loadout.landmarkId,
  ].filter(Boolean);

  return {
    frame: loadout.frame || eq.frame,
    nameEffect: loadout.nameEffect || eq.nameEffect,
    badge: loadout.badge || eq.badge,
    anim: loadout.anim || eq.anim,
    themeId: loadout.themeId || activeTheme,
    landmarkId: loadout.landmarkId,
    focusItem,
    previewCount: previewKeys.length,
  };
}

export function formatDiamondPrice(diamonds: number): string {
  const v = Math.max(0, Math.floor(Number.isFinite(diamonds) ? diamonds : 0));
  return `${v.toLocaleString('en-US')} Diamonds`;
}

export function formatCoinPrice(coins: number): string {
  return `${formatCoinsCompact(coins)} Coins`;
}

export function formatCombinedPrice(diamonds: number, coins?: number): string {
  const parts: string[] = [];
  if (diamonds > 0) parts.push(formatDiamondPrice(diamonds));
  if (coins && coins > 0) parts.push(formatCoinPrice(coins));
  return parts.length ? parts.join(' + ') : 'Included';
}

export function getCosmeticCategoryCounts(): Record<DxCategoryFilter, number> {
  return {
    all: ALL_COSMETIC_ITEMS.length,
    bundle: COSMETIC_BUNDLES.length,
    profile_effect: PROFILE_FRAMES.length,
    name_effect: NAME_EFFECTS.length,
    theme: THEME_ITEMS.length,
    animation: PREMIUM_ANIMATIONS.length,
    badge: EXCLUSIVE_BADGES.length,
    diamond_asset: DIAMOND_ASSETS.length,
  };
}

export function getAvailableExclusiveCount(s: GameState): number {
  let count = 0;
  for (const item of ALL_COSMETIC_ITEMS) {
    if (!isCosmeticOwned(s, item.id)) count += 1;
  }
  return count;
}

export function filterAndSortCosmetics(
  s: GameState,
  items: CosmeticItemDef[],
  opts: DxFilterOptions,
): CosmeticItemDef[] {
  const rankNow = Math.max(MIN_RANK, Math.floor(Number(s.rank) || MIN_RANK));
  const query = (opts.search || '').trim().toLowerCase();
  const rarityFilter = opts.rarity || 'all';
  const priceFilter = opts.price || 'all';
  const ownershipFilter = opts.ownership || 'all';
  const sortBy = opts.sortBy || 'recommended';

  const filtered = items.filter((item) => {
    if (opts.category && opts.category !== 'all' && opts.category !== 'bundle' && item.category !== opts.category) {
      return false;
    }
    if (rarityFilter !== 'all' && item.rarity !== rarityFilter) {
      return false;
    }
    if (priceFilter === 'diamonds_only' && (item.coinsCost || 0) > 0) {
      return false;
    }
    if (priceFilter === 'dual_currency' && !(item.coinsCost && item.coinsCost > 0)) {
      return false;
    }
    if (priceFilter === 'under_50' && item.diamondsCost >= 50) {
      return false;
    }
    if (priceFilter === 'under_200' && item.diamondsCost >= 200) {
      return false;
    }
    const owned = isCosmeticOwned(s, item.id);
    const rankLocked = Boolean(item.reqRank && rankNow < item.reqRank);
    if (ownershipFilter === 'owned' && !owned) return false;
    if (ownershipFilter === 'unowned' && owned) return false;
    if (ownershipFilter === 'rank_locked' && !rankLocked) return false;
    if (ownershipFilter === 'available' && (owned || rankLocked)) return false;

    if (query) {
      const hay = `${item.name} ${item.previewTag} ${item.desc} ${item.rarity} ${item.category}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    if (sortBy === 'price_asc') {
      if (a.diamondsCost !== b.diamondsCost) return a.diamondsCost - b.diamondsCost;
      return (a.coinsCost || 0) - (b.coinsCost || 0);
    }
    if (sortBy === 'price_desc') {
      if (b.diamondsCost !== a.diamondsCost) return b.diamondsCost - a.diamondsCost;
      return (b.coinsCost || 0) - (a.coinsCost || 0);
    }
    if (sortBy === 'rarity') {
      const rw = getRarityWeight(b.rarity) - getRarityWeight(a.rarity);
      if (rw !== 0) return rw;
      return b.diamondsCost - a.diamondsCost;
    }
    if (sortBy === 'newest') {
      return getCosmeticCatalogIndex(b.id) - getCosmeticCatalogIndex(a.id);
    }
    // recommended: purchasable first, then unowned, then owned, preserving rarity/curated priority
    const aOwned = isCosmeticOwned(s, a.id) ? 1 : 0;
    const bOwned = isCosmeticOwned(s, b.id) ? 1 : 0;
    if (aOwned !== bOwned) return aOwned - bOwned;
    const aBuyable = canBuyCosmeticItem(s, a.id).ok ? 0 : 1;
    const bBuyable = canBuyCosmeticItem(s, b.id).ok ? 0 : 1;
    if (aBuyable !== bBuyable) return aBuyable - bBuyable;
    return getCosmeticCatalogIndex(a.id) - getCosmeticCatalogIndex(b.id);
  });

  return sorted;
}

