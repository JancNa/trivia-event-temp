/**
 * Returns the full base URL for the app, including the Vite BASE_URL path.
 * Use this instead of window.location.origin so that GitHub Pages sub-paths
 * (e.g. /trivia-event-temp/) are always included.
 */
export function siteBase(): string {
  // import.meta.env.BASE_URL is injected by Vite at build time.
  // In dev it is '/', in GitHub Pages it is '/trivia-event-temp/'.
  const base = import.meta.env.BASE_URL ?? '/';
  // Remove trailing slash so we can append #/route cleanly
  return window.location.origin + base.replace(/\/$/, '');
}

export function playUrl(leaderboardId: string): string {
  return `${siteBase()}/#/play/${leaderboardId}`;
}

export function leaderboardUrl(leaderboardId: string): string {
  return `${siteBase()}/#/leaderboard/${leaderboardId}`;
}
