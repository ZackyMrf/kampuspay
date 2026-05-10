import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Polyfills Buffer, process, etc. for @solana/web3.js in the browser
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream', 'crypto'],
      globals: { Buffer: true, process: true, global: true },
    }),
  ],
  resolve: {
    // Ensure only one copy of React is bundled (fixes "invalid hook call" with adapters)
    dedupe: ['react', 'react-dom'],
    alias: {
      buffer: path.resolve('./node_modules/buffer'),
    },
  },
  define: {
    'process.env': {},
  },
  build: {
    target: 'es2020',
    cssTarget: 'safari14',
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [
      '@solana/wallet-adapter-react',
      '@solana/web3.js',
      '@supabase/supabase-js',
      'buffer',
      'qrcode.react',
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
    ],
  },
})
