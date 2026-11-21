
import { connection, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  // Make this route request-dependent (avoid prerendering)
  await connection();

  try {
    // Read query parameters
    const params = new URL(request.url).searchParams;

    // -------------------- SEARCH --------------------

    const search = params.get("search")?.trim() || "";

    // -------------------- PAGINATION --------------------

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

    // -------------------- SORTING --------------------

    const order: Prisma.SortOrder =
      params.get("order") === "asc" ? "asc" : "desc";

    // -------------------- SEARCH FILTER --------------------

    const where: Prisma.LabWhereInput = {};

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

    // -------------------- FETCH LABS --------------------

    const [labs, total] = await Promise.all([
      prisma.lab.findMany({
        where,

        include: {
          models: {
            select: {
              id: true,
              name: true,
              slug: true,
              modelType: true,
              contextWindow: true,
              inputPrice: true,
              outputPrice: true,
            },
          },
        },

        orderBy: {
          name: order,
        },

        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.lab.count({
        where,
      }),
    ]);

    // -------------------- RESPONSE --------------------

    return NextResponse.json({
      success: true,
      message: "Labs fetched successfully.",

      data: labs.map((lab) => ({
        id: lab.id,
        name: lab.name,
        description: lab.description,
        website: lab.website,
        logo: lab.logo,
        totalModels: lab.models.length,
        models: lab.models,
      })),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Lab API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch labs.",
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
