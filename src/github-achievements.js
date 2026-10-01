import { load } from 'cheerio';

const githubOrigin = 'https://github.com';
const usernamePattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

export function isValidGithubUsername(username) {
  return typeof username === 'string' && usernamePattern.test(username);
}

export function parseGithubAchievements(html, username) {
  const $ = load(html);
  const achievements = [];
  const seen = new Set();

  $('.achievement-badge-sidebar, img[data-hovercard-type="achievement"][alt^="Achievement:"]').each((_, element) => {
    const image = $(element);
    const name = image.attr('alt')?.replace(/^Achievement:\s*/i, '').trim();
    const link = image.closest('a');

    if (!name || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());

    const badge = link.find('.achievement-tier-label').first();
    const countLabel = badge.text().trim();
    const countMatch = countLabel.match(/^x(\d+)$/i);
    const count = countMatch ? Number(countMatch[1]) : null;
    const tier = badge.attr('class')?.match(/achievement-tier-label--([a-z]+)/i)?.[1]?.toLowerCase() ?? null;
    const imageUrl = image.attr('src');
    const href = link.attr('href');

    achievements.push({
      name,
      level: count,
      tier,
      imageUrl: imageUrl ? new URL(imageUrl, githubOrigin).href : null,
      profileUrl: href ? new URL(href, githubOrigin).href : `${githubOrigin}/${encodeURIComponent(username)}?tab=achievements`
    });
  });

  return {
    username,
    profileUrl: `${githubOrigin}/${encodeURIComponent(username)}?tab=achievements`,
    achievements
  };
}

export async function fetchGithubAchievements(username, fetchImpl = fetch) {
  if (!isValidGithubUsername(username)) {
    const error = new Error('Enter a valid GitHub username.');
    error.statusCode = 400;
    throw error;
  }

  let response;
  try {
    response = await fetchImpl(`${githubOrigin}/${encodeURIComponent(username)}`, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'github-achievement-tracker/1.0'
      },
      signal: AbortSignal.timeout(8000)
    });
  } catch (cause) {
    const error = new Error(cause.name === 'TimeoutError'
      ? 'GitHub profile lookup timed out. Try again shortly.'
      : 'Could not reach GitHub. Try again shortly.');
    error.statusCode = 503;
    throw error;
  }

  if (response.status === 404) {
    const error = new Error(`GitHub user "${username}" was not found.`);
    error.statusCode = 404;
    throw error;
  }

  if (!response.ok) {
    const rateLimited = response.status === 403 || response.status === 429;
    const error = new Error(rateLimited
      ? 'GitHub is rate-limiting profile lookups. Try again shortly.'
      : 'GitHub could not provide profile data right now. Try again shortly.');
    error.statusCode = rateLimited ? 503 : 502;
    throw error;
  }

  return parseGithubAchievements(await response.text(), username);
}