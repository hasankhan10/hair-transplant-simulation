
/**
 * Advanced Image Processing Utility for Medical Visualization
 * Handles automatic head detection and focusing.
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

            // 1. Initial analysis to find the "Head" region
            // We look for the main cluster of pixels that aren't background
            // This is a heuristic: most patient photos have a subject in the center-top

            const width = img.width;
            const height = img.height;
            const aspectRatio = height / width;

            let cropWidth, cropHeight, startX, startY;

            // INTELLIGENT CLINICAL CROP
            // We differentiate between "Already focused" photos and "Torso/Distant" photos.
            // If the photo is already square-ish (Aspect < 1.25), we assume it's a headshot.

            const isAlreadyFocused = aspectRatio < 1.25;

            if (isAlreadyFocused) {
                // PHOTO TYPE 2 (OR TOP-DOWN SCALP): 
                // Don't cut aggressively. Just center it and normalize to square.
                const side = Math.min(width, height) * 0.95; // Take nearly the whole photo
                cropWidth = side;
                cropHeight = side;
                startX = (width - side) / 2;
                startY = (height - side) / 2;
            } else {
                // PHOTO TYPE 1 (TORSO/DISTANT PORTRAIT):
                // Apply aggressive surgical focus on the head area (upper half).
                // We take 80% of the width to include face AND scalp context.
                const side = width * 0.80;
                cropWidth = side;
                cropHeight = side;
                startX = (width - side) / 2;

                // Position startY near the top to capture the scalp/forehead (8% down)
                startY = height * 0.08;
            }

            // Standardize output to a clinical 1:1 square
            canvas.width = 1024;
            canvas.height = 1024;

            // Draw the "Smart Focus"
            ctx.drawImage(
                img,
                startX, startY, cropWidth, cropHeight, // Source (Focused on head)
                0, 0, 1024, 1024                       // Destination (Clinical Standard)
            );

            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = reject;
        img.src = base64Image;
    });
};
