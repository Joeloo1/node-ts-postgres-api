import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { client as redis } from "../config/redis";
import { Prisma } from "@prisma/client";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { productQuerySchema } from "../Schema/querySchema";
import { updateProductSchema } from "../Schema/productSchema";
import {
  buildWhereClause,
  buildOrderByClause,
  buildSelectClause,
  getPaginationParams,
} from "../utils/queryBuilder";
import logger from "../config/logger";
import { scanDel } from "../config/redis";
import { logAudit } from "../utils/audit";
import { triggerStockNotification } from "./stockNotifyController";

const REDIS_TTL = 3600;
const getProductKey = (id: string) => `product:${id}`;

// Sort keys so query param order never produces a different cache key
const ALLOWED_CACHE_PARAMS = new Set([
  "page",
  "limit",
  "sort",
  "order",
  "sortBy",
  "category_id",
  "minPrice",
  "maxPrice",
  "price_gte",
  "price_lte",
  "rating_gte",
  "discount_gte",
  "availability",
  "fields",
  "includeImages",
  "brand",
  "name",
  "tag",
  "attributes",
]);

const getProductsQueryKey = (query: Record<string, unknown>) => {
  const filtered = Object.keys(query)
    .filter((k) => ALLOWED_CACHE_PARAMS.has(k))
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = query[k];
      return acc;
    }, {});
  return `products:list:${JSON.stringify(filtered)}`;
};

const productCategoryInclude = {
  category: {
    select: {
      category_id: true,
      name: true,
    },
  },
} as const;

const baseListSelect = (includeImages: boolean) =>
  ({
    product_id: true,
    name: true,
    description: true,
    price: true,
    unit: true,
    image: true,
    discount: true,
    availability: true,
    stock: true,
    brand: true,
    rating: true,
    category_id: true,
    createdAt: true,
    updatedAt: true,
    ...(includeImages ? ({ images: true } as any) : {}),
    category: productCategoryInclude.category,
  }) as any;

const clearProductCache = async () => {
  await scanDel("products:list:*");
};

// CREATE PRODUCT
export const createProduct = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const data = req.body;

    if (data.category_id) {
      const categoryExists = await prisma.category.findUnique({
        where: { category_id: data.category_id },
      });
      if (!categoryExists) {
        logger.warn(`Category with ID: ${data.category_id} does not exist`);
        return next(
          new AppError(
            `Category with ID ${data.category_id} does not exist`,
            400,
          ),
        );
      }
    }

    logger.info("Creating new Product");
    const product = await prisma.products.create({
      data,
      include: {
        category: {
          select: {
            category_id: true,
            name: true,
          },
        },
      },
    });

    // Seed initial price into history
    if (product.price != null) {
      await prisma.priceHistory.create({
        data: { product_id: product.product_id, price: product.price },
      });
    }

    await clearProductCache();

    await logAudit({
      req,
      action: "CREATE_PRODUCT",
      entityType: "Product",
      entityId: product.product_id,
      after: product,
    });

    logger.info("Product created successfully");
    res.status(201).json({
      status: "Success",
      data: {
        product,
      },
    });
  },
);

// GET ALL PRODUCTS WITH FILTERING, SORTING & PAGINATION
export const getAllProducts = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    // Validate and parse query parameters
    const filters = productQuerySchema.parse(req.query);

    const cacheKey = getProductsQueryKey(req.query);

    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      logger.info("Serving products from cache");
      res.setHeader(
        "Cache-Control",
        "public, max-age=30, stale-while-revalidate=600",
      );
      return res.status(200).json(JSON.parse(cachedData));
    }

    logger.info("Fetching all Products");
    // Build query components
    const where = { ...buildWhereClause(filters), deletedAt: null };
    const orderBy = buildOrderByClause(filters);
    const select = buildSelectClause(filters.fields, {
      includeImages: filters.includeImages,
    });
    const { skip, take } = getPaginationParams(filters.page, filters.limit);

    // Execute query with count in parallel
    const productsPromise = select
      ? prisma.products.findMany({
          where,
          orderBy,
          skip,
          take,
          select,
        })
      : prisma.products.findMany({
          where,
          orderBy,
          skip,
          take,
          select: baseListSelect(filters.includeImages),
        });

    const [products, total] = await Promise.all([
      productsPromise,
      prisma.products.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / filters.limit);

    logger.info("Fetched all products successfully");

    const responseData = {
      status: "Success",
      results: products.length,
      data: {
        products,
      },
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
        hasNext: filters.page < totalPages,
        hasPrev: filters.page > 1,
      },
    };
    await redis.setEx(cacheKey, REDIS_TTL, JSON.stringify(responseData));

    res.setHeader(
      "Cache-Control",
      "public, max-age=30, stale-while-revalidate=600",
    );
    res.status(200).json(responseData);
  },
);

