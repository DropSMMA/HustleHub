import { NextResponse } from "next/server";
import { z } from "zod";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { auth } from "@/libs/next-auth";
import getS3Client from "@/libs/s3";

const requestSchema = z.object({
  fileName: z.string().trim().min(1),
  fileType: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const raw = await request.json();
    const { fileName, fileType } = requestSchema.parse(raw);

    const bucket = process.env.AWS_S3_BUCKET;
    const cdnDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

    if (!bucket) {
      return NextResponse.json(
        { message: "Storage bucket not configured." },
        { status: 500 }
      );
    }

    if (!cdnDomain) {
      return NextResponse.json(
        { message: "CloudFront domain not configured." },
        { status: 500 }
      );
    }

    const key = `uploads/${randomUUID()}-${fileName.replace(/\s+/g, "-")}`;

    const s3 = getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

    return NextResponse.json({
      uploadUrl,
      fileUrl: `${cdnDomain.replace(/\/$/, "")}/${key}`,
    });
  } catch (error) {
    console.error("[uploads][POST]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid upload request." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Unable to generate upload URL. Please try again later." },
      { status: 500 }
    );
  }
}
