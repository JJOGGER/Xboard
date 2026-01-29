import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Try to import vite-plugin-imagemin, but make it optional
let viteImagemin: any
try {
  viteImagemin = require('vite-plugin-imagemin').default
} catch (e) {
  console.warn('vite-plugin-imagemin not found, image optimization will be skipped')
}

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/user/' : '/',
  plugins: [
    vue(),
    // Image optimization plugin (optional)
    ...(viteImagemin ? [viteImagemin({
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false
      },
      optipng: {
        optimizationLevel: 7
      },
      mozjpeg: {
        quality: 80
      },
      pngquant: {
        quality: [0.8, 0.9],
        speed: 4
      },
      svgo: {
        plugins: [
          {
            name: 'removeViewBox',
            active: false
          },
          {
            name: 'removeEmptyAttrs',
            active: true
          }
        ]
      }
    })] : [])
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@xboard/shared': resolve(__dirname, '../shared/src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    chunkSizeWarningLimit: 1000, // Warn for chunks larger than 1MB
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core Vue ecosystem
          if (id.includes('node_modules/vue/') || id.includes('node_modules/@vue/')) {
            return 'vue-core'
          }
          if (id.includes('node_modules/vue-router')) {
            return 'vue-router'
          }
          if (id.includes('node_modules/pinia')) {
            return 'pinia'
          }
          
          // Naive UI - keep in a single chunk to avoid circular chunk/runtime init issues.
          // Empirically, splitting Naive UI away from other vendor deps can still create
          // execution-order cycles (TDZ errors). So we bundle Naive UI into the main vendor chunk.
          if (
            id.includes('node_modules/naive-ui') ||
            id.includes('node_modules/css-render') ||
            id.includes('node_modules/@css-render') ||
            id.includes('node_modules/evtd') ||
            id.includes('node_modules/treemate') ||
            id.includes('node_modules/vooks') ||
            id.includes('node_modules/vdirs') ||
            id.includes('node_modules/seemly')
          ) {
            return 'vendor'
          }
          
          // Charts library
          if (id.includes('node_modules/chart.js')) {
            return 'chartjs'
          }
          if (id.includes('node_modules/vue-chartjs')) {
            return 'vue-chartjs'
          }
          
          // Form validation
          if (id.includes('node_modules/vee-validate') || id.includes('node_modules/yup')) {
            return 'form-validation'
          }
          
          // Utilities
          if (id.includes('node_modules/axios')) {
            return 'axios'
          }
          if (id.includes('node_modules/dayjs')) {
            return 'dayjs'
          }
          if (id.includes('node_modules/lodash-es')) {
            return 'lodash'
          }
          
          // QR Code
          if (id.includes('node_modules/qrcode')) {
            return 'qrcode'
          }
          
          // Shared package
          if (id.includes('packages/shared')) {
            return 'xboard-shared'
          }
          
          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
        // Optimize chunk naming
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    minify: 'esbuild'
  }
})
