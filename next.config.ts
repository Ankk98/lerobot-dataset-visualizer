import type { NextConfig } from "next";
import packageJson from './package.json';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  generateBuildId: () => packageJson.version,
  // Disable React strict mode to prevent double-mounting issues
  reactStrictMode: false,
  // Expose environment variables
  env: {
    NEXT_PUBLIC_USE_LOCAL_DATASETS: process.env.NEXT_PUBLIC_USE_LOCAL_DATASETS,
    NEXT_PUBLIC_LOCAL_DATASETS_PATH: process.env.NEXT_PUBLIC_LOCAL_DATASETS_PATH,
    NEXT_PUBLIC_HF_TOKEN: process.env.NEXT_PUBLIC_HF_TOKEN,
    DATASET_URL: process.env.DATASET_URL,
  },
  // Configure webpack to handle problematic packages
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mock localStorage and other browser APIs on the server
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }
    return config;
  },
};

export default nextConfig;
