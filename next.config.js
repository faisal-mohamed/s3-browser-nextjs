// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   // Your existing security settings
//   productionBrowserSourceMaps: false,
//   compiler: {
//     removeConsole: true,
//   },
  
//   // 1. Enable standalone output for minimal Docker images
//   output: 'standalone',
  
//   // 2. Disable powered-by header (removes "X-Powered-By: Next.js")
//   poweredByHeader: false,
  
//   // 3. Enable compression
//   compress: true,
  
//   // 4. Security headers
//   async headers() {
//     return [
//       {
//         // Apply to all routes
//         source: '/(.*)',
//         headers: [
//           {
//             key: 'X-Content-Type-Options',
//             value: 'nosniff'
//           },
//           {
//             key: 'X-Frame-Options',
//             value: 'DENY'
//           },
//           {
//             key: 'X-XSS-Protection',
//             value: '1; mode=block'
//           },
//           {
//             key: 'Referrer-Policy',
//             value: 'strict-origin-when-cross-origin'
//           },
//           {
//             key: 'Permissions-Policy',
//             value: 'camera=(), microphone=(), geolocation=()'
//           },
//           // Only add HSTS if you're using HTTPS
//           // {
//           //   key: 'Strict-Transport-Security',
//           //   value: 'max-age=31536000; includeSubDomains; preload'
//           // }
//         ]
//       }
//     ]
//   },
  
//   // 5. Enhanced webpack configuration
//   webpack: (config, { isServer, dev }) => {
//     // Only apply optimizations in production client-side builds
//     if (!isServer && !dev) {
//       // Enhanced minification
//       config.optimization = {
//         ...config.optimization,
//         minimize: true,
//         concatenateModules: true,
//         usedExports: true,
//         sideEffects: false,
//       };
      
//       // Remove source map references in production
//       config.devtool = false;
//     }
    
//     return config;
//   },
  
//   // 6. Disable ETags (optional - reduces fingerprinting)
//   generateEtags: false,
  
//   // 7. Experimental features for better security
//   experimental: {
//     // Remove server components source maps
//     serverComponentsExternalPackages: [],
//   },
// };


const nextConfig = {
  
};

module.exports = nextConfig;


