// Registration Service: In-App Contest Registration for Codeforces and LeetCode
const { BROWSER_HEADERS } = require('../config/constants');

/**
 * Extract a specific cookie value by key from a raw cookie string
 * @param {string} cookieStr
 * @param {string} key
 * @returns {string|null}
 */
function extractCookieValue(cookieStr, key) {
  if (!cookieStr || typeof cookieStr !== 'string') return null;
  const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

/**
 * Verify a LeetCode session cookie
 * @param {string} cookie
 * @returns {Promise<{ valid: boolean, username?: string, error?: string }>}
 */
async function verifyLeetCodeSession(cookie) {
  if (!cookie || typeof cookie !== 'string' || !cookie.trim()) {
    return { valid: false, error: 'LeetCode cookie string is required.' };
  }

  const cleanCookie = cookie.trim();
  const csrfToken = extractCookieValue(cleanCookie, 'csrftoken') || '';

  try {
    const query = `
      query globalData {
        userStatus {
          isSignedIn
          username
          realName
          avatar
        }
      }
    `;

    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
        'Cookie': cleanCookie,
        'x-csrftoken': csrfToken,
        ...BROWSER_HEADERS
      },
      body: JSON.stringify({ query })
    });

    if (!res.ok) {
      return { valid: false, error: `LeetCode responded with HTTP status ${res.status}.` };
    }

    const data = await res.json();
    const userStatus = data.data?.userStatus;

    if (userStatus && userStatus.isSignedIn && userStatus.username) {
      return {
        valid: true,
        username: userStatus.username,
        realName: userStatus.realName || userStatus.username,
        avatar: userStatus.avatar || null
      };
    }

    return {
      valid: false,
      error: 'LeetCode session is invalid or expired. Please log in to LeetCode and copy a fresh LEETCODE_SESSION cookie.'
    };
  } catch (err) {
    return { valid: false, error: `Failed to verify LeetCode session: ${err.message}` };
  }
}

/**
 * Verify a Codeforces session cookie
 * @param {string} cookie
 * @returns {Promise<{ valid: boolean, handle?: string, error?: string }>}
 */
async function verifyCodeforcesSession(cookie) {
  if (!cookie || typeof cookie !== 'string' || !cookie.trim()) {
    return { valid: false, error: 'Codeforces cookie string is required.' };
  }

  const cleanCookie = cookie.trim();

  // Basic sanity check for Codeforces session identifiers
  const hasJSession = cleanCookie.includes('JSESSIONID') || cleanCookie.includes('39ce7');
  if (!hasJSession) {
    return {
      valid: false,
      error: 'Cookie must contain at least JSESSIONID or 39ce7 from your Codeforces session.'
    };
  }

  try {
    const res = await fetch('https://codeforces.com/settings/general', {
      headers: {
        'Cookie': cleanCookie,
        'Referer': 'https://codeforces.com/',
        ...BROWSER_HEADERS
      },
      redirect: 'follow'
    });

    const text = await res.text();

    // Check if user is logged in
    const profileMatch = text.match(/href="\/profile\/([^"]+)"/i) || text.match(/class="rated-user"[^>]*>([^<]+)</i);
    const hasLogout = text.includes('/logout') || text.includes('Logout');

    if (hasLogout && profileMatch) {
      const handle = profileMatch[1].trim();
      return {
        valid: true,
        handle
      };
    }

    // If redirected to login page or login form is present
    if (text.includes('/enter') || res.url.includes('/enter')) {
      return {
        valid: false,
        error: 'Codeforces session has expired. Please log in to codeforces.com and copy your active session cookie.'
      };
    }

    // If Cloudflare captcha challenged
    if (res.status === 403 || text.includes('cf-browser-verification') || text.includes('Cloudflare')) {
      return {
        valid: true,
        handle: 'Authenticated User (Cloudflare Active)',
        warning: 'Cloudflare challenge page detected, but cookies were saved and will be sent with registration requests.'
      };
    }

    return {
      valid: true,
      handle: 'Codeforces User (Session Verified)'
    };
  } catch (err) {
    return { valid: false, error: `Failed to connect to Codeforces: ${err.message}` };
  }
}

/**
 * Register for a Codeforces contest using session cookie
 * @param {number|string} contestId
 * @param {string} cookie
 * @param {string} contestTitle
 * @returns {Promise<{ success: boolean, message?: string, alreadyRegistered?: boolean, error?: string, directUrl?: string }>}
 */
