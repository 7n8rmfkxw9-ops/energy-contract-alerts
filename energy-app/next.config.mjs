/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse (via pdfjs-dist) et tesseract.js utilisent des chemins de
  // module natifs/legacy incompatibles avec le bundling webpack des
  // route handlers — on les charge via require() Node natif à la place.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "tesseract.js"],
  },
};

export default nextConfig;
