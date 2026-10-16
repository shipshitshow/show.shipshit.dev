/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";

const nextConfig = {
  images: {
    // Assets are already delivered by the configured CDN/origin.
    unoptimized: true,
    localPatterns: [
      { pathname: "/api/public/channel-art" },
      {
        pathname: "/api/og/livestreams/**",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "**.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "preview.redd.it",
      },
      {
        protocol: "https",
        hostname: "**.redd.it",
      },
    ],
  },
  allowedDevOrigins: ["127.0.0.1"],
  experimental: isProduction
    ? {}
    : {
        cpus: 2,
      },
  async redirects() {
    return [
      {
        destination: "/analytics",
        permanent: false,
        source: "/review",
      },
      {
        source: "/",
        has: [{ type: "host", value: "live.shipshit.dev" }],
        destination: "https://show.shipshit.dev",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "live.shipshit.dev" }],
        destination: "https://show.shipshit.dev/:path*",
        permanent: true,
      },
    ];
  },
  ...(isProduction
    ? {
        outputFileTracingIncludes: {
          "/*": ["./data/livestream/**/*"],
        },
      }
    : {}),
};

export default nextConfig;
