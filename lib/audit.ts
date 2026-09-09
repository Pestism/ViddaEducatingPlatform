// lib/audit.ts
// Utility for audit logging

import { PrismaClient, type Prisma } from '@prisma/client';

const db = new PrismaClient();

/**
 * Log an audit event
 * Every action in the system should call this
 */
export async function logAudit(
  eventType: string,
  actor: string,
  details: Prisma.InputJsonObject
) {
  try {
    return await db.auditLog.create({
      data: {
        eventType,
        actor,
        details,
      },
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
    // Don't throw - audit logging shouldn't break the app
    return null;
  }
}

/**
 * Get recent audit logs
 */
export async function getAuditLogs(limit: number = 20) {
  return await db.auditLog.findMany({
    take: limit,
    orderBy: { timestamp: 'desc' },
  });
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogsForEntity(entityId: string) {
  return await db.auditLog.findMany({
    where: {
      details: {
        path: ['analysis_id'],
        equals: entityId,
      },
    },
    orderBy: { timestamp: 'asc' },
  });
}
