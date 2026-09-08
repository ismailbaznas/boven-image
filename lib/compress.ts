export type StagedMediaFile = {
  file: File;
  originalFile: File;
  originalSize: number;
  compressedSize: number;
  isCompressed: boolean;
};

/**
 * Resizes and compresses an image in the browser if size > maxBytes or dimensions > maxDimension.
 * Target: High resolution (max 2560px), JPEG quality 85%, payload < 3.8 MB (safe for Vercel 4.5MB limit).
 */
export async function compressImageIfNeeded(
  file: File,
  maxDimension = 2560,
  quality = 0.85,
  maxBytes = 3.8 * 1024 * 1024
): Promise<StagedMediaFile> {
  // If not an image or SVG/GIF, return as-is
  if (!file.type.startsWith("image/") || file.type.includes("svg") || file.type.includes("gif")) {
    return {
      file,
      originalFile: file,
      originalSize: file.size,
      compressedSize: file.size,
      isCompressed: false,
    };
  }

  // If already below threshold, we keep as-is
  const needsCompression = file.size > maxBytes;
  if (!needsCompression) {
    return {
      file,
      originalFile: file,
      originalSize: file.size,
      compressedSize: file.size,
      isCompressed: false,
    };
  }

  try {
    const compressedBlob = await compressBrowserImage(file, maxDimension, quality);
    if (compressedBlob && compressedBlob.size < file.size) {
      const originalName = file.name;
      // Ensure extension matches JPEG output
      const normalizedName = originalName.replace(/\.(png|jpeg|jpg|webp)$/i, ".jpg");
      const compressedFile = new File([compressedBlob], normalizedName, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      return {
        file: compressedFile,
        originalFile: file,
        originalSize: file.size,
        compressedSize: compressedFile.size,
        isCompressed: true,
      };
    }
  } catch (err) {
    console.warn("Client compression fallback to original:", err);
  }

  return {
    file,
    originalFile: file,
    originalSize: file.size,
    compressedSize: file.size,
    isCompressed: false,
  };
}

function compressBrowserImage(
  file: File,
  maxDimension: number,
  initialQuality: number
): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Scale down if larger than maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return resolve(null);
      }

      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Export as JPEG
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return resolve(null);
          }
          // If blob is still > 3.8 MB, try a slightly lower quality pass
          if (blob.size > 3.8 * 1024 * 1024 && initialQuality > 0.7) {
            canvas.toBlob(
              (lowerBlob) => {
                resolve(lowerBlob || blob);
              },
              "image/jpeg",
              0.75
            );
          } else {
            resolve(blob);
          }
        },
        "image/jpeg",
        initialQuality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}
