export const githubAchievementCatalog = [
  { name: 'Pair Extraordinaire', icon: '🤝', availability: 'available' },
  { name: 'Galaxy Brain', icon: '🧠', availability: 'available' },
  { name: 'Public Sponsor', icon: '💖', availability: 'available' },
  { name: 'Heart On Your Sleeve', icon: '❤️', availability: 'available' },
  { name: 'Quickdraw', icon: '⚡', availability: 'available' },
  { name: 'Pull Shark', icon: '🦈', availability: 'available' },
  { name: 'YOLO', icon: '🚀', availability: 'available' },
  { name: 'Starstruck', icon: '⭐', availability: 'available' },
  { name: 'Arctic Code Vault Contributor', icon: '❄️', availability: 'retired' },
  { name: 'Mars 2020 Contributor', icon: '🪐', availability: 'retired' }
];

export const achievementProgressDefinitions = {
  'Pair Extraordinaire': {
    metric: 'Merged co-authored pull requests',
    targets: [1, 10, 24, 48]
  },
  'Galaxy Brain': {
    metric: 'Accepted discussion answers',
    targets: [2, 8, 16, 32]
  },
  'Public Sponsor': {
    metric: 'GitHub Sponsors contributions',
    targets: [1]
  },
  'Heart On Your Sleeve': {
    metric: 'Heart reactions on public issues or pull requests',
    targets: [1]
  },
  Quickdraw: {
    metric: 'Issues or pull requests closed within 5 minutes',
    targets: [1]
  },
  'Pull Shark': {
    metric: 'Merged pull requests',
    targets: [2, 16, 128, 1024],
    source: 'github'
  },
  YOLO: {
    metric: 'Pull requests merged without review',
    targets: [1]
  },
  Starstruck: {
    metric: 'Stars on a single repository',
    targets: [16, 128, 512, 4096]
  }
};

export const tieredAchievementTargets = Object.fromEntries(
  Object.entries(achievementProgressDefinitions).map(([name, definition]) => [name, definition.targets])
);

export function getInitialActivityCounts(achievements = []) {
  const counts = Object.fromEntries(
    Object.keys(achievementProgressDefinitions).map((name) => [name, 0])
  );

  for (const achievement of achievements) {
    const definition = achievementProgressDefinitions[achievement.name];
    if (!definition || definition.source === 'github') continue;
    const level = achievement.level ?? 1;
    counts[achievement.name] = definition.targets[Math.min(level, definition.targets.length) - 1] ?? definition.targets[0];
  }

  return counts;
}

export function getAchievementActivityProgress(activityCount, targets) {
  const count = Math.max(0, Math.floor(activityCount));
  const level = targets.reduce((currentLevel, target, index) => count >= target ? index + 1 : currentLevel, 0);
  const nextTarget = targets[level] ?? null;
  const previousTarget = level === 0 ? 0 : targets[level - 1];

  return {
    level,
    nextTarget,
    remaining: nextTarget === null ? 0 : nextTarget - count,
    progressPercent: nextTarget === null
      ? 100
      : Math.round(((count - previousTarget) / (nextTarget - previousTarget)) * 100)
  };
}

export function getAchievementBreakdown(activityCounts, pullRequestCount = null) {
  return githubAchievementCatalog
    .filter((achievement) => achievement.availability === 'available')
    .map(({ name }) => {
      const definition = achievementProgressDefinitions[name];
      const count = definition.source === 'github'
        ? pullRequestCount
        : Number(activityCounts[name]) || 0;

      if (count === null) {
        return { name, metric: definition.metric, count: null, level: null, nextLevel: null, remaining: null };
      }

      const progress = getAchievementActivityProgress(count, definition.targets);
      return {
        name,
        metric: definition.metric,
        count,
        level: progress.level,
        nextLevel: progress.nextTarget === null ? null : progress.level + 1,
        remaining: progress.remaining
      };
    });
}