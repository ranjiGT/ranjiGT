import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchGithubAchievements,
  isValidGithubUsername,
  parseGithubAchievements
} from '../src/github-achievements.js';
import achievementsHandler from '../api/achievements.js';

const profileHtml = `
  <a href="/Njengah?achievement=pair-extraordinaire&amp;tab=achievements">
    <img class="achievement-badge-sidebar" alt="Achievement: Pair Extraordinaire" src="/assets/pair.png">
    <span class="achievement-tier-label achievement-tier-label--gold">x4</span>
  </a>
  <a href="/Njengah?achievement=pull-shark&amp;tab=achievements">
    <img class="achievement-badge-sidebar" alt="Achievement: Pull Shark" src="https://github.githubassets.com/assets/pull-shark.png">
    <span class="achievement-tier-label achievement-tier-label--silver">x3</span>
  </a>
`;

function createResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    }
  };
}

test('parses publicly visible achievement names, levels, tiers, and profile links', () => {
  const result = parseGithubAchievements(profileHtml, 'Njengah');

  assert.equal(result.username, 'Njengah');
  assert.equal(result.profileUrl, 'https://github.com/Njengah?tab=achievements');
  assert.deepEqual(result.achievements, [
    {
      name: 'Pair Extraordinaire',
      level: 4,
      tier: 'gold',
      imageUrl: 'https://github.com/assets/pair.png',
      profileUrl: 'https://github.com/Njengah?achievement=pair-extraordinaire&tab=achievements'
    },
    {
      name: 'Pull Shark',
      level: 3,
      tier: 'silver',
      imageUrl: 'https://github.githubassets.com/assets/pull-shark.png',
      profileUrl: 'https://github.com/Njengah?achievement=pull-shark&tab=achievements'
    }
  ]);
});

test('validates GitHub usernames before making a profile request', async () => {
  assert.equal(isValidGithubUsername('Njengah'), true);
  assert.equal(isValidGithubUsername('user-name'), true);
  assert.equal(isValidGithubUsername('bad/name'), false);
  assert.equal(isValidGithubUsername(''), false);

  await assert.rejects(fetchGithubAchievements('bad/name', async () => {
    throw new Error('Fetch should not run for invalid usernames');
  }), { statusCode: 400 });
});

test('fetches and parses a public GitHub profile', async () => {
  let requestedUrl;
  const fetchImpl = async (url, options) => {
    requestedUrl = url;
    assert.equal(options.headers['User-Agent'], 'github-achievement-tracker/1.0');
    return { ok: true, text: async () => profileHtml };
  };

  const result = await fetchGithubAchievements('Njengah', fetchImpl);

  assert.equal(requestedUrl, 'https://github.com/Njengah');
  assert.equal(result.achievements.length, 2);
});

test('returns clear errors for missing profiles and upstream rate limits', async () => {
  await assert.rejects(
    fetchGithubAchievements('missing-user', async () => ({ status: 404, ok: false })),
    { statusCode: 404, message: 'GitHub user "missing-user" was not found.' }
  );
  await assert.rejects(
    fetchGithubAchievements('Njengah', async () => ({ status: 429, ok: false })),
    { statusCode: 503 }
  );
  await assert.rejects(
    fetchGithubAchievements('Njengah', async () => {
      const error = new Error('request timed out');
      error.name = 'TimeoutError';
      throw error;
    }),
    { statusCode: 503, message: 'GitHub profile lookup timed out. Try again shortly.' }
  );
});

test('serverless handler supports CORS preflight and rejects unsupported methods', async () => {
  const preflightResponse = createResponse();
  await achievementsHandler({
    method: 'OPTIONS',
    headers: { origin: 'https://ranjigt.github.io' },
    query: {}
  }, preflightResponse);
  assert.equal(preflightResponse.statusCode, 204);
  assert.equal(preflightResponse.headers['Access-Control-Allow-Origin'], 'https://ranjigt.github.io');

  const deniedOriginResponse = createResponse();
  await achievementsHandler({
    method: 'OPTIONS',
    headers: { origin: 'https://untrusted.example' },
    query: {}
  }, deniedOriginResponse);
  assert.equal(deniedOriginResponse.headers['Access-Control-Allow-Origin'], undefined);

  const methodResponse = createResponse();
  await achievementsHandler({ method: 'POST', query: {} }, methodResponse);
  assert.equal(methodResponse.statusCode, 405);
  assert.deepEqual(methodResponse.body, { error: 'Method not allowed.' });
});

test('serverless handler returns validation errors as JSON', async () => {
  const response = createResponse();
  await achievementsHandler({ method: 'GET', query: { username: 'bad/name' } }, response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: 'Enter a valid GitHub username.' });
});

test('serverless handler returns parsed public achievements', async () => {
  const response = createResponse();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, text: async () => profileHtml });

  try {
    await achievementsHandler({ method: 'GET', query: { username: 'Njengah' } }, response);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.achievements[0].name, 'Pair Extraordinaire');
  assert.equal(response.body.achievements[0].level, 4);
});