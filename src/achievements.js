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

export const tieredAchievementTargets = {
  'Pair Extraordinaire': [1, 10, 24, 48],
  'Galaxy Brain': [2, 8, 16, 32]
};

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