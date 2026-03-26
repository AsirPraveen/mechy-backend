/**
 * Tenant isolation middleware.
 * Ensures every request from an authenticated user is scoped to their workshop.
 * Attaches req.workshopId for use in controllers.
 *
 * CRITICAL: Missing workshopId = potential cross-tenant data leak.
 */
const tenantScope = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  if (!req.user.workshopId) {
    // Owners who haven't created a workshop yet, or customers not yet linked
    // Allow through — controllers should handle the null case
    req.workshopId = null;
  } else {
    req.workshopId = req.user.workshopId;
  }

  next();
};

module.exports = tenantScope;
