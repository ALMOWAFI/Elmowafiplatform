import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { createHtmlPlugin } from 'vite-plugin-html'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    
    // HTML optimization plugin
    createHtmlPlugin({
      minify: true,
      inject: {
        data: {
          title: 'Elmowafiplatform - Family Management',
          description: 'AI-powered family memory and travel platform with real-time collaboration',
          themeColor: '#3B82F6'
        }
      }
    }),
    
    // Progressive Web App
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/cdn\./i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Elmowafiplatform',
        short_name: 'Elmowafi',
        description: 'AI-powered family management platform',
        theme_color: '#3B82F6',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    }),
    
    // Bundle analyzer (only in analyze mode)
    process.env.ANALYZE === 'true' && visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Development server optimization
  server: {
    host: true,
    port: 5173,
    cors: true,
    hmr: {
      overlay: false
    }
  },

  // Build optimizations
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // Terser options for better compression
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.trace']
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    
    // Rollup options for advanced chunking
    rollupOptions: {
      output: {
        // Manual chunks for optimal loading
        manualChunks: (id) => {
          // Vendor libraries
          if (id.includes('node_modules')) {
            // Three.js and related 3D libraries
            if (id.includes('three') || id.includes('@react-three') || id.includes('leva')) {
              return 'three-libs'
            }
            
            // Chart and visualization libraries
            if (id.includes('chart') || id.includes('d3') || id.includes('recharts')) {
              return 'chart-libs'
            }
            
            // Map libraries
            if (id.includes('mapbox') || id.includes('leaflet') || id.includes('deck.gl')) {
              return 'map-libs'
            }
            
            // UI libraries
            if (id.includes('lucide-react') || id.includes('framer-motion') || 
                id.includes('@radix-ui') || id.includes('cmdk')) {
              return 'ui-libs'
            }
            
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || 
                id.includes('react-router') || id.includes('react-query')) {
              return 'react-libs'
            }
            
            // Utility libraries
            if (id.includes('date-fns') || id.includes('lodash') || 
                id.includes('axios') || id.includes('zod')) {
              return 'utils-libs'
            }
            
            // AI/ML libraries
            if (id.includes('tensorflow') || id.includes('@tensorflow') || 
                id.includes('langchain') || id.includes('openai')) {
              return 'ai-libs'
            }
            
            // Everything else from node_modules
            return 'vendor'
          }
          
          // Application code chunks
          if (id.includes('src/pages/')) {
            return 'pages'
          }
          
          if (id.includes('src/features/')) {
            return 'features'
          }
          
          if (id.includes('src/components/')) {
            return 'components'
          }
          
          if (id.includes('src/services/')) {
            return 'services'
          }
        },
        
        // Optimize chunk naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            if (facadeModuleId.includes('src/pages/')) {
              return 'assets/pages/[name]-[hash].js'
            }
            if (facadeModuleId.includes('src/features/')) {
              return 'assets/features/[name]-[hash].js'
            }
          }
          return 'assets/[name]-[hash].js'
        },
        
        // Optimize entry and asset naming
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const ext = info[info.length - 1]
          
          if (/\.(woff|woff2|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return 'assets/fonts/[name]-[hash].[ext]'
          }
          
          if (/\.(png|jpe?g|svg|gif|webp|avif)$/i.test(assetInfo.name || '')) {
            return 'assets/images/[name]-[hash].[ext]'
          }
          
          if (ext === 'css') {
            return 'assets/styles/[name]-[hash].[ext]'
          }
          
          return 'assets/[name]-[hash].[ext]'
        }
      },
      
      // External dependencies (CDN)
      external: process.env.CDN_MODE === 'true' ? [
        'react',
        'react-dom',
        'three',
        'chart.js'
      ] : []
    },
    
    // Asset inlining threshold
    assetsInlineLimit: 4096,
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Report compressed size
    reportCompressedSize: true
  },

  // Optimization options
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand',
      'lucide-react'
    ],
    exclude: [
      // Large libraries that should be code split
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'chart.js',
      'mapbox-gl'
    ]
  },

  // CSS processing
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      css: {
        charset: false
      }
    }
  },

  // Environment variables
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  }
})