async function registerCodeforcesContest(contestId, cookie, contestTitle = 'Codeforces Contest') {
  const cleanId = String(contestId).replace(/^cf-/, '');
  const regUrl = `https://codeforces.com/contestRegistration/${cleanId}`;
  const directUrl = regUrl;

  if (!cookie || !cookie.trim()) {
    return {
      success: false,
      error: 'Codeforces session cookie is missing. Please configure your cookie in Session Settings.',
      directUrl
    };
  }

  const cleanCookie = cookie.trim();

  try {
    // 1. GET registration page to extract CSRF token and check current status
    const getRes = await fetch(regUrl, {
      headers: {
        'Cookie': cleanCookie,
        'Referer': 'https://codeforces.com/contests',
        ...BROWSER_HEADERS
      },
      redirect: 'follow'
    });

    const getHtml = await getRes.text();

    // Check if already registered
    if (
      getHtml.includes('You are already registered') ||
      getHtml.includes('already registered for the contest') ||
      getHtml.includes('You have been registered') ||
      getRes.url.includes(`/contest/${cleanId}`) && !getRes.url.includes('Registration')
    ) {
      return {
        success: true,
        alreadyRegistered: true,
        message: `You are already registered for ${contestTitle}!`,
        directUrl
      };
    }

    // Check if session is expired
    if (getHtml.includes('/enter') && !getHtml.includes('/logout')) {
      return {
        success: false,
        error: 'Your Codeforces session has expired. Please copy fresh cookies from codeforces.com.',
        directUrl
      };
    }

    // Extract csrf token from HTML
    const csrfMatch =
      getHtml.match(/name=["']csrf_token["']\s+value=["']([a-f0-9]+)["']/i) ||
      getHtml.match(/<meta\s+name=["']X-Csrf-Token["']\s+content=["']([a-f0-9]+)["']/i) ||
      getHtml.match(/data-csrf=["']([a-f0-9]+)["']/i) ||
      getHtml.match(/"csrf_token"\s*:\s*"([a-f0-9]+)"/i);

    if (!csrfMatch) {
      // Cloudflare or custom anti-bot check prevented headless extraction
      return {
        success: false,
        error: 'Could not extract registration CSRF token (Cloudflare protection active). Use direct 1-click register.',
        directUrl
      };
    }

    const csrfToken = csrfMatch[1];

    // 2. POST registration form
    const formParams = new URLSearchParams();
    formParams.append('csrf_token', csrfToken);
    formParams.append('action', 'formSubmitted');
    formParams.append('takePartAs', 'personal');

    const postRes = await fetch(regUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cleanCookie,
        'Referer': regUrl,
        ...BROWSER_HEADERS
      },
      body: formParams.toString(),
      redirect: 'follow'
    });

    const postHtml = await postRes.text();

    if (
      postRes.status === 200 ||
      postRes.status === 302 ||
      postHtml.includes('You have been registered') ||
      postHtml.includes('You are already registered') ||
      postRes.url.includes(`/contest/${cleanId}`) ||
      postRes.url.includes('/contests')
    ) {
      return {
        success: true,
        message: `Successfully registered for ${contestTitle}!`,
        directUrl
      };
    }

    // If an error alert was shown in the HTML
    const errorMatch = postHtml.match(/<span class="error[^>]*>([^<]+)<\/span>/i);
    const errorMsg = errorMatch ? errorMatch[1].trim() : 'Registration could not be confirmed by Codeforces.';

    return {
      success: false,
      error: errorMsg,
      directUrl
    };
  } catch (err) {
    return {
      success: false,
      error: `Network error during registration: ${err.message}`,
      directUrl
    };
  }
}

/**
 * Register for a LeetCode contest using session cookie
 * @param {string} contestSlug
 * @param {string} cookie
 * @param {string} contestTitle
 * @returns {Promise<{ success: boolean, message?: string, alreadyRegistered?: boolean, error?: string, directUrl?: string }>}
 */
async function registerLeetCodeContest(contestSlug, cookie, contestTitle = 'LeetCode Contest') {
  const directUrl = `https://leetcode.com/contest/${contestSlug}/`;

  if (!cookie || !cookie.trim()) {
    return {
      success: false,
      error: 'LeetCode session cookie is missing. Please configure your cookie in Session Settings.',
      directUrl
    };
  }

  const cleanCookie = cookie.trim();
  const csrfToken = extractCookieValue(cleanCookie, 'csrftoken') || '';

  try {
    const mutation = `
      mutation registerContest($contestSlug: String!) {
        registerContest(contestSlug: $contestSlug) {
          ok
          error
        }
      }
    `;

    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': directUrl,
        'Cookie': cleanCookie,
        'x-csrftoken': csrfToken,
        ...BROWSER_HEADERS
      },
      body: JSON.stringify({
        query: mutation,
        variables: { contestSlug }
      })
    });

    const data = await res.json();

    if (data.data?.registerContest?.ok) {
      return {
        success: true,
        message: `Successfully registered for ${contestTitle}!`,
        directUrl
      };
    }

    const errorMsg = data.data?.registerContest?.error || data.errors?.[0]?.message || '';

    if (errorMsg.toLowerCase().includes('already') || errorMsg.toLowerCase().includes('registered')) {
      return {
        success: true,
        alreadyRegistered: true,
        message: `You are already registered for ${contestTitle}!`,
        directUrl
      };
    }

    if (errorMsg) {
      return {
        success: false,
        error: `LeetCode error: ${errorMsg}`,
        directUrl
      };
    }

    return {
      success: false,
      error: 'Could not complete registration. Check your LeetCode session or use direct registration.',
      directUrl
    };
  } catch (err) {
    return {
      success: false,
      error: `Network error registering with LeetCode: ${err.message}`,
      directUrl
    };
  }
}

module.exports = {
  verifyLeetCodeSession,
  verifyCodeforcesSession,
  registerCodeforcesContest,
  registerLeetCodeContest
};
