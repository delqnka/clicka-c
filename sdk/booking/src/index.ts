/**
 * Public SDK surface for `@clicka/booking`.
 *
 * Recommended (Tier 1) integration:
 *
 *   import { BookingProvider, BookingButton } from '@clicka/booking';
 *   import '@clicka/booking/styles.css';
 *
 *   <BookingProvider salonSlug="urban-by-delyana">
 *     <App />
 *     <BookingButton>Reserve</BookingButton>
 *   </BookingProvider>
 *
 * Or trigger anywhere via the hook:
 *
 *   const { open } = useBooking();
 *   <button onClick={() => open('balayage')}>Book balayage</button>
 *
 * Or with zero React glue — put `data-clicka-book` on any element:
 *
 *   <button data-clicka-book>Reserve</button>
 *   <button data-clicka-book="balayage">Book balayage</button>
 *
 * Advanced — raw widget without provider:
 *
 *   import { BookingWidget } from '@clicka/booking';
 */
export { BookingProvider, BookingContext } from '@/components/booking/BookingProvider';
export type { BookingContextValue, BookingProviderProps } from '@/components/booking/BookingProvider';
export { BookingButton } from '@/components/booking/BookingButton';
export type { BookingButtonProps } from '@/components/booking/BookingButton';
export { useBooking } from '@/components/booking/useBooking';

// Raw widget — kept for advanced consumers who want their own state pipeline.
export { BookingWidget } from '@/components/booking/BookingWidget';
export type {
  BookingWidgetHandle,
  BookingWidgetProps,
  BookingServiceItem,
  PublicStaffMember,
  BookingSuccessDetails,
  OpeningDayRecord,
  BookingBlock,
} from '@/components/booking/types';
