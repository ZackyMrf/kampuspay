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
  optimizeDeps: {
    include: ['buffer', '@solana/web3.js', '@solana/wallet-adapter-react'],
  },
})
