import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
// import viteImagemin from 'vite-plugin-imagemin'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/admin/' : '/',
  plugins: [
    vue(),
    // Image optimization plugin - commented out for E2E tests
    // viteImagemin({
    //   gifsicle: {
    //     optimizationLevel: 7,
    //     interlaced: false
    //   },
    //   optipng: {
    //     optimizationLevel: 7
    //   },
    //   mozjpeg: {
    //     quality: 80
    //   },
    //   pngquant: {
    //     quality: [0.8, 0.9],
    //     speed: 4
    //   },
    //   svgo: {
    //     plugins: [
    //       {
    //         name: 'removeViewBox',
    //         active: false
    //       },
    //       {
    //         name: 'removeEmptyAttrs',
    //         active: true
    //       }
    //     ]
    //   }
    // })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@xboard/shared': resolve(__dirname, '../shared/src')
    }
  },
  server: {
    port: 5174,
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
          
          // Element Plus - split into smaller chunks
          if (id.includes('node_modules/element-plus')) {
            // Split Element Plus components
            if (id.includes('/es/components/')) {
              const componentName = id.split('/es/components/')[1]?.split('/')[0]
              if (componentName) {
                return `element-plus-${componentName}`
              }
            }
            return 'element-plus-core'
          }
          
          // Charts library
          if (id.includes('node_modules/echarts')) {
            return 'echarts'
          }
          if (id.includes('node_modules/vue-echarts')) {
            return 'vue-echarts'
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
          
          // Icons
          if (id.includes('node_modules/@element-plus/icons-vue')) {
            return 'element-icons'
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
