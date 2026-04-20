import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema-pg";
import { eq, desc } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import crypto from "crypto";
import { getAdminFromCookie } from "@/lib/auth";
import { hasPermission } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/utils";
import { sendWelcomeEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function GET() {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    // Get requesting user's role
    const requestingUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, Number(admin.sub)),
    });

    if (!requestingUser || !hasPermission(requestingUser.role, JSON.parse(requestingUser.permissions || "[]"), "users.view")) {
      return apiError("No permission to view users", 403, "FORBIDDEN");
    }

    let users: any[] = await db.select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      permissions: adminUsers.permissions,
      isActive: adminUsers.isActive,
      lastLoginAt: adminUsers.lastLoginAt,
      createdAt: adminUsers.createdAt,
    }).from(adminUsers).orderBy(desc(adminUsers.createdAt));

    // Non-admins can't see admin accounts
    if (requestingUser.role !== "admin") {
      users = users.filter((u) => u.role !== "admin");
    }

    // Testers only see users they created + themselves
    if (requestingUser.role === "tester") {
      users = users.filter((u: any) => u.id === requestingUser.id);
    }

    return apiSuccess(users.map((u) => ({
      ...u,
      permissions: JSON.parse(u.permissions || "[]"),
    })));
  } catch (error) {
    console.error("GET /api/admin/users error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to fetch users", 500);
  }
}

export async function POST(request: Request) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const requestingUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, Number(admin.sub)),
    });

    if (!requestingUser || !hasPermission(requestingUser.role, JSON.parse(requestingUser.permissions || "[]"), "users.manage")) {
      return apiError("No permission to manage users", 403, "FORBIDDEN");
    }

    const body = await request.json();
    const { email, name, role, permissions } = body;

    if (!email || !name || !role) {
      return apiError("Email, name, and role are required", 400, "VALIDATION_ERROR");
    }

    // Generate strong password
    const generatedPassword = crypto.randomBytes(12).toString("base64url").slice(0, 16);

    // Non-admins can't create admins
    if (requestingUser.role !== "admin" && role === "admin") {
      return apiError("Only admins can create admin accounts", 403, "FORBIDDEN");
    }

    // Testers can only create tester accounts
    if (requestingUser.role === "tester" && role !== "tester") {
      return apiError("Testers can only create other tester accounts", 403, "FORBIDDEN");
    }

    // Non-admins can't grant permissions they don't have
    if (requestingUser.role !== "admin" && permissions) {
      const myPerms = JSON.parse(requestingUser.permissions || "[]");
      for (const perm of permissions) {
        if (!myPerms.includes(perm)) {
          return apiError(`You can't grant permission "${perm}" because you don't have it`, 403, "FORBIDDEN");
        }
      }
    }

    // Check unique email
    const existing = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.email, email.trim().toLowerCase()),
    });
    if (existing) {
      return apiError("An account with this email already exists", 409, "DUPLICATE");
    }

    const passwordHash = hashSync(generatedPassword, 12);

    const [created] = await db.insert(adminUsers).values({
      email: email.trim().toLowerCase(),
      passwordHash,
      name: name.trim(),
      role,
      permissions: JSON.stringify(permissions || []),
      mustChangePassword: true,
    }).returning();

    // Send welcome email with credentials
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leafyshop.eu";
    sendWelcomeEmail(
      email.trim().toLowerCase(),
      name.trim(),
      generatedPassword,
      `${appUrl}/management/login`,
      role,
    ).catch(() => {});

    // Audit log
    logAudit({
      userId: Number(admin.sub),
      userName: requestingUser?.name || "Unknown",
      userRole: requestingUser?.role || "unknown",
      action: "create",
      entityType: "user",
      entityId: created.id,
      entityName: name.trim(),
      isTestData: requestingUser?.role === "tester",
    });

    revalidatePath("/management", "layout");
    return apiSuccess({
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
    }, 201);
  } catch (error) {
    console.error("POST /api/admin/users error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to create user", 500);
  }
}
