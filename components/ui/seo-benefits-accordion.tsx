'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type Benefit = {
  title: string;
  body: string;
};

export function SeoBenefitsAccordion({ benefits }: { benefits: Benefit[] }) {
  return (
    <Accordion type="single" collapsible defaultValue={benefits[0]?.title} className="w-full">
      {benefits.map((b) => (
        <AccordionItem key={b.title} value={b.title}>
          <AccordionTrigger>{b.title}</AccordionTrigger>
          <AccordionContent>{b.body}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
