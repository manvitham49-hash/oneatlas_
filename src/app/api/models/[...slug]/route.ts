
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    slug: string[];
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    // 1. Get slug from URL parameters
    const { slug: slugParts } = await params;

    // 2. Validate slug
    if (!slugParts || slugParts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Model slug is required",
        },
        { status: 400 }
      );
    }

    // 3. Convert slug array into complete slug
    const slug = slugParts.join("/");

    // 4. Fetch model with related information
    const model = await prisma.model.findUnique({
      where: {
        slug: slug,
      },

      include: {
        // Lab information
        lab: true,

        // Provider information
        providers: {
          include: {
            provider: true,
          },
        },

        // Benchmark information
        // Latest benchmark records appear first
        benchmarks: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    // 5. Check whether model exists
    if (!model) {
      return NextResponse.json(
        {
          success: false,
          message: "AI model not found",
        },
        { status: 404 }
      );
    }

    // 6. Return complete model details
    return NextResponse.json(
      {
        success: true,
        data: model,
        message: "Model details fetched successfully",
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Model Details API Error:", error);

    // 7. Handle server errors
    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch model details",
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
      { status: 500 }
    );
  }
}
