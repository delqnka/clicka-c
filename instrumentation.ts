export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  // DIAG: temporarily disabled while isolating Barber runtime "__dirname" crash.
  // if (process.env.NEXT_RUNTIME === 'edge') {
  //   await import('./sentry.edge.config');
  // }
}
