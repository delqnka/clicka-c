'use client';

import { useContext } from 'react';
import { BookingContext, type BookingContextValue } from './BookingProvider';

/**
 * Access the booking modal from anywhere inside a `<BookingProvider>`.
 *
 * @throws if called outside a `<BookingProvider>` tree.
 */
export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error(
      '[@clicka1/booking] useBooking() must be called inside <BookingProvider>.',
    );
  }
  return ctx;
}
