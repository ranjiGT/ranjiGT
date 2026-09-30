import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchMergedPullRequests,
  getPullSharkProgress,
  summarizePullRequests
} from '../src/pull-shark.js';
import {
  achievementProgressDefinitions,
  getAchievementActivityProgress,
  getInitialActivityCounts,
  getVerifiedAchievements,
  getVerifiedActivityMinimums,
  githubAchievementCatalog,
  tieredAchievementTargets
} from '../src/achievements.js';

test('lists current and retired GitHub achievement types', () => {
  const availableAchievements = githubAchievementCatalog.filter(({ availability }) => availability === 'available');

  assert.equal(availableAchievements.length, 8);
  assert.equal(githubAchievementCatalog.filter(({ availability }) => availability === 'retired').length, 2);
  assert.equal(Object.keys(achievementProgressDefinitions).length, 8);
  assert.ok(availableAchievements.every(({ name }) => achievementProgressDefinitions[name]));
});

test('returns only publicly verified achievements for ranjiGT', () => {
  const achievements = getVerifiedAchievements('ranjiGT');

  assert.equal(achievements.length, 7);
  assert.deepEqual(achievements.find(({ name }) => name === 'Pair Extraordinaire'), {
    name: 'Pair Extraordinaire',
    level: 4
  });
  assert.equal(getVerifiedAchievements('octocat'), null);
  assert.deepEqual(getVerifiedActivityMinimums('ranjiGT'), {
    pairExtraordinaire: 48,
    galaxyBrain: 32
  });
  assert.equal(getVerifiedActivityMinimums('octocat'), null);
  assert.equal(getInitialActivityCounts('octocat')['Pair Extraordinaire'], 0);
  assert.equal(getInitialActivityCounts('ranjiGT').Starstruck, 16);
});

test('calculates remaining Pair Extraordinaire and Galaxy Brain activity', () => {
  assert.deepEqual(getAchievementActivityProgress(4, tieredAchievementTargets['Pair Extraordinaire']), {
    level: 1,
    nextTarget: 10,
    remaining: 6,
    progressPercent: 33
  });
  assert.deepEqual(getAchievementActivityProgress(8, tieredAchievementTargets['Galaxy Brain']), {
    level: 2,
    nextTarget: 16,
    remaining: 8,
    progressPercent: 0
  });
});

test('summarizes merged pull requests by year and repository', () => {
  const report = summarizePullRequests([
    { closed_at: '2024-02-01T12:00:00Z', repository_url: 'https://api.github.com/repos/acme/alpha' },
    { closed_at: '2024-08-15T12:00:00Z', repository_url: 'https://api.github.com/repos/acme/alpha' },
    { closed_at: '2023-11-01T12:00:00Z', repository_url: 'https://api.github.com/repos/acme/beta' }
  ]);

  assert.deepEqual(report.byYear, [
    { year: 2024, count: 2 },
    { year: 2023, count: 1 }
  ]);
  assert.deepEqual(report.byRepository, [
    { repository: 'acme/alpha', count: 2 },
    { repository: 'acme/beta', count: 1 }
  ]);
});

test('reports current and next Pull Shark milestones', () => {
  assert.deepEqual(getPullSharkProgress(100), {
    currentMilestone: 16,
    nextMilestone: 128,
    progressPercent: 78
  });
  assert.deepEqual(getPullSharkProgress(1100), {
    currentMilestone: 1024,
    nextMilestone: null,
    progressPercent: 100
  });
});

test('fetches all available search pages up to the API result limit', async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(new URL(url));
    const page = Number(url.searchParams.get('page'));
    const items = page === 1
      ? Array.from({ length: 100 }, (_, index) => ({
          closed_at: `2024-01-${String((index % 28) + 1).padStart(2, '0')}T12:00:00Z`,
          repository_url: 'https://api.github.com/repos/acme/alpha'
        }))
      : [{
          closed_at: '2025-01-01T12:00:00Z',
          repository_url: 'https://api.github.com/repos/acme/beta'
        }];

    return { ok: true, json: async () => ({ total_count: 101, items }) };
  };

  const report = await fetchMergedPullRequests('octocat', fetchImpl);

  assert.equal(report.totalCount, 101);
  assert.equal(report.pullRequests.length, 101);
  assert.equal(report.truncated, false);
  assert.deepEqual(urls.map((url) => url.searchParams.get('page')), ['1', '2']);
  assert.equal(urls[0].searchParams.get('q'), 'author:octocat is:pr is:merged');
});

test('explains GitHub search rate limits', async () => {
  const fetchImpl = async () => ({ ok: false, status: 403 });

  await assert.rejects(
    fetchMergedPullRequests('octocat', fetchImpl),
    /GitHub rate limit reached/
  );
});