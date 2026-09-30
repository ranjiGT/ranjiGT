export const githubAchievementCatalog = [
  { name: 'Pair Extraordinaire', availability: 'available' },
  { name: 'Galaxy Brain', availability: 'available' },
  { name: 'Public Sponsor', availability: 'available' },
  { name: 'Quickdraw', availability: 'available' },
  { name: 'Pull Shark', availability: 'available' },
  { name: 'YOLO', availability: 'available' },
  { name: 'Starstruck', availability: 'available' },
  { name: 'Arctic Code Vault Contributor', availability: 'retired' },
  { name: 'Mars 2020 Contributor', availability: 'retired' }
];

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