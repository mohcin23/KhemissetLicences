const Redis = require('ioredis');

let client = null;

function getRedis(url) {
  if (client) return client;

  const redisUrl = url || process.env.REDIS_URL || 'redis://:redispassword@localhost:6379';

  client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
    lazyConnect: true,
  });

  client.on('connect', () => {
    console.log('✅ Redis connecté');
  });

  client.on('error', (err) => {
    console.error('❌ Redis erreur:', err.message);
  });

  return client;
}

async function closeRedis() {
  if (client) {
    await client.quit();
    client = null;
  }
}

module.exports = { getRedis, closeRedis };
