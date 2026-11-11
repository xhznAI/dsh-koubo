export default [{
  entry: { index: 'src/index.ts', api: 'src/api/index.ts', grok: 'src/grok.ts' },
  outDir: 'lib', format: 'esm', platform: 'node', dts: false, clean: false,
  outputOptions: { entryFileNames: '[name].js', chunkFileNames: 'shared-[name]-[hash].js' },
  deps: { neverBundle: specifier => specifier.startsWith('@deepseek-ai/') || specifier === 'zod' },
}, {
  entry: { client: 'src/client/index.tsx' }, outDir: 'lib', format: 'cjs', platform: 'browser', dts: false, clean: false,
  deps: { neverBundle: specifier => specifier.startsWith('@deepseek-ai/') || specifier === 'react' || specifier === 'react/jsx-runtime' },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: "dsh-koubo", factory: (require) => {',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    footer: 'return module.exports; } });',
  },
}];
