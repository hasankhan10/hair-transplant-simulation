
/**
 * Advanced Image Processing Utility for Medical Visualization
 * Standardizes images while preserving original framing.
 */

export const autoCropToHead = async (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64Image);
                return;
            }

            // CLINICAL NORMALIZATION (NO CROPPING)
            // As per user request, we no longer "auto zoom" or "auto cut".
            // We use the image exactly as provided, but we normalize the size
            // to ensure high performance and API compatibility.

            const maxDimension = 1280; // Standard High-Def clinical resolution
            let targetWidth = img.width;
            let targetHeight = img.height;

            // Scale down if the image is excessively large to prevent memory/API errors
            if (targetWidth > maxDimension || targetHeight > maxDimension) {
                if (targetWidth > targetHeight) {
                    targetHeight = (targetHeight / targetWidth) * maxDimension;
                    targetWidth = maxDimension;
                } else {
                    targetWidth = (targetWidth / targetHeight) * maxDimension;
                    targetHeight = maxDimension;
                }
            }

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // Draw the image "As It Is" without any cropping or zooming
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            // Use high-quality JPEG to keep data size manageable for AI processing
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = reject;
        img.src = base64Image;
    });
};
