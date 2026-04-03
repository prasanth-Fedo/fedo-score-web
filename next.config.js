/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for camera access on HTTPS (Vercel)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self)",
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
