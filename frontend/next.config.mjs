/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "http://backend:3001/api/auth/:path*",
      },
    ];
  },
};

export default nextConfig;
