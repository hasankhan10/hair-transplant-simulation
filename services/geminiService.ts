import { GoogleGenAI } from "@google/genai";
import { VisualizationParams, GraftDensity } from "../types";

const MODEL_NAME = 'gemini-2.5-flash-image';

/**
 * Strips the data:image prefix to get just the base64 data
 */
const getBase64Data = (dataUrl: string): { data: string; mimeType: string } => {
    const [header, data] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    return { data, mimeType };
};

/**
 * Loads an image from a URL or base64 string
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = (e) => {
            console.error("Failed to load image:", src);
            reject(new Error("Image load failed"));
        };
        img.src = src;
    });
};

/**
 * Converts a remote or local image URL to a base64 string
 */
const urlToBase64 = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn(`Could not load reference image at ${url}`);
        throw error;
    }
};

/**
 * Composites the mask onto the original image so the AI sees the "Red Zone"
 * in the correct spatial context.
 */
const createAIComposition = async (originalBase64: string, maskBase64: string): Promise<string> => {
    const [img, mask] = await Promise.all([loadImage(originalBase64), loadImage(maskBase64)]);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return originalBase64;

    ctx.drawImage(img, 0, 0);

    // GREEN SCREEN STRATEGY (CHROMA KEY):
    // We use pure Neon Green (#00FF00) which never appears in human skin/hair.
    // This tells the AI: "This is artificial. Replace completely."
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#00FF00';
    ctx.globalAlpha = 1.0;

    // We need to draw the mask shape, but fill it with green.
    // 1. Draw the user's mask to an offscreen canvas
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
        maskCtx.drawImage(mask, 0, 0, canvas.width, canvas.height);
        maskCtx.drawImage(mask, 0, 0, canvas.width, canvas.height); // Hardened mask signal

        // 2. Composite "Source In" to keep only the mask shape but make it green
        maskCtx.globalCompositeOperation = 'source-in';
        maskCtx.fillStyle = '#00FF00';
        maskCtx.fillRect(0, 0, canvas.width, canvas.height);

        // 3. Draw the green mask onto the main image with a tiny 1px blur to help AI soften edges
        maskCtx.filter = 'blur(1px)';
        ctx.drawImage(maskCanvas, 0, 0);
        maskCtx.filter = 'none';
    }

    return canvas.toDataURL('image/png');
};

/**
 * Strictly composites the AI result onto the original image using the mask.
 */
const compositeStrictResult = async (
    originalBase64: string,
    aiResultBase64: string,
    maskBase64: string
): Promise<string> => {
    try {
        const [imgOriginal, imgAI, imgMask] = await Promise.all([
            loadImage(originalBase64),
            loadImage(aiResultBase64),
            loadImage(maskBase64)
        ]);

        const canvas = document.createElement('canvas');
        canvas.width = imgOriginal.width;
        canvas.height = imgOriginal.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) return aiResultBase64;

        // 1. Draw Background
        ctx.drawImage(imgOriginal, 0, 0);

        // 2. Prepare Soft Mask
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const maskCtx = maskCanvas.getContext('2d');

        if (maskCtx) {
            maskCtx.drawImage(imgMask, 0, 0, canvas.width, canvas.height);
            maskCtx.globalCompositeOperation = 'source-over';
            maskCtx.drawImage(imgMask, 0, 0, canvas.width, canvas.height);
            maskCtx.drawImage(imgMask, 0, 0, canvas.width, canvas.height);
        }

        // 3. Deep Feathered Blending
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
            // 12px deep feathering to eliminate the "box effect" and ensure a seamless surgical blend
            tempCtx.filter = 'blur(12px)';
            tempCtx.drawImage(maskCanvas, 0, 0);
            tempCtx.filter = 'none'; // Reset filter

            tempCtx.globalCompositeOperation = 'source-in';

            tempCtx.drawImage(imgAI, 0, 0, canvas.width, canvas.height);

            ctx.drawImage(tempCanvas, 0, 0);
        }

        return canvas.toDataURL('image/png');
    } catch (error) {
        return aiResultBase64;
    }
};

/**
 * Fetches and encodes ONE Master Reference image for the selected density.
 * Using only 1 image prevents context blending and lighting leakage.
 */
const getMasterReference = async (density: GraftDensity): Promise<{ data: string; mimeType: string } | null> => {
    const densityKey = density.toLowerCase();
    const fileExtensions = ['.jpg', '.JPG', '.jpeg', '.png'];

    // Attempt to load '1' with common extensions
    for (const ext of fileExtensions) {
        try {
            const url = `/references/density/${densityKey}/1${ext}`;
            const b64 = await urlToBase64(url);
            return getBase64Data(b64);
        } catch (e) {
            continue;
        }
    }
    return null;
};

/**
 * Validates if the uploaded image is a human scalp/head using the Backend API
 */
export const validateScalpImage = async (patientImage: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const response = await fetch('/api/v1/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ patientImage })
        });

        return await response.json();
    } catch (error: any) {
        console.error("Validation failed:", error);
        return { success: false, error: "Validation service temporarily unavailable." };
    }
};

/**
 * Generates a medical hair visualization by calling the Backend API
 */
export const generateHairVisualization = async (
    patientImage: string,
    params: VisualizationParams
): Promise<string> => {
    try {
        const response = await fetch('/api/v1/simulate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                patientImage,
                mask: params.mask,
                density: params.density
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || "Failed to generate simulation");
        }

        return data.resultImage;
    } catch (error: any) {
        console.error("Simulation failed:", error);
        throw error;
    }
};
