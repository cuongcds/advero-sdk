# advero-sdk

Web SDK (JavaScript) that publishers embed on their website to display Advero
ads. No dependencies at runtime — uses the browser's native `fetch` only.

This package is published to npm and served through jsDelivr from GitHub
(see `docs/TECHNICAL_DESIGN.md` §2.1). It talks to the Ad Serving Engine's
`/ads/*` routes (`backend/application/controllers/Ads.php`), which are
authenticated by `placementCode` + a verified `Referer`/domain — not by
cookie/session.

## Install

### Via jsDelivr (recommended for publishers)

```html
<script src="https://cdn.jsdelivr.net/gh/cuongcds/advero-sdk@0.1.1/dist/sdk.min.js"></script>
```

Pin to an exact version tag (`@0.1.1`) rather than `@main` — this avoids a
future breaking release changing behavior on your site without notice.

### Via npm (if you bundle your own site scripts)

```bash
npm install advero-sdk
```

```js
import AdveroSDK from 'advero-sdk';
```

## Usage

The SDK never assumes or defaults the Advero backend's domain — you must
pass your own `baseUrl` explicitly. Replace `https://ads-advero.domain.com`
below with the actual ad-serving endpoint for your Advero account (this is a
placeholder, not a real host).

```html
<div id="ad-slot-1"></div>

<script src="https://cdn.jsdelivr.net/gh/cuongcds/advero-sdk@0.1.1/dist/sdk.min.js"></script>
<script>
  AdveroSDK.init({
    baseUrl: 'https://ads-advero.domain.com', // your Advero ad-serving endpoint — required, no default
  });

  AdveroSDK.render({
    el: '#ad-slot-1',
    placementCode: 'YOUR_PLACEMENT_CODE', // required, no default
  });
</script>
```

Call `init()` once per page. Call `render()` once per ad slot on the page —
each slot has its own `placementCode`.

More end-to-end examples (multiple slots on one page, lazy-rendering a slot
only once it scrolls into view, bundling via npm) are in
[`examples/`](examples/).

### Getting your baseUrl/placementCode

- `baseUrl` is the ad-serving endpoint for your Advero account — ask whoever
  manages your Advero account/deployment for this URL; the SDK has no
  default and will refuse to run without it.
- `placementCode` is a single opaque value (`propertyCode-randomCode`, e.g.
  `ap-0123456789abcdef01234567-89abcdef`) generated for each placement — you
  copy it as-is, never construct or split it yourself:
  1. Log in to Advero and go to your Property's **Placements** list
     (Properties (`/property`) → open your website's Property → **Placements**).
  2. Next to the placement you want to embed, click the copy icon under
     **Placement code**.
  3. Paste that value as `placementCode` below. It only works from the
     domain it belongs to — the request is checked server-side against the
     page's `Referer`, so a code copied for one property's domain will not
     serve ads embedded on a different domain.
  If the property's domain shows as "Not verified" yet, finish domain
  verification first (DNS TXT record or HTML meta tag/file, explained on the
  Property's page) — an unverified domain's placements will not authenticate
  ad requests.

### `AdveroSDK.init({ baseUrl })`

| Option | Required | Description |
| --- | --- | --- |
| `baseUrl` | yes | Origin of the Advero ad-serving endpoint, e.g. `https://ads-advero.domain.com`. Must be supplied by you — the SDK does not hardcode or default to any Advero domain. |

Throws an `Error` immediately if `baseUrl` is missing or empty — this is a
configuration error meant to be caught during integration, not at runtime in
front of real visitors.

### `AdveroSDK.render({ el, placementCode, showPlaceholder })`

| Option | Required | Description |
| --- | --- | --- |
| `el` | yes | A CSS selector string or a DOM `Element` where the ad should be rendered. |
| `placementCode` | yes | The placement's code (`propertyCode-randomCode`), copied from the Placements list. Must be supplied by you — no default. |
| `showPlaceholder` | no | When there's no eligible advertiser creative, the API returns a placeholder ("Advertise here" banner linking to this placement's Marketplace listing) instead of leaving the slot empty. Defaults to `true`. Pass `false` to render nothing in that case instead of the placeholder. |

Behavior:
- On success (`200` with `{ creative_url, click_url }`), renders `<a href="{click_url}" target="_blank" rel="noopener"><img src="{creative_url}"></a>` inside `el`. This also covers the placeholder response (`{ ..., placeholder: true }`) unless `showPlaceholder: false` was passed.
- On `204 No Content` or any network/fetch error, renders nothing and does **not** throw — an empty ad slot is normal (no eligible campaign for that placement right now), not a failure.
- Throws only for integration mistakes: missing/invalid `placementCode`, `el` that doesn't resolve to an element, or calling `render()` before `init()`.

## Build

```bash
npm install
npm run build
```

Produces `dist/sdk.min.js` (+ sourcemap) via esbuild, bundled as an IIFE that
exposes `window.AdveroSDK` when loaded with a plain `<script>` tag.

## Versioning

Semver. Publishers should pin to an exact version tag (e.g. `@0.1.1`) when
loading from jsDelivr, per `docs/TECHNICAL_DESIGN.md` §2.1.
