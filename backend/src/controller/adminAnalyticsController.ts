import { Request, Response } from "express";
import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import logger from "../config/logger";
import { client as redis } from "../config/redis";

const DASHBOARD_CACHE_KEY = "analytics:dashboard";
const DASHBOARD_TTL = 300; // 5 minutes

const PAID_STATUSES: OrderStatus[] = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

export const getDashboardStats = catchAsync(
  async (_req: Request, res: Response) => {
    const cached = await redis.get(DASHBOARD_CACHE_KEY);

    if (cached) {
      logger.info("Serving dashboard analytics from cache");
      return res.status(200).json(JSON.parse(cached));
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      revenueResult,
      totalOrders,
      totalUsers,
      totalProducts,
      recentOrders,
      avgOrderValueResult,
      lowStockProducts,
      ordersByStatus,
      topProducts,
      revenueByDay,
    ] = await Promise.all([
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { in: PAID_STATUSES } },
      }),

      prisma.order.count(),
      // Total users — Prisma count
      prisma.user.count(),

      // Total products (excluding soft-deleted)
      prisma.products.count({ where: { deletedAt: null } }),

      // Orders in the last 30 days — Prisma findMany
      prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

      prisma.order.aggregate({
        where: { status: { in: PAID_STATUSES } },
        _avg: { total: true },
      }),

      prisma.products.findMany({
        where: { stock: { lte: 5 }, availability: true, deletedAt: null },
        select: { product_id: true, name: true, stock: true, image: true },
        orderBy: { stock: "asc" },
        take: 10,
      }),

      prisma.order.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      // Top 5 products by units sold — Prisma groupBy (no raw SQL needed)
      prisma.orderItem.groupBy({
        by: ["product_id"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
        where: {
          order: { status: { in: PAID_STATUSES } },
        },
      }),

      // Revenue per day for last 30 days — requires prisma.$queryRaw
      // Reason: Prisma groupBy does not support DATE_TRUNC for time-bucketing.
      // This is the only raw SQL in this controller.
      prisma.$queryRaw<Array<{ date: string; revenue: number }>>`
      SELECT
        TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS date,
        SUM(total)::float AS revenue
      FROM "Order"
      WHERE "createdAt" >= ${thirtyDaysAgo}
        AND status = ANY(ARRAY['PAID','PROCESSING','SHIPPED','DELIVERED'])
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY DATE_TRUNC('day', "createdAt") ASC
    `,
    ]);

    // Enrich top products with names using a single Prisma query
    const productIds = topProducts.map((p) => p.product_id);
    const productNames = await prisma.products.findMany({
      where: { product_id: { in: productIds } },
      select: { product_id: true, name: true, image: true },
    });

    const nameMap = new Map(productNames.map((p) => [p.product_id, p]));

    const enrichedTopProducts = topProducts.map((p) => ({
      ...nameMap.get(p.product_id),
      unitsSold: p._sum.quantity ?? 0,
    }));

    const responseData = {
      status: "success",
      data: {
        totals: {
          revenue: revenueResult._sum.total ?? 0,
          orders: totalOrders,
          recentOrders,
          users: totalUsers,
          products: totalProducts,
          avgOrderValue: avgOrderValueResult._avg.total ?? 0,
        },
        revenueByDay,
        topProducts: enrichedTopProducts,
        lowStockProducts,
        ordersByStatus: ordersByStatus.map((s) => ({
          status: s.status,
          count: s._count.id,
        })),
      },
    };

    await redis.setEx(
      DASHBOARD_CACHE_KEY,
      DASHBOARD_TTL,
      JSON.stringify(responseData),
    );

    logger.info("Admin fetched dashboard analytics");
    res.status(200).json(responseData);
  },
);

type RevenuePeriod = "daily" | "weekly" | "monthly" | "yearly";

const PERIOD_TRUNC: Record<RevenuePeriod, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

const PERIOD_FORMAT: Record<RevenuePeriod, string> = {
  daily: "YYYY-MM-DD",
  weekly: "IYYY-IW",
  monthly: "YYYY-MM",
  yearly: "YYYY",
};

// GET /admin/analytics/revenue?period=daily|weekly|monthly|yearly&days=90
export const getRevenueBreakdown = catchAsync(
  async (req: Request, res: Response) => {
    const period = ((req.query.period as string) || "daily") as RevenuePeriod;
    const days = Math.min(Number(req.query.days) || 30, 365);

    if (!PERIOD_TRUNC[period]) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid period. Use daily|weekly|monthly|yearly",
      });
    }

    const cacheKey = `analytics:revenue:${period}:${days}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const trunc = PERIOD_TRUNC[period];
    const fmt = PERIOD_FORMAT[period];

    const rows = await prisma.$queryRaw<
      Array<{ period: string; revenue: number; orders: number }>
    >`
      SELECT
        TO_CHAR(DATE_TRUNC(${trunc}, "createdAt"), ${fmt}) AS period,
        SUM(total)::float                                   AS revenue,
        COUNT(*)::int                                       AS orders
      FROM "Order"
      WHERE "createdAt" >= ${since}
        AND status = ANY(ARRAY['PAID','PROCESSING','SHIPPED','DELIVERED'])
      GROUP BY DATE_TRUNC(${trunc}, "createdAt")
      ORDER BY DATE_TRUNC(${trunc}, "createdAt") ASC
    `;

    const payload = { status: "success", data: { period, days, rows } };
    await redis.setEx(cacheKey, 300, JSON.stringify(payload));
    res.status(200).json(payload);
  },
);

// GET /admin/analytics/top-customers?limit=10
export const getTopCustomers = catchAsync(
  async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const cacheKey = `analytics:top-customers:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const rows = await prisma.$queryRaw<
      Array<{
        userId: string;
        name: string;
        email: string;
        totalSpend: number;
        orderCount: number;
      }>
    >`
      SELECT
        o."userId",
        u.name,
        u.email,
        SUM(o.total)::float  AS "totalSpend",
        COUNT(o.id)::int     AS "orderCount"
      FROM "Order" o
      JOIN "User" u ON u.id = o."userId"
      WHERE o.status = ANY(ARRAY['PAID','PROCESSING','SHIPPED','DELIVERED'])
      GROUP BY o."userId", u.name, u.email
      ORDER BY "totalSpend" DESC
      LIMIT ${BigInt(limit)}
    `;

    const payload = { status: "success", data: { customers: rows } };
    await redis.setEx(cacheKey, 300, JSON.stringify(payload));
    res.status(200).json(payload);
  },
);

// GET /admin/analytics/top-products?by=revenue|units&limit=10
export const getTopProductsAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    const by = (req.query.by as string) === "revenue" ? "revenue" : "units";
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const cacheKey = `analytics:top-products:${by}:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const orderClause =
      by === "revenue"
        ? Prisma.sql`SUM(oi.price * oi.quantity) DESC`
        : Prisma.sql`SUM(oi.quantity) DESC`;

    const rows = await prisma.$queryRaw<
      Array<{
        productId: string;
        name: string;
        image: string | null;
        revenue: number;
        unitsSold: number;
      }>
    >`
      SELECT
        p.product_id::text                        AS "productId",
        p.name,
        p.image,
        SUM(oi.price * oi.quantity)::float        AS revenue,
        SUM(oi.quantity)::int                     AS "unitsSold"
      FROM "OrderItem" oi
      JOIN "Products" p ON p.product_id = oi.product_id
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status = ANY(ARRAY['PAID','PROCESSING','SHIPPED','DELIVERED'])
      GROUP BY p.product_id, p.name, p.image
      ORDER BY ${orderClause}
      LIMIT ${BigInt(limit)}
    `;

    const payload = { status: "success", data: { by, products: rows } };
    await redis.setEx(cacheKey, 300, JSON.stringify(payload));
    res.status(200).json(payload);
  },
);
