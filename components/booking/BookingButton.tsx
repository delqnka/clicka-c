'use client';

import React, { forwardRef } from 'react';
import { useBooking } from './useBooking';

export type BookingButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Pre-select this service id when opening the modal. */
  service?: string;
  /** When true, the modal stays focused on only this service. */
  lockService?: boolean;
  /** Optional staff/trainer name used to filter class schedules. */
  staffName?: string;
  trainerName?: string;
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
    { service, lockService, staffName, trainerName, onClick, type = 'button', children, ...rest },
    ref,
  ) {
    const { open } = useBooking();
    return (
      <button
        ref={ref}
        type={type}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) open(service, { lockService, staffName, trainerName });
        }}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
