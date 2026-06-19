export function isEngineOnlyMode() {
  const raw = process.env.CLICKA_ENGINE_ONLY ?? process.env.ENGINE_ONLY ?? '';
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}