// GET SINGLE PRODUCT
export const getProduct = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;

    const cacheKey = getProductKey(productId);

    //  Check Cache
    const cachedProduct = await redis.get(cacheKey);
    if (cachedProduct) {
      logger.info(`Serving product ${productId} from cache`);
      const parsed = JSON.parse(cachedProduct) as any;
      // If cache was populated before `images` existed, refresh it.
      if (!Array.isArray(parsed?.images)) {
        logger.info(
          `Cache for product ${productId} is stale (missing images). Refreshing...`,
        );
        await redis.del(cacheKey);
      } else {
        res.setHeader(
          "Cache-Control",
          "public, max-age=60, stale-while-revalidate=600",
        );
        return res.status(200).json({
          status: "Success",
          source: "cached",
          data: { product: parsed },
        });
      }
    }

    logger.info(`Fetching Product by ID: ${productId}`);
    const product = await prisma.products.findFirst({
      where: { product_id: productId, deletedAt: null },
      include: {
        ...productCategoryInclude,
        attributes: {
          select: { id: true, key: true, value: true },
          orderBy: [{ key: "asc" }, { value: "asc" }],
        },
        tags: {
          select: { tag: { select: { id: true, name: true, slug: true } } },
        },
      },
    });

    if (!product) {
      logger.warn(`Product with ID: ${productId} not found`);
      return next(new AppError("Product not found", 404));
    }

    await redis.setEx(cacheKey, REDIS_TTL, JSON.stringify(product));

    logger.info("Product Fetched by ID successfully");
    res.setHeader(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=600",
    );
    res.status(200).json({
      status: "Success",
      data: { product },
    });
  },
);

// UPDATE PRODUCT
export const updateProduct = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    const data = updateProductSchema.parse(req.body);

    const existingProduct = await prisma.products.findFirst({
      where: { product_id: productId, deletedAt: null },
    });

    if (!existingProduct) {
      logger.warn(`Product with ${productId} not found`);
      return next(new AppError(`product with ${productId} not found`, 404));
    }

    if (data.category_id) {
      const categoryExists = await prisma.category.findUnique({
        where: { category_id: data.category_id },
      });
      if (!categoryExists) {
        logger.warn(`Category with ID: ${data.category_id} oes not exist`);
        return next(
          new AppError(
            `Category with ID ${data.category_id} does not exist`,
            400,
          ),
        );
      }
    }

    logger.info("Updating product");
    // When the images array is explicitly set, sync the main image with images[0]
    const updateData: Record<string, unknown> = { ...data };
    if (data.images !== undefined && data.image === undefined) {
      updateData.image = data.images[0] ?? null;
    }
    const product = await prisma.products.update({
      where: { product_id: productId },
      data: updateData as any,
      include: productCategoryInclude,
    });

    const stocKIncreased =
      data.stock !== undefined && existingProduct.stock === 0 && data.stock > 0;

    if (stocKIncreased) {
      triggerStockNotification(productId).catch((err) => {
        logger.warn("Back-in-stock trgger failed", { productId, err });
      });
    }

    // Record price history whenever price changes
    if (data.price !== undefined && data.price !== existingProduct.price) {
      await prisma.priceHistory.create({
        data: { product_id: productId, price: data.price },
      });
      await redis.del(`price_history:${productId}`);
    }

    await redis.del(getProductKey(productId));
    await clearProductCache();

    await logAudit({
      req,
      action: "UPDATE_PRODUCT",
      entityType: "Product",
      entityId: productId,
      before: existingProduct,
      after: product,
    });

    logger.info(`Product with ID: ${productId} updated successfully`);
    res.status(200).json({
      status: "Success",
      data: {
        product,
      },
    });
  },
);

// delete product
export const deleteProduct = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;

    const existingProduct = await prisma.products.findFirst({
      where: { product_id: productId, deletedAt: null },
    });

    if (!existingProduct) {
      logger.warn(`Product with ID: ${productId} not found`);
      return next(new AppError(`Product with ID: ${productId} not found`, 404));
    }

    logger.info(`Soft-deleting product with ID: ${productId}`);
    await prisma.products.update({
      where: { product_id: productId },
      data: { deletedAt: new Date(), availability: false },
    });

    await logAudit({
      req,
      action: "DELETE_PRODUCT",
      entityType: "Product",
      entityId: productId,
      before: existingProduct,
    });

    await redis.del(getProductKey(productId));
    await clearProductCache();

    logger.info(`Product with ID: ${productId} deleted successfully`);
    res.status(204).json({
      status: "Success",
      data: null,
    });
  },
);

export const addProductImages = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    const uploaded = ((req as any).uploadedProductImages ?? []) as string[];

    if (!uploaded.length) {
      return next(
        new AppError("Please upload one or more images (field: images)", 400),
      );
    }

    const product = await prisma.products.findFirst({
      where: { product_id: productId, deletedAt: null },
    });

    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    const mode = typeof req.query.mode === "string" ? req.query.mode : "append";
    const existingImages = Array.isArray((product as any).images)
      ? ((product as any).images as string[])
      : [];
    const nextImages =
      mode === "replace" ? uploaded : [...existingImages, ...uploaded];

    const updated = await prisma.products.update({
      where: { product_id: productId },
      data: {
        ...({ images: nextImages } as any),
        image: product.image ?? nextImages[0] ?? null,
      } as any,
      include: productCategoryInclude,
    });

    await redis.del(getProductKey(productId));
    await clearProductCache();

    res.status(200).json({
      status: "success",
      data: {
        product: updated,
      },
    });
  },
);

export const getProductsFeed = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const products = await prisma.products.findMany({
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { product_id: cursor },
            skip: 1,
          }
        : {}),
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        product_id: true,
        name: true,
        price: true,
        image: true,
        brand: true,
        rating: true,
        availability: true,
        discount: true,
        category: {
          select: {
            category_id: true,
            name: true,
          },
        },
      },
    });

    const hasNextPage = products.length > limit;

    if (hasNextPage) products.pop();

    res.status(200).json({
      status: "success",
      result: products.length,
      data: { products },
      pagination: {
        hasNextPage,
        nextCursor: hasNextPage
          ? products[products.length - 1].product_id
          : null,
      },
    });
  },
);

// ── Autocomplete suggestions ─────────────────────────────────────────────────

export const getSuggestions = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (q.length < 2) {
      return res.status(200).json({ status: "success", data: [] });
    }

    const cacheKey = `suggestions:${q.toLowerCase()}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json({ status: "success", data: JSON.parse(cached) });
    }

    const suggestions = await prisma.products.findMany({
      where: {
        deletedAt: null,
        availability: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        product_id: true,
        name: true,
        brand: true,
        price: true,
        image: true,
        discount: true,
      },
      take: 8,
      orderBy: { rating: "desc" },
    });

    await redis.setEx(cacheKey, 30, JSON.stringify(suggestions));

    res.status(200).json({ status: "success", data: suggestions });
  },
);

// ── Full-text search with relevance ranking ──────────────────────────────────

type SearchRow = {
  product_id: string;
  search_rank: number;
};

export const searchProducts = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 24));
    const skip = (page - 1) * limit;

    if (!q) {
      return res.status(200).json({
        status: "success",
        results: 0,
        data: { products: [] },
        pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      });
    }

    const cacheKey = `search:${encodeURIComponent(q)}:p${page}:l${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    // Parse optional filter params
    const categoryId = req.query.category_id ? Number(req.query.category_id) : undefined;
    const priceGte   = req.query.price_gte   ? Number(req.query.price_gte)   : undefined;
    const priceLte   = req.query.price_lte   ? Number(req.query.price_lte)   : undefined;
    const ratingGte  = req.query.rating_gte  ? Number(req.query.rating_gte)  : undefined;
    const brand      = typeof req.query.brand === "string" ? req.query.brand.trim() : undefined;
    const tag        = typeof req.query.tag   === "string" ? req.query.tag.trim()   : undefined;
    const availability = req.query.availability !== undefined
      ? req.query.availability === "true"
      : undefined;

    // Build dynamic WHERE conditions
    const conditions: Prisma.Sql[] = [
      Prisma.sql`p."deletedAt" IS NULL`,
      Prisma.sql`(
        to_tsvector('english', coalesce(p.name,'') || ' ' || coalesce(p.brand,'') || ' ' || coalesce(p.description,''))
        @@ plainto_tsquery('english', ${q})
        OR p.name ILIKE ${`%${q}%`}
        OR p.brand ILIKE ${`%${q}%`}
      )`,
    ];

    if (categoryId !== undefined && !isNaN(categoryId)) {
      conditions.push(Prisma.sql`p.category_id = ${categoryId}`);
    }
    if (priceGte !== undefined && !isNaN(priceGte)) {
      conditions.push(Prisma.sql`p.price >= ${priceGte}`);
    }
    if (priceLte !== undefined && !isNaN(priceLte)) {
      conditions.push(Prisma.sql`p.price <= ${priceLte}`);
    }
    if (ratingGte !== undefined && !isNaN(ratingGte)) {
      conditions.push(Prisma.sql`p.rating >= ${ratingGte}`);
    }
    if (brand) {
      conditions.push(Prisma.sql`p.brand ILIKE ${`%${brand}%`}`);
    }
    if (availability !== undefined) {
      conditions.push(Prisma.sql`p.availability = ${availability}`);
    }
    if (tag) {
      conditions.push(Prisma.sql`EXISTS (
        SELECT 1 FROM "ProductTag" pt
        JOIN "Tag" t ON pt."tagId" = t.id
        WHERE pt."productId" = p.product_id AND t.slug = ${tag}
      )`);
    }

    const whereClause = Prisma.join(conditions, " AND ");

    // Step 1: get ranked IDs (fast raw SQL)
    const [ranked, countResult] = await Promise.all([
      prisma.$queryRaw<SearchRow[]>`
        SELECT p.product_id::text, CAST(
          ts_rank_cd(
            to_tsvector('english', coalesce(p.name,'') || ' ' || coalesce(p.brand,'') || ' ' || coalesce(p.description,'')),
            plainto_tsquery('english', ${q})
          ) AS float8
        ) as search_rank
        FROM "Products" p
        WHERE ${whereClause}
        ORDER BY search_rank DESC, p.rating DESC NULLS LAST, p."createdAt" DESC
        LIMIT ${BigInt(limit)} OFFSET ${BigInt(skip)}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM "Products" p WHERE ${whereClause}
      `,
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const productIds = ranked.map((r) => r.product_id);

    // Step 2: fetch full product records with Prisma ORM (gets typed results + category join)
    const products =
      productIds.length === 0
        ? []
        : await prisma.products.findMany({
            where: { product_id: { in: productIds } },
            select: baseListSelect(false),
          });

    // Restore rank order
    const rankMap = new Map(ranked.map((r) => [r.product_id, r.search_rank]));
    products.sort(
      (a: any, b: any) =>
        (rankMap.get(b.product_id) ?? 0) - (rankMap.get(a.product_id) ?? 0),
    );

    const totalPages = Math.ceil(total / limit);
    const responseData = {
      status: "success",
      results: products.length,
      data: { products },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    await redis.setEx(cacheKey, 60, JSON.stringify(responseData));
    res.status(200).json(responseData);
  },
);

// ── Trending products (most ordered in last 7 days) ──────────────────────────

export const getTrending = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
    const cacheKey = `trending:${limit}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json({ status: "success", data: { products: JSON.parse(cached) } });
    }

    type TrendRow = { product_id: string; order_count: bigint };

    const trendRows = await prisma.$queryRaw<TrendRow[]>`
      SELECT oi.product_id::text, COUNT(*)::bigint as order_count
      FROM "OrderItem" oi
      JOIN "Order" o ON oi."orderId" = o.id
      WHERE o."createdAt" > NOW() - INTERVAL '7 days'
      GROUP BY oi.product_id
      ORDER BY order_count DESC
      LIMIT ${BigInt(limit)}
    `;

    const productIds = trendRows.map((r) => r.product_id);

    if (productIds.length === 0) {
      // Fallback: highest rated available products
      const products = await prisma.products.findMany({
        where: { deletedAt: null, availability: true },
        select: baseListSelect(false),
        orderBy: { rating: "desc" },
        take: limit,
      });
      await redis.setEx(cacheKey, 300, JSON.stringify(products));
      return res.status(200).json({ status: "success", data: { products } });
    }

    const products = await prisma.products.findMany({
      where: { product_id: { in: productIds }, deletedAt: null },
      select: baseListSelect(false),
    });

    // Restore trending order
    const orderMap = new Map(trendRows.map((r) => [r.product_id, Number(r.order_count)]));
    products.sort(
      (a: any, b: any) =>
        (orderMap.get(b.product_id) ?? 0) - (orderMap.get(a.product_id) ?? 0),
    );

    await redis.setEx(cacheKey, 300, JSON.stringify(products));
    res.status(200).json({ status: "success", data: { products } });
  },
);

// ── Related products (same category, similar price) ──────────────────────────

export const getRelatedProducts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    const limit = Math.min(12, Math.max(1, Number(req.query.limit) || 6));
    const cacheKey = `related:${productId}:${limit}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json({ status: "success", data: { products: JSON.parse(cached) } });
    }

    const product = await prisma.products.findFirst({
      where: { product_id: productId, deletedAt: null },
      select: { price: true, category_id: true },
    });

    if (!product) return next(new AppError("Product not found", 404));

    // Same category, similar price (±60%), excluding current product
    const priceMin = product.price * 0.4;
    const priceMax = product.price * 1.6;

    const products = await prisma.products.findMany({
      where: {
        deletedAt: null,
        availability: true,
        product_id: { not: productId },
        ...(product.category_id ? { category_id: product.category_id } : {}),
        price: { gte: priceMin, lte: priceMax },
      },
      select: baseListSelect(false),
      orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    // If not enough results, backfill from same category without price constraint
    if (products.length < 4 && product.category_id) {
      const existing = new Set(products.map((p: any) => p.product_id));
      const backfill = await prisma.products.findMany({
        where: {
          deletedAt: null,
          availability: true,
          product_id: { not: productId, notIn: [...existing] },
          category_id: product.category_id,
        },
        select: baseListSelect(false),
        orderBy: { rating: "desc" },
        take: limit - products.length,
      });
      products.push(...backfill);
    }

    await redis.setEx(cacheKey, 300, JSON.stringify(products));
    res.status(200).json({ status: "success", data: { products } });
  },
);

// ── Frequently bought together ────────────────────────────────────────────────

export const getFrequentlyBoughtTogether = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    const limit = Math.min(8, Math.max(1, Number(req.query.limit) || 4));
    const cacheKey = `fbt:${productId}:${limit}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json({ status: "success", data: { products: JSON.parse(cached) } });
    }

    const product = await prisma.products.findFirst({
      where: { product_id: productId, deletedAt: null },
      select: { product_id: true },
    });
    if (!product) return next(new AppError("Product not found", 404));

    type FbtRow = { product_id: string; co_count: bigint };

    const fbtRows = await prisma.$queryRaw<FbtRow[]>`
      SELECT oi2.product_id::text, COUNT(*)::bigint as co_count
      FROM "OrderItem" oi1
      JOIN "OrderItem" oi2
        ON oi1."orderId" = oi2."orderId"
        AND oi2.product_id::text != oi1.product_id::text
      WHERE oi1.product_id = ${productId}::uuid
      GROUP BY oi2.product_id
      ORDER BY co_count DESC
      LIMIT ${BigInt(limit)}
    `;

    const coIds = fbtRows.map((r) => r.product_id);

    if (coIds.length === 0) {
      // Fallback: related products
      return getRelatedProducts(req, res, next);
    }

    const products = await prisma.products.findMany({
      where: {
        product_id: { in: coIds },
        deletedAt: null,
        availability: true,
      },
      select: baseListSelect(false),
    });

    const coMap = new Map(fbtRows.map((r) => [r.product_id, Number(r.co_count)]));
    products.sort(
      (a: any, b: any) =>
        (coMap.get(b.product_id) ?? 0) - (coMap.get(a.product_id) ?? 0),
    );

    await redis.setEx(cacheKey, 300, JSON.stringify(products));
    res.status(200).json({ status: "success", data: { products } });
  },
);
