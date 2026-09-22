# Examples

Every example uses the placeholder `https://ads-advero.domain.com` for
`baseUrl` and `'YOUR_PLACEMENT_CODE'` (or similar) for `placementCode` —
replace both with your own values before running (see "Getting your
baseUrl/placementCode" in the parent [README](../README.md)). Neither has a
default in the SDK.

| File | Shows |
| --- | --- |
| [`basic.html`](basic.html) | Minimal setup: one `<script>` tag, one ad slot. |
| [`multiple-slots.html`](multiple-slots.html) | One `init()` call, several `render()` calls for different placements on the same page (header, in-article, sidebar). |
| [`lazy-render.html`](lazy-render.html) | Delaying `render()` (and its fetch) until the slot scrolls into view, using `IntersectionObserver`. |
| [`npm-bundler.js`](npm-bundler.js) | Importing the SDK as an ES module when you bundle your own site scripts, instead of loading it from jsDelivr. |

To try an `.html` example locally, serve this directory with any static
server (opening the file directly via `file://` also works, since the SDK
only talks to `baseUrl` over `fetch`) — e.g.:

```bash
npx serve .
```
