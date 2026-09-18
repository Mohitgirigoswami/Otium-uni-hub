import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

if (process.env.CLOUDINARY_API_KEY && process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "otium_wall_memes";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No image file provided." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. If Cloudinary credentials are fully configured, attempt Cloudinary
    if (
      process.env.CLOUDINARY_API_KEY &&
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      try {
        const uploadResult = await new Promise<any>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: "auto" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(buffer);
        });

        return NextResponse.json({
          success: true,
          data: {
            url: uploadResult.secure_url || uploadResult.url,
            publicId: uploadResult.public_id,
            width: uploadResult.width,
            height: uploadResult.height,
          },
        });
      } catch (cloudErr) {
        console.warn("[POST /api/upload]: Cloudinary upload failed, falling back to local storage.", cloudErr);
      }
    }

    // 2. High-reliability Local Disk Fallback: save to public/uploads
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const rawExt = file.name ? path.extname(file.name).toLowerCase() : ".jpg";
    const ext = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(rawExt) ? rawExt : ".jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    await fs.promises.writeFile(filePath, buffer);

    const host = req.headers.get("host") || "192.168.31.146:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const fileUrl = `${protocol}://${host}/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        publicId: fileName,
        width: 800,
        height: 600,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/upload Fatal Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Image upload failed." },
      { status: 500 }
    );
  }
}
