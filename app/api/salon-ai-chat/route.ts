import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { BRAND } from '@/lib/brand';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isCustomSiteBrandsEnabled } from '@/lib/custom-site-features';
import { normalizeServices } from '@/lib/salon-services';
import { normalizeSalonFaqItems } from '@/lib/salon-visitor-info';
import { getBrandsByIds } from '@/lib/brands';
import { parseTimeToMinutes } from '@/lib/booking-time';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type StaffRow = { name: string; role?: string; bio?: string; service_names?: string[] };

const JS_DAY_KEY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function offsetDayISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string { return new Date().toISOString().slice(0, 10); }

async function getSalonFreeSlots(
  salonId: string,
  workingHours: Record<string, { open?: string; close?: string; closed?: boolean }>,
  durationMin: number,
  days = 7,
  slotsPerDay = 4,
): Promise<{ date: string; slots: string[] }[]> {
  const start = todayISO();
  const end = offsetDayISO(days);

  const bookings = await sql`
    SELECT date, time, COALESCE(service_duration, 60) AS duration
    FROM bookings
    WHERE salon_id = ${salonId}
      AND date >= ${start} AND date <= ${end}
      AND status NOT IN ('cancelled', 'completed')
  ` as { date: string; time: string; duration: number }[];

  const bookedByDate = new Map<string, { startMin: number; endMin: number }[]>();
  for (const b of bookings) {
    const startMin = parseTimeToMinutes(b.time) ?? 0;
    const list = bookedByDate.get(b.date) ?? [];
    list.push({ startMin, endMin: startMin + Math.max(5, b.duration) });
    bookedByDate.set(b.date, list);
  }

  const result: { date: string; slots: string[] }[] = [];
  for (let d = 0; d <= days; d++) {
    const dateStr = offsetDayISO(d);
    const jsDay = new Date(dateStr + 'T12:00:00').getDay();
    const dayKey = JS_DAY_KEY[jsDay]!;
    const dayHours = workingHours[dayKey];
    if (!dayHours || dayHours.closed || !dayHours.open || !dayHours.close) continue;

    const openMin = parseTimeToMinutes(dayHours.open) ?? 540;
    const closeMin = parseTimeToMinutes(dayHours.close) ?? 1080;
    const booked = bookedByDate.get(dateStr) ?? [];
    const daySlots: string[] = [];

    for (let t = openMin; t + durationMin <= closeMin && daySlots.length < slotsPerDay; t += 30) {
      if (!booked.some((b) => t < b.endMin && t + durationMin > b.startMin)) {
        daySlots.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
      }
    }

    if (daySlots.length > 0) result.push({ date: dateStr, slots: daySlots });
  }
  return result;
}

async function getStaffFreeSlots(
  salonId: string,
  staffMemberId: string,
  workingHours: Record<string, { open?: string; close?: string; closed?: boolean }>,
  durationMin: number,
  days = 7,
  slotsPerDay = 3,
): Promise<{ date: string; slots: string[] }[]> {
  const start = todayISO();
  const end = offsetDayISO(days);

  const bookings = await sql`
    SELECT date, time, COALESCE(service_duration, 60) AS duration
    FROM bookings
    WHERE salon_id = ${salonId}
      AND staff_member_id = ${staffMemberId}::uuid
      AND date >= ${start} AND date <= ${end}
      AND status NOT IN ('cancelled', 'completed')
  ` as { date: string; time: string; duration: number }[];

  const bookedByDate = new Map<string, { startMin: number; endMin: number }[]>();
  for (const b of bookings) {
    const startMin = parseTimeToMinutes(b.time) ?? 0;
    const list = bookedByDate.get(b.date) ?? [];
    list.push({ startMin, endMin: startMin + Math.max(5, b.duration) });
    bookedByDate.set(b.date, list);
  }

  const result: { date: string; slots: string[] }[] = [];
  for (let d = 0; d <= days; d++) {
    const dateStr = offsetDayISO(d);
    const jsDay = new Date(dateStr + 'T12:00:00').getDay();
    const dayKey = JS_DAY_KEY[jsDay]!;
    const dayHours = workingHours[dayKey];
    if (!dayHours || dayHours.closed || !dayHours.open || !dayHours.close) continue;

    const openMin = parseTimeToMinutes(dayHours.open) ?? 540;
    const closeMin = parseTimeToMinutes(dayHours.close) ?? 1080;
    const booked = bookedByDate.get(dateStr) ?? [];
    const daySlots: string[] = [];

    for (let t = openMin; t + durationMin <= closeMin && daySlots.length < slotsPerDay; t += 30) {
      if (!booked.some((b) => t < b.endMin && t + durationMin > b.startMin)) {
        daySlots.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
      }
    }

    if (daySlots.length > 0) result.push({ date: dateStr, slots: daySlots });
  }
  return result;
}

