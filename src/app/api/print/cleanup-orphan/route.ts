import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "@/utils/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/auth.config";

/**
 * Route handler for cleaning up unsubmitted print document uploads on tab close / beacon
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate caller (Session or Bearer JWT)
    const session = await getServerSession(authOptions);
    const apiAuth = !session?.user ? await verifyAuth(req) : null;
    const user = session?.user || apiAuth?.user;

    if (!user || !user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = { filePath: text };
      }
    }

    const { filePath, fileUrl } = body || {};
    const target = filePath || fileUrl;

    if (!target || typeof target !== "string" || target.includes("..")) {
      return NextResponse.json({ success: false, error: "Invalid filePath" }, { status: 400 });
    }

    // 2. Ownership Verification: Ensure the path belongs to this user or caller is SUPER_ADMIN
    const isOwner = target.includes(`/${user.id}_`) || target.includes(`${user.id}_`);
    const isAdmin = (user as any).role === "SUPER_ADMIN" || (user as any).role === "PRINT_MANAGER";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden: You do not own this asset." }, { status: 403 });
    }

    // 3. Safety check: ensure file is NOT linked to an existing, active PrintOrder
    const existingOrder = await prisma.printOrder.findFirst({
      where: {
        OR: [
          { fileUrl: { contains: target } },
          { deliveryLocation: { contains: target } },
        ],
      },
      select: { id: true },
    });

    // If order was already submitted, preserve the file
    if (existingOrder) {
      return NextResponse.json({ success: true, message: "File belongs to active order, preserved." });
    }

    // Unsubmitted orphaned file -> delete from Supabase storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      let bucketName = "print-documents";
      let relativePath = target;
      if (relativePath.includes("/print-documents/")) {
        relativePath = relativePath.split("/print-documents/")[1];
      } else if (relativePath.includes("/documents/")) {
        bucketName = "documents";
        relativePath = relativePath.split("/documents/")[1];
      }
      relativePath = relativePath.split("?")[0];

      await supabaseAdmin.storage.from(bucketName).remove([relativePath]);
    }

    return NextResponse.json({ success: true, deleted: target });
  } catch (error: any) {
    console.warn("[cleanup-orphan API Warning]:", error?.message);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
