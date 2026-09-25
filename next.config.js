/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PWA service worker is registered manually (see app/layout.tsx + public/sw.js)
  // rather than via a bundler plugin, to keep the build simple and phone-editable.
};

module.exports = nextConfig;
