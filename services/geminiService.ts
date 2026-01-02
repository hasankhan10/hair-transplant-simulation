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

  // 2. Define the simulation prompt
  const densityDescription = {
    [GraftDensity.LOW]: "Low density (35 grafts/cm²). Visible scalp spacing.",
    [GraftDensity.MEDIUM]: "Medium density (50 grafts/cm²). Natural coverage.",
    [GraftDensity.HIGH]: "High density (65 grafts/cm²). Thick, full coverage."
  };

  const useMask = params.mask;
  const { data: base64Data, mimeType } = getBase64Data(patientImage);

  // UPDATED PROMPT: Enhanced for Spatial Awareness and Multi-Angle Support
  const prompt = `You are a professional medical-grade hair transplant simulation engine.

CONTEXT:
- IMAGE 1: The original patient photo (could be frontal, crown, side, or top-down angle).
- IMAGE 2: The surgical mask. The RED-painted area defines the target transplant zone.

CORE RULES (MANDATORY):
1. PERSPECTIVE & 3D GEOMETRY: Analyze the camera angle and head position in IMAGE 1. The generated hair MUST follow the 3D curvature of the scalp and the perspective of the shot.
2. HAIR MATCHING: Match the existing hair in IMAGE 1 EXACTLY in terms of:
   - Color, texture, and thickness.
   - Natural growth direction (e.g., following the crown whorl or temple flow).
3. TRANSPLANT ZONE (RED MASK):
   - You MUST generate hair inside the red-marked area from IMAGE 2.
   - This red area is a precise map of where the scalp is thinning or bald.
   - Do NOT generate hair outside this zone unless blending into existing hair.

STYLE PARAMETERS:
- Hair Type: ${params.hairType}
- Density: ${densityDescription[params.density]}
- Demographics: ${params.ethnicity}, Age ${params.age || 'Adult'}

REALISM REQUIREMENTS:
- The generated hair must blend seamlessly with surrounding hair.
- Density transitions must be natural and gradual (no hard lines).
- Avoid artificial symmetry; maintain natural irregularities of human hair.
- Maintain lighting and shadow consistency according to IMAGE 1.

OUTPUT GOAL:
Produce a photorealistic hair transplant simulation that is medically accurate, respects the camera angle, and is indistinguishable from a real result.
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