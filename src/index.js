/**
 * Advero Web SDK — embedded by publishers to display Advero ads.
 *
 * No default/hardcoded backend domain: the ad-serving base URL is always
 * supplied explicitly by the integrator at init() time (TECHNICAL_DESIGN.md
 * §2.1 — SDK calls GET /ads/* on whatever host the publisher configures).
 */

let config = null;

/**
 * @param {{ baseUrl: string }} options
 * baseUrl: origin (+ optional path prefix) of the Advero ad-serving endpoint,
 *   e.g. "https://ads-advero.domain.com" — no trailing slash required.
 */
function init(options) {
  const opts = options || {};
  const baseUrl = opts.baseUrl;

  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
    throw new Error('AdveroSDK.init: "baseUrl" is required (no default is provided — pass the Advero ad-serving endpoint for your account).');
  }

  config = {
    baseUrl: baseUrl.replace(/\/+$/, ''),
  };
}

function resolveElement(el) {
  if (typeof el === 'string') {
    return document.querySelector(el);
  }
  if (el instanceof Element) {
    return el;
  }
  return null;
}

const BADGE_LABEL = 'Ads by Advero';
const BADGE_ICON_SIZE = 12;
const BADGE_PADDING = 3;
const BADGE_IDLE_OPACITY = '0.5';
const BADGE_ICON_PATH = '/assets/images/favicons/favicon_white.png';

function applyStyles(el, styles) {
  Object.keys(styles).forEach(function (name) {
    el.style[name] = styles[name];
  });
}

/**
 * Small "Ads by Advero" disclosure in the top-right corner of the creative,
 * like Google's AdChoices badge: the Advero icon (served from baseUrl) that
 * expands leftwards to show its label on hover/focus, and opens baseUrl (the
 * Advero home page) in a new tab on click. Styled via element.style only, so
 * a publisher's CSP (style-src) never blocks it. It sits beside the creative's
 * click link, never inside it, so using it is not an ad click.
 */
function renderBadge(baseUrl) {
  const badge = document.createElement('a');
  badge.href = baseUrl;
  badge.target = '_blank';
  badge.rel = 'noopener';
  badge.title = BADGE_LABEL;
  badge.setAttribute('aria-label', BADGE_LABEL);
  applyStyles(badge, {
    position: 'absolute',
    top: '0',
    right: '0',
    zIndex: '2',
    display: 'flex',
    alignItems: 'center',
    height: (BADGE_ICON_SIZE + BADGE_PADDING * 2) + 'px',
    padding: '0 ' + BADGE_PADDING + 'px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    background: '#0f172a',
    borderRadius: '0 0 0 3px',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.35)',
    font: '10px/1 Arial, Helvetica, sans-serif',
    color: '#fff',
    textDecoration: 'none',
    cursor: 'pointer',
    opacity: BADGE_IDLE_OPACITY,
    transition: 'opacity 0.2s ease',
  });

  const label = document.createElement('span');
  label.textContent = BADGE_LABEL;
  applyStyles(label, {
    display: 'block',
    maxWidth: '0',
    padding: '0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    transition: 'max-width 0.2s ease, padding 0.2s ease',
  });

  const icon = document.createElement('img');
  icon.src = baseUrl + BADGE_ICON_PATH;
  icon.alt = '';
  icon.width = BADGE_ICON_SIZE;
  icon.height = BADGE_ICON_SIZE;
  applyStyles(icon, { display: 'block', flex: 'none', width: BADGE_ICON_SIZE + 'px', height: BADGE_ICON_SIZE + 'px', maxWidth: 'none' });

  function setExpanded(value) {
    label.style.maxWidth = value ? '90px' : '0';
    label.style.padding = value ? '0 4px 0 3px' : '0';
    badge.style.opacity = value ? '1' : BADGE_IDLE_OPACITY;
  }
  badge.addEventListener('mouseenter', function () { setExpanded(true); });
  badge.addEventListener('mouseleave', function () { setExpanded(false); });
  badge.addEventListener('focus', function () { setExpanded(true); });
  badge.addEventListener('blur', function () { setExpanded(false); });

  badge.appendChild(label);
  badge.appendChild(icon);
  return badge;
}

