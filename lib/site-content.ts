export type SiteContentBenefitItem = {
  id: string;
  title: string;
  text: string;
};

export type SiteContentPriceItem = {
  id: string;
  name: string;
  price: string;
  text: string;
};

export type SiteContent = {
  benefits: {
    title: string;
    intro: string;
    items: SiteContentBenefitItem[];
  };
  reformer: {
    title: string;
    subtitle: string;
    body: string;
  };
  audience: {
    title: string;
    intro: string;
    items: string[];
    outro: string;
  };
  whyChooseUs: {
    title: string;
    intro: string;
    items: string[];
    outro: string;
  };
  pricing: {
    title: string;
    intro: string;
    items: SiteContentPriceItem[];
    note: string;
  };
  instructors: {
    title: string;
    subtitle: string;
    body: string;
  };
  gallery: {
    title: string;
    subtitle: string;
    body: string;
  };
  contact: {
    title: string;
    subtitle: string;
    body: string;
  };
};

export function defaultSiteContent(locale: 'bg' | 'en' = 'bg'): SiteContent {
  if (locale === 'en') {
    return {
      benefits: {
        title: 'Benefits',
        intro: 'What will you achieve with Reformer Pilates?',
        items: [
          { id: 'benefit-1', title: 'Stronger body', text: 'Builds muscular strength and improves overall physical capacity.' },
          { id: 'benefit-2', title: 'Better posture', text: 'Supports posture and helps reduce neck and back tension.' },
          { id: 'benefit-3', title: 'More flexibility', text: 'Improves joint mobility and range of motion.' },
          { id: 'benefit-4', title: 'Balance and stability', text: 'Develops coordination and control in every movement.' },
          { id: 'benefit-5', title: 'Joint-friendly', text: 'An efficient workout with minimal stress on the joints.' },
          { id: 'benefit-6', title: 'Toned silhouette', text: 'Helps build long, strong and harmoniously shaped muscles.' },
        ],
      },
      reformer: {
        title: 'About Reformer Pilates',
        subtitle: 'More than a workout – a new way to care for your body',
        body: 'Reformer Pilates is a modern training method that combines strength, control, flexibility and balance.',
      },
      audience: {
        title: 'Who is it for?',
        intro: 'Reformer Pilates suits complete beginners as well as active people with training experience.',
        items: ['Beginners', 'Advanced clients', 'People with back discomfort', 'People with sedentary lifestyles', 'Athletes', 'Women and men of all ages'],
        outro: 'Each session can be adapted to your level and goals thanks to the adjustable resistance.',
      },
      whyChooseUs: {
        title: 'Why choose us?',
        intro: 'We believe effective training starts with personal attention.',
        items: [
          'Professional Reformer equipment',
          'Small groups for more personal attention',
          'Certified instructors',
          'Calm, modern and welcoming atmosphere',
          'Individual approach to every session',
        ],
        outro: 'Our mission is to help you feel stronger, more confident and better in your own body.',
      },
      pricing: {
        title: 'Pricing and packages',
        intro: 'Choose a package that matches your goals',
        items: [
          { id: 'price-1', name: 'Single session', price: '', text: 'Perfect if you want to try Reformer Pilates first.' },
          { id: 'price-2', name: '8-session pass', price: '', text: 'A strong option for regular sessions and steady progress.' },
          { id: 'price-3', name: '12-session pass', price: '', text: 'The best choice for building a consistent training rhythm.' },
        ],
        note: 'Add the real prices when the client sends them.',
      },
      instructors: {
        title: 'Our instructors',
        subtitle: 'Professionalism, attention and support',
        body: 'Our certified instructors are with you in every session, helping you move safely and confidently.',
      },
      gallery: {
        title: 'Gallery',
        subtitle: 'An atmosphere that inspires',
        body: 'Explore the studio, the calm atmosphere and the professional Reformer equipment created for a comfortable training experience.',
      },
      contact: {
        title: 'Contacts',
        subtitle: 'Start your transformation today',
        body: 'We are waiting for you at Reset Body Lab – where movement meets balance and training becomes care for the body.',
      },
    };
  }

  return {
    benefits: {
      title: 'Ползи',
      intro: 'Какво ще постигнеш с Reformer Pilates?',
      items: [
        { id: 'benefit-1', title: 'По-силно тяло', text: 'Укрепва мускулатурата и подобрява цялостната физическа сила.' },
        { id: 'benefit-2', title: 'По-добра стойка', text: 'Коригира стойката и намалява напрежението в гърба и врата.' },
        { id: 'benefit-3', title: 'Повече гъвкавост', text: 'Увеличава подвижността на ставите и подобрява обхвата на движение.' },
        { id: 'benefit-4', title: 'Баланс и стабилност', text: 'Развива координацията и контрола върху всяко движение.' },
        { id: 'benefit-5', title: 'Щадящо ставите', text: 'Ефективна тренировка с минимално натоварване върху ставите.' },
        { id: 'benefit-6', title: 'Стегната и оформена фигура', text: 'Помага за изграждането на дълги, силни и хармонично оформени мускули.' },
      ],
    },
    reformer: {
      title: 'За Reformer Pilates',
      subtitle: 'Повече от тренировка – нов начин да се грижиш за тялото си',
      body: 'Reformer Pilates е съвременен метод за тренировка, който съчетава сила, контрол, гъвкавост и баланс.',
    },
    audience: {
      title: 'За кого е подходящ?',
      intro: 'Reformer Pilates е подходящ както за хора без предишен опит, така и за активно спортуващи.',
      items: [
        'Начинаещи',
        'Напреднали',
        'Хора с болки в гърба',
        'Хора със заседнал начин на живот',
        'Спортисти',
        'Жени и мъже на всякаква възраст',
        'Всеки, който иска да подобри силата, гъвкавостта и стойката си',
      ],
      outro: 'Благодарение на регулируемото съпротивление всяка тренировка може да бъде адаптирана според индивидуалното ниво и цели.',
    },
    whyChooseUs: {
      title: 'Защо да изберете Reset Body Lab?',
      intro: 'Ние вярваме, че качествената тренировка започва с индивидуално отношение.',
      items: [
        'Професионални Reformer уреди',
        'Малки групи за повече внимание към всеки клиент',
        'Сертифицирани инструктори',
        'Спокойна, модерна и уютна атмосфера',
        'Индивидуален подход към всяка тренировка',
      ],
      outro: 'Нашата мисия е да ти помогнем да се чувстваш по-силен, по-уверен и по-добре в собственото си тяло.',
    },
    pricing: {
      title: 'Цени и пакети',
      intro: 'Избери пакет, който отговаря на твоите цели',
      items: [
        { id: 'price-1', name: 'Единично посещение', price: '', text: 'Идеално, ако искаш първо да опиташ Reformer Pilates.' },
        { id: 'price-2', name: 'Карта за 8 посещения', price: '', text: 'Подходяща за редовни тренировки и устойчиви резултати.' },
        { id: 'price-3', name: 'Карта за 12 посещения', price: '', text: 'Най-добрият избор за изграждане на постоянен тренировъчен режим.' },
      ],
      note: 'Добави реалните цени, когато клиентът ги изпрати.',
    },
    instructors: {
      title: 'Нашите инструктори',
      subtitle: 'Професионализъм, внимание и отношение',
      body: 'Нашият екип от сертифицирани инструктори ще бъде до теб по време на всяка тренировка. Независимо дали започваш за първи път или вече имаш опит, ще получиш индивидуални насоки, правилна техника и постоянна подкрепа.',
    },
    gallery: {
      title: 'Галерия',
      subtitle: 'Атмосфера, която вдъхновява',
      body: 'Разгледай нашето студио и се потопи в спокойната атмосфера, модерната обстановка и професионалните Reformer уреди.',
    },
    contact: {
      title: 'Контакти',
      subtitle: 'Започни своята трансформация още днес',
      body: 'Очакваме те в Reset Body Lab – мястото, където движението среща баланса, а тренировките се превръщат в грижа за тялото.',
    },
  };
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeString(item)).filter(Boolean);
}

