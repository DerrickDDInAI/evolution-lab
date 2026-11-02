/** Appearance is browser-local. Never included in arena commands or persistence. */
export const VISUAL_THEMES = [
  {id:'original',name:'Original Glass Tide',description:'The original pearl and teal world, with painted paper controls.',color:'#244e50'},
  {id:'sunseed',name:'Sunseed Garden',description:'Warm cream, sage leaves and coral petals.',color:'#e8d593'},
  {id:'watercolor',name:'Watercolor Glass Tide',description:'Celadon shallows, pearl shells and lilac reeds.',color:'#a9ccc4'},
  {id:'moonbloom',name:'Moonbloom Nursery',description:'Moonlit moss, ivory buds and peach sentinels.',color:'#535e77'},
] as const;
export type VisualThemeId = typeof VISUAL_THEMES[number]['id'];
export const THEME_STORAGE_KEY='immunity-visual-theme';
export function visualTheme(value:unknown):VisualThemeId{
  return VISUAL_THEMES.find(theme=>theme.id===value)?.id??'original';
}
export const themePath=(theme:VisualThemeId,asset:'atlas'|'floor'|'menu'|'sign'|'ground')=>`/immunity/themes/${theme}/${asset}.webp`;
export const themeColors={
  original:{floor:'#7fa6a3',shore:'#e9ddc790',wall:'#eff1d9',ink:'#244d4c',shadow:'#173e4540'},
  sunseed:{floor:'#f3e7bb',shore:'#fff5d77a',wall:'#dfd1a1',ink:'#494728',shadow:'#62623a20'},
  watercolor:{floor:'#e4e7d4',shore:'#f8f0d680',wall:'#f4ecd6',ink:'#254f4d',shadow:'#37656120'},
  moonbloom:{floor:'#a09baa',shore:'#a4a2ba35',wall:'#b6b2aa',ink:'#343c48',shadow:'#1a253c55'},
} as const;
