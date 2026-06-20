/** @type {import('tailwindcss').Config} */
// Tailwind config used ONLY to compile the SDK's CSS bundle (dist/booking.css).
// Content globs follow the booking + transitive sibling components so every
// utility used inside the modal ends up in the output stylesheet.
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const r = (p) => path.join(repoRoot, p);

module.exports = {
  content: [
    r('components/booking/**/*.{ts,tsx}'),
    r('components/salon/SalonBookingModal.tsx'),
    r('components/salon/BookingSuccessView.tsx'),
    r('components/salon/service-category-tabs.tsx'),
  ],
  // No `darkMode: 'class'` — leave that to consumer site.
  theme: {
    extend: {},
  },
  plugins: [],
};
