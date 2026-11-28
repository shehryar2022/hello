import { MIN_RANK } from './constants';
import type {
  CosmeticBundleDef,
  CosmeticCategory,
  CosmeticItemDef,
  CosmeticPurchaseHistoryEntry,
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
    diamondsCost: 50,
    previewTag: 'Cyber Static Rim',
    icon: '💠',
    desc: 'Crisp electric cyan-violet neon border with static luminous trim.',
    accentColor: '#3fd2ff',
    secondaryColor: '#a855f7',
  },
  {
    id: 'frame_rainbow',
    name: 'Prismatic Spectrum Frame',
    category: 'profile_effect',
    rarity: 'Epic',
    diamondsCost: 56,
    previewTag: 'Spectrum Border',
    icon: '🌈',
    desc: 'Clean full-spectrum chromatic border with zero distraction.',
    accentColor: '#ff4ecd',
    secondaryColor: '#37e6a0',
  },
  {
    id: 'frame_galaxy',
    name: 'Galaxy Orbit Frame',
    category: 'profile_effect',
    rarity: 'Epic',
    diamondsCost: 64,
    previewTag: 'Deep Nebula',
    icon: '🌌',
    desc: 'Rich indigo-magenta celestial border around your emblem.',
    accentColor: '#9b6dff',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'frame_aurora',
    name: 'Aurora Borealis Frame',
    category: 'profile_effect',
    rarity: 'Epic',
    diamondsCost: 72,
    previewTag: 'Polar Trim',
    icon: '✨',
    desc: 'Crisp emerald, teal, and violet polar gradient border.',
    accentColor: '#37e6a0',
    secondaryColor: '#22d3ee',
  },
  {
    id: 'frame_lightning',
    name: 'Electric Cobalt Frame',
    category: 'profile_effect',
    rarity: 'Legendary',
    diamondsCost: 82,
    reqRank: 3,
    previewTag: 'Storm Gold',
    icon: '⚡',
    desc: 'High-contrast cobalt and gold trim around your commander flag.',
    accentColor: '#60a5fa',
    secondaryColor: '#facc15',
  },
  {
    id: 'frame_royal_gold',
    name: 'Royal Gold Frame',
    category: 'profile_effect',
    rarity: 'Legendary',
    diamondsCost: 92,
    coinsCost: 250_000,
    reqRank: 4,
    previewTag: 'Imperial Crest',
    icon: '👑',
    desc: 'Burnished 24K sovereign gold filigree border with warm luster.',
    accentColor: '#ffc93c',
    secondaryColor: '#f59e0b',
  },
  {
    id: 'frame_holographic',
    name: 'Holographic Prism Frame',
    category: 'profile_effect',
    rarity: 'Legendary',
    diamondsCost: 108,
    previewTag: 'Iridescent',
    icon: '🪩',
    desc: 'Refractive pastel holographic foil border.',
    accentColor: '#67e8f9',
    secondaryColor: '#f472b6',
  },
  {
    id: 'frame_diamond_crystal',
    name: 'Diamond Crystal Frame',
    category: 'profile_effect',
    rarity: 'Legendary',
    diamondsCost: 125,
    coinsCost: 400_000,
    reqRank: 4,
    previewTag: 'Faceted Gleam',
    icon: '💎',
    desc: 'Ice-cut crystalline border framing your national crest.',
    accentColor: '#7ee8ff',
    secondaryColor: '#e0f2fe',
  },
  {
    id: 'frame_legendary',
    name: 'Legendary Sovereign Frame',
    category: 'profile_effect',
    rarity: 'Legendary',
    diamondsCost: 175,
    coinsCost: 1_000_000,
    reqRank: 5,
    previewTag: 'Apex Crown',
    icon: '🔥',
    desc: 'Solar gold & cosmic violet double-bevel sovereign border.',
    accentColor: '#fbbf24',
    secondaryColor: '#c084fc',
  },
  {
    id: 'frame_seasonal',
    name: 'Solstice Celebration Frame',
    category: 'profile_effect',
    rarity: 'Exclusive',
    diamondsCost: 145,
    previewTag: 'Seasonal Drop',
    icon: '🎆',
    desc: 'Limited seasonal celebration border in rose-gold and amber.',
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
    diamondsCost: 50,
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
    diamondsCost: 52,
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
    diamondsCost: 54,
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
    diamondsCost: 56,
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
    diamondsCost: 58,
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
    diamondsCost: 60,
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
    diamondsCost: 62,
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
    diamondsCost: 64,
    coinsCost: 900_000,
    reqRank: 5,
    previewTag: 'Grand Master',
    icon: '⚜️',
    desc: 'Imperial gold-violet gradient with radiant aura glow.',
    accentColor: '#fbbf24',
    secondaryColor: '#e879f9',
    limitedLabel: 'Prestige Tier',
  },
  // Update 2.0 Typography FX (+14 -> 22 total, priced 50-599 Diamonds)
  {
    id: 'nfx_crimson_blaze',
    name: 'Crimson Ledger Type',
    category: 'name_effect',
    rarity: 'Common',
    diamondsCost: 65,
    previewTag: 'Crimson Sweep',
    icon: '🔥',
    desc: 'Refined ruby-coral typography sweep built for bold statesmen.',
    accentColor: '#fb7185',
    secondaryColor: '#f97316',
  },
  {
    id: 'nfx_emerald_pulse',
    name: 'Emerald Mint Type',
    category: 'name_effect',
    rarity: 'Common',
    diamondsCost: 80,
    previewTag: 'Jade Flow',
    icon: '💚',
    desc: 'Balanced jade-to-mint animated lettering with crisp readability.',
    accentColor: '#34d399',
    secondaryColor: '#2dd4bf',
  },
  {
    id: 'nfx_amber_ledger',
    name: 'Amber Reserve Type',
    category: 'name_effect',
    rarity: 'Common',
    diamondsCost: 95,
    previewTag: 'Bullion Ink',
    icon: '🪙',
    desc: 'Warm bullion-amber gradient with gentle specular cadence.',
    accentColor: '#f59e0b',
    secondaryColor: '#fde68a',
  },
  {
    id: 'nfx_frost_crystal',
    name: 'Glacier Frost Type',
    category: 'name_effect',
    rarity: 'Rare',
    diamondsCost: 115,
    previewTag: 'Arctic Ice',
    icon: '❄️',
    desc: 'Sub-zero ice blue and silver metallic sweep across chat & rankings.',
    accentColor: '#bae6fd',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'nfx_cobalt_laser',
    name: 'Cobalt Laser Type',
    category: 'name_effect',
    rarity: 'Rare',
    diamondsCost: 135,
    previewTag: 'Laser Track',
    icon: '🔵',
    desc: 'Precision azure-indigo typographic scanline gleam.',
    accentColor: '#3b82f6',
    secondaryColor: '#22d3ee',
  },
  {
    id: 'nfx_obsidian_silver',
    name: 'Platinum Chrome Type',
    category: 'name_effect',
    rarity: 'Rare',
    diamondsCost: 160,
    previewTag: 'Brushed Steel',
    icon: '🩶',
    desc: 'Mirror-brushed platinum & titanium lettering for modern cabinets.',
    accentColor: '#f8fafc',
    secondaryColor: '#94a3b8',
  },
  {
    id: 'nfx_solar_flare',
    name: 'Solar Eclipse Type',
    category: 'name_effect',
    rarity: 'Epic',
    diamondsCost: 195,
    reqRank: 3,
    previewTag: 'Corona Glow',
    icon: '☀️',
    desc: 'Corona gold and tangerine gradient with warm solar halo.',
    accentColor: '#fb923c',
    secondaryColor: '#fde047',
  },
  {
    id: 'nfx_amethyst_royal',
    name: 'Amethyst Dynasty Type',
    category: 'name_effect',
    rarity: 'Epic',
    diamondsCost: 230,
    reqRank: 3,
    previewTag: 'Imperial Violet',
    icon: '🔮',
    desc: 'Regal violet-orchid typographic shimmer with refined depth.',
    accentColor: '#c084fc',
    secondaryColor: '#e879f9',
  },
  {
    id: 'nfx_rose_velvet',
    name: 'Rose Gold Velvet Type',
    category: 'name_effect',
    rarity: 'Epic',
    diamondsCost: 265,
    reqRank: 4,
    previewTag: 'Rose Foil',
    icon: '🌹',
    desc: 'Champagne rose-gold foil typography for luxury collections.',
    accentColor: '#fda4af',
    secondaryColor: '#fcd34d',
  },
  {
    id: 'nfx_titanium_chrome',
    name: 'Titanium Specular Type',
    category: 'name_effect',
    rarity: 'Epic',
    diamondsCost: 290,
    reqRank: 4,
    previewTag: 'Mirror Gloss',
    icon: '⚙️',
    desc: 'Architectural silver-cyan gloss with wide-tracking letterforms.',
    accentColor: '#e2e8f0',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'nfx_cyber_glitch',
    name: 'Cyber Lattice Type',
    category: 'name_effect',
    rarity: 'Legendary',
    diamondsCost: 340,
    reqRank: 5,
    previewTag: 'Holo Matrix',
    icon: '🧬',
    desc: 'High-tech cyan-magenta phase shift across executive nameplates.',
    accentColor: '#00e5ff',
    secondaryColor: '#ff3dc8',
  },
  {
    id: 'nfx_plasma_wave',
    name: 'Plasma Horizon Type',
    category: 'name_effect',
    rarity: 'Legendary',
    diamondsCost: 395,
    reqRank: 6,
    previewTag: 'Ion Shimmer',
    icon: '🌠',
    desc: 'Multi-band violet, cyan, and solar-mint wave motion.',
    accentColor: '#818cf8',
    secondaryColor: '#34d399',
  },
  {
    id: 'nfx_starlight_serif',
    name: 'Starlight Sovereign Type',
    category: 'name_effect',
    rarity: 'Mythic',
    diamondsCost: 480,
    reqRank: 8,
    previewTag: 'Astral Gold',
    icon: '🌟',
    desc: 'Luminous gold-pearl starlight bloom across rankings & chat.',
    accentColor: '#fef08a',
    secondaryColor: '#7ee8ff',
  },
  {
    id: 'nfx_imperial_prism',
    name: 'Imperial Diamond Prism Type',
    category: 'name_effect',
    rarity: 'Mythic',
    diamondsCost: 565,
    reqRank: 10,
    previewTag: 'Apex Prism',
    icon: '💠',
    desc: 'Update 2.0 flagship refractive prism typography with radiant gleam.',
    accentColor: '#fde047',
    secondaryColor: '#f472b6',
    limitedLabel: 'Typography Apex',
  },
];

