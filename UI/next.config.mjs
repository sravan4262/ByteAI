import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output only when building the Docker image.
  // SWA's oryx builder deploys without this env var and gets the standard output.
  // Dockerfile sets ENV NEXT_OUTPUT=standalone before running pnpm build.
  ...(process.env.NEXT_OUTPUT === 'standalone' && { output: 'standalone' }),
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
  devIndicators: false,
}

export default nextConfig
