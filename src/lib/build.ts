// Which commit this build came from. Railway sets the RAILWAY_GIT_* variables
// during `npm run build` (its clone may not carry .git); local builds ask git.
import { execSync } from 'node:child_process';
import { SITE } from './site';

const git = (args: string): string => {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
};

const fromRailway = Boolean(process.env.RAILWAY_GIT_COMMIT_SHA);
const sha = process.env.RAILWAY_GIT_COMMIT_SHA || git('rev-parse HEAD');
const message = (process.env.RAILWAY_GIT_COMMIT_MESSAGE || (sha ? git('log -1 --format=%s') : '')).split('\n')[0];

export const BUILD = {
  sha,
  short: sha.slice(0, 7),
  message,
  // Uncommitted changes in a local build; never true on Railway.
  dirty: !fromRailway && sha !== '' && git('status --porcelain') !== '',
  date: new Date(),
  url: sha ? `${SITE.repo}/commit/${sha}` : SITE.repo,
};
