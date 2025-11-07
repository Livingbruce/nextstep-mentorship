// Netlify Function wrapper for Express app
// This allows the backend to run as a Netlify Function
// Same domain as frontend = NO CORS issues!

import serverless from 'serverless-http';
import app from '../../src/index.js';

// Export the handler for Netlify Functions
export const handler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/octet-stream']
});

