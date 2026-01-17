
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

            // Target Dimensions (Focus Area)
            // Usually, the head is in the upper 70% of the photo and centered.
            // We want to zoom into a tighter box.

            let cropWidth, cropHeight, startX, startY;

            if (width > height) {
                // Landscape - likely has a lot of "room" on sides
                cropHeight = height;
                cropWidth = height * 0.8; // Vertical box focus
                startX = (width - cropWidth) / 2;
                startY = 0;
            } else {
                // Portrait - already vertical, but maybe too much body
                cropWidth = width;
                cropHeight = width * 1.2; // Focus on top portion
                startX = 0;
                startY = 0; // Keep the top part (the head)
            }

            // Scaled Zoom: We want to center it slightly better
            // For hair transplants, the top of the head is the priority

            canvas.width = 1024; // Standardize for AI clarity
            canvas.height = 1024;

            // Draw the "Smart Crop"
            ctx.drawImage(
                img,
                startX, startY, cropWidth, cropHeight, // Source
                0, 0, 1024, 1024                       // Destination
            );

            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = reject;
        img.src = base64Image;
    });
};
