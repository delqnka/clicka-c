'use client';

import { motion } from 'framer-motion';
import { Bot, CalendarClock, LayoutTemplate, Link2, Percent, Rocket } from 'lucide-react';
import { Reveal } from '@/components/marketing/reveal';

const services = [
  {
    id: 'site',
    title: 'Професионален сайт',
    kicker: 'Дизайн и скорост',
    body: 'Изчистена визия, мобилен изглед и бързо зареждане. Твоят бранд на преден план — без шум.',
    icon: LayoutTemplate,
  },
  {
    id: 'booking',
    title: 'Резервации 24/7',
    kicker: 'Онлайн, директно при теб',
    body: 'Клиентите избират услуга, час и дата. Заявката идва при теб — без телефонен хаос в кабинала.',
    icon: CalendarClock,
  },
  {
    id: 'ai',
    title: '24/7 ai рецепционист',
    kicker: 'Автоматизация',
    body: 'Подсказва свободни часове и приема записвания, докато ти си с гост. По-малко „секретарка“, повече фокус върху работата ти.',
    icon: Bot,
  },
  {
    id: 'commission',
    title: '0 % комисионна',
    kicker: 'Приходът е твой',
    body: 'Не плащаш процент от всеки час към посредник. Онлайн резервациите не „ядат“ маржа ти.',
    icon: Percent,
  },
  {
    id: 'brand',
    title: 'Твоят линк и визия',
    kicker: 'Независимост',
    body: 'Собствен адрес и подредба, които изглеждат като теб — не като още един профил в чужда витрина.',
    icon: Link2,
  },
  {
    id: 'launch',
    title: 'Старт за минути',
    kicker: 'Без седмици чакане',
    body: 'От ценоразписа до линка стъпка по стъпка — готов за по-малко от 15 минути, за да пуснеш часовете още днес.',
    icon: Rocket,
  },
] as const;

export function ServicesSection() {
  return (
    <section
      id="services"
      className="relative border-t border-white/[0.06] py-24 sm:py-32"
      aria-labelledby="services-title"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">Какво получаваш</p>
          <h2
            className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl"
            id="services-title"
          >
            Сайт и спокойствие в един пакет.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.id} delay={i * 0.05}>
                <motion.article
                  className="glass panel-hover flex h-full min-h-[280px] flex-col rounded-3xl p-6 sm:p-8"
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    <Icon className="h-4 w-4 text-accent" aria-hidden />
                  </div>
                  <p className="mt-6 text-xs text-white/40">{s.kicker}</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-white">{s.title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-white/55">{s.body}</p>
                </motion.article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
