/**
 * Image compression utility for Postio.
 *
 * Compresses large images in the browser using the native Canvas API,
 * so the user can upload photos larger than 5 MB and Postio will
 * automatically optimize them before they hit Supabase Storage.
 *
 * Notes:
 * - We do NOT touch video files – compression is image-only.
 * - SVG is skipped (vector format – re-encoding makes no sense).
 * - GIFs are kept as-is by default (canvas re-encoding would destroy animation);
 *   if the user uploads a >5 MB GIF we still let it through untouched so the
 *   existing 5 MB hard limit in the upload hook applies.
 */

import { toast } from "sonner";

/** Files larger than this are considered "large" and will be compressed. */
export const COMPRESSION_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5 MB

/** Target maximum width/height after compression. */
const TARGET_MAX_DIMENSION = 2048;

/** Initial JPEG quality used during compression. */
const INITIAL_QUALITY = 0.8;

/** Hard cap: if a single image is larger than this we still try, but it is huge. */
const ABSOLUTE_HARD_LIMIT = 50 * 1024 * 1024; // 50 MB

/**
 * Returns true when the given file is an image that we can safely re-encode
 * through a canvas. Skips SVGs (vector) and GIFs (animated).
 */
function isCompressibleImage(file: File): boolean {
  if (file.type === "image/svg+xml") return false;
  if (file.type === "image/gif") return false;
  return file.type.startsWith("image/");
}

/**
 * Loads a File into an HTMLImageElement and resolves once it is decoded.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Keep the URL around until the image is consumed by the canvas
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Re-encodes the image through a canvas with the given dimensions and quality,
 * returning a JPEG (or PNG fallback) Blob.
 */
function encodeToBlob(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
  outputType: string,
): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas 2D context is not available"));
      return;
    }
    // White background so transparent PNGs do not turn black after JPEG conversion
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      outputType,
      quality,
    );
  });
}

/**
 * Computes scaled dimensions that preserve aspect ratio and fit within
 * the configured maximum dimension.
 */
function computeScaledDimensions(
  srcWidth: number,
  srcHeight: number,
  maxDim: number,
): { width: number; height: number } {
  if (srcWidth <= maxDim && srcHeight <= maxDim) {
    return { width: srcWidth, height: srcHeight };
  }
  if (srcWidth >= srcHeight) {
    const ratio = maxDim / srcWidth;
    return { width: maxDim, height: Math.round(srcHeight * ratio) };
  }
  const ratio = maxDim / srcHeight;
  return { width: Math.round(srcWidth * ratio), height: maxDim };
}

export interface CompressionResult {
  /** The file that should be uploaded (original or compressed). */
  file: File;
  /** Whether the file was actually compressed (false = returned as-is). */
  compressed: boolean;
  /** Original size in bytes. */
  originalSize: number;
  /** Final size in bytes (== originalSize when not compressed). */
  finalSize: number;
}

/**
 * Compresses the given image file if it exceeds the configured threshold.
 *
 * Behaviour:
 * - Non-image files (videos) → returned untouched.
 * - Images smaller than {@link COMPRESSION_THRESHOLD_BYTES} → returned untouched.
 * - Images larger than the threshold → re-encoded through a canvas with
 *   max {@link TARGET_MAX_DIMENSION}px on the longest side and quality
 *   starting at {@link INITIAL_QUALITY}. If the result is still too big the
 *   quality is reduced iteratively (down to 0.5).
 * - Images that fail to decode → original file is returned (the 5 MB hard
 *   limit in the upload hook will then apply).
 *
 * Side effect: shows a toast informing the user about the automatic
 * optimization. Logs the original → final size to the console.
 */
export async function compressImageIfNeeded(
  file: File,
  options: { warningToastMessage?: string } = {},
): Promise<CompressionResult> {
  const originalSize = file.size;

  // Quick path: not an image, already small, or beyond absolute limit
  if (!isCompressibleImage(file) || originalSize <= COMPRESSION_THRESHOLD_BYTES) {
    return { file, compressed: false, originalSize, finalSize: originalSize };
  }

  if (originalSize > ABSOLUTE_HARD_LIMIT) {
    // Do not even attempt to load an image this huge in the browser –
    // the upload hook's 50 MB hard cap will reject it.
    return { file, compressed: false, originalSize, finalSize: originalSize };
  }

  // Notify the user (only when we are actually going to compress)
  if (options.warningToastMessage) {
    toast.warning(options.warningToastMessage, {
      duration: 5000,
    });
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch (err) {
    console.warn("[Postio] compressImageIfNeeded: failed to decode image", err);
    return { file, compressed: false, originalSize, finalSize: originalSize };
  } finally {
    // loadImage keeps the URL alive for the canvas; it is revoked after encoding.
  }

  const { width: targetW, height: targetH } = computeScaledDimensions(
    img.naturalWidth,
    img.naturalHeight,
    TARGET_MAX_DIMENSION,
  );

  // Prefer JPEG for maximum size reduction. Fall back to the original mime
  // if the image is a PNG with alpha (JPEG would lose transparency, but
  // most social uploads prefer flat JPEGs anyway).
  const prefersJpeg = file.type !== "image/png" && file.type !== "image/webp";
  const outputType = prefersJpeg ? "image/jpeg" : file.type;

  // Iterate quality downwards until the blob fits or we hit the floor.
  const qualitySteps = [INITIAL_QUALITY, 0.7, 0.6, 0.5];
  let bestBlob: Blob | null = null;

  for (const quality of qualitySteps) {
    try {
      const blob = await encodeToBlob(img, targetW, targetH, quality, outputType);
      if (!blob) continue;
      bestBlob = blob;
      if (blob.size <= 3 * 1024 * 1024) {
        // 3 MB – good enough, stop trying
        break;
      }
    } catch (err) {
      console.warn("[Postio] compressImageIfNeeded: encoding failed", err);
    }
  }

  // Free the object URL assigned in loadImage
  if (img.src) URL.revokeObjectURL(img.src);

  if (!bestBlob) {
    console.warn("[Postio] compressImageIfNeeded: no blob produced, returning original");
    return { file, compressed: false, originalSize, finalSize: originalSize };
  }

  // Build a new File from the blob, preserving a sensible name + type
  const originalName = file.name;
  const dotIndex = originalName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
  const newName = `${baseName}-optimized.jpg`;
  const compressedFile = new File([bestBlob], newName, {
    type: outputType,
    lastModified: Date.now(),
  });

  const originalMB = (originalSize / (1024 * 1024)).toFixed(2);
  const newMB = (compressedFile.size / (1024 * 1024)).toFixed(2);
  // eslint-disable-next-line no-console
  console.log(
    `📸 Optimalizace: Původní velikost ${originalMB} MB -> Nová velikost ${newMB} MB`,
  );

  return {
    file: compressedFile,
    compressed: true,
    originalSize,
    finalSize: compressedFile.size,
  };
}
