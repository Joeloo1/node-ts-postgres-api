import { ProductQueryInput } from "../Schema/querySchema";

// Build WHERE clause for Prisma
export function buildWhereClause(filters: ProductQueryInput) {
  const where: any = {};

  // Text search (case-insensitive)
  if (filters.name) {
    where.name = {
      contains: filters.name,
      mode: "insensitive",
    };
  }

  if (filters.brand) {
    where.brand = {
      contains: filters.brand,
      mode: "insensitive",
    };
  }

  // Exact matches - FIXED: Use camelCase for Prisma
  if (filters.category_id !== undefined) {
    where.categoryId = filters.category_id;
  }

  if (filters.availability !== undefined) {
    where.availability = filters.availability;
  }

  // Range filters - Price
  if (filters.price_gte !== undefined || filters.price_lte !== undefined) {
    where.price = {};
    if (filters.price_gte !== undefined) {
      where.price.gte = filters.price_gte;
    }
    if (filters.price_lte !== undefined) {
      where.price.lte = filters.price_lte;
    }
  }

  // Range filters - Rating
  if (filters.rating_gte !== undefined) {
    where.rating = {
      gte: filters.rating_gte,
    };
  }

  // Range filters - Discount
  if (filters.discount_gte !== undefined) {
    where.discount = {
      gte: filters.discount_gte,
    };
  }

  return where;
}


// Build ORDER BY clause for Prisma
export function buildOrderByClause(filters: ProductQueryInput) {
  return {
    [filters.sortBy]: filters.order,
  };
}

// Build SELECT clause for Prisma
export function buildSelectClause(fields?: string) {
  if (!fields) return undefined;

  const fieldArray = fields.split(",").map((f) => f.trim());
  const select: any = {};

  // Map snake_case to camelCase for Prisma
  const fieldMap: Record<string, string> = {
    category_id: "categoryId",
    created_at: "createdAt",
    updated_at: "updatedAt",
    product_id: "productId",
  };

  fieldArray.forEach((field) => {
    const prismaField = fieldMap[field] || field;
    select[prismaField] = true;
  });

  return select;
}

// Calculate pagination values
export function getPaginationParams(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}