export const LEADERBOARD_ANIMATIONS: CosmeticItemDef[] = [
  {
    id: 'lb_silver_edge',
    name: 'Silver Ledger Edge',
    category: 'leaderboard_anim',
    rarity: 'Common',
    diamondsCost: 55,
    previewTag: 'Clean Glint',
    icon: '🥈',
    desc: 'Subtle brushed silver border accent on your Global Leaderboard row.',
    accentColor: '#cbd5e1',
    secondaryColor: '#94a3b8',
  },
  {
    id: 'lb_jade_flow',
    name: 'Jade Growth Sweep',
    category: 'leaderboard_anim',
    rarity: 'Common',
    diamondsCost: 75,
    previewTag: 'Mint Pulse',
    icon: '🌿',
    desc: 'Gentle emerald prosperity shimmer across your ranking banner.',
    accentColor: '#3fe0b0',
    secondaryColor: '#10b981',
  },
  {
    id: 'lb_amber_beacon',
    name: 'Amber Beacon Strip',
    category: 'leaderboard_anim',
    rarity: 'Common',
    diamondsCost: 90,
    previewTag: 'Warm Highlight',
    icon: '🔆',
    desc: 'Warm amber spotlight sweep along your national leaderboard card.',
    accentColor: '#f59e0b',
    secondaryColor: '#fde68a',
  },
  {
    id: 'lb_cyan_scan',
    name: 'Telemetry Cyan Scan',
    category: 'leaderboard_anim',
    rarity: 'Rare',
    diamondsCost: 115,
    previewTag: 'Light Beam',
    icon: '📡',
    desc: 'Smooth GPU-composited cyan light sweep across your ranking row.',
    accentColor: '#38bdf8',
    secondaryColor: '#67e8f9',
  },
  {
    id: 'lb_emerald_glow',
    name: 'Emerald Vault Glow',
    category: 'leaderboard_anim',
    rarity: 'Rare',
    diamondsCost: 140,
    previewTag: 'Vault Trim',
    icon: '💎',
    desc: 'Deep emerald perimeter aura illuminating your GDP row cleanly.',
    accentColor: '#34d399',
    secondaryColor: '#22d3ee',
  },
  {
    id: 'lb_indigo_wave',
    name: 'Indigo Tide Row FX',
    category: 'leaderboard_anim',
    rarity: 'Rare',
    diamondsCost: 165,
    previewTag: 'Royal Tide',
    icon: '🌊',
    desc: 'Smooth indigo-violet gradient wave inside your leaderboard row.',
    accentColor: '#818cf8',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'lb_ruby_pulse',
    name: 'Crimson Command Pulse',
    category: 'leaderboard_anim',
    rarity: 'Epic',
    diamondsCost: 190,
    reqRank: 3,
    previewTag: 'Ruby Rim',
    icon: '♦️',
    desc: 'Refined crimson border pulse highlighting top industrial nations.',
    accentColor: '#fb7185',
    secondaryColor: '#f59e0b',
  },
  {
    id: 'lb_royal_shimmer',
    name: 'Royal Silk Shimmer',
    category: 'leaderboard_anim',
    rarity: 'Epic',
    diamondsCost: 225,
    reqRank: 3,
    previewTag: 'Silk Sheen',
    icon: '⚜️',
    desc: 'Diagonal velvet-gold sheen passing gracefully across your row.',
    accentColor: '#c084fc',
    secondaryColor: '#fbbf24',
  },
  {
    id: 'lb_gold_sweep',
    name: 'Sovereign Gold Sweep',
    category: 'leaderboard_anim',
    rarity: 'Epic',
    diamondsCost: 260,
    reqRank: 4,
    previewTag: '24K Sweep',
    icon: '🏅',
    desc: 'Burnished golden light ribbon gliding across your ranking card.',
    accentColor: '#ffc93c',
    secondaryColor: '#fef08a',
  },
  {
    id: 'lb_plasma_rail',
    name: 'Plasma Horizon Rail',
    category: 'leaderboard_anim',
    rarity: 'Epic',
    diamondsCost: 295,
    reqRank: 5,
    previewTag: 'Neon Rail',
    icon: '⚡',
    desc: 'Electric cyan-magenta dual rail accent for high-growth rivals.',
    accentColor: '#00e5ff',
    secondaryColor: '#ff3dc8',
  },
  {
    id: 'lb_aurora_ribbon',
    name: 'Aurora Borealis Ribbon',
    category: 'leaderboard_anim',
    rarity: 'Legendary',
    diamondsCost: 335,
    reqRank: 5,
    previewTag: 'Polar Glow',
    icon: '🌌',
    desc: 'Layered emerald and polar-violet ribbon drifting across your row.',
    accentColor: '#2dd4bf',
    secondaryColor: '#a855f7',
  },
  {
    id: 'lb_diamond_glint',
    name: 'Diamond Facet Glint',
    category: 'leaderboard_anim',
    rarity: 'Legendary',
    diamondsCost: 385,
    reqRank: 6,
    previewTag: 'Crystal Beam',
    icon: '💠',
    desc: 'Specular ice-diamond beam sweeping across your leaderboard tile.',
    accentColor: '#7ee8ff',
    secondaryColor: '#e0f2fe',
  },
  {
    id: 'lb_prism_border',
    name: 'Iridescent Prism Trim',
    category: 'leaderboard_anim',
    rarity: 'Legendary',
    diamondsCost: 430,
    reqRank: 7,
    previewTag: 'Hologram Edge',
    icon: '🪩',
    desc: 'Prismatic perimeter sheen designed with zero text jitter.',
    accentColor: '#67e8f9',
    secondaryColor: '#f472b6',
  },
  {
    id: 'lb_starlight_trail',
    name: 'Starlight Sovereign Trail',
    category: 'leaderboard_anim',
    rarity: 'Mythic',
    diamondsCost: 475,
    reqRank: 9,
    previewTag: 'Astral Glide',
    icon: '🌠',
    desc: 'Astral indigo-gold gradient sweep across Global & Weekly rankings.',
    accentColor: '#fde047',
    secondaryColor: '#818cf8',
  },
  {
    id: 'lb_imperial_crest',
    name: 'Imperial Crest Aura',
    category: 'leaderboard_anim',
    rarity: 'Mythic',
    diamondsCost: 530,
    reqRank: 10,
    previewTag: 'Grand Crown',
    icon: '👑',
    desc: 'Regal gold-amethyst radiance underscoring apex national leaders.',
    accentColor: '#fbbf24',
    secondaryColor: '#c084fc',
  },
  {
    id: 'lb_nova_aura',
    name: 'Apex Nova Leaderboard FX',
    category: 'leaderboard_anim',
    rarity: 'Ultra Exclusive',
    diamondsCost: 595,
    reqRank: 12,
    previewTag: 'Apex Sweep',
    icon: '🌟',
    desc: 'Flagship prismatic leaderboard highlight with zero flicker or layout shift.',
    accentColor: '#fde047',
    secondaryColor: '#7ee8ff',
    limitedLabel: 'Leaderboard Apex',
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
    diamondsCost: 52,
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
    diamondsCost: 58,
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
    diamondsCost: 68,
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
    diamondsCost: 76,
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
    diamondsCost: 86,
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
    diamondsCost: 95,
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
    diamondsCost: 105,
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
    diamondsCost: 118,
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
    diamondsCost: 135,
    coinsCost: 450_000,
    themeId: 'diamond_crystal',
    previewTag: 'Crystalline Ice',
    icon: '💎',
    desc: 'Frosted glacier-navy surfaces with brilliant diamond-cyan facets.',
    accentColor: '#7ee8ff',
    secondaryColor: '#a5b4fc',
  },
  // Update 2.0 Themes (+5 -> 15 total)
  {
    id: 'theme_imperial_obsidian',
    name: 'Imperial Obsidian',
    category: 'theme',
    rarity: 'Rare',
    diamondsCost: 145,
    themeId: 'imperial_obsidian',
    previewTag: 'Obsidian Brass',
    icon: '🪨',
    desc: 'Graphite volcanic stone panels edged with brushed bronze & steel.',
    accentColor: '#d4a359',
    secondaryColor: '#94a3b8',
  },
  {
    id: 'theme_sapphire_monarch',
    name: 'Sapphire Monarch',
    category: 'theme',
    rarity: 'Epic',
    diamondsCost: 220,
    themeId: 'sapphire_monarch',
    previewTag: 'Crown Sapphire',
    icon: '💙',
    desc: 'Deep royal sapphire UI surfaces paired with pale platinum type.',
    accentColor: '#60a5fa',
    secondaryColor: '#e2e8f0',
  },
  {
    id: 'theme_jade_dynasty',
    name: 'Jade Dynasty',
    category: 'theme',
    rarity: 'Epic',
    diamondsCost: 265,
    themeId: 'jade_dynasty',
    previewTag: 'Celadon Jade',
    icon: '🪷',
    desc: 'Serene malachite-jade cabinetry accented by warm imperial gold.',
    accentColor: '#2dd4bf',
    secondaryColor: '#fcd34d',
  },
  {
    id: 'theme_solar_eclipse',
    name: 'Solar Eclipse',
    category: 'theme',
    rarity: 'Legendary',
    diamondsCost: 360,
    reqRank: 5,
    themeId: 'solar_eclipse',
    previewTag: 'Umbra Corona',
    icon: '🌑',
    desc: 'Deep umbra charcoal lit by luminous solar-amber corona borders.',
    accentColor: '#fb923c',
    secondaryColor: '#fde047',
  },
  {
    id: 'theme_platinum_vault',
    name: 'Platinum Sovereign Vault',
    category: 'theme',
    rarity: 'Mythic',
    diamondsCost: 520,
    reqRank: 8,
    themeId: 'platinum_vault',
    previewTag: 'Platinum Reserve',
    icon: '🏛️',
    desc: 'Architectural silver-slate command center with crisp diamond accents.',
    accentColor: '#f1f5f9',
    secondaryColor: '#38bdf8',
    limitedLabel: 'Reserve Edition',
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
    desc: 'Surrounds your command showcase with counter-rotating mythic orbital rings and star flares.',
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
  // Update 2.0 UI FX (+6 -> 16 total, all 50-599 Diamonds)
  {
    id: 'anim_glass_sheen',
    name: 'Frosted Glass Sheen',
    category: 'animation',
    rarity: 'Common',
    diamondsCost: 65,
    previewTag: 'Glass Glint',
    icon: '🪟',
    desc: 'Clean architectural diagonal glass sheen over command panels.',
    accentColor: '#e2e8f0',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'anim_horizon_scan',
    name: 'Treasury Radar Sweep',
    category: 'animation',
    rarity: 'Rare',
    diamondsCost: 125,
    previewTag: 'Metric Pulse',
    icon: '📊',
    desc: 'Subtle horizontal telemetry pulse highlighting live income panels.',
    accentColor: '#38bdf8',
    secondaryColor: '#3fe0b0',
  },
  {
    id: 'anim_gold_filigree',
    name: 'Sovereign Gold Filigree',
    category: 'animation',
    rarity: 'Epic',
    diamondsCost: 210,
    reqRank: 3,
    previewTag: 'Gilded Edge',
    icon: '🪙',
    desc: 'Warm golden bezel glow surrounding your Executive Dashboard card.',
    accentColor: '#ffc93c',
    secondaryColor: '#f59e0b',
  },
  {
    id: 'anim_prism_lattice',
    name: 'Crystalline Prism Lattice',
    category: 'animation',
    rarity: 'Legendary',
    diamondsCost: 325,
    reqRank: 4,
    previewTag: 'Diamond Mesh',
    icon: '💠',
    desc: 'Faceted cyan-violet lattice overlay tuned cleanly for 60fps GPU playback.',
    accentColor: '#67e8f9',
    secondaryColor: '#c084fc',
  },
  {
    id: 'anim_quantum_ripple',
    name: 'Quantum Resonance Veil',
    category: 'animation',
    rarity: 'Mythic',
    diamondsCost: 495,
    reqRank: 7,
    previewTag: 'Wave Harmonics',
    icon: '⚛️',
    desc: 'Dual harmonic cyan & orchid waves framing your national command panel.',
    accentColor: '#22d3ee',
    secondaryColor: '#e879f9',
  },
  {
    id: 'anim_apex_crown',
    name: 'Apex Sovereign Radiance',
    category: 'animation',
    rarity: 'Ultra Exclusive',
    diamondsCost: 599,
    reqRank: 10,
    previewTag: 'Update 2.0 Apex',
    icon: '⚜️',
    desc: 'Supreme gold, diamond & amethyst UI aura crafted for Update 2.0.',
    accentColor: '#fde047',
    secondaryColor: '#7ee8ff',
    limitedLabel: 'Collector Apex',
  },
];

export const EXCLUSIVE_BADGES: CosmeticItemDef[] = [
  {
    id: 'badge_diamond_member',
    name: 'Diamond Member',
    category: 'badge',
    rarity: 'Rare',
    diamondsCost: 50,
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
    diamondsCost: 52,
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
    diamondsCost: 55,
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
    diamondsCost: 58,
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
    diamondsCost: 62,
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
    diamondsCost: 66,
    coinsCost: 800_000,
    reqRank: 6,
    previewTag: 'Founder Vault',
    icon: '⚜️',
    desc: 'Collector-grade gilded fleur-de-lis reserved for Apex Founders.',
    accentColor: '#fde047',
    secondaryColor: '#e879f9',
    limitedLabel: 'Collector Crest',
  },
  // Update 2.0 Badges (+6 -> 12 total, 50-599 Diamonds)
  {
    id: 'badge_civic_architect',
    name: 'Civic Master Planner',
    category: 'badge',
    rarity: 'Common',
    diamondsCost: 70,
    previewTag: 'Urban Planner',
    icon: '📐',
    desc: 'Marks balanced city zoning and civic engineering excellence.',
    accentColor: '#34d399',
    secondaryColor: '#60a5fa',
  },
  {
    id: 'badge_trade_envoy',
    name: 'Global Trade Envoy',
    category: 'badge',
    rarity: 'Rare',
    diamondsCost: 130,
    previewTag: 'Maritime Crest',
    icon: '🚢',
    desc: 'Recognizes international commerce & export corridor pioneers.',
    accentColor: '#38bdf8',
    secondaryColor: '#2dd4bf',
  },
  {
    id: 'badge_quantum_pioneer',
    name: 'Quantum Directorate',
    category: 'badge',
    rarity: 'Epic',
    diamondsCost: 240,
    reqRank: 4,
    previewTag: 'Science Seal',
    icon: '⚛️',
    desc: 'Prestigious R&D insignia displayed across rankings and chat.',
    accentColor: '#a855f7',
    secondaryColor: '#22d3ee',
  },
  {
    id: 'badge_space_director',
    name: 'Orbital Launch Director',
    category: 'badge',
    rarity: 'Legendary',
    diamondsCost: 350,
    reqRank: 7,
    previewTag: 'Aerospace Seal',
    icon: '🚀',
    desc: 'Honors nations operating deep-space telemetry & launch complexes.',
    accentColor: '#818cf8',
    secondaryColor: '#fbbf24',
  },
  {
    id: 'badge_grand_chancellor',
    name: 'Grand Chancellor Seal',
    category: 'badge',
    rarity: 'Mythic',
    diamondsCost: 470,
    reqRank: 10,
    previewTag: 'High State',
    icon: '⚖️',
    desc: 'Sovereign judicial and treasury seal of the Grand Chancellery.',
    accentColor: '#fbbf24',
    secondaryColor: '#f472b6',
  },
  {
    id: 'badge_eternal_sovereign',
    name: 'Eternal Sovereign Crest',
    category: 'badge',
    rarity: 'Ultra Exclusive',
    diamondsCost: 580,
    reqRank: 14,
    previewTag: 'Apex Honor',
    icon: '🌟',
    desc: 'Update 2.0 supreme insignia reserved for titan economies.',
    accentColor: '#fde047',
    secondaryColor: '#7ee8ff',
    limitedLabel: 'Mythic Honor',
  },
];

export const ACHIEVEMENT_EFFECTS: CosmeticItemDef[] = [
  {
    id: 'achfx_emerald_ribbon',
    name: 'Emerald Merit Ribbon',
    category: 'achievement_fx',
    rarity: 'Common',
    diamondsCost: 75,
    previewTag: 'Milestone Glow',
    icon: '🎖️',
    desc: 'Adds an emerald honor border around claimed Achievement cards & unlock popups.',
    accentColor: '#3fe0b0',
    secondaryColor: '#10b981',
  },
  {
    id: 'achfx_cyan_seal',
    name: 'Azure Citation Seal',
    category: 'achievement_fx',
    rarity: 'Rare',
    diamondsCost: 135,
    previewTag: 'Prism Crest',
    icon: '🔷',
    desc: 'Illuminates unlocked milestone trophies with crisp cyan radiance.',
    accentColor: '#38bdf8',
    secondaryColor: '#818cf8',
  },
  {
    id: 'achfx_gold_wreath',
    name: 'Imperial Laurel Wreath',
    category: 'achievement_fx',
    rarity: 'Epic',
    diamondsCost: 230,
    reqRank: 3,
    previewTag: 'Laurel Aura',
    icon: '🏆',
    desc: 'Surrounds achievement unlocks and trophy cards with gilded laurel shine.',
    accentColor: '#ffc93c',
    secondaryColor: '#f59e0b',
  },
  {
    id: 'achfx_diamond_burst',
    name: 'Diamond Trophy Burst',
    category: 'achievement_fx',
    rarity: 'Legendary',
    diamondsCost: 345,
    reqRank: 5,
    previewTag: 'Faceted Celebration',
    icon: '💎',
    desc: 'Enhances trophy banners and unlock celebrations with icy diamond gleam.',
    accentColor: '#7ee8ff',
    secondaryColor: '#e0f2fe',
  },
  {
    id: 'achfx_aurora_banner',
    name: 'Aurora Honor Banner',
    category: 'achievement_fx',
    rarity: 'Mythic',
    diamondsCost: 460,
    reqRank: 8,
    previewTag: 'Polar Honors',
    icon: '🌠',
    desc: 'Drapes luminous polar ribbons across your Achievement Hall showcases.',
    accentColor: '#2dd4bf',
    secondaryColor: '#c084fc',
  },
  {
    id: 'achfx_sovereign_crest',
    name: 'Sovereign Triumph FX',
    category: 'achievement_fx',
    rarity: 'Ultra Exclusive',
    diamondsCost: 575,
    reqRank: 12,
    previewTag: 'Grand Triumph',
    icon: '👑',
    desc: 'Apex prismatic trophy celebration effect across every earned honor.',
    accentColor: '#fde047',
    secondaryColor: '#fb7185',
    limitedLabel: 'Hall of Fame',
  },
];

export const PREMIUM_VISUAL_EFFECTS: CosmeticItemDef[] = [
  {
    id: 'pvfx_velvet_vignette',
    name: 'Executive Velvet Sheen',
    category: 'premium_vfx',
    rarity: 'Common',
    diamondsCost: 85,
    previewTag: 'Subtle Vignette',
    icon: '🪄',
    desc: 'Refines top-bar badges and dashboard headers with a soft velvet gloss.',
    accentColor: '#a78bfa',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'pvfx_crystal_refraction',
    name: 'Crystal Refraction Edge',
    category: 'premium_vfx',
    rarity: 'Rare',
    diamondsCost: 150,
    previewTag: 'Specular Rim',
    icon: '🔹',
    desc: 'Projects clean crystalline edge highlights across command panels.',
    accentColor: '#67e8f9',
    secondaryColor: '#818cf8',
  },
  {
    id: 'pvfx_telemetry_grid',
    name: 'Macro Telemetry Grid',
    category: 'premium_vfx',
    rarity: 'Epic',
    diamondsCost: 255,
    reqRank: 3,
    previewTag: 'Precision Grid',
    icon: '🧭',
    desc: 'Overlays an ultra-clean command telemetry blueprint texture onto headers.',
    accentColor: '#34d399',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'pvfx_imperial_amber',
    name: 'Imperial Bullion Glow',
    category: 'premium_vfx',
    rarity: 'Legendary',
    diamondsCost: 375,
    reqRank: 5,
    previewTag: 'Bullion Bloom',
    icon: '✨',
    desc: 'Enriches treasury and hero counters with warm 24K gold luminance.',
    accentColor: '#ffc93c',
    secondaryColor: '#fb923c',
  },
  {
    id: 'pvfx_nebula_depth',
    name: 'Deep Nebula Atmosphere',
    category: 'premium_vfx',
    rarity: 'Mythic',
    diamondsCost: 490,
    reqRank: 9,
    previewTag: 'Cosmic Depth',
    icon: '🌌',
    desc: 'Adds layered cosmic indigo-magenta lighting depth behind UI cards.',
    accentColor: '#c084fc',
    secondaryColor: '#22d3ee',
  },
  {
    id: 'pvfx_sovereign_radiance',
    name: 'Sovereign Prism Field',
    category: 'premium_vfx',
    rarity: 'Ultra Exclusive',
    diamondsCost: 590,
    reqRank: 12,
    previewTag: 'Apex Atmosphere',
    icon: '💠',
    desc: 'Signature Update 2.0 full-suite diamond prism atmospheric glow.',
    accentColor: '#fde047',
    secondaryColor: '#7ee8ff',
    limitedLabel: 'Visual Apex',
  },
];

export const DIAMOND_ASSETS: DiamondAssetDef[] = [
  {
    id: 'asset_aurora_obelisk',
    name: 'Aurora Cultural Obelisk',
    category: 'diamond_asset',
    rarity: 'Epic',
    diamondsCost: 55,
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
    diamondsCost: 72,
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
    diamondsCost: 88,
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
    diamondsCost: 105,
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
  // Update 2.0 Landmarks (+5 -> 9 total, 50-599 Diamonds)
  {
    id: 'asset_solar_monolith',
    name: 'Helios Solar Monolith',
    category: 'diamond_asset',
    rarity: 'Rare',
    diamondsCost: 120,
    coinsCost: 350_000,
    previewTag: '3D Monument · +1.5% Inc',
    icon: '🔆',
    desc: 'Gilded solar prism monolith gracing the waterfront promenade (+1.5% Income, +1.0 Happiness).',
    accentColor: '#fb923c',
    secondaryColor: '#fde047',
    incomePctBonus: 1.5,
    hapBonus: 1.0,
    tradeBonusPct: 1,
  },
  {
    id: 'asset_quantum_spire',
    name: 'Quantum Beacon Tower',
    category: 'diamond_asset',
    rarity: 'Epic',
    diamondsCost: 225,
    coinsCost: 900_000,
    reqRank: 4,
    previewTag: '3D Wonder · +2% Inc',
    icon: '🗼',
    desc: 'Sub-atomic resonance needle crowning the 3D skyline (+2.0% Income, +1.5 Happiness, +2% Trade).',
    accentColor: '#22d3ee',
    secondaryColor: '#a855f7',
    incomePctBonus: 2.0,
    hapBonus: 1.5,
    tradeBonusPct: 2,
  },
  {
    id: 'asset_imperial_pavilion',
    name: 'Imperial Treasury Rotunda',
    category: 'diamond_asset',
    rarity: 'Legendary',
    diamondsCost: 340,
    coinsCost: 2_500_000,
    reqRank: 6,
    previewTag: '3D Rotunda · +3% Trade',
    icon: '🕌',
    desc: 'Gold-domed diplomatic rotunda welcoming foreign trade missions (+2.0% Income, +2.0 Happiness).',
    accentColor: '#fbbf24',
    secondaryColor: '#34d399',
    incomePctBonus: 2.0,
    hapBonus: 2.0,
    tradeBonusPct: 3,
  },
  {
    id: 'asset_celestial_observatory',
    name: 'Celestial Dome Observatory',
    category: 'diamond_asset',
    rarity: 'Mythic',
    diamondsCost: 465,
    coinsCost: 6_000_000,
    reqRank: 9,
    previewTag: '3D Observatory · +2.5% Inc',
    icon: '🔭',
    desc: 'Orbital laser observatory towering above your 3D harbor (+2.5% Income, +2.0 Happiness, +4% Trade).',
    accentColor: '#818cf8',
    secondaryColor: '#7ee8ff',
    incomePctBonus: 2.5,
    hapBonus: 2.0,
    tradeBonusPct: 4,
  },
  {
    id: 'asset_sovereign_colossus',
    name: 'Sovereign Horizon Colossus',
    category: 'diamond_asset',
    rarity: 'Ultra Exclusive',
    diamondsCost: 580,
    coinsCost: 15_000_000,
    reqRank: 12,
    previewTag: '3D Apex Wonder · +3% Inc',
    icon: '🗽',
    desc: 'Monumental prismatic lighthouse monument overlooking your 3D nation (+3.0% Income, +2.5 Happiness).',
    accentColor: '#fde047',
    secondaryColor: '#f472b6',
    incomePctBonus: 3.0,
    hapBonus: 2.5,
    tradeBonusPct: 5,
    limitedLabel: 'Wonder Apex',
  },
];

export const ALL_COSMETIC_ITEMS: CosmeticItemDef[] = [
  ...PROFILE_FRAMES,
  ...NAME_EFFECTS,
  ...LEADERBOARD_ANIMATIONS,
  ...THEME_ITEMS,
  ...PREMIUM_ANIMATIONS,
  ...EXCLUSIVE_BADGES,
  ...ACHIEVEMENT_EFFECTS,
  ...PREMIUM_VISUAL_EFFECTS,
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
    diamondsCost: 235,
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
    diamondsCost: 179,
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
    diamondsCost: 225,
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
    diamondsCost: 425,
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
  {
    id: 'bundle_typography_elite',
    name: 'Executive Typography Suite',
    rarity: 'Legendary',
    diamondsCost: 445,
    itemIds: ['nfx_solar_flare', 'nfx_amethyst_royal', 'lb_gold_sweep', 'achfx_gold_wreath'],
    badgeText: 'Update 2.0',
    desc: 'Solar & Amethyst Typography FX paired with Gold Leaderboard Sweep & Laurel Triumph.',
    accentColor: '#fbbf24',
    secondaryColor: '#c084fc',
  },
  {
    id: 'bundle_leaderboard_prestige',
    name: 'Global Ranking Prestige Pack',
    rarity: 'Mythic',
    diamondsCost: 545,
    itemIds: ['lb_diamond_glint', 'nfx_plasma_wave', 'theme_sapphire_monarch', 'pvfx_crystal_refraction'],
    badgeText: 'Apex Value',
    desc: 'Dominate leaderboard style with Diamond Glint row FX, Plasma Type & Sapphire Monarch Theme.',
    accentColor: '#7ee8ff',
    secondaryColor: '#60a5fa',
  },
];

export const RARITY_COLORS: Record<CosmeticRarity, { text: string; border: string; bg: string }> = {
  Common: {
    text: '#cbd5e1',
    border: 'rgba(148, 163, 184, 0.42)',
    bg: 'rgba(148, 163, 184, 0.14)',
  },
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
    lbAnim: raw.lbAnim && owned.has(raw.lbAnim) ? raw.lbAnim : undefined,
    achFx: raw.achFx && owned.has(raw.achFx) ? raw.achFx : undefined,
    premiumVfx: raw.premiumVfx && owned.has(raw.premiumVfx) ? raw.premiumVfx : undefined,
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
    case 'leaderboard_anim':
      return 'lbAnim';
    case 'achievement_fx':
      return 'achFx';
    case 'premium_vfx':
      return 'premiumVfx';
    default:
      return null;
  }
}

export function applyBuyCosmeticItem(
  s: GameState,
  itemId: string,
  autoEquip = true,
  nowMs = Date.now(),
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

  const ts = Math.max(0, Math.floor(Number.isFinite(nowMs) ? nowMs : Date.now()));
  const entry: CosmeticPurchaseHistoryEntry = {
    id: `ch_${ts}_${def.id.slice(0, 12)}`,
    itemId: def.id,
    name: def.name,
    kind: 'item',
    diamondsPaid: check.diamondsCost,
    coinsPaid: check.coinsCost,
    atMs: ts,
  };
  const nextHist = [entry, ...(Array.isArray(s.cosHist) ? s.cosHist : [])].slice(0, 25);

  return {
    ok: true,
    item: def,
    state: {
      ...s,
      gems: Math.max(0, safeGems - check.diamondsCost),
      cash: Math.max(0, safeCash - check.coinsCost),
      cos: nextOwned,
      cosEq: nextEq,
      cosHist: nextHist,
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
    case 'Common':
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
    case 'Common':
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
  nowMs = Date.now(),
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
  const ts = Math.max(0, Math.floor(Number.isFinite(nowMs) ? nowMs : Date.now()));
  const entry: CosmeticPurchaseHistoryEntry = {
    id: `ch_${ts}_${quote.bundle.id.slice(0, 12)}`,
    itemId: quote.bundle.id,
    name: quote.bundle.name,
    kind: 'bundle',
    diamondsPaid: check.diamondsCost,
    coinsPaid: check.coinsCost,
    atMs: ts,
  };
  const nextHist = [entry, ...(Array.isArray(s.cosHist) ? s.cosHist : [])].slice(0, 25);

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
      cosHist: nextHist,
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
export type DxPriceFilter = 'all' | 'diamonds_only' | 'dual_currency' | 'under_100' | 'under_200';
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
  lbAnim?: string;
  achFx?: string;
  premiumVfx?: string;
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
      loadout.lbAnim ||
      loadout.achFx ||
      loadout.premiumVfx ||
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
  if (item.category === 'leaderboard_anim') return loadout.lbAnim === item.id;
  if (item.category === 'achievement_fx') return loadout.achFx === item.id;
  if (item.category === 'premium_vfx') return loadout.premiumVfx === item.id;
  if (item.category === 'theme') return Boolean(item.themeId && loadout.themeId === item.themeId);
  if (item.category === 'diamond_asset') return loadout.landmarkId === item.id;
  return false;
}

function pickFallbackFocusId(next: CosmeticPreviewLoadout): string | undefined {
  if (next.landmarkId) return next.landmarkId;
  if (next.frame) return next.frame;
  if (next.nameEffect) return next.nameEffect;
  if (next.lbAnim) return next.lbAnim;
  if (next.badge) return next.badge;
  if (next.anim) return next.anim;
  if (next.achFx) return next.achFx;
  if (next.premiumVfx) return next.premiumVfx;
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
  } else if (item.category === 'leaderboard_anim') {
    if (active) delete next.lbAnim;
    else next.lbAnim = item.id;
  } else if (item.category === 'achievement_fx') {
    if (active) delete next.achFx;
    else next.achFx = item.id;
  } else if (item.category === 'premium_vfx') {
    if (active) delete next.premiumVfx;
    else next.premiumVfx = item.id;
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
  lbAnim?: string;
  achFx?: string;
  premiumVfx?: string;
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
    loadout.lbAnim,
    loadout.achFx,
    loadout.premiumVfx,
    loadout.themeId,
    loadout.landmarkId,
  ].filter(Boolean);

  return {
    frame: loadout.frame || eq.frame,
    nameEffect: loadout.nameEffect || eq.nameEffect,
    badge: loadout.badge || eq.badge,
    anim: loadout.anim || eq.anim,
    lbAnim: loadout.lbAnim || eq.lbAnim,
    achFx: loadout.achFx || eq.achFx,
    premiumVfx: loadout.premiumVfx || eq.premiumVfx,
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
    leaderboard_anim: LEADERBOARD_ANIMATIONS.length,
    theme: THEME_ITEMS.length,
    animation: PREMIUM_ANIMATIONS.length,
    badge: EXCLUSIVE_BADGES.length,
    achievement_fx: ACHIEVEMENT_EFFECTS.length,
    premium_vfx: PREMIUM_VISUAL_EFFECTS.length,
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
    if (priceFilter === 'under_100' && (item.diamondsCost <= 0 || item.diamondsCost >= 100)) {
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
