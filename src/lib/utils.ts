import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Params = Partial<
  Record<keyof URLSearchParams, string | number | null | undefined>
>;

export function createQueryString(
  params: Params,
  searchParams: URLSearchParams
) {
  const newSearchParams = new URLSearchParams(searchParams?.toString());

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      newSearchParams.delete(key);
    } else {
      newSearchParams.set(key, String(value));
    }
  }

  return newSearchParams.toString();
}

export function formatDate(
  date: Date | string | number,
  opts: Intl.DateTimeFormatOptions = {}
) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: opts.month ?? "long",
    day: opts.day ?? "numeric",
    year: opts.year ?? "numeric",
    ...opts,
  }).format(new Date(date));
}

/**
 * 压缩图片到指定大小（默认1MB）
 * @param file 原始文件
 * @param maxSizeInBytes 最大字节数 (1MB = 1048576)
 * @returns 压缩后的 File 对象
 */
export async function compressImage(file: File, maxSizeInBytes: number = 1048576): Promise<File> {
  // 如果文件已经小于限制，直接返回
  if (file.size <= maxSizeInBytes) return file;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // 限制最大分辨率为 1080p
        const MAX_DIMENSION = 1920;
        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        const attemptCompression = (q: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("图片处理失败"));
                return;
              }
              // 如果还是太大，且质量还能降，继续压缩
              if (blob.size > maxSizeInBytes && q > 0.1) {
                attemptCompression(q - 0.1);
              } else {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
                  type: "image/webp",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            },
            "image/webp",
            q
          );
        };

        attemptCompression(quality);
      };
      img.onerror = () => reject(new Error("图片加载失败"));
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
  });
}
