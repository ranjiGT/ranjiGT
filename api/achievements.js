import { fetchGithubAchievements } from '../src/github-achievements.js';

const allowedOrigins = new Set([
  'https://ranjigt.github.io',
  'http://localhost:3000',
  'http://localhost:8000',
  'http://localhost:8005',
  ...(process.env.ACHIEVEMENTS_ALLOWED_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean)
]);

export default async function handler(request, response) {
  const origin = request.headers?.origin;
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
  }
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const username = Array.isArray(request.query?.username)
    ? request.query.username[0]
    : request.query?.username;

  try {
    return response.status(200).json(await fetchGithubAchievements(username));
  } catch (error) {
    return response.status(error.statusCode ?? 502).json({ error: error.message });
  }
}