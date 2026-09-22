// advero-sdk — usage when bundling your own site scripts (webpack, esbuild,
// Vite, etc.) instead of loading the SDK via a <script> tag from jsDelivr.
//
//   npm install advero-sdk
//
import AdveroSDK from 'advero-sdk';

// Read baseUrl from your own app config/env — never hardcode a default here
// either; this mirrors the SDK's own "no default domain" rule.
AdveroSDK.init({
  baseUrl: process.env.ADVERO_BASE_URL,
});

document.addEventListener('DOMContentLoaded', () => {
  AdveroSDK.render({
    el: '#ad-slot-1',
    placementCode: process.env.ADVERO_PLACEMENT_CODE,
  });
});
