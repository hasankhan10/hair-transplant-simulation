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
  // Draw the mask at 100% opacity for the AI to see it as a "Command Zone"
  ctx.globalAlpha = 1.0;
  ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/png');
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
      // Reduced to 1px for sharper, strand-level blending (avoids the 'fuzzy' look)
      tempCtx.filter = 'blur(1px)';
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const densityDescription = {
    [GraftDensity.LOW]: "25 grafts/cm². Natural scalp visibility between follicles.",
    [GraftDensity.MEDIUM]: "45 grafts/cm². Strong coverage with natural depth.",
    [GraftDensity.HIGH]: "70+ grafts/cm². Dense packing, scalp completely obscured."
  };

  // 1. Prepare the contextual image for the AI
  const aiInputImage = params.mask
    ? await createAIComposition(patientImage, params.mask)
    : patientImage;

  const { data: base64Data, mimeType } = getBase64Data(aiInputImage);

  const prompt = `CRITICAL OBJECTIVE: RECONSTRUCT BIOLOGICAL HAIR.
The patient image has a SOLID RED marked zone. You must replace this red area with 100% photorealistic, medically accurate hair follicles.

AUTONOMOUS DETECTION & BIOLOGICAL RULES (MANDATORY):
1. PATIENT ANALYSIS: Automatically detect the patient's biological age, ethnicity, and unique hair characteristics (color, thickness, and natural "Salt & Pepper" gray/black mix) from IMAGE 1. 
2. TEXTURE MATCHING: Replicate the exact hair texture (Straight, Wavy, Curly, or Coily) seen in the surrounding hair. The result must be a high-frequency digital construction, not a smooth edit.
3. ROOT REALISM: Generate micro-shadows at the root of every hair strand. There must be "depth" between the hair and the scalp.
4. ANATOMICAL FLOW: 
   - Detect the head position and angle.
   - If this is a CROWN shot, create a precise SPIRAL WHORL matching the existing rotation.
   - If frontal, create a forward "leaping" hair direction.
5. IRREGULARITY: Avoid perfect symmetry. Add natural flyaways and slightly messy strand directions to avoid the "wig" or "Photoshop" look.
6. DENSITY: ${densityDescription[params.density]}.
7. DELETE RED: Ensure not a single pixel of red remains. Replace it with 100% hair and scalp detail.

STRICT RULE: The final result must be indistinguishable from a real post-transplant photograph. The AI must adapt perfectly to THIS specific person's DNA and hair pattern.`;
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          { text: prompt }
        ],
      },
    ],
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

  // 3. CLEAN UP: Composite the AI result back onto the original to ensure 
  // background Sharpness and Edge Blending (feathering).
  if (params.mask) {
    return await compositeStrictResult(patientImage, resultImageUrl, params.mask);
  }

  return resultImageUrl;
};