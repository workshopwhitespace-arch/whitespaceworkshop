import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Pin the workspace root; a stray package-lock.json in the home directory
  // otherwise makes Turbopack infer a root above this repo.
  turbopack: { root: path.resolve(__dirname) },
}

export default nextConfig
