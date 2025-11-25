export function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res
      .status(403)
      .json({ error: "Administrator access is required for this resource" });
  }
  return next();
}


