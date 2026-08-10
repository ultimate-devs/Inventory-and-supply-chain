import mongoose from 'mongoose';

// One entry per ADK agent run that produced something worth surfacing: an
// insight, a recommendation, or an action taken. `relatedModel`/`relatedId`
// tie the entry back to the specific record it's about (an Alert, a
// GreedyRun, a PurchaseOrder, ...) so an agent's output is never a
// free-floating text blob - it's always traceable to what generated it.

export const AGENT_TYPES = Object.freeze({
  MONITORING: 'monitoring',
  ADVISORY: 'advisory',
  ANALYTICS: 'analytics',
  PROCUREMENT: 'procurement',
});

export const AGENT_LOG_TRIGGER = Object.freeze({
  CRON: 'cron',
  MANUAL: 'manual',
});

const agentLogSchema = new mongoose.Schema(
  {
    agentType: { type: String, enum: Object.values(AGENT_TYPES), required: true },
    action: { type: String, required: true, trim: true, maxlength: 100 },
    summary: { type: String, required: true, trim: true, maxlength: 2000 },

    relatedModel: { type: String, trim: true },
    relatedId: { type: mongoose.Schema.Types.ObjectId },

    triggeredBy: { type: String, enum: Object.values(AGENT_LOG_TRIGGER), required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

agentLogSchema.index({ createdAt: -1 });
agentLogSchema.index({ agentType: 1, createdAt: -1 });
agentLogSchema.index({ relatedModel: 1, relatedId: 1 });

export const AgentLog = mongoose.model('AgentLog', agentLogSchema);
