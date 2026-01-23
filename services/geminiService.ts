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
            // 6px feathering for a refined blend that hides the "cut" line without losing thickness
            tempCtx.filter = 'blur(6px)';
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
 * Generates a medical hair visualization using Gemini API with ONE Master Reference
 */
export const generateHairVisualization = async (
    patientImage: string,
    params: VisualizationParams
): Promise<string> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key not found");

    const densityLabel = params.density === GraftDensity.LOW ? "LOW" : params.density === GraftDensity.MEDIUM ? "MEDIUM" : "HIGH";

    // 1. Prepare the contextual image (Patient + Green Mask)
    const aiInputImage = params.mask
        ? await createAIComposition(patientImage, params.mask)
        : patientImage;

    const { data: patientBase64, mimeType: patientMime } = getBase64Data(aiInputImage);

    // 2. Fetch the Master Reference Image
    const masterRef = await getMasterReference(params.density);

    const prompt = `ROLE: MASTER HAIR TRANSPLANT SURGEON.

CRITICAL SECURITY RULE: "ONE-SHOT" CONTEXT ISOLATION.
- I am providing ONE [MASTER CLINICAL REFERENCE] image. 
- USE THIS ONLY as a mathematical frequency map for follicle spacing and graft density.
- DO NOT COPY the skin color, lighting, background, or head shape from the reference.
- THE PRIMARY PATIENT PHOTO IS THE ONLY SOURCE FOR PIXELS AND IDENTITY.

YOUR MISSION:
1. TARGET DENSITY ANALYSIS (STERILE MASTER REFERENCE):
   - Analyze the provided ${densityLabel} DENSITY MASTER REFERENCE for graft count per square cm.
   - Apply that exact graft spacing to the Patient's green mask area.

2. BIOLOGICAL DNA PRESERVATION (PATIENT PHOTO):
   - Replicate the patient's biological DNA (Hair texture, Color, Graying ratio).
   - Ensure the skin and forehead look exactly like the patient, with ZERO grayish tint from the reference.

3. ANATOMY & FRONTOTEMPORAL RECONSTRUCTION:
   - FACIAL PROPORTIONS: Evaluate the Three-Tier facial balance.
   - FRONTOTEMPORAL ANGLE: Populate the corners and temporal recesses with 100% density. NO THINNING AT THE EDGES.
   - HAIRLINE SOFTNESS: Create a natural, irregular, "micro-jagged" surgical hairline.

4. EXECUTE THE TRANSPLANT (ZERO-GOSSIP BOUNDARY):
   - 100% SPATIAL OCCUPANCY: Every single green pixel must be converted into a hair follicle.
   - ZERO GREEN ARTIFACTS: The bright green must be 100% replaced.
   - DIRECTIONAL FLOW: Create a natural growth flow matching the patient’s existing whorl and angle.

FINAL OUTPUT: A high-resolution, surgical-grade medical visualization. ${densityLabel} DENSITY. 100% PATIENT IDENTITY. NO REFERENCE LEAKAGE.`;

    const ai = new GoogleGenAI({ apiKey });
    const parts: any[] = [];

    // Add Master Reference first (Context)
    if (masterRef) {
        parts.push({ text: "[MASTER CLINICAL DENSITY REFERENCE - FOR DATA ONLY]" });
        parts.push({
            inlineData: {
                data: masterRef.data,
                mimeType: masterRef.mimeType
            }
        });
    }

    // Add Patient (Identity)
    parts.push({ text: "[PRIMARY PATIENT PHOTO - USE THIS FOR ALL PIXELS AND IDENTITY]" });
    parts.push({
        inlineData: {
            data: patientBase64,
            mimeType: patientMime
        }
    });

    // Add Command
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [{ parts }],
    });

    let resultImageUrl = '';
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                resultImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                break;
            }
        }
    }

    if (!resultImageUrl) {
        throw new Error("AI failed to generate a new look. Please try a different angle.");
    }

    // 3. CLEAN UP: Composite result back onto original
    if (params.mask) {
        return await compositeStrictResult(patientImage, resultImageUrl, params.mask);
    }

    return resultImageUrl;
};
