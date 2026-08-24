import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // `postgres` (porsager) is a plain Node library; keep it out of the bundler.
  serverExternalPackages: ['postgres'],

  // Don't let `next dev` drop generated AGENTS.md / CLAUDE.md files into this
  // folder; this repo keeps its own rules elsewhere.
  agentRules: false,
};

export default nextConfig;
