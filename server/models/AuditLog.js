const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true
    }, // 'SHEET_EDIT', 'GRIEVANCE_UPDATED', 'BATCH_PUBLISHED'
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    actorRole: {
      type: String
    },
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College'
    },
    target: {
      type: String
    }, // 'Sheet' | 'Issue' | 'Batch'
    targetId: {
      type: mongoose.Schema.Types.ObjectId
    },
    detail: {
      type: String
    },
    before: {
      type: mongoose.Schema.Types.Mixed
    },
    after: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
