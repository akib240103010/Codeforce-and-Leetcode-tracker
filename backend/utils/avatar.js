// Avatar normalization, detection, and SVG placeholder generator

/**
 * Normalizes an avatar URL to ensure valid HTTPS protocol
 * @param {string} url
 * @returns {string}
 */
function normalizeAvatarUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  if (!clean) return '';
  if (clean.startsWith('//')) {
    clean = `https:${clean}`;
  } else if (clean.startsWith('http://')) {
    clean = clean.replace(/^http:\/\//i, 'https://');
  }
  return clean;
}

/**
 * Checks if an avatar URL is a generic placeholder/default image
 * @param {string} url
 * @returns {boolean}
 */
function isDefaultAvatarUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase();
  return lower.includes('no-avatar.jpg') || 
         lower.includes('no-title.jpg') || 
         lower.includes('avatar_none.png');
}

/**
 * Generates an SVG avatar fallback with user's initial and styled gradient
 * @param {string} name
 * @param {string} bgColor1
 * @param {string} bgColor2
 * @returns {string} SVG string
 */
function generateSvgAvatar(name, bgColor1 = '#3b82f6', bgColor2 = '#1d4ed8') {
  const initial = ((name || 'U').charAt(0) || 'U').toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgColor1}" />
        <stop offset="100%" stop-color="${bgColor2}" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="50" fill="url(#avatarGrad)" />
    <text x="50" y="62" font-size="44" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" fill="#ffffff" text-anchor="middle">${initial}</text>
  </svg>`;
}

module.exports = {
  normalizeAvatarUrl,
  isDefaultAvatarUrl,
  generateSvgAvatar
};
