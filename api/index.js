import app from '../server/src/app.js';

export default function handler(req, res) {
  // Ensure the URL matches the Express route pattern starting with /api
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  return app(req, res);
}
