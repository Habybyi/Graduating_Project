import { db } from "../db/connection.js";

const insertStmt = db.prepare(`
  INSERT INTO activity_log (user_id, user_role, action, entity_type, entity_id, summary, metadata)
  VALUES (@userId, @userRole, @action, @entityType, @entityId, @summary, @metadata)
`);

// See Documentation/Architecture/Activity_Log.md for the full event list and design.
export function logActivity({ actingUser, action, entityType, entityId, summary, metadata }) {
  insertStmt.run({
    userId: actingUser.id,
    userRole: actingUser.role,
    action,
    entityType,
    entityId,
    summary,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}
