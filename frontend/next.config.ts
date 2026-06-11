import type { NextConfig } from "next";

// Force HTTPS for the API URL — ensures no Mixed Content errors in production.
// The NEXT_PUBLIC_API_URL env var is validated and sanitized here at build time.
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://sohaib125-crm-operations-management-system.hf.space';
const safeApiUrl = rawApiUrl.replace(/^http:\/\/(?!localhost)/, 'https://');

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: safeApiUrl,
  },
};

export default nextConfig;
