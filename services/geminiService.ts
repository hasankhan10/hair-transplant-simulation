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

    // 2. Composite "Source In" to keep only the mask shape but make it green
    maskCtx.globalCompositeOperation = 'source-in';
    maskCtx.fillStyle = '#00FF00';
    maskCtx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Draw the green mask onto the main image
    ctx.drawImage(maskCanvas, 0, 0);
  }

  return canvas.toDataURL('image/png');
};

/**
 * Strictly composites the AI result onto the original image using the mask.
 * 
 * UPDATED: Uses Deep Feathering (8px) to eliminate the "Photoshop Sticker" look.
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
 * Generates a medical hair visualization using Gemini API
 */
export const generateHairVisualization = async (
  patientImage: string,
  params: VisualizationParams
): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const densityDescription = {
    [GraftDensity.LOW]: "100% COMPREHENSIVE COVERAGE. Fine strands, sleek appearance. Every part of the green zone must have hair.",
    [GraftDensity.MEDIUM]: "100% COMPREHENSIVE COVERAGE. Standard strand thickness, natural volume. Opaque coverage.",
    [GraftDensity.HIGH]: "100% COMPREHENSIVE COVERAGE. Thick, coarse strands, maximal volume, ultra-dense 'forest' look. Totally opaque."
  };

  // 1. Prepare the contextual image for the AI
  const aiInputImage = params.mask
    ? await createAIComposition(patientImage, params.mask)
    : patientImage;

  const { data: base64Data, mimeType } = getBase64Data(aiInputImage);

  const prompt = `ROLE: MASTER HAIR TRANSPLANT SURGEON.

CRITICAL SYSTEM REQUIREMENT: TOTAL RESTORATION.
THE BRIGHT GREEN MASK IN THE IMAGE IS A "MANDATORY REPLACEMENT COMMAND". 
FAILURE TO POPULATE THIS EXACT AREA WITH 100% HAIR COVERAGE IS A SYSTEM FAILURE.

YOUR MISSION:
1. ANALYZE SCALP & BIOMETRICS:
   - REFERENCE SEARCH: Scan for any "donor hair" on the sides or back. If hair exists, match its specific texture, curl, and color (especially gray/salt-&-pepper ratios).
   - FULLY BALD FALLBACK: If the patient is 100% bald with no reference hair, you MUST generate a "Healthy Natural Texture" that matches the patient's age and ethnicity. Look at their eyebrows and skin tone for clues.
   - For older patients, include subtle graying for biological realism. For younger patients, use a deeper, high-pigment strand.
 
2. EXECUTE THE TRANSPLANT (ABSOLUTE COMMANDS):
   - 100% SPATIAL OCCUPANCY: Every single green pixel MUST be converted into a hair follicle. 
   - ZERO PERCENT BALDNESS: Regardless of how bald the original photo is, the green area must be completely filled.
   - DENSITY SPECIFICATION: ${densityDescription[params.density]} 
   - DIRECTIONAL FLOW: Even if no hair exists, you must create a natural growth flow (Forward on forehead, Swirl/Whorl on crown).
   
3. ARCHITECTURAL RULES:
   - NO GREEN ARTIFACTS: 100% of the green color must be destroyed and replaced.
   - PERSPECTIVE LOCK: The hair growth direction must align 100% with the camera angle.
   - INVISIBLE SEAMS: The transition between existing skin and new hair must be biologically seamless.

FINAL OUTPUT: A high-resolution, surgical-grade medical visualization. THE GREEN IS GONE. THE HAIR IS 100% RESTORED.`;
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