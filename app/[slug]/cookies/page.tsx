import { notFound } from 'next/navigation';
import { getPublicSalonPageData } from '@/lib/public-salon';

export const dynamic = 'force-dynamic';

export default async function CookiesPage({ params }: { params: { slug: string } }) {
  const pageData = await getPublicSalonPageData({ slug: params.slug });
  if (!pageData) return notFound();

  const salon = pageData.salon as Record<string, unknown>;
  const legal = (salon.legal_info ?? {}) as Record<string, unknown>;
  const salonName = String(salon.name ?? '').trim() || 'Салонът';
  const domain = String(salon.custom_domain || `${params.slug}.clicka.bg`).trim();
  const contactEmail = String(legal.contactEmail ?? salon.email ?? '').trim() || '—';

  const today = new Date().toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <main style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px 80px', fontFamily: 'system-ui, sans-serif', color: '#1a1a1a', lineHeight: 1.7 }}>
      <a href={`/${params.slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', textDecoration: 'none', marginBottom: 32 }}>
        ← Обратно към {salonName}
      </a>

      <h1>Политика за бисквитки (Cookies)</h1>
      <p><strong>{salonName}</strong> — <a href={`https://${domain}`}>{`https://${domain}`}</a></p>
      <p><em>Последна актуализация: {today}</em></p>

      <h2>1. Какво са бисквитките?</h2>
      <p>
        Бисквитките (cookies) са малки текстови файлове, които се съхраняват на вашето устройство, когато
        посещавате уебсайт. Те позволяват на сайта да запомни вашите действия и предпочитания за определен период
        от време, така че да не се налага да ги въвеждате отново при следващо посещение.
      </p>

      <h2>2. Какви бисквитки използваме</h2>
      <h3>2.1. Задължителни бисквитки</h3>
      <p>
        Тези бисквитки са необходими за нормалното функциониране на сайта. Те не могат да бъдат изключени.
        Използват се за управление на сесиите при резервация и за запазване на вашия избор относно бисквитките.
      </p>
      <ul>
        <li><strong>clicka-cookie-consent</strong> — запазва вашия избор за бисквитки (срок: 1 година).</li>
      </ul>

      <h3>2.2. Функционални бисквитки</h3>
      <p>
        Използват се за подобряване на потребителското изживяване — например за запазване на избрана услуга
        или дата при резервация. Без тях някои функции може да не работят правилно.
      </p>

      <h3>2.3. Аналитични бисквитки</h3>
      <p>
        Може да използваме инструменти за анализ (напр. анонимна статистика за посещенията), за да подобряваме
        сайта. Тези бисквитки се активират само при ваше изрично съгласие.
      </p>

      <h2>3. Бисквитки на трети страни</h2>
      <p>
        Когато отворите карта на Google Maps, Google може да постави свои бисквитки на вашето устройство.
        Тяхното поведение се определя от{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Политиката за поверителност на Google
        </a>
        .
      </p>

      <h2>4. Как да управлявате бисквитките</h2>
      <p>
        Можете да приемете или откажете бисквитките чрез банера, показван при първото ви посещение на сайта.
        Можете да промените избора си по всяко време като изчистите съхранените данни от вашия браузър.
      </p>
      <p>
        Повечето браузъри позволяват управление на бисквитките в настройките. Вижте помощната документация
        на вашия браузър за подробности.
      </p>

      <h2>5. Вашите права</h2>
      <p>
        Имате право да оттеглите съгласието си по всяко време, без да е необходимо да се обаждате или
        изпращате формуляр. Просто изчистете съхранените данни на сайта от браузъра си.
        За въпроси, свързани с обработката на лични данни, се свържете с нас на:{' '}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
      </p>

      <h2>6. Промени в политиката</h2>
      <p>
        Запазваме правото да актуализираме тази политика. При съществени промени ще ви уведомим чрез
        видим банер на сайта. Продължаването на използване на сайта след промените означава приемане
        на актуализираната политика.
      </p>
    </main>
  );
}
