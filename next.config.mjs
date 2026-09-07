/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXTAUTH_URL:
      process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.trim() !== ""
        ? process.env.NEXTAUTH_URL
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://otium-uni-hub.vercel.app",
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/print',
        destination: '/print-station',
        permanent: true,
      },
      {
        source: '/whisper',
        destination: '/incognito',
        permanent: true,
      },
      {
        source: '/home',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