function renderCreative(container, data) {
  const link = document.createElement('a');
  link.href = data.click_url;
  link.target = '_blank';
  link.rel = 'noopener';

  const img = document.createElement('img');
  img.src = data.creative_url;
  img.style.display = 'block';
  img.style.maxWidth = '100%';

  link.appendChild(img);

  const frame = document.createElement('div');
  applyStyles(frame, { position: 'relative', display: 'inline-block', maxWidth: '100%', lineHeight: '0' });
  frame.appendChild(link);
  // The house placeholder is not an advertiser's ad, so it carries no disclosure.
  if (!data.placeholder) {
    frame.appendChild(renderBadge(config.baseUrl));
  }

  container.innerHTML = '';
  container.appendChild(frame);
}

/**
 * @param {{ el: string|Element, placementCode: string, showPlaceholder?: boolean, viewer?: { age?: number, gender?: string, expires: number, token: string } }} options
 * placementCode: a single fixed-length opaque string ("propertyCode-
 *   randomCode", e.g. "ap-...-89abcdef"), shown with a copy button next to
 *   each placement in the Advero dashboard (Placements list) — copy it
 *   as-is, never construct or split it yourself.
 * showPlaceholder: when there's no eligible advertiser creative, the API
 *   returns a placeholder ("Advertise here" banner linking to this
 *   placement's Marketplace listing) instead of a 204. Defaults to true; set
 *   false to render nothing in that case instead.
 * viewer: optional signal about the person viewing the page, produced by the
 *   publisher's SERVER (never by this script — the secret must not be in the
 *   page): { age?: number, gender?: 'male'|'female', expires: number (unix
 *   seconds, at most one hour ahead), token: string }. token is
 *   HMAC-SHA256 over "placementCode|age|gender|expires" with the property's
 *   signal secret (shown in the Advero dashboard, Property settings); age
 *   and gender are empty strings when omitted. An invalid or expired signal is
 *   ignored by the server.
 * Fetches a creative for placementCode and renders it into el. No ad
 * available (204) or a network error simply results in nothing being
 * rendered — this is normal, not an error condition, so it never throws.
 */
async function render(options) {
  const opts = options || {};
  const el = opts.el;
  const placementCode = opts.placementCode;
  const showPlaceholder = opts.showPlaceholder !== false;

  if (!config) {
    throw new Error('AdveroSDK.render: call AdveroSDK.init({ baseUrl }) first.');
  }
  if (typeof placementCode !== 'string' || placementCode.trim() === '') {
    throw new Error('AdveroSDK.render: "placementCode" is required.');
  }

  const container = resolveElement(el);
  if (!container) {
    throw new Error('AdveroSDK.render: could not resolve "el" to a DOM element.');
  }

  let url = config.baseUrl + '/ads/serve/' + encodeURIComponent(placementCode);
  const viewer = opts.viewer;
  if (viewer && typeof viewer === 'object' && viewer.token && viewer.expires) {
    const params = new URLSearchParams();
    params.set('va', viewer.age === undefined || viewer.age === null ? '' : String(viewer.age));
    params.set('vg', viewer.gender || '');
    params.set('vexp', String(viewer.expires));
    params.set('vt', String(viewer.token));
    url += '?' + params.toString();
  }

  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    return; // network error — no ad, no throw
  }

  if (response.status === 204 || !response.ok) {
    return; // no eligible ad — normal, not an error
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    return;
  }

  if (!data || !data.creative_url || !data.click_url) {
    return;
  }

  if (data.placeholder && !showPlaceholder) {
    return;
  }

  renderCreative(container, data);
}

const AdveroSDK = { init, render };

export default AdveroSDK;
export { init, render };

if (typeof window !== 'undefined') {
  window.AdveroSDK = AdveroSDK;
}
