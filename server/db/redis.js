import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

// Create a Redis client using the Upstash URL
const redis = new Redis(process.env.REDIS_URL);

redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err); // removed .message to see full error
});

export default redis;