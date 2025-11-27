"use client";

type ImageOptimizationPreset = "avatar" | "post";

interface ImageOptimizationOptions {
  preset?: ImageOptimizationPreset;
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  initialQuality?: number;
  outputType?: "image/jpeg" | "image/png" | "image/webp";
  minFileSizeBytes?: number;
}

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const DEFAULT_PRESET_OPTIONS: Record<
  ImageOptimizationPreset,
  Required<Omit<ImageOptimizationOptions, "preset">>
> = {
  avatar: {
    maxSizeMB: 0.4,
    maxWidthOrHeight: 512,
    initialQuality: 0.8,
    outputType: "image/webp",
    minFileSizeBytes: 120 * 1024,
  },
  post: {
    maxSizeMB: 1.2,
    maxWidthOrHeight: 1600,
    initialQuality: 0.82,
    outputType: "image/webp",
    minFileSizeBytes: 200 * 1024,
  },
};

const ensureExtensionMatchesMime = (name: string, mimeType: string): string => {
  const extension = MIME_EXTENSION_MAP[mimeType];

  if (!extension) {
    return name;
  }

  const baseName = name.replace(/\.[^/.]+$/, "");
  return `${baseName}.${extension}`;
};

export const optimizeImageFile = async (
  file: File,
  options?: ImageOptimizationOptions
): Promise<File> => {
  const { preset = "post", ...overrides } = options ?? {};
  const defaults = DEFAULT_PRESET_OPTIONS[preset];
  const {
    maxSizeMB,
    maxWidthOrHeight,
    initialQuality,
    outputType,
    minFileSizeBytes,
  } = {
    ...defaults,
    ...overrides,
  };

  if (file.size <= minFileSizeBytes) {
    return file;
  }

  try {
    const { default: imageCompression } = await import(
      "browser-image-compression"
    );

    const optimized = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      initialQuality,
      useWebWorker: true,
      fileType: outputType,
      fileName: ensureExtensionMatchesMime(file.name, outputType ?? file.type),
    });

    const optimizedMimeType = outputType ?? optimized.type ?? file.type;
    const optimizedName = ensureExtensionMatchesMime(
      optimized.name || file.name,
      optimizedMimeType
    );

    if (
      optimized instanceof File &&
      optimized.name === optimizedName &&
      optimized.type === optimizedMimeType
    ) {
      return optimized;
    }

    const blob =
      optimized instanceof Blob
        ? optimized
        : new Blob([optimized], { type: optimizedMimeType });

    return new File([blob], optimizedName, {
      type: optimizedMimeType,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error("[image-optimizer] Failed to optimize image", error);
    return file;
  }
};

export type { ImageOptimizationPreset, ImageOptimizationOptions };