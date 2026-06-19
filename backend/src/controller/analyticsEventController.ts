import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import { z } from "zod";

const VALID_EVENTS = new Set([
  "PAGE_VIEW",
  "PRODUCT_VIEW",
  "ADD_TO_CART",
  "REMOVE_FROM_CART",
  "CHECKOUT_START",
  "ORDER_COMPLETE",
  "SEARCH",
  "WISHLIST_ADD",
]);

const trackSchema = z.object({
  sessionId: z.string().min(1).max(100),
  event: z.string().min(1).max(50),
  productId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const trackEvent = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const parsed = trackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ status: "fail", message: "Invalid event payload" });
  }

  const { sessionId, event, productId, metadata } = parsed.data;

  if (!VALID_EVENTS.has(event)) {
    return res.status(400).json({ status: "fail", message: "Unknown event type" });
  }

  // Fire-and-forget — never block the client response for analytics
  prisma.analyticsEvent
    .create({
      data: {
        sessionId,
        event,
        userId: req.user?.id ?? null,
        productId: productId ?? null,
        metadata: (metadata as any) ?? null,
        ip: (req.ip ?? "").slice(0, 45) || null,
        userAgent: (req.headers["user-agent"] ?? "").slice(0, 500) || null,
      },
    })
    .catch(() => {});

  res.status(204).end();
});

// Admin: funnel summary — count of each event type in the last N days
export const getEventFunnel = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  type FunnelRow = { event: string; count: bigint };
  const rows = await prisma.$queryRaw<FunnelRow[]>`
    SELECT event, COUNT(*)::bigint as count
    FROM "AnalyticsEvent"
    WHERE "createdAt" >= ${since}
    GROUP BY event
    ORDER BY count DESC
  `;

  const funnel = rows.map((r) => ({ event: r.event, count: Number(r.count) }));

  res.status(200).json({ status: "success", data: { days, funnel } });
});
