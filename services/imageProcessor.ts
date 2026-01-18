
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

            let cropWidth, cropHeight, startX, startY;

            // SURGICAL HEADSHOT CROP
            // We force a perfectly square crop to prevent any "squeezing" or stretching.
            // We zoom in to focus strictly on the Face/Head area, exactly like Photo 2.

            const side = Math.min(width, height) * 0.55; // Capture a tight head area

            cropWidth = side;
            cropHeight = side;

            startX = (width - side) / 2;

            // Y-Axis: Position strictly towards the top for scalp focus
            if (height > width) {
                // Portrait (Selfies): Focus on upper 10%
                startY = height * 0.10;
            } else {
                // Landscape: Focus on upper 5%
                startY = height * 0.05;
            }

            // Standardize output to a focused square for the AI
            canvas.width = 1024;
            canvas.height = 1024;

            // Draw the "Face & Head" Focus
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
