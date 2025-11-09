let cachedHandler;

module.exports = async function handler(req, res) {
  if (!cachedHandler) {
    const mod = await import('../backend/api/index.js');
    cachedHandler = mod.default || mod;
  }
  return cachedHandler(req, res);
};

