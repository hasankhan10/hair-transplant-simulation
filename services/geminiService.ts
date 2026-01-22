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
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
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
 * Fetches and encodes the 5 reference images for a given density
 */
const getDensityReferences = async (density: GraftDensity): Promise<{ data: string; mimeType: string }[]> => {
  const densityKey = density.toLowerCase();
  const fileExtensions = ['.jpg', '.JPG', '.jpeg'];
  const references: { data: string; mimeType: string }[] = [];

  // We attempt to load 1.jpg, 2.jpg... from the respective public folder
  const loadAttempts = [1, 2, 3, 4, 5].map(async (num) => {
    for (const ext of fileExtensions) {
      try {
        const url = `/references/density/${densityKey}/${num}${ext}`;
        const b64 = await urlToBase64(url);
        return getBase64Data(b64);
      } catch (e) {
        continue;
      }
    }
    return null;
  });

  const results = await Promise.all(loadAttempts);
  return results.filter((r): r is { data: string; mimeType: string } => r !== null);
};

/**
 * Generates a medical hair visualization using Gemini API with Visual Density References
 */
export const generateHairVisualization = async (
  patientImage: string,
  params: VisualizationParams
): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const densityLabel = params.density === GraftDensity.LOW ? "LOW" : params.density === GraftDensity.MEDIUM ? "MEDIUM" : "HIGH";

  // 1. Prepare the contextual image for the AI (Patient + Mask)
  const aiInputImage = params.mask
    ? await createAIComposition(patientImage, params.mask)
    : patientImage;

  const { data: patientBase64, mimeType: patientMime } = getBase64Data(aiInputImage);

  // 2. Fetch Visual Density References (The Magic)
  const referenceImages = await getDensityReferences(params.density);

  const prompt = `ROLE: MASTER HAIR TRANSPLANT SURGEON.

CRITICAL SYSTEM REQUIREMENT: TOTAL RESTORATION.
THE BRIGHT GREEN MASK IN THE IMAGE IS A "MANDATORY REPLACEMENT COMMAND". 

YOUR MISSION:
1. TARGET DENSITY ANALYSIS (VISUAL REFERENCES PROVIDED):
   - You are provided with 5 REFERENCE IMAGES that define our clinic's standard for ${densityLabel} DENSITY.
   - ANALYZE THESE REFERENCES ONLY FOR: Follicle spacing, graft density (hair count per square cm), and coverage thickness.
   - MANDATE: Apply the EXACT SAME density and spacing seen in these 5 references to the Green Mask area on the patient.

2. BIOLOGICAL DNA MATCHING (PATIENT PHOTO):
   - ANALYZE PATIENT'S DONOR HAIR (Sides/Back): Replicate the patient's EXACT color, texture (straight/wavy/curly), and biological hair DNA.
   - DO NOT copy the hair color or personal style from the reference photos. Only take the DENSITY.

3. ANATOMY & FRONTOTEMPORAL RECONSTRUCTION:
   - FACIAL PROPORTION ANALYSIS: Evaluate the "Three-Tier" facial balance. 
   - FOREHEAD & TEMPLE DESIGN: The green mask indicates both a lowered hairline and a closure of the temples. 
   - FRONTOTEMPORAL ANGLE: You MUST aggressively populate the "Frontotemporal Recesses" (the corners of the head). These corners are critical for a youthful, surgical restoration. Do not round them off or leave them thin.
   - TEMPLE POINT RESTORATION: Reconstruct the temple points within the green area with new, dense hair follicles, ensuring they flow seamlessly into the rest of the scalp.
   - HAIRLINE SOFTNESS: Maintain a natural, irregular, "micro-jagged" hairline at the very boundary, but ensure the bulk of the masked zone is fully opaque.

4. EXECUTE THE TRANSPLANT (ZERO-TOLERANCE RULES):
   - 100% PERIMETER INTEGRITY: Every green pixel, especially in the CORNERS and EDGES of the mask at the temples, MUST be converted into a hair follicle. There should be ZERO gap between the mask boundary and the generated hair.
   - DENSITY UNIFORMITY: Ensure the density is consistent from the center of the scalp all the way to the temporal corners. No thinning at the recesses.
   - DIRECTIONAL FLOW: Create a natural growth flow (Forward/Down at the temples, Forward on forehead, Swirl on crown).

FINAL OUTPUT: A high-resolution, surgical-grade medical visualization. THE GREEN IS GONE. THE HAIR IS 100% RESTORED AT ${densityLabel} DENSITY, WITH SHARP, DEFINED FRONTOTEMPORAL RECONSTRUCTION.`;

  const ai = new GoogleGenAI({ apiKey });

  // Build parts with explicit labeling to prevent context leakage
  const parts: any[] = [];

  // 1. Contextual Training Data (labeled as Sterile References)
  referenceImages.forEach((ref, index) => {
    parts.push({ text: `[CLINICAL DENSITY REFERENCE DATA #${index + 1} - FOR DENSITY SPACING ONLY]` });
    parts.push({
      inlineData: {
        data: ref.data,
        mimeType: ref.mimeType
      }
    });
  });

  // 2. The Actual Patient (labeled as the Identity Source)
  parts.push({ text: "[PRIMARY PATIENT PHOTO - USE THIS FOR ALL PIXELS, SKIN, AND HAIR DNA]" });
  parts.push({
    inlineData: {
      data: patientBase64,
      mimeType: patientMime
    }
  });

  // 3. The Execution Command
  const finalPrompt = `ROLE: MASTER HAIR TRANSPLANT SURGEON.

CRITICAL SECURITY RULE: REFERENCE LEAKAGE PREVENTION.
- DO NOT use any visual elements (faces, backgrounds, clothing, or lighting) from the Reference images.
- DO NOT copy the hair color or specific hair strands from the Reference images.
- USE THE REFERENCES ONLY as "Density Frequency Maps" (mathematical hair-per-cm² standards).

YOUR MISSION:
1. TARGET DENSITY ANALYSIS (STERILE REFERENCES PROVIDED):
   - Analyze the provided ${densityLabel} DENSITY REFERENCES only for graft count and spacing. 
   - Apply that mathematical frequency to the patient.

2. BIOLOGICAL IDENTITY PROTECTION:
   - THE PATIENT IS THE ONLY PIXEL SOURCE. Replicate the patient's biological DNA (texture, color, salt-&-pepper ratio).
   - The skin, forehead, and existing hair must belong 100% to the patient.

3. ANATOMY & FRONTOTEMPORAL RECONSTRUCTION:
   - FACIAL PROPORTION ANALYSIS: Evaluate the "Three-Tier" facial balance. 
   - FRONTOTEMPORAL ANGLE: Aggressively populate the corners with 100% density.
   - TEMPLE POINT RESTORATION: Ensure the flow is natural and dense at the recesses.

4. EXECUTE THE TRANSPLANT:
   - 100% SPATIAL OCCUPANCY: Every green pixel must be converted into a hair follicle.
   - DIRECTIONAL FLOW: Create a natural growth flow matching the patient's existing geometry.

FINAL OUTPUT: A high-resolution simulation. ${densityLabel} DENSITY. ZERO LEAKAGE FROM REFERENCES. 100% PATIENT IDENTITY.`;

  parts.push({ text: finalPrompt });

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

  // 3. CLEAN UP: Composite result back onto the original
  if (params.mask) {
    return await compositeStrictResult(patientImage, resultImageUrl, params.mask);
  }

  return resultImageUrl;
};