/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PWA service worker is registered manually (see app/layout.tsx + public/sw.js)
  // rather than via a bundler plugin, to keep the build simple and phone-editable.
  experimental: {
    // instrumentation.ts (startup env check) — opt-in on Next.js 14,
    // on by default from 15.
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
