import sharp from 'sharp';

export interface PaddingInfo {
    top: number;
    left: number;
    bottom: number;
    right: number;
}

/**
 * Strips the data:image prefix to get just the base64 data
 */
export const getBase64Data = (dataUrl: string): { data: string; mimeType: string } => {
    const [header, data] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    return { data, mimeType };
};

/**
 * Server-side image composition using Sharp
 */
export async function compositeStrictResultServer(
    originalBuffer: Buffer,
    aiResultBuffer: Buffer,
    maskBuffer: Buffer
): Promise<Buffer> {
    const originalMetadata = await sharp(originalBuffer).metadata();

    // 1. Create a feathered mask (8px blur like in the browser)
    const featheredMask = await sharp(maskBuffer)
        .resize(originalMetadata.width, originalMetadata.height)
        .blur(8)
        .toBuffer();

    // 2. Extract the AI result through the feathered mask
    const aiWithAlpha = await sharp(aiResultBuffer)
        .resize(originalMetadata.width, originalMetadata.height)
        .composite([{ input: featheredMask, blend: 'dest-in' }])
        .png()
        .toBuffer();

    // 3. Composite onto the original
    return sharp(originalBuffer)
        .composite([{ input: aiWithAlpha, top: 0, left: 0 }])
        .toBuffer();
}

/**
 * Pads an image to make it square, keeping it centered.
 */
export async function padToSquare(inputBuffer: Buffer): Promise<{
    buffer: Buffer;
    originalWidth: number;
    originalHeight: number;
    padding: PaddingInfo;
}> {
    const metadata = await sharp(inputBuffer).metadata();
    const w = metadata.width!;
    const h = metadata.height!;
    const size = Math.max(w, h);

    const left = Math.floor((size - w) / 2);
    const top = Math.floor((size - h) / 2);
    const right = size - w - left;
    const bottom = size - h - top;

    const squareBuffer = await sharp(inputBuffer)
        .extend({
            top,
            left,
            bottom,
            right,
            background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .resize(1024, 1024)
        .png()
        .toBuffer();

    return {
        buffer: squareBuffer,
        originalWidth: w,
        originalHeight: h,
        padding: { top, left, bottom, right }
    };
}

/**
 * Crops a square padded image back to its original aspect ratio.
 */
export async function cropToOriginal(
    squareBuffer: Buffer,
    originalWidth: number,
    originalHeight: number,
    padding: PaddingInfo
): Promise<Buffer> {
    const size = Math.max(originalWidth, originalHeight);

    return sharp(squareBuffer)
        .resize(size, size)
        .extract({
            left: padding.left,
            top: padding.top,
            width: originalWidth,
            height: originalHeight
        })
        .png()
        .toBuffer();
}

/**
 * Converts a grayscale/red opaque mask (where painted region has alpha>0, unpainted has alpha=0)
 * into an OpenAI-compatible mask (where painted region has alpha=0, unpainted has alpha=255).
 * Pads it to square to match the padded patient photo.
 */
export async function prepareOpenAiMask(
    maskBuffer: Buffer,
    originalWidth: number,
    originalHeight: number,
    padding: PaddingInfo
): Promise<Buffer> {
    // 1. Pad the user's mask to square matching the patient's aspect ratio extension
    // 2. Negate the color and the alpha channel (so painted transparent becomes opaque, and painted opaque becomes transparent)
    return sharp(maskBuffer)
        .extend({
            top: padding.top,
            left: padding.left,
            bottom: padding.bottom,
            right: padding.right,
            background: { r: 0, g: 0, b: 0, alpha: 0 } // pad with transparent
        })
        .resize(1024, 1024, { fit: 'fill' })
        .ensureAlpha()
        .negate({ alpha: true })
        .png()
        .toBuffer();
}
