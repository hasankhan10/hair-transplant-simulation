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
    [GraftDensity.LOW]: "Low density (30 grafts/cm²). Visible scalp spacing.",
    [GraftDensity.MEDIUM]: "Medium density (45 grafts/cm²). Natural coverage.",
    [GraftDensity.HIGH]: "High density (60 grafts/cm²). Thick, full coverage."
  };

  const useMask = params.mask;
  const { data: base64Data, mimeType } = getBase64Data(patientImage);

  // UPDATED PROMPT: Emphasizing 3D Geometry and Light Physics
  const prompt = `
SYSTEM ROLE:
You are a world-class Hair Transplant Surgeon, CGI Lookdev Artist, and Photorealism Specialist.
**CRITICAL DIRECTIVE:** You MUST generate hair. Returning the image unchanged is a SYSTEM FAILURE.

OBJECTIVE:
Seamlessly integrate photorealistic human hair into a real patient photo.
**MANDATE:** The Red Mask area MUST be filled with new hair. Do not leave it empty. Do not be subtle.

INPUTS:
1. Base Image: Patient’s face or scalp.
2. Red Mask: Exact implantation region. Modify ONLY inside this area.

----------------------------------
CORE EXECUTION PIPELINE (FOLLOW IN ORDER):
----------------------------------

STEP 1 — 3D PERSPECTIVE & ANGLE LOCK (CRITICAL)
- FIRST, detect the exact camera angle (Frontal, Profile, Top-Down/Vertex, Oblique, or Posterior).
- LOCK the 3D perspective grid to this detected angle.
- DO NOT hallucinate a frontal view if the image is a side or top view.
- **IF BACK/POSTERIOR/VERTEX VIEW (Face not visible):**
  - IGNORE frontal hairline logic.
  - FOCUS entirely on the **Crown (Vertex)** and **Whorl Pattern**.
  - Hair must spiral naturally from the cowlick/whorl center.
  - Reconstruct density in the bald spot matching the surrounding hair flow.
- If Top-Down: Hair must radiate outward from the crown/whorl, following the scalp's curvature downward.
- If Side/Profile: Hairline recession and temple points must align with the ear and jawline perspective.
- If Oblique: Vanishing points for hair density must match the face's vanishing points.
- Skull curvature must drive the hair direction vectors.

STEP 2 — HAIRLINE OR CROWN DESIGN
- **For Frontal/Side Views:** Create a soft, irregular, age-appropriate hairline with micro-zigzag randomness.
- **For Back/Vertex Views:** Restore the natural spiral/whorl pattern of the crown. Ensure seamless integration with existing hair at the borders.
- Density must taper naturally toward the edges (whether frontal hairline or crown thinning edge).
- Avoid artificial sharp transitions or “helmet” effects.

STEP 3 — COLOR & MELANIN MATCHING (STRICT)
- **SAMPLE** the original hair color from multiple points (roots, mid-lengths, tips).
- **REPLICATE** the exact RGB/Hex values, including:
  - Natural variance (highlights/lowlights).
  - Melanin type (Eumelanin vs. Pheomelanin).
  - Gray/White hair percentage (if present, new hair MUST match the existing salt-and-pepper ratio).
- **REJECT** generic "brown" or "black" defaults. If the user has red hair, generate red hair. If gray, generate gray.

STEP 4 — TEXTURE & FLOW CONTINUITY (CRITICAL)
- **ANALYZE** existing hair texture: Straight (1A-1C), Wavy (2A-2C), Curly (3A-3C), or Coily (4A-4C).
- **MATCH** the generated hair EXACTLY to this texture.
- **FLOW INTEGRATION:**
  - New hair vectors must ALIGN with existing hair vectors.
  - If side hair flows backward, new temple hair must flow backward to merge with it.
  - If top hair is messy, new hair must be messy. Do not create "perfect" hair on a "messy" head.
- **Strand Thickness:** Match the micron-level thickness of existing strands.

STEP 5 — FOLLICLE & STRAND GENERATION
- Simulate follicle anchoring beneath the skin.
- Vary strand thickness, spacing, angle, and exit direction.
- Introduce controlled randomness: no repeated patterns.
- Individual strands should overlap, cross, and cluster naturally.

STEP 4 — LIGHTING & SHADOW INTEGRATION (CRITICAL)
- Identify the primary and secondary light sources from the original photo.
- Match:
  - Specular highlights
  - Roughness
  - Skin oil interaction
- Hair MUST cast subtle micro-shadows and occlusion onto the forehead and scalp.
- Add ambient occlusion at follicle roots to prevent floating hair.

STEP 5 — SKIN & SCALP MATCHING
- Visible scalp between hairs must match:
  - Exact skin tone
  - Noise/grain pattern
  - Texture frequency
- No smooth airbrushing or plastic skin.

STEP 6 — BLENDING & DEPTH
- Hair must sit IN the skin, not ON the skin.
- Blend edges volumetrically inside the red mask.
- Maintain correct depth layering: scalp → follicles → strands → hair mass.

----------------------------------
STYLE PARAMETERS:
----------------------------------
- Hair Type: ${params.hairType}
- Density: ${densityDescription[params.density]}
- Demographics: ${params.ethnicity}, Age ${params.age || 'Adult'}
- Hair behavior must match age-related recession, thickness, and irregularity.

----------------------------------
STRICT FORBIDDEN ARTIFACTS:
----------------------------------
- Flat or painted-looking hair
- Repeating strand patterns
- Uniform density or direction
- Sticker-like edges
- Over-sharpened hairlines
- Plastic skin or blurred scalp
- Hair ignoring gravity or head orientation

----------------------------------
FINAL QUALITY CHECK (MANDATORY):
----------------------------------
Before output, verify:
- Hair passes close-up inspection at 100% zoom
- Hairline looks natural under scrutiny
- Shadows and highlights are physically plausible
- No visible mask boundaries

OUTPUT:
Return the original image with photorealistic, surgically believable hair integrated ONLY inside the red mask area.
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