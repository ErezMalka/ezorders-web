/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Chromium is a binary and a pile of brotli archives, not JavaScript. Left to
  // the bundler it gets rewritten into something that no longer knows where its
  // own files are. Both packages are loaded at runtime instead, from node_modules.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],

  // And the binary itself has to be told to come along. Nothing imports these
  // files — the package unpacks them by path at runtime — so the tracer cannot
  // see them, and a function deployed without them is a function whose PDF step
  // quietly returns nothing. Only the one route that prints needs them.
  outputFileTracingIncludes: {
    "/c/[token]": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};
module.exports = nextConfig;