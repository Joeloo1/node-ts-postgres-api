import { Request, Response } from "express";
import { OrderStatus } from "@prisma/client";
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
  async (req: Request, res: Response) => {
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
