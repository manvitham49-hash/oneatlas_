
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";

// -------------------- ADMIN AUTHENTICATION --------------------

async function requireAdmin() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized. Please log in as admin.",
      },
      { status: 401 }
    );
  }

  return null;
}

// -------------------- GET: FETCH BENCHMARKS --------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const modelSlug = searchParams.get("modelSlug")?.trim();
    const category = searchParams.get("category")?.trim();
    const search = searchParams.get("search")?.trim();

    const parsedPage = Number.parseInt(
      searchParams.get("page") || "1",
      10
    );

    const parsedLimit = Number.parseInt(
      searchParams.get("limit") || "50",
      10
    );

    const page = Math.max(
      1,
      Number.isFinite(parsedPage) ? parsedPage : 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.isFinite(parsedLimit) ? parsedLimit : 50
      )
    );

    const where: Prisma.BenchmarkWhereInput = {};

    if (modelSlug) {
      where.model = {
        slug: modelSlug,
      };
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          model: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          model: {
            slug: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const [benchmarks, total] = await Promise.all([
      prisma.benchmark.findMany({
        where,

        include: {
          model: {
            select: {
              id: true,
              name: true,
              slug: true,
              lab: {
                select: {
                  name: true,
                },
              },
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.benchmark.count({
        where,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Benchmarks fetched successfully.",
      data: benchmarks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Fetch Benchmarks API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch benchmarks.",
      },
      { status: 500 }
    );
  }
}

// -------------------- POST: ADD BENCHMARK --------------------

export async function POST(request: NextRequest) {
  try {
    // Verify admin session
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }

    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const modelSlug =
      typeof body.modelSlug === "string"
        ? body.modelSlug.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const category =
      typeof body.category === "string"
        ? body.category.trim()
        : "";

    if (
      !modelSlug ||
      !name ||
      body.score === undefined ||
      body.score === null ||
      body.score === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Model slug, benchmark name and score are required.",
        },
        { status: 400 }
      );
    }

    if (name.length > 150 || modelSlug.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Benchmark name or model slug is too long.",
        },
        { status: 400 }
      );
    }

    if (category.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Benchmark category is too long.",
        },
        { status: 400 }
      );
    }

    const score = Number(body.score);

    if (!Number.isFinite(score)) {
      return NextResponse.json(
        {
          success: false,
          message: "Score must be a valid number.",
        },
        { status: 400 }
      );
    }

    // Find model
    const model = await prisma.model.findUnique({
      where: {
        slug: modelSlug,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!model) {
      return NextResponse.json(
        {
          success: false,
          message: "Model not found. Check the model slug.",
        },
        { status: 404 }
      );
    }

    // Create benchmark
    const benchmark = await prisma.benchmark.create({
      data: {
        name,
        score,
        category: category || null,
        modelId: model.id,
      },
      include: {
        model: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Benchmark added successfully.",
        data: benchmark,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add Benchmark API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to add benchmark.",
      },
      { status: 500 }
    );
  }
}

// -------------------- PATCH: UPDATE BENCHMARK --------------------

export async function PATCH(request: NextRequest) {
  try {
    // Verify admin session
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }

    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Benchmark ID is required.",
        },
        { status: 400 }
      );
    }

    const existingBenchmark = await prisma.benchmark.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingBenchmark) {
      return NextResponse.json(
        {
          success: false,
          message: "Benchmark not found.",
        },
        { status: 404 }
      );
    }

    const data: Prisma.BenchmarkUpdateInput = {};

    // Update name
    if (body.name !== undefined) {
      if (
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.trim().length > 150
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Enter a valid benchmark name.",
          },
          { status: 400 }
        );
      }

      data.name = body.name.trim();
    }

    // Update score
    if (body.score !== undefined) {
      if (
        body.score === "" ||
        body.score === null ||
        !Number.isFinite(Number(body.score))
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Score must be a valid number.",
          },
          { status: 400 }
        );
      }

      data.score = Number(body.score);
    }

    // Update category
    if (body.category !== undefined) {
      if (
        body.category !== null &&
        typeof body.category !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Category must be a string or null.",
          },
          { status: 400 }
        );
      }

      const category =
        typeof body.category === "string"
          ? body.category.trim()
          : "";

      if (category.length > 100) {
        return NextResponse.json(
          {
            success: false,
            message: "Benchmark category is too long.",
          },
          { status: 400 }
        );
      }

      data.category = category || null;
    }

    // Update associated model
    if (body.modelSlug !== undefined) {
      if (
        typeof body.modelSlug !== "string" ||
        !body.modelSlug.trim() ||
        body.modelSlug.trim().length > 255
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Enter a valid model slug.",
          },
          { status: 400 }
        );
      }

      const model = await prisma.model.findUnique({
        where: {
          slug: body.modelSlug.trim(),
        },
        select: {
          id: true,
        },
      });

      if (!model) {
        return NextResponse.json(
          {
            success: false,
            message: "Model not found. Check the model slug.",
          },
          { status: 404 }
        );
      }

      data.model = {
        connect: {
          id: model.id,
        },
      };
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Provide at least one field to update.",
        },
        { status: 400 }
      );
    }

    const updatedBenchmark = await prisma.benchmark.update({
      where: { id },
      data,

      include: {
        model: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Benchmark updated successfully.",
      data: updatedBenchmark,
    });
  } catch (error) {
    console.error("Update Benchmark API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update benchmark.",
      },
      { status: 500 }
    );
  }
}

// -------------------- DELETE: REMOVE BENCHMARK --------------------

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin session
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }

    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Benchmark ID is required.",
        },
        { status: 400 }
      );
    }

    const existingBenchmark = await prisma.benchmark.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
      },
    });

    if (!existingBenchmark) {
      return NextResponse.json(
        {
          success: false,
          message: "Benchmark not found.",
        },
        { status: 404 }
      );
    }

    await prisma.benchmark.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Benchmark deleted successfully.",
      data: existingBenchmark,
    });
  } catch (error) {
    console.error("Delete Benchmark API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete benchmark.",
      },
      { status: 500 }
    );
  }
}
