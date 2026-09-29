export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type SlipMimeType = "image/jpeg" | "image/png";

/** A local photo whose bytes are read only when it is about to be uploaded. */
export interface LocalImage {
  /** A readable file with these bytes. */
  uri: string;
  /**
   * A lasting reference to the photo to keep with its transaction, when `uri` is a temporary copy, such as `ph://` for
   * a photo iOS only lets the app read through a copy. Defaults to `uri`.
   */
  reference?: string;
  byteLength: number;
  header(): Promise<Uint8Array>;
  base64(): Promise<string>;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Identify the actual encoding from its magic bytes rather than a file name or media type. */
export function sniffImageMime(header: Uint8Array): SlipMimeType | null {
  if (PNG_SIGNATURE.every((byte, index) => header[index] === byte)) return "image/png";
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return "image/jpeg";
  return null;
}

export class SlipImageError extends Error {
  constructor(readonly code: "UNREADABLE_IMAGE" | "UNSUPPORTED_IMAGE" | "IMAGE_TOO_LARGE") {
    super(code);
    this.name = "SlipImageError";
  }
}

/**
 * Keep a readable JPEG/PNG original byte-for-byte when it fits the API limit.
 * Only oversized originals are handed to `shrink`, whose output must itself be a supported image within the limit.
 */
export async function prepareSlipUpload(
  original: LocalImage,
  shrink: (image: LocalImage) => Promise<LocalImage>
): Promise<{ fileBase64: string; mimeType: SlipMimeType }> {
  const mimeType = sniffImageMime(await original.header());
  if (!mimeType) throw new SlipImageError("UNSUPPORTED_IMAGE");
  let upload = original;
  if (original.byteLength > MAX_IMAGE_BYTES) {
    try {
      upload = await shrink(original);
    } catch {
      throw new SlipImageError("IMAGE_TOO_LARGE");
    }
    if (upload.byteLength > MAX_IMAGE_BYTES) throw new SlipImageError("IMAGE_TOO_LARGE");
  }
  const uploadMime = upload === original ? mimeType : sniffImageMime(await upload.header());
  if (!uploadMime) throw new SlipImageError("UNSUPPORTED_IMAGE");
  const fileBase64 = await upload.base64();
  if (!fileBase64) throw new SlipImageError("UNREADABLE_IMAGE");
  return { fileBase64, mimeType: uploadMime };
}
