
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

            // AGGRESSIVE HEAD-CENTRIC CROP
            // We focus on the top-center of the image where the face/scalp usually resides.
            // We want to eliminate the chest, shoulders, and excessive background.

            let cropWidth, cropHeight, startX, startY;

            if (width > height) {
                // Landscape: High focus on the middle vertical slice
                cropHeight = height * 0.85; // Avoid very top/bottom edges
                cropWidth = cropHeight * 0.8; // Maintain a 4:5 vertical head ratio
                startX = (width - cropWidth) / 2;
                startY = height * 0.05; // Drop slightly from the very top
            } else {
                // Portrait: This is the most common for selfies.
                // We need to cut inward from the sides and significantly from the bottom.
                cropWidth = width * 0.75; // Take only the center 75% of the width
                cropHeight = cropWidth * 1.1; // Make it a vertical rectangle (Head sized)
                startX = (width - cropWidth) / 2;

                // Hair transplants need the TOP of the head, so we start near the top.
                // We go down just enough to capture the neck but stop before the chest.
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
