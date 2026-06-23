export function isCustomSiteBlogEnabled() {
  return process.env.CLICKA_ENABLE_CUSTOM_SITE_BLOG === '1';
}

export function isCustomSiteBrandsEnabled() {
  return process.env.CLICKA_ENABLE_CUSTOM_SITE_BRANDS === '1';
}
