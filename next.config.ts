import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rfgortcdptfmmonsqjtp.supabase.co',
      },
    ],
  },
 };

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
