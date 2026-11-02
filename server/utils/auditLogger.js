const AuditLog = require('../models/AuditLog');

/**
 * Log an administrative / evaluation audit record safely (never throws)
 */
const logAudit = async ({ action, actor, actorRole, college, target, targetId, detail, before, after }) => {
  try {
    await AuditLog.create({ action, actor, actorRole, college, target, targetId, detail, before, after });
  } catch (err) {
    console.error('[AuditLog] Failed to write audit:', err.message);
    // Never throw — audit failure must not break the request
  }
};

module.exports = { logAudit };