function normalizeBenefitItems(value: unknown, fallback: SiteContentBenefitItem[]) {
  if (!Array.isArray(value)) return fallback;
  const out = value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const title = normalizeString(row.title);
      const text = normalizeString(row.text);
      if (!title && !text) return null;
      return {
        id: normalizeString(row.id) || `benefit-${index + 1}`,
        title,
        text,
      };
    })
    .filter(Boolean) as SiteContentBenefitItem[];
  return out.length > 0 ? out : fallback;
}

function normalizePriceItems(value: unknown, fallback: SiteContentPriceItem[]) {
  if (!Array.isArray(value)) return fallback;
  const out = value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const name = normalizeString(row.name);
      const text = normalizeString(row.text);
      const price = normalizeString(row.price);
      if (!name && !text && !price) return null;
      return {
        id: normalizeString(row.id) || `price-${index + 1}`,
        name,
        price,
        text,
      };
    })
    .filter(Boolean) as SiteContentPriceItem[];
  return out.length > 0 ? out : fallback;
}

export function normalizeSiteContent(raw: unknown, locale: 'bg' | 'en' = 'bg'): SiteContent {
  const fallback = defaultSiteContent(locale);
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const benefitsRaw = row.benefits && typeof row.benefits === 'object' ? (row.benefits as Record<string, unknown>) : {};
  const reformerRaw = row.reformer && typeof row.reformer === 'object' ? (row.reformer as Record<string, unknown>) : {};
  const audienceRaw = row.audience && typeof row.audience === 'object' ? (row.audience as Record<string, unknown>) : {};
  const whyRaw = row.whyChooseUs && typeof row.whyChooseUs === 'object' ? (row.whyChooseUs as Record<string, unknown>) : {};
  const pricingRaw = row.pricing && typeof row.pricing === 'object' ? (row.pricing as Record<string, unknown>) : {};
  const instructorsRaw = row.instructors && typeof row.instructors === 'object' ? (row.instructors as Record<string, unknown>) : {};
  const galleryRaw = row.gallery && typeof row.gallery === 'object' ? (row.gallery as Record<string, unknown>) : {};
  const contactRaw = row.contact && typeof row.contact === 'object' ? (row.contact as Record<string, unknown>) : {};

  return {
    benefits: {
      title: normalizeString(benefitsRaw.title) || fallback.benefits.title,
      intro: normalizeString(benefitsRaw.intro) || fallback.benefits.intro,
      items: normalizeBenefitItems(benefitsRaw.items, fallback.benefits.items),
    },
    reformer: {
      title: normalizeString(reformerRaw.title) || fallback.reformer.title,
      subtitle: normalizeString(reformerRaw.subtitle) || fallback.reformer.subtitle,
      body: normalizeString(reformerRaw.body) || fallback.reformer.body,
    },
    audience: {
      title: normalizeString(audienceRaw.title) || fallback.audience.title,
      intro: normalizeString(audienceRaw.intro) || fallback.audience.intro,
      items: normalizeStringList(audienceRaw.items).length > 0 ? normalizeStringList(audienceRaw.items) : fallback.audience.items,
      outro: normalizeString(audienceRaw.outro) || fallback.audience.outro,
    },
    whyChooseUs: {
      title: normalizeString(whyRaw.title) || fallback.whyChooseUs.title,
      intro: normalizeString(whyRaw.intro) || fallback.whyChooseUs.intro,
      items: normalizeStringList(whyRaw.items).length > 0 ? normalizeStringList(whyRaw.items) : fallback.whyChooseUs.items,
      outro: normalizeString(whyRaw.outro) || fallback.whyChooseUs.outro,
    },
    pricing: {
      title: normalizeString(pricingRaw.title) || fallback.pricing.title,
      intro: normalizeString(pricingRaw.intro) || fallback.pricing.intro,
      items: normalizePriceItems(pricingRaw.items, fallback.pricing.items),
      note: normalizeString(pricingRaw.note) || fallback.pricing.note,
    },
    instructors: {
      title: normalizeString(instructorsRaw.title) || fallback.instructors.title,
      subtitle: normalizeString(instructorsRaw.subtitle) || fallback.instructors.subtitle,
      body: normalizeString(instructorsRaw.body) || fallback.instructors.body,
    },
    gallery: {
      title: normalizeString(galleryRaw.title) || fallback.gallery.title,
      subtitle: normalizeString(galleryRaw.subtitle) || fallback.gallery.subtitle,
      body: normalizeString(galleryRaw.body) || fallback.gallery.body,
    },
    contact: {
      title: normalizeString(contactRaw.title) || fallback.contact.title,
      subtitle: normalizeString(contactRaw.subtitle) || fallback.contact.subtitle,
      body: normalizeString(contactRaw.body) || fallback.contact.body,
    },
  };
}
