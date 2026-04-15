import type { Core } from '@strapi/strapi';

const extraOrigins = (process.env.FRONTEND_URLS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      origin: [
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        ...extraOrigins,
      ],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
