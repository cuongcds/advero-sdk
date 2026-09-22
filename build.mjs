import { build } from 'esbuild';

// IIFE build so a plain <script src="..."> tag works without a bundler,
// exposing window.AdveroSDK (also done at runtime in src/index.js).
await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  format: 'iife',
  globalName: 'AdveroSDKBundle',
  outfile: 'dist/sdk.min.js',
  target: ['es2018'],
});

console.log('Built dist/sdk.min.js');
