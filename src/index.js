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

function renderCreative(container, data) {
  const link = document.createElement('a');
  link.href = data.click_url;
  link.target = '_blank';
  link.rel = 'noopener';

  const img = document.createElement('img');
  img.src = data.creative_url;

  link.appendChild(img);
  container.innerHTML = '';
  container.appendChild(link);
}

/**
 * @param {{ el: string|Element, placementCode: string, showPlaceholder?: boolean }} options
 * placementCode: a single fixed-length opaque string ("propertyCode-
 *   randomCode", e.g. "ap-...-89abcdef"), shown with a copy button next to
 *   each placement in the Advero dashboard (Placements list) — copy it
 *   as-is, never construct or split it yourself.
 * showPlaceholder: when there's no eligible advertiser creative, the API
 *   returns a placeholder ("Advertise here" banner linking to this
 *   placement's Marketplace listing) instead of a 204. Defaults to true; set
 *   false to render nothing in that case instead.
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

  const url = config.baseUrl + '/ads/serve/' + encodeURIComponent(placementCode);

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
