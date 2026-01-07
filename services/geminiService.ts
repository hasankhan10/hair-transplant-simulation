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
 * Loads an image from a base64 string
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => {
      console.error("Failed to load image for composition");
      reject(new Error("Image load failed"));
    };
    img.src = src;
  });
};

/**
 * Strictly composites the AI result onto the original image using the mask.
 * This forces the AI output to exist ONLY where the user drew the mask.
 * 
 * UPDATED: Adds edge feathering/blurring to the mask to ensure the hair
 * blends naturally with the skin, avoiding the "hard sticker" look.
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

    // 1. Draw Background (Original Photo)
    ctx.drawImage(imgOriginal, 0, 0);

    // 2. Prepare the Mask (Solidify + Soften)
    // We create a separate canvas to process the mask before using it for clipping
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');

    if (maskCtx) {
      // A. Draw the user's raw mask
      maskCtx.drawImage(imgMask, 0, 0, canvas.width, canvas.height);

      // B. "Solidify" the mask. 
      // The user draws with opacity 0.85. We draw it over itself multiple times
      // to ensure the core area is fully opaque (alpha=1.0) so hair isn't transparent.
      maskCtx.globalCompositeOperation = 'source-over';
      maskCtx.drawImage(imgMask, 0, 0, canvas.width, canvas.height);
      maskCtx.drawImage(imgMask, 0, 0, canvas.width, canvas.height);
    }

    // 3. Cutout Logic with Feathering
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      // A. Draw the processed mask WITH A BLUR
      // This creates a soft alpha gradient at the edges (feathering)
      // making the hair fade into the skin rather than stopping abruptly.
      tempCtx.filter = 'blur(2px)';
      tempCtx.drawImage(maskCanvas, 0, 0);
      tempCtx.filter = 'none'; // Reset filter

      // B. Composite Mode: Keep only pixels where mask exists
      tempCtx.globalCompositeOperation = 'source-in';

      // C. Draw AI Result (stretched to fit canvas to avoid alignment issues)
      tempCtx.drawImage(imgAI, 0, 0, canvas.width, canvas.height);

      // D. Draw the cut-out hair onto main canvas
      ctx.drawImage(tempCanvas, 0, 0);
    }

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error("Composition Error - Returning raw AI result (Risk of leakage):", error);
    return aiResultBase64;
  }
};

/**
 * Generates a medical hair visualization using Gemini API
 */
export const generateHairVisualization = async (
  patientImage: string,
  params: VisualizationParams
): Promise<string> => {
  // 1. Try to initialize the API client
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }

  // 2. Define the simulation prompt with more impactful "Medical" descriptions
  const densityDescription = {
    [GraftDensity.LOW]: "RECONSTRUCT with 25-35 follicular units per cm². This is a 'Light' coverage suitable for a natural look where some scalp is still visible. Use fine, thin grafts.",
    [GraftDensity.MEDIUM]: "RECONSTRUCT with 45-55 follicular units per cm². This is 'Standard High Quality' coverage. The scalp should be mostly covered, appearing thick and healthy.",
    [GraftDensity.HIGH]: "RECONSTRUCT with 65-75+ follicular units per cm². This is 'Maximum Density' (Dense Packing). The scalp should be completely obscured by thick, lush, and high-volume hair."
  };

  console.log(`[Simulation] Starting with Density: ${params.density}, Hair: ${params.hairType}`);

  const useMask = params.mask;
  const { data: base64Data, mimeType } = getBase64Data(patientImage);

  // UPDATED PROMPT: Ultra-Aggressive for Reconstruction and Density Compliance
  const prompt = `You are a world-class medical hair transplant simulation engine. Your goal is to show the patient a RECONSTRUCTED, SUCCESSFUL result.

CONTEXT:
- IMAGE 1: The original hair loss photo.
- IMAGE 2: The surgical mask. The RED-painted area is the EXACT target for new follicular unit transplantation.

MANDATORY EXECUTION RULES:
1. RECONSTRUCTION (CRITICAL): You MUST fill the entire RED-MARKED AREA from IMAGE 2 with new, healthy hair. Do NOT show the bald or thinning scalp that exists in IMAGE 1 inside this zone. REPLACE it.
2. DENSITY COMPLIANCE: You must strictly follow the requested density:
   - ${densityDescription[params.density]}
   - If HIGH density is requested, the scalp should be ALMOST INVISIBLE under thick hair.
   - If MEDIUM density is requested, show full coverage with natural scalp depth.
3. PERSPECTIVE: Maintain the 3D geometry and angle from IMAGE 1. The hair must wrap naturally around the curvature of the head.
4. NATURAL MATCH: The new hair MUST match the existing hair in IMAGE 1 (Color: same, Texture: ${params.hairType}, Direction: natural flow).
5. BLENDING: The transition between the new hair (inside the mask) and old hair (outside) must be seamless and indistinguishable.

NEGATIVE CONSTRAINTS:
- DO NOT return the same image.
- DO NOT leave the red area bald or thinning.
- DO NOT add hair outside the red area unless for edge blending.

OUTPUT GOAL:
A photorealistic, medical-grade "After" photo that VIRTUALLY ELIMINATES the hair loss shown in the red-marked zone.
`;


  // Initialize AI
  const ai = new GoogleGenAI({ apiKey });

  const parts: any[] = [
    {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    },
  ];

  if (useMask) {
    const maskData = getBase64Data(params.mask!);
    parts.push({
      inlineData: {
        data: maskData.data,
        mimeType: maskData.mimeType,
      }
    });
  }

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: parts,
    },
  });

  let resultImageUrl = '';

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        const responseMimeType = part.inlineData.mimeType || 'image/png';
        resultImageUrl = `data:${responseMimeType};base64,${base64EncodeString}`;
        break;
      }
    }
  }

  if (!resultImageUrl) {
    throw new Error("API did not return a modified image.");
  }

  // 3. FORCE BOUNDARIES WITH FEATHERING
  if (useMask) {
    return await compositeStrictResult(patientImage, resultImageUrl, params.mask!);
  }

  return resultImageUrl;
};