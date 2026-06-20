'use client';

import React, { forwardRef } from 'react';
import { useBooking } from './useBooking';

export type BookingButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Pre-select this service id when opening the modal. */
  service?: string;
};

/**
 * Drop-in button that opens the booking modal. Must be used inside a
 * `<BookingProvider>`. Accepts every native `<button>` prop so consumers
 * keep their own classes, styles, ARIA, etc.
 *
 * @example
 *   <BookingButton>Reserve</BookingButton>
 *   <BookingButton service="balayage" className="btn btn_solid">Book balayage</BookingButton>
 */
export const BookingButton = forwardRef<HTMLButtonElement, BookingButtonProps>(
  function BookingButton(
    { service, onClick, type = 'button', children, ...rest },
    ref,
  ) {
    const { open } = useBooking();
    return (
      <button
        ref={ref}
        type={type}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) open(service);
        }}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
