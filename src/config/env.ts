/**
 * Environment configuration
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config()

export const ServerConfig = {
  PORT: +(process.env.PORT || 3001),
  HOST: process.env.HOST || '127.0.0.1',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

export const RedisConfig = {
  PORT: +(process.env.REDIS_PORT || 6379),
  HOST: process.env.REDIS_HOST || 'localhost',
  USERNAME: process.env.REDIS_USERNAME || '',
  PASSWORD: process.env.REDIS_PASSWORD || '',
  DB: +(process.env.REDIS_DB || 0),
};

export const ApiConfig = {
  URL: process.env.API_URL || 'http://localhost:3000/api',
};

export const ChatbotConfig = {
  AVATAR: process.env.CHATBOT_AVATAR || 'https://cdn.anizu.net/mascot.jpg',
  NAME: process.env.CHATBOT_NAME || 'System',
  ID: '1337', // Fixed ID for the system bot
};