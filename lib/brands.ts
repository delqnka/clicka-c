export type Brand = {
  id: string;
  name: string;
  domain: string;
  category: BrandCategory;
};

export type BrandCategory =
  | 'hair'
  | 'nails'
  | 'pmu'
  | 'skincare'
  | 'makeup'
  | 'spa'
  | 'color';

export const BRAND_CATEGORY_LABELS: Record<BrandCategory, string> = {
  hair: 'Коса',
  color: 'Боя за коса',
  nails: 'Нокти',
  pmu: 'Перманентен грим',
  skincare: 'Козметика за лице',
  makeup: 'Грим',
  spa: 'Масаж & СПА',
};

export const ALL_BRANDS: Brand[] = [
  // Hair
  { id: 'loreal-pro', name: "L'Oréal Professionnel", domain: 'lorealparisusa.com', category: 'hair' },
  { id: 'wella', name: 'Wella Professionals', domain: 'wella.com', category: 'hair' },
  { id: 'schwarzkopf', name: 'Schwarzkopf Professional', domain: 'schwarzkopf.com', category: 'hair' },
  { id: 'kerastase', name: 'Kérastase', domain: 'kerastase.com', category: 'hair' },
  { id: 'olaplex', name: 'Olaplex', domain: 'olaplex.com', category: 'hair' },
  { id: 'redken', name: 'Redken', domain: 'redken.com', category: 'hair' },
  { id: 'matrix', name: 'Matrix', domain: 'matrix.com', category: 'hair' },
  { id: 'paul-mitchell', name: 'Paul Mitchell', domain: 'paulmitchell.com', category: 'hair' },
  { id: 'moroccanoil', name: 'Moroccanoil', domain: 'moroccanoil.com', category: 'hair' },
  { id: 'davines', name: 'Davines', domain: 'davines.com', category: 'hair' },
  { id: 'joico', name: 'Joico', domain: 'joico.com', category: 'hair' },
  { id: 'goldwell', name: 'Goldwell', domain: 'goldwell.com', category: 'hair' },
  { id: 'framesi', name: 'Framesi', domain: 'framesi.it', category: 'hair' },
  { id: 'revlon-pro', name: 'Revlon Professional', domain: 'revlonprofessional.com', category: 'hair' },
  { id: 'alfaparf', name: 'Alfaparf Milano', domain: 'alfaparfmilano.com', category: 'hair' },
  { id: 'nioxin', name: 'Nioxin', domain: 'nioxin.com', category: 'hair' },
  { id: 'fanola', name: 'Fanola', domain: 'fanola.com', category: 'hair' },
  { id: 'bhave', name: 'bhave', domain: 'bhave.com', category: 'hair' },
  { id: 'brillante', name: 'Brillante', domain: 'brillante.bg', category: 'hair' },

  // Color
  { id: 'igora', name: 'Schwarzkopf IGORA', domain: 'schwarzkopf.com', category: 'color' },
  { id: 'koleston', name: 'Wella Koleston', domain: 'wella.com', category: 'color' },
  { id: 'inoa', name: "L'Oréal INOA", domain: 'lorealprofessionnel.com', category: 'color' },
  { id: 'majirel', name: "L'Oréal Majirel", domain: 'lorealprofessionnel.com', category: 'color' },
  { id: 'lisap', name: 'Lisap Milano', domain: 'lisap.com', category: 'color' },
  { id: 'kydra', name: 'Kydra', domain: 'kydra.com', category: 'color' },
  { id: 'insight', name: 'Insight Professional', domain: 'insightprofessional.eu', category: 'color' },

  // Nails
  { id: 'opi', name: 'OPI', domain: 'opi.com', category: 'nails' },
  { id: 'essie', name: 'Essie', domain: 'essie.com', category: 'nails' },
  { id: 'cnd', name: 'CND', domain: 'cnd.com', category: 'nails' },
  { id: 'gelish', name: 'Gelish', domain: 'gelish.com', category: 'nails' },
  { id: 'kodi', name: 'Kodi Professional', domain: 'kodiprofessional.com', category: 'nails' },
  { id: 'ibd', name: 'IBD', domain: 'ibd.com', category: 'nails' },
  { id: 'orly', name: 'ORLY', domain: 'orlybeauty.com', category: 'nails' },
  { id: 'moyra', name: 'Moyra', domain: 'moyra.hu', category: 'nails' },
  { id: 'nailtek', name: 'Nail Tek', domain: 'nailtek.com', category: 'nails' },
  { id: 'patrisa-nail', name: 'Patrisa Nail', domain: 'patrisanail.ru', category: 'nails' },
  { id: 'victoria-vynn', name: 'Victoria Vynn', domain: 'victoriavynn.com', category: 'nails' },

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
  { id: 'mesotherapy', name: 'Mesotherapy Solutions', domain: 'mesotherapy-solutions.com', category: 'skincare' },
  { id: 'inedit', name: 'Inedit Cosmetica', domain: 'ineiditcosmetica.com', category: 'skincare' },
  { id: 'cosmedix', name: 'CosMedix', domain: 'cosmedix.com', category: 'skincare' },
  { id: 'janssen', name: 'Janssen Cosmetics', domain: 'janssen-cosmetics.com', category: 'skincare' },

  // Makeup
  { id: 'mac', name: 'MAC Cosmetics', domain: 'maccosmetics.com', category: 'makeup' },
  { id: 'anastasia', name: 'Anastasia Beverly Hills', domain: 'anastasiabeverlyhills.com', category: 'makeup' },
  { id: 'charlotte-tilbury', name: 'Charlotte Tilbury', domain: 'charlottetilbury.com', category: 'makeup' },
  { id: 'nars', name: 'NARS', domain: 'narscosmetics.com', category: 'makeup' },
  { id: 'urban-decay', name: 'Urban Decay', domain: 'urbandecay.com', category: 'makeup' },
  { id: 'make-up-forever', name: 'Make Up For Ever', domain: 'makeupforever.com', category: 'makeup' },
  { id: 'kryolan', name: 'Kryolan', domain: 'kryolan.com', category: 'makeup' },

  // Spa & Massage
  { id: 'thalgo', name: 'Thalgo', domain: 'thalgo.com', category: 'spa' },
  { id: 'comfort-zone', name: 'Comfort Zone', domain: 'comfortzoneskin.com', category: 'spa' },
  { id: 'elemis', name: 'Elemis', domain: 'elemis.com', category: 'spa' },
  { id: 'babor', name: 'BABOR', domain: 'babor.com', category: 'spa' },
  { id: 'biologique', name: 'Biologique Recherche', domain: 'biologique-recherche.com', category: 'spa' },
];

export function getBrandsByIds(ids: string[]): Brand[] {
  const set = new Set(ids);
  return ALL_BRANDS.filter((b) => set.has(b.id));
}

export function normalizeBrandDomains(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(String).filter(Boolean);
}
