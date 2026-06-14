const { ActivityLog } = require('../models');

const logActivity = async ({ userId, action, entityType, entityId, metadata }) => {
  try {
    await ActivityLog.create({ userId, action, entityType, entityId, metadata });
  } catch (err) {
    console.error('Activity log failed:', err.message);
  }
};

module.exports = { logActivity };
