
import { NextResponse } from "next/server";
import {
  createAdminSession,
  destroyAdminSession,
  isAdminAuthenticated,
} from "@/lib/admin-auth";

// GET: Check admin login status
export async function GET() {
  try {
    const authenticated = await isAdminAuthenticated();

    return NextResponse.json({
      success: true,
      authenticated,
    });
  } catch (error) {
    console.error("Session check error:", error);

    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        message: "Unable to verify admin session.",
      },
      { status: 500 }
    );
  }
}

// POST: Admin login
export async function POST(request: Request) {
  try {
    const adminPassword = process.env.BENCHMARK_ADMIN_KEY;

    if (!adminPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin authentication is not configured.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const suppliedKey =
      typeof body.adminKey === "string"
        ? body.adminKey
        : "";

    if (!suppliedKey || suppliedKey !== adminPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid admin key.",
        },
        { status: 401 }
      );
    }

    await createAdminSession();

    return NextResponse.json({
      success: true,
      authenticated: true,
      message: "Admin login successful.",
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to log in.",
      },
      { status: 500 }
    );
  }
}

// DELETE: Admin logout
export async function DELETE() {
  try {
    await destroyAdminSession();

    return NextResponse.json({
      success: true,
      authenticated: false,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Admin logout error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to log out.",
      },
      { status: 500 }
    );
  }
}
