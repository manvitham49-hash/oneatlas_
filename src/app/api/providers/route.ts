
import { connection, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  // Make this route request-dependent (avoid prerendering)
  await connection();

  try {
    // Read query parameters
    const params = new URL(request.url).searchParams;

    // -------------------- 1. SEARCH PROVIDERS --------------------

    const search = params.get("search")?.trim() || "";

    // -------------------- 2. PAGINATION --------------------

    const pageValue = Number.parseInt(
      params.get("page") || "1",
      10
    );

    const limitValue = Number.parseInt(
      params.get("limit") || "10",
      10
    );

    const page = Number.isNaN(pageValue)
      ? 1
      : Math.max(1, pageValue);

    const limit = Number.isNaN(limitValue)
      ? 10
      : Math.min(50, Math.max(1, limitValue));

    // -------------------- 3. SORTING --------------------

    const order: Prisma.SortOrder =
      params.get("order") === "asc" ? "asc" : "desc";

    // -------------------- 4. SEARCH FILTER --------------------

    const where: Prisma.ProviderWhereInput = {};

    if (search) {
      where.OR = [
        {
          name: {
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

    // -------------------- 5. FETCH PROVIDERS --------------------

    const [providers, total] = await Promise.all([
      prisma.provider.findMany({
        where,

        include: {
          models: {
            include: {
              model: true,
            },
          },
        },

        orderBy: {
          name: order,
        },

        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.provider.count({
        where,
      }),
    ]);

    // -------------------- 6. FORMAT PROVIDERS --------------------

    const formattedProviders = providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      description: provider.description,
      website: provider.website,
      totalModels: provider.models.length,

      models: provider.models.map((item) => ({
        id: item.model.id,
        name: item.model.name,
        slug: item.model.slug,
        inputPrice: item.inputPrice,
        outputPrice: item.outputPrice,
      })),
    }));

    // -------------------- 7. SUCCESS RESPONSE --------------------

    return NextResponse.json(
      {
        success: true,
        message: "Providers fetched successfully.",
        data: formattedProviders,

        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Provider API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch providers.",

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
