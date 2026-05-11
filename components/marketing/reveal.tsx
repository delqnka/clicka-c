'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';

const ease = [0.25, 0.1, 0.25, 1] as const;

type RevealProps = HTMLMotionProps<'div'> & {
  children: React.ReactNode;
  delay?: number;
};

export function Reveal({ children, className, delay = 0, ...rest }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 1, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
      transition={{ duration: 0.55, delay, ease }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
