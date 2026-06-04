export type Brand = {
  id: string;
  name: string;
  domain: string;
  category: BrandCategory;
};

export type BrandCategory =
  | 'hair'
  | 'color'
  | 'nails'
  | 'pmu'
  | 'skincare'
  | 'makeup'
  | 'spa'
  | 'depilation'
  | 'lashes';

export const BRAND_CATEGORY_LABELS: Record<BrandCategory, string> = {
  hair: 'Коса',
  color: 'Боя за коса',
  nails: 'Нокти',
  pmu: 'Перманентен грим',
  skincare: 'Козметика за лице',
  makeup: 'Грим',
  spa: 'Масаж & СПА',
  depilation: 'Депилация',
  lashes: 'Мигли',
};

export const ALL_BRANDS: Brand[] = [
  // Hair
  { id: 'loreal-pro', name: "L'Oréal Professionnel", domain: 'lorealprofessionnel.com', category: 'hair' },
  { id: 'wella', name: 'Wella Professionals', domain: 'wella.com', category: 'hair' },
  { id: 'schwarzkopf', name: 'Schwarzkopf Professional', domain: 'schwarzkopf.com', category: 'hair' },
  { id: 'kerastase', name: 'Kérastase', domain: 'kerastase.com', category: 'hair' },
  { id: 'olaplex', name: 'Olaplex', domain: 'olaplex.com', category: 'hair' },
  { id: 'redken', name: 'Redken', domain: 'redken.com', category: 'hair' },
  { id: 'matrix', name: 'Matrix', domain: 'matrix.com', category: 'hair' },
  { id: 'moroccanoil', name: 'Moroccanoil', domain: 'moroccanoil.com', category: 'hair' },
  { id: 'davines', name: 'Davines', domain: 'davines.com', category: 'hair' },
  { id: 'goldwell', name: 'Goldwell', domain: 'goldwell.com', category: 'hair' },
  { id: 'alfaparf', name: 'Alfaparf Milano', domain: 'alfaparfmilano.com', category: 'hair' },
  { id: 'fanola', name: 'Fanola', domain: 'fanola.com', category: 'hair' },
  { id: 'paul-mitchell', name: 'Paul Mitchell', domain: 'paulmitchell.com', category: 'hair' },
  { id: 'joico', name: 'Joico', domain: 'joico.com', category: 'hair' },
  { id: 'framesi', name: 'Framesi', domain: 'framesi.it', category: 'hair' },
  { id: 'revlon-pro', name: 'Revlon Professional', domain: 'revlonprofessional.com', category: 'hair' },
  { id: 'eugene-perma', name: 'Eugene Perma', domain: 'eugene-perma.com', category: 'hair' },
  { id: 'oway', name: 'Oway', domain: 'oway.it', category: 'hair' },
  { id: 'londa', name: 'Londa Professional', domain: 'londa-professional.com', category: 'hair' },
  { id: 'indola', name: 'Indola', domain: 'indola.com', category: 'hair' },
  { id: 'babyliss-pro', name: 'BaByliss Pro', domain: 'babyliss.com', category: 'hair' },
  { id: 'ghd', name: 'GHD', domain: 'ghdhair.com', category: 'hair' },
  { id: 'wahl', name: 'Wahl', domain: 'wahl.com', category: 'hair' },

  // Color
  { id: 'igora', name: 'Schwarzkopf IGORA', domain: 'schwarzkopf.com', category: 'color' },
  { id: 'koleston', name: 'Wella Koleston', domain: 'wella.com', category: 'color' },
  { id: 'inoa', name: "L'Oréal INOA", domain: 'lorealprofessionnel.com', category: 'color' },
  { id: 'majirel', name: "L'Oréal Majirel", domain: 'lorealprofessionnel.com', category: 'color' },
  { id: 'londa-color', name: 'Londa Color', domain: 'londa-professional.com', category: 'color' },
  { id: 'indola-color', name: 'Indola Color', domain: 'indola.com', category: 'color' },
  { id: 'sensido', name: 'Sensido', domain: 'sensido.eu', category: 'color' },
  { id: 'lisap', name: 'Lisap Milano', domain: 'lisap.com', category: 'color' },
  { id: 'kydra', name: 'Kydra', domain: 'kydra.com', category: 'color' },
  { id: 'insight', name: 'Insight Professional', domain: 'insightprofessional.eu', category: 'color' },

  // Nails
  { id: 'opi', name: 'OPI', domain: 'opi.com', category: 'nails' },
  { id: 'essie', name: 'Essie', domain: 'essie.com', category: 'nails' },
  { id: 'cnd', name: 'CND', domain: 'cnd.com', category: 'nails' },
  { id: 'gelish', name: 'Gelish', domain: 'gelish.com', category: 'nails' },
  { id: 'kodi', name: 'Kodi Professional', domain: 'kodiprofessional.com', category: 'nails' },
  { id: 'victoria-vynn', name: 'Victoria Vynn', domain: 'victoriavynn.com', category: 'nails' },
  { id: 'semilac', name: 'Semilac', domain: 'semilac.com', category: 'nails' },
  { id: 'claresa', name: 'Claresa', domain: 'claresa.eu', category: 'nails' },
  { id: 'luxio', name: 'Luxio', domain: 'luxio.com', category: 'nails' },
  { id: 'moyra', name: 'Moyra', domain: 'moyra.hu', category: 'nails' },

  // PMU
  { id: 'phibrows', name: 'PhiBrows', domain: 'phibrows.com', category: 'pmu' },
  { id: 'browxenna', name: 'Browxenna', domain: 'browxenna.com', category: 'pmu' },
  { id: 'nouveau-contour', name: 'Nouveau Contour', domain: 'nouveaucontour.com', category: 'pmu' },
  { id: 'biotek', name: 'Biotek', domain: 'biotek.it', category: 'pmu' },
  { id: 'amiea', name: 'Amiea', domain: 'amiea.com', category: 'pmu' },
  { id: 'biomaser', name: 'Biomaser', domain: 'biomaser.com', category: 'pmu' },
  { id: 'purebeau', name: 'Purebeau', domain: 'purebeau.com', category: 'pmu' },
  { id: 'tina-davies', name: 'Tina Davies', domain: 'tinadavies.com', category: 'pmu' },
  { id: 'perma-blend', name: 'Perma Blend', domain: 'permablend.net', category: 'pmu' },
  { id: 'doreme', name: 'Doreme', domain: 'doreme.com', category: 'pmu' },

  // Skincare
  { id: 'dermalogica', name: 'Dermalogica', domain: 'dermalogica.com', category: 'skincare' },
  { id: 'la-roche-posay', name: 'La Roche-Posay', domain: 'laroche-posay.com', category: 'skincare' },
  { id: 'germaine', name: 'Germaine de Capuccini', domain: 'germainedecapuccini.com', category: 'skincare' },
  { id: 'environ', name: 'Environ', domain: 'environ.com', category: 'skincare' },
  { id: 'gigi', name: 'GIGI Cosmetics', domain: 'gigicosmetics.com', category: 'skincare' },
  { id: 'janssen', name: 'Janssen Cosmetics', domain: 'janssen-cosmetics.com', category: 'skincare' },
  { id: 'mesoestetic', name: 'Mesoestetic', domain: 'mesoestetic.com', category: 'skincare' },
  { id: 'casmara', name: 'Casmara', domain: 'casmara.com', category: 'skincare' },
  { id: 'biodroga', name: 'Biodroga', domain: 'biodroga.de', category: 'skincare' },
  { id: 'repechage', name: 'Repêchage', domain: 'repechage.com', category: 'skincare' },

  // Makeup
  { id: 'mac', name: 'MAC Cosmetics', domain: 'maccosmetics.com', category: 'makeup' },
  { id: 'charlotte-tilbury', name: 'Charlotte Tilbury', domain: 'charlottetilbury.com', category: 'makeup' },
  { id: 'nars', name: 'NARS', domain: 'narscosmetics.com', category: 'makeup' },
  { id: 'make-up-forever', name: 'Make Up For Ever', domain: 'makeupforever.com', category: 'makeup' },
  { id: 'kryolan', name: 'Kryolan', domain: 'kryolan.com', category: 'makeup' },
  { id: 'inglot', name: 'Inglot', domain: 'inglotcosmetics.com', category: 'makeup' },
  { id: 'catrice', name: 'Catrice', domain: 'catrice.eu', category: 'makeup' },

  // Spa & Massage
  { id: 'thalgo', name: 'Thalgo', domain: 'thalgo.com', category: 'spa' },
  { id: 'comfort-zone', name: 'Comfort Zone', domain: 'comfortzoneskin.com', category: 'spa' },
  { id: 'elemis', name: 'Elemis', domain: 'elemis.com', category: 'spa' },
  { id: 'babor', name: 'BABOR', domain: 'babor.com', category: 'spa' },
  { id: 'pevonia', name: 'Pevonia', domain: 'pevonia.com', category: 'spa' },

  // Депилация
  { id: 'rica-wax', name: 'Rica Wax', domain: 'rica.it', category: 'depilation' },
  { id: 'caron', name: 'Caron', domain: 'caronlab.com', category: 'depilation' },
  { id: 'berodin', name: 'Berodin', domain: 'berodin.com', category: 'depilation' },
  { id: 'lycon', name: 'Lycon', domain: 'lycon.com.au', category: 'depilation' },
  { id: 'depileve', name: 'Depilève', domain: 'depileve.com', category: 'depilation' },

  // Мигли
  { id: 'lovely', name: 'Lovely', domain: 'lovelystore.eu', category: 'lashes' },
  { id: 'bombini', name: 'Bombini', domain: 'bombini.pl', category: 'lashes' },
  { id: 'navina', name: 'Navina', domain: 'navina.eu', category: 'lashes' },
  { id: 'lash-me', name: 'Lash Me', domain: 'lashme.eu', category: 'lashes' },
];

export function getBrandsByIds(ids: string[]): Brand[] {
  const set = new Set(ids);
  return ALL_BRANDS.filter((b) => set.has(b.id));
}

export function normalizeBrandDomains(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(String).filter(Boolean);
}
