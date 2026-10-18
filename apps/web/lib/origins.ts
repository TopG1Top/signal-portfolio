export const trustedOrigins = [
  process.env.APP_ORIGIN ?? 'http://localhost:3000',
  ...(process.env.NODE_ENV === 'production' ? [] : ['http://127.0.0.1:3000']),
];