function cancelPolicyText(hours?: number, action?: string): string {
  if (!hours) return '';
  const actionMap: Record<string, string> = {
    full_refund: 'пълно връщане',
    keep_deposit: 'депозитът се задържа',
    keep_full: 'сумата не се връща',
  };
  return `безплатно отказване до ${hours} ч. преди (след срока — ${actionMap[action ?? ''] ?? 'без връщане'})`;
}

type StaffSlots = { staffName: string; days: { date: string; slots: string[] }[] };

function buildSystemPrompt(
  salon: Record<string, unknown>,
  staff: StaffRow[],
  isTeamPlan: boolean,
  staffSlots: StaffSlots[],
  soloSlots: { date: string; slots: string[] }[],
): string {
  const name = String(salon.name ?? '');
  const category = String(salon.category ?? '');
  const city = String(salon.city ?? '');
  const address = String(salon.address ?? '');
  const phone = String(salon.phone ?? '');
  const about = String(salon.about ?? '');
  const instagram = salon.instagram_username ? `@${salon.instagram_username}` : '';

  // Services with deposit & cancellation policy
  const services = normalizeServices(salon.services);
  const servicesText = services.length > 0
    ? services.map((s) => {
        const parts = [s.name];
        if (s.price) parts.push(`${s.price} €`);
        if (s.duration_min) parts.push(`${s.duration_min} мин`);
        if (s.deposit_amount) parts.push(`депозит ${s.deposit_amount} €`);
        const policy = cancelPolicyText(s.cancel_policy_hours, s.cancel_policy_action);
        if (policy) parts.push(policy);
        return parts.join(' — ');
      }).join('\n')
    : '';

  // Working hours
  let hoursText = '';
  try {
    const wh = salon.working_hours as Record<string, { open: string; close: string; closed: boolean }> | null;
    if (wh) {
      const dayNames: Record<string, string> = {
        monday: 'Понеделник', tuesday: 'Вторник', wednesday: 'Сряда',
        thursday: 'Четвъртък', friday: 'Петък', saturday: 'Събота', sunday: 'Неделя',
      };
      hoursText = Object.entries(wh)
        .map(([day, val]) => val.closed ? `${dayNames[day]}: почивен` : `${dayNames[day]}: ${val.open} — ${val.close}`)
        .join('\n');
    }
  } catch { /* ignore */ }

  // Brands
  const brandIds = isCustomSiteBrandsEnabled() && Array.isArray(salon.brand_domains) ? salon.brand_domains.map(String) : [];
  const brands = isCustomSiteBrandsEnabled() ? getBrandsByIds(brandIds) : [];
  const brandsText = brands.length > 0 ? brands.map((b) => b.name).join(', ') : '';

  // FAQ
  const faqItems = normalizeSalonFaqItems(salon.faq_items);
  const faqText = faqItems.length > 0
    ? faqItems.map((f) => `В: ${f.question}\nО: ${f.answer}`).join('\n\n')
    : '';

  // Offers
  let offersText = '';
  try {
    const offers = salon.offers as { title: string; description?: string; discount?: number }[] | null;
    if (Array.isArray(offers) && offers.length > 0) {
      offersText = offers.map((o) => {
        const parts = [o.title];
        if (o.discount) parts.push(`${o.discount}% отстъпка`);
        if (o.description) parts.push(o.description);
        return parts.join(' — ');
      }).join('\n');
    }
  } catch { /* ignore */ }

  // Staff
  const staffText = staff.length > 0
    ? staff.map((m) => {
        const parts = [m.name];
        if (m.role) parts.push(m.role);
        if (m.service_names && m.service_names.length > 0) parts.push(`(${m.service_names.join(', ')})`);
        return parts.join(' — ');
      }).join('\n')
    : '';

  // Today's date label for context (Sofia timezone = UTC+3)
  const todayBg = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const todayISOBg = todayBg.toISOString().slice(0, 10);
  const todayLabelBg = new Date(todayISOBg + 'T12:00:00').toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Free slots per staff (team plan only)
  const slotsText = staffSlots.length > 0
    ? staffSlots.map((ss) => {
        const dayLines = ss.days.map((d) => {
          const dateObj = new Date(d.date + 'T12:00:00');
          const label = dateObj.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          return `  ${label} [${d.date}]: ${d.slots.join(', ')}`;
        }).join('\n');
        return `${ss.staffName}:\n${dayLines}`;
      }).join('\n\n')
    : '';

  // Solo plan free slots text
  const soloSlotsText = soloSlots.length > 0
    ? soloSlots.map((d) => {
        const dateObj = new Date(d.date + 'T12:00:00');
        const label = dateObj.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        return `  ${label} [${d.date}]: ${d.slots.join(', ')}`;
      }).join('\n')
    : '';

  const noSlotsMsg = `В момента няма заредени свободни часове — попитай клиента кой ден му е удобен и кажи да се обади на ${phone || 'телефона на салона'} за потвърждение.`;

  const bookingInstructions = isTeamPlan ? `
ЗАПИСВАНЕ ДИРЕКТНО В ЧАТ:
Записвай клиентите сам — не ги пращай на линкове. Когато клиент иска час, събери стъпка по стъпка (не всичко наведнъж):
1. Услуга
2. Майстор (ако не посочи — предложи кой е наличен за тази услуга)
3. Дата и час (само от СВОБОДНИТЕ ЧАСОВЕ по-долу — не измисляй!)
4. Ime на клиента
5. Телефон
6. Имейл

Когато имаш ВСИЧКИТЕ 6 потвърдени, отговори САМО с:
<<BOOK:{"staffName":"ИМЕ","serviceName":"УСЛУГА","date":"YYYY-MM-DD","time":"HH:MM","clientName":"ИМЕ","clientPhone":"ТЕЛЕФОН","clientEmail":"ИМЕЙЛ","depositAmount":ДЕПОЗИТ_ИЛИ_0}>>
(ДЕПОЗИТ_ИЛИ_0 = числото от депозита на услугата от списъка с услуги, или 0 ако няма депозит)

${slotsText ? `СВОБОДНИ ЧАСОВЕ (следващите 7 дни):\n${slotsText}` : noSlotsMsg}` : `
ЗАПИСВАНЕ ДИРЕКТНО В ЧАТ:
Записвай клиентите сам — не ги пращай на линкове. Когато клиент иска час, събери стъпка по стъпка (не всичко наведнъж):
1. Услуга (от списъка)
2. Дата и час (само от СВОБОДНИТЕ ЧАСОВЕ по-долу — не измисляй!)
3. Ime на клиента
4. Телефон
5. Имейл

Когато имаш ВСИЧКИТЕ 5 потвърдени, отговори САМО с:
<<BOOK:{"staffName":"","serviceName":"УСЛУГА","date":"YYYY-MM-DD","time":"HH:MM","clientName":"ИМЕ","clientPhone":"ТЕЛЕФОН","clientEmail":"ИМЕЙЛ","depositAmount":ДЕПОЗИТ_ИЛИ_0}>>
(ДЕПОЗИТ_ИЛИ_0 = числото от депозита на услугата от списъка с услуги, или 0 ако няма депозит)

${soloSlotsText ? `СВОБОДНИ ЧАСОВЕ (следващите 7 дни):\n${soloSlotsText}` : noSlotsMsg}`;

  const depositServices = normalizeServices(salon.services).filter((s) => s.deposit_amount && s.deposit_amount > 0);
  const depositRule = depositServices.length > 0
    ? `УСЛУГИ С ДЕПОЗИТ — СПЕЦИАЛНО ПРАВИЛО (ВАЖНО!):
Следните услуги изискват онлайн депозит при записване: ${depositServices.map((s) => `${s.name} (депозит ${s.deposit_amount} €)`).join(', ')}.
Когато клиент иска да се запише за такава услуга — НЕ събирай данни в чата. ВЕДНАГА отговори с едно изречение обяснение + бутон за записване:
<<BOOK_LINK:ИМЕ_НА_УСЛУГАТА>>
Пример: "Боядисването на корен изисква депозит от 1 € при записване — натисни бутона по-долу за да избереш час и платиш депозита:<<BOOK_LINK:Боядисване на корен>>"
НЕ задавай въпроси, НЕ събирай имена/телефони — директно показвай бутона.`
    : '';

  const bookingLinkRule = 'Записвай директно в чата — не пращай клиента на линк (ОСВЕН за услуги с депозит — за тях използвай <<BOOK_LINK:>>)';

  const contactRule = `АНУЛИРАНЕ / ПРОМЯНА НА ЧАС — СПЕЦИАЛНО ПРАВИЛО:
Когато клиент иска да анулира или промени резервация:
1. Кажи: "Разбира се! За да уведомя салона, трябва ми само твоето име и телефон."
2. Събери: име и телефон (стъпка по стъпка)
3. Когато имаш И ДВЕТЕ, отговори САМО с:
<<CONTACT_REQUEST:{"clientName":"ИМЕ","clientPhone":"ТЕЛЕФОН","reason":"анулиране/промяна на час"}>>
НЕ казвай нищо друго освен тага — фронтендът ще покаже потвърждение автоматично.`;

  return `Ти си рецепционист на "${name}"${city ? ` в ${city}` : ''} — отговаряш като истински служител на салона, не като бот.

ДНЕС Е: ${todayLabelBg} [${todayISOBg}]. Използвай това за "утре", "вдругиден", имена на дни и т.н.

ТВОЯТА ЦЕЛ: Всеки разговор да завърши с резервация. Ти не просто отговаряш на въпроси — ти водиш клиента към записване.

КАК СЕ ДЪРЖИШ:
- Кратки, човешки отговори — 1-3 изречения максимум
- Задавай по ЕДИН уточняващ въпрос наведнъж — не бомбардирай с въпроси
- Предлагай конкретни часове директно ("Имам свободно в сряда в 10:00 и 12:30 — кое ви е удобно?")
- Използвай емоджита пестеливо (😊 при топли отговори, не при всяко изречение)
- Датите пиши само в човешки формат (напр. "събота, 13 юни") — НИКОГА не показвай ISO формат [YYYY-MM-DD] на клиента

КОНСУЛТАТИВЕН ПОДХОД — ЗАДЪЛЖИТЕЛЕН, БЕЗ ИЗКЛЮЧЕНИЕ:
Когато клиент изрази желание ("искам да стана блондинка", "искам да боядисам косата", "искам нещо с косата", "искам да си направя нокти" и т.н.) — НИКОГА не отговаряш само с "Чудесно!" или "Разбира се!" и спираш. Това е ЗАБРАНЕНО. ЗАДЪЛЖИТЕЛНО веднага задаваш конкретен уточняващ въпрос в СЪЩОТО съобщение.

Формула: [топло потвърждение — 3-5 думи] + [конкретен уточняващ въпрос]

Примери:
- "Искам да стана блондинка" → "Чудесно! Косата ви къса, средна или дълга е?"
  → след отговора: "Пълно изрусяване или балеаж/кичури?"
  → след отговора: препоръчай точна услуга от списъка + предложи конкретен час

- "Искам да изруся косата" → "С удоволствие! Каква е дължината на косата ви?"

- "Искам нещо различно с косата" → "Звучи вълнуващо! Мислите ли за цвят, прическа или нещо друго?"

- "Колко ще ми струва боядисването?" → "Зависи от дължината — косата ви къса, средна или дълга е?"

- "Имате ли свободно утре?" → "Да проверя! Каква процедура ви интересува?"

Правило: Идентифицирай намерението → задай 1 уточняващ въпрос → (след отговор) задай още 1 ако трябва → препоръчай услуга → предложи час

НИКОГА НЕ ПРАВИШ:
- НЕ отговаряш само с "Чудесно!", "Разбира се!", "С удоволствие!" — ВИНАГИ добавяш въпрос
- Не казваш "Изберете услуга" или "Коя услуга искате?" — задавай конкретни въпроси
- Не препращаш към линкове, освен ако клиентът изрично ги поиска
- Не изброявaш всички услуги без причина
- Не казваш "нямам информация" — ако нещо не знаеш, попитай клиента или предложи да се обади на ${phone || 'телефона на салона'}
- Не измисляш услуги, цени, часове или имена извън предоставените данни

${about ? `ЗА САЛОНА:\n${about}\n` : ''}
${staffText ? `ЕКИП:\n${staffText}\n` : ''}
${servicesText ? `УСЛУГИ И ЦЕНИ:\n${servicesText}\n` : ''}
${hoursText ? `РАБОТНО ВРЕМЕ:\n${hoursText}\n` : ''}
${address ? `АДРЕС: ${address}${city ? `, ${city}` : ''}\n` : ''}
${phone ? `ТЕЛЕФОН: ${phone}\n` : ''}
${instagram ? `INSTAGRAM: ${instagram}\n` : ''}
${brandsText ? `РАБОТИМ С: ${brandsText}\n` : ''}
${offersText ? `АКТУАЛНИ ОФЕРТИ:\n${offersText}\n` : ''}
${faqText ? `ЧЕСТИ ВЪПРОСИ:\n${faqText}\n` : ''}
${bookingInstructions}

${depositRule ? `${depositRule}\n` : ''}${contactRule}

ДОПЪЛНИТЕЛНИ ПРАВИЛА:
- Отговаряй само за "${name}"
- ${bookingLinkRule}`;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  try {
    const { salonId, messages } = await req.json() as { salonId: string; messages: ChatMessage[] };

    if (!salonId || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid' }, { status: 400 });
    }

    // Run rate limit check + salon lookup + offers + staff all in parallel
    const [rlResult, salonRows, offersRows, staffRows] = await Promise.all([
      checkRateLimit('salon-ai-chat', ip, 20, 60 * 1000),
      sql`
        SELECT CAST(id AS text) AS id, name, category, city, address, phone, about,
               instagram_username, services, working_hours, brand_domains, faq_items,
               plan, email, telegram_chat_id, owner_name
        FROM salons
        WHERE CAST(id AS text) = ${salonId} AND is_active = true
        LIMIT 1
      ` as Promise<Record<string, unknown>[]>,
      sql`
        SELECT title, description, discount FROM salon_offers
        WHERE salon_id = ${salonId} AND is_active = true
        ORDER BY created_at DESC LIMIT 5
      `.catch(() => []) as Promise<Record<string, unknown>[]>,
      sql`
        SELECT CAST(sm.id AS text) AS id, sm.name, sm.role, sm.bio,
          ARRAY(
            SELECT svc->>'name'
            FROM jsonb_array_elements(salons.services) AS svc
            JOIN staff_services ss ON ss.service_id = svc->>'id'
            WHERE ss.staff_member_id = sm.id
          ) AS service_names
        FROM staff_members sm
        JOIN salons ON salons.id = sm.salon_id
        WHERE sm.salon_id = ${salonId} AND sm.is_active = true
        ORDER BY sm.created_at ASC
        LIMIT 20
      `.catch(() => []) as Promise<(StaffRow & { id: string })[]>,
    ]);

    if (rlResult.limited) return NextResponse.json({ error: 'Твърде много заявки. Опитай след малко.' }, { status: 429 });
    if (salonRows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const salon = salonRows[0]!;
    salon.offers = offersRows;
    const staff = staffRows as (StaffRow & { id: string })[];

    const isTeamPlan = String(salon.plan ?? '') === 'team';
    const wh = (salon.working_hours as Record<string, { open?: string; close?: string; closed?: boolean }> | null) ?? {};
    let staffSlots: StaffSlots[] = [];
    let soloSlots: { date: string; slots: string[] }[] = [];

    if (isTeamPlan && staff.length > 0) {
      staffSlots = (await Promise.allSettled(
        staff.map(async (sm) => {
          const days = await getStaffFreeSlots(salonId, sm.id, wh, 60, 14);
          return { staffName: sm.name, days };
        }),
      )).flatMap((r) => r.status === 'fulfilled' ? [r.value] : []);
    } else if (!isTeamPlan) {
      soloSlots = await getSalonFreeSlots(salonId, wh, 60, 14).catch(() => []);
    }

    const systemPrompt = buildSystemPrompt(salon, staff, isTeamPlan, staffSlots, soloSlots);

    const models = ['google/gemini-2.5-flash', 'google/gemini-2.0-flash', 'anthropic/claude-haiku-4-5'];
    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-8),
    ];

    let reply = 'Нещо се обърка. Опитай пак.';
    for (const model of models) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      let res: Response;
      try {
        res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': BRAND.siteUrl,
          },
          body: JSON.stringify({
            model,
            max_tokens: 300,
            ...(model.startsWith('google/') ? { thinking: { type: 'disabled' } } : {}),
            messages: chatMessages,
          }),
        });
      } catch (err) {
        clearTimeout(timeout);
        console.warn(`[salon-ai-chat] timeout/error on ${model}, trying next`, err);
        continue;
      }
      clearTimeout(timeout);

      const data = await res.json() as { choices?: { message?: { content?: string } }[]; error?: { code?: number } };
      const is429 = (!res.ok && res.status === 429)
        || (data.error && (data.error as { code?: number }).code === 429);

      if (is429) {
        console.warn(`[salon-ai-chat] 429 on ${model}, trying next`);
        continue;
      }
      if (!res.ok || data.error) {
        console.error('[salon-ai-chat] OpenRouter error', res.status, JSON.stringify(data));
      }
      reply = data.choices?.[0]?.message?.content ?? reply;
      break;
    }

    return NextResponse.json({ message: reply });
  } catch (e) {
    console.error('[salon-ai-chat]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
