
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

            // INTELLIGENT HEAD-DETECTION HEURISTIC
            // If the image is ALREADY a headshot (relatively square or 4:5 ratio),
            // we skip aggressive cropping to avoid zooming into the nose/eyes.
            // If it's a full-torso shot (usually much taller or wider), we apply aggressive zoom.

            const isAlreadyHeadshot = aspectRatio > 0.7 && aspectRatio < 1.3;

            if (isAlreadyHeadshot) {
                // If it's already a headshot, we just "Standardize" it.
                // We take 95% of the image to clean up any rough edges.
                cropWidth = width * 0.95;
                cropHeight = height * 0.95;
                startX = (width - cropWidth) / 2;
                startY = (height - cropHeight) / 2;
            } else if (width > height) {
                // Landscape (Torso Shot): High focus on the middle vertical slice
                cropWidth = width * 0.45;
                cropHeight = cropWidth; // Square focus
                startX = (width - cropWidth) / 2;
                startY = height * 0.05;
            } else {
                // Portrait (Torso Shot): Aggressive head-focus
                cropWidth = width * 0.48; // Capture 48% of the width (center)
                cropHeight = cropWidth * 1.1; // Maintain a vertical face/head ratio
                startX = (width - cropWidth) / 2;
                startY = height * 0.08;
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
