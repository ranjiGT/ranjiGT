export const githubAchievementCatalog = [
  { name: 'Pair Extraordinaire', availability: 'available' },
  { name: 'Galaxy Brain', availability: 'available' },
  { name: 'Public Sponsor', availability: 'available' },
  { name: 'Heart On Your Sleeve', availability: 'available' },
  { name: 'Quickdraw', availability: 'available' },
  { name: 'Pull Shark', availability: 'available' },
  { name: 'YOLO', availability: 'available' },
  { name: 'Starstruck', availability: 'available' },
  { name: 'Arctic Code Vault Contributor', availability: 'retired' },
  { name: 'Mars 2020 Contributor', availability: 'retired' }
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

const verifiedAchievements = new Map([
  ['pair extraordinaire', 4],
  ['galaxy brain', 4],
  ['public sponsor', null],
  ['quickdraw', null],
  ['pull shark', 3],
  ['yolo', null],
  ['starstruck', null]
]);

export function getVerifiedAchievements(username) {
  if (username.toLowerCase() !== 'ranjigt') return null;

  return githubAchievementCatalog
    .filter((achievement) => verifiedAchievements.has(achievement.name.toLowerCase()))
    .map(({ name }) => ({ name, level: verifiedAchievements.get(name.toLowerCase()) }));
}

export function getVerifiedActivityMinimums(username) {
  const achievements = getVerifiedAchievements(username);
  if (!achievements) return null;

  const levels = new Map(achievements.map(({ name, level }) => [name, level]));
  return {
    pairExtraordinaire: tieredAchievementTargets['Pair Extraordinaire'][levels.get('Pair Extraordinaire') - 1],
    galaxyBrain: tieredAchievementTargets['Galaxy Brain'][levels.get('Galaxy Brain') - 1]
  };
}

export function getInitialActivityCounts(username) {
  const counts = Object.fromEntries(
    Object.keys(achievementProgressDefinitions).map((name) => [name, 0])
  );
  const verified = getVerifiedAchievements(username);

  for (const achievement of verified ?? []) {
    const definition = achievementProgressDefinitions[achievement.name];
    if (!definition || definition.source === 'github') continue;
    const level = achievement.level ?? 1;
    counts[achievement.name] = definition.targets[level - 1] ?? definition.targets[0];
  }

  const minimums = getVerifiedActivityMinimums(username);
  if (minimums) {
    counts['Pair Extraordinaire'] = minimums.pairExtraordinaire;
    counts['Galaxy Brain'] = minimums.galaxyBrain;
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