import type { ProductQueryInput } from "../Schema/querySchema";

// Build WHERE clause for Prisma
export function buildWhereClause(filters: ProductQueryInput) {
  const where: any = {};

  // Text search (case-insensitive substring — for browsing/admin)
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

  if (filters.category_id !== undefined) {
    where.category_id = filters.category_id;
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

  // Tag collection filter (slug)
  if (filters.tag) {
    where.tags = {
      some: {
        tag: { slug: filters.tag },
      },
    };
  }

  // Attribute filter — "Color:Red,Size:M" → AND conditions
  if (filters.attributes) {
    const pairs = filters.attributes
      .split(",")
      .map((pair) => {
        const colonIdx = pair.indexOf(":");
        if (colonIdx === -1) return null;
        return {
          key: pair.slice(0, colonIdx).trim(),
          value: pair.slice(colonIdx + 1).trim(),
        };
      })
      .filter((p): p is { key: string; value: string } =>
        p !== null && p.key.length > 0 && p.value.length > 0,
      );

    if (pairs.length > 0) {
      where.AND = [
        ...(where.AND ?? []),
        ...pairs.map(({ key, value }) => ({
          attributes: { some: { key, value } },
        })),
      ];
    }
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
export function buildSelectClause(
  fields?: string,
  opts?: { includeImages?: boolean },
) {
  if (!fields) return undefined;

  const fieldArray = fields.split(",").map((f) => f.trim());
  const select: any = {};

  const fieldMap: Record<string, string> = {
    created_at: "createdAt",
    updated_at: "updatedAt",
  };

  fieldArray.forEach((field) => {
    const prismaField = fieldMap[field] ?? field;
    select[prismaField] = true;
  });

  select.product_id = true;
  select.name = true;
  select.image = true;
  if (opts?.includeImages) {
    select.images = true;
  }

  return select;
}

// Calculate pagination values
export function getPaginationParams(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

// Cursor-based pagination params — pass cursor (last product_id) for stable, index-friendly pagination
export function getCursorParams(
  cursor: string | undefined,
  limit: number,
): { cursor?: { product_id: string }; skip?: number; take: number; orderBy: object[] } {
  if (cursor) {
    return {
      cursor: { product_id: cursor },
      skip: 1,
      take: limit,
      // Stable compound sort required for cursor pagination correctness
      orderBy: [{ createdAt: "desc" as const }, { product_id: "asc" as const }],
    };
  }
  return { take: limit, orderBy: [{ createdAt: "desc" as const }, { product_id: "asc" as const }] };
}
