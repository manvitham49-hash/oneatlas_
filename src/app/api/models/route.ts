
import { connection, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  // Make this route request-dependent (avoid prerendering)
  await connection();

  try {
    // Read query parameters
    const params = new URL(request.url).searchParams;

    // -------------------- 1. SEARCH AND FILTERS --------------------

    const search = params.get("search")?.trim() || "";
    const lab = params.get("lab")?.trim() || "";
    const provider = params.get("provider")?.trim() || "";
    const capability = params.get("capability")?.trim() || "";

    // -------------------- 2. PAGINATION --------------------

    const requestedPage = Number.parseInt(
      params.get("page") || "1",
      10
    );

    const requestedLimit = Number.parseInt(
      params.get("limit") || "10",
      10
    );

    const page =
      Number.isFinite(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1;

    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 50)
        : 10;

    // -------------------- 3. SORTING --------------------

    const allowedSortFields = [
      "inputPrice",
      "outputPrice",
      "contextWindow",
      "releaseDate",
      "createdAt",
      "name",
    ] as const;

    type SortField = (typeof allowedSortFields)[number];

    const requestedSort = params.get("sortBy") || "createdAt";

    const sortBy: SortField = allowedSortFields.includes(
      requestedSort as SortField
    )
      ? (requestedSort as SortField)
      : "createdAt";

    const order: Prisma.SortOrder =
      params.get("order") === "asc" ? "asc" : "desc";

    // -------------------- 4. DATABASE FILTERS --------------------

    const where: Prisma.ModelWhereInput = {};

    // Search by model name, slug or description
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Filter by lab
    if (lab) {
      where.lab = {
        name: {
          contains: lab,
          mode: "insensitive",
        },
      };
    }

    // Filter by provider
    if (provider) {
      where.providers = {
        some: {
          provider: {
            name: {
              contains: provider,
              mode: "insensitive",
            },
          },
        },
      };
    }

    // Filter by capability
    if (capability) {
      where.capabilities = {
        has: capability.toLowerCase(),
      };
    }

    // -------------------- 5. FETCH MODELS --------------------

    const [models, total] = await Promise.all([
      prisma.model.findMany({
        where,

        include: {
          lab: true,

          providers: {
            include: {
              provider: true,
            },
          },

          benchmarks: true,
        },

        orderBy: {
          [sortBy]: order,
        },

        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.model.count({
        where,
      }),
    ]);

    // -------------------- 6. PAGINATION INFORMATION --------------------

    const totalPages = Math.ceil(total / limit);

    // -------------------- 7. SUCCESS RESPONSE --------------------

    return NextResponse.json(
      {
        success: true,
        message: "Models fetched successfully.",
        data: models,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Model API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch models.",
        error:
          process.env.NODE_ENV === "development" &&
          error instanceof Error
            ? error.message
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}
