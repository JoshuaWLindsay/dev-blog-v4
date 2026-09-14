const weatherHost = 'weather\\.joshuawlindsay\\.dev'
const weatherHeaders = [
  { key: 'Cache-Control', value: 'no-store' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/weather/:path*',
        headers: weatherHeaders,
      },
      {
        source: '/',
        has: [{ type: 'host', value: weatherHost }],
        headers: weatherHeaders,
      },
      {
        source: '/full',
        has: [{ type: 'host', value: weatherHost }],
        headers: weatherHeaders,
      },
    ]
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/',
          has: [{ type: 'host', value: weatherHost }],
          destination: '/weather',
        },
        {
          source: '/full',
          has: [{ type: 'host', value: weatherHost }],
          destination: '/weather/full',
        },
      ],
    }
  },
}

export default nextConfig
