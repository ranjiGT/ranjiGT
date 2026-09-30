const milestones = [2, 16, 128, 1024];
const resultsPerPage = 100;
const maxSearchResults = 1000;

export function summarizePullRequests(pullRequests) {
  const byYear = new Map();
  const byRepository = new Map();

  for (const pullRequest of pullRequests) {
    const year = new Date(pullRequest.closed_at).getUTCFullYear();
    const repository = pullRequest.repository_url
      ?.replace('https://api.github.com/repos/', '')
      .replace(/\/$/, '');

    if (Number.isFinite(year) && repository) {
      byYear.set(year, (byYear.get(year) ?? 0) + 1);
      byRepository.set(repository, (byRepository.get(repository) ?? 0) + 1);
    }
  }

  return {
    byYear: [...byYear].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year),
    byRepository: [...byRepository]
      .map(([repository, count]) => ({ repository, count }))
      .sort((a, b) => b.count - a.count || a.repository.localeCompare(b.repository))
  };
}

export function getPullSharkProgress(totalCount) {
  const currentMilestone = [...milestones].reverse().find((milestone) => totalCount >= milestone) ?? null;
  const nextMilestone = milestones.find((milestone) => totalCount < milestone) ?? null;

  return {
    currentMilestone,
    nextMilestone,
    progressPercent: nextMilestone ? Math.min(100, Math.round((totalCount / nextMilestone) * 100)) : 100
  };
}

export async function fetchMergedPullRequests(username, fetchImpl = fetch) {
  const query = `author:${username} is:pr is:merged`;
  const pullRequests = [];
  let totalCount = 0;

  for (let page = 1; page <= maxSearchResults / resultsPerPage; page += 1) {
    const url = new URL('https://api.github.com/search/issues');
    url.searchParams.set('q', query);
    url.searchParams.set('per_page', String(resultsPerPage));
    url.searchParams.set('page', String(page));

    const response = await fetchImpl(url);
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        throw new Error('GitHub rate limit reached. Wait a little and try again.');
      }
      throw new Error(`GitHub search failed (${response.status}). Check the username and try again.`);
    }

    const data = await response.json();
    if (page === 1) totalCount = data.total_count;
    pullRequests.push(...data.items);

    if (pullRequests.length >= totalCount || data.items.length < resultsPerPage) break;
  }

  return {
    totalCount,
    pullRequests,
    truncated: totalCount > pullRequests.length,
    ...summarizePullRequests(pullRequests)
  };
}