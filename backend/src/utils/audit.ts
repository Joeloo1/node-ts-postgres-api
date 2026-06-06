import { Request } from "express";
import { prisma } from "../config/database";
import logger from "../config/logger";

interface AuditParams {
  req: Request;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

export const logAudit = async (params: AuditParams): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: params.req.user!.id,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: (params.before as any) ?? undefined,
        after: (params.after as any) ?? undefined,
        ip: params.req.ip,
      },
    });
  } catch (err) {
    logger.error("Failed to wire audit log", { error: err, ...params });
  }
};
