
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config(); // Also load standard .env if it exists

const app = express();
const PORT = process.env.PORT || 3001;

// Increase payload limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(cors());

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
 * Fetches and encodes ONE Master Reference image for the selected density from the local filesystem.
 */
async function getMasterReferenceServer(density: string): Promise<{ data: string; mimeType: string } | null> {
    const densityKey = (density || 'medium').toLowerCase();
    const fileExtensions = ['.jpg', '.JPG', '.jpeg', '.png'];
    const publicPath = path.join(__dirname, '../public');

    for (const ext of fileExtensions) {
        try {
            const filePath = path.join(publicPath, 'references', 'density', densityKey, `1${ext}`);
            const fs = await import('fs/promises');
            const buffer = await fs.readFile(filePath);
            const mimeType = ext.endsWith('png') ? 'image/png' : 'image/jpeg';
            return { data: buffer.toString('base64'), mimeType };
        } catch (e) {
            continue;
        }
    }
    return null;
}

/**
 * Server-side image composition using Sharp
 */
async function compositeStrictResultServer(
    originalBuffer: Buffer,
    aiResultBuffer: Buffer,
    maskBuffer: Buffer
): Promise<Buffer> {
    const originalMetadata = await sharp(originalBuffer).metadata();

    // 1. Create a feathered mask (12px blur like in the browser)
    const featheredMask = await sharp(maskBuffer)
        .resize(originalMetadata.width, originalMetadata.height)
        .blur(12)
        .toBuffer();

    // 2. Extract the AI result through the feathered mask
    const aiWithAlpha = await sharp(aiResultBuffer)
        .resize(originalMetadata.width, originalMetadata.height)
        .composite([{ input: featheredMask, blend: 'dest-in' }])
        .png()
        .toBuffer();

    // 3. Composite onto the original
    return sharp(originalBuffer)
        .composite([{ input: aiWithAlpha, top: 0, left: 0 }])
        .toBuffer();
}

app.post('/api/v1/validate', async (req, res) => {
    try {
        const { patientImage, apiKey: providedKey } = req.body;
        const apiKey = process.env.GEMINI_API_KEY || providedKey;

        if (!apiKey) {
            return res.status(401).json({ success: false, error: "API Key not found" });
        }

        const ai = new GoogleGenAI({ apiKey });
        const { data: patientBase64, mimeType: patientMime } = getBase64Data(patientImage);

        const validationPrompt = "Analyze this image. Is it a human scalp, human hair, or a human head/face suitable for a hair transplant simulation? Answer ONLY with 'TRUE' if it is, or 'FALSE' if it is anything else (animals, landscapes, objects, etc).";
        const validationResult = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{
                parts: [
                    { text: validationPrompt },
                    { inlineData: { data: patientBase64, mimeType: patientMime } }
                ]
            }]
        });

        let validationText = "";
        if (validationResult.candidates?.[0]?.content?.parts) {
            for (const part of validationResult.candidates[0].content.parts) {
                if ('text' in part) validationText += part.text;
            }
        }

        if (validationText.toUpperCase().includes("FALSE")) {
            return res.json({
                success: false,
                error: "Please upload a clear photo of your scalp/head for simulation, not any other type of image."
            });
        }

        return res.json({ success: true });
    } catch (error: any) {
        console.error("Validation Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/v1/simulate', async (req, res) => {
    try {
        const { patientImage, mask, density, apiKey: providedKey } = req.body;

        // Use server-side API key if available, otherwise use from request (for multi-tenant support if needed)
        const apiKey = process.env.GEMINI_API_KEY || providedKey;

        if (!apiKey) {
            return res.status(401).json({ success: false, error: "API Key not found" });
        }

        const ai = new GoogleGenAI({ apiKey });
        const { data: patientBase64, mimeType: patientMime } = getBase64Data(patientImage);

        // --- 1. ANATOMICAL VALIDATION (Redundant check for API security) ---
        const validationPrompt = "Analyze this image. Is it a human scalp, human hair, or a human head/face suitable for a hair transplant simulation? Answer ONLY with 'TRUE' if it is, or 'FALSE' if it is anything else (animals, landscapes, objects, etc).";
        const validationResult = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{
                parts: [
                    { text: validationPrompt },
                    { inlineData: { data: patientBase64, mimeType: patientMime } }
                ]
            }]
        });

        let validationText = "";
        if (validationResult.candidates?.[0]?.content?.parts) {
            for (const part of validationResult.candidates[0].content.parts) {
                if ('text' in part) validationText += part.text;
            }
        }

        if (validationText.toUpperCase().includes("FALSE")) {
            return res.status(400).json({
                success: false,
                error: "Please upload a clear photo of your scalp/head for simulation, not any other type of image."
            });
        }

        // --- 2. PREPARE AI INPUT (Adding the Green Mask) ---
        // Note: For deep server-side logic, we recreate the green mask overlay
        let inputImageBase64 = patientBase64;
        let inputMime = patientMime;

        if (mask) {
            const { data: maskData } = getBase64Data(mask);
            const patBuffer = Buffer.from(patientBase64, 'base64');
            const maskBuffer = Buffer.from(maskData, 'base64');

            const metadata = await sharp(patBuffer).metadata();

            // Create a solid green layer
            const greenLayer = await sharp({
                create: {
                    width: metadata.width!,
                    height: metadata.height!,
                    channels: 4,
                    background: { r: 0, g: 255, b: 0, alpha: 1 }
                }
            }).png().toBuffer();

            // Mask the green layer with the user's mask
            const greenMask = await sharp(greenLayer)
                .composite([{ input: maskBuffer, blend: 'dest-in' }])
                .toBuffer();

            // Composite onto patient image
            const aiInputBuffer = await sharp(patBuffer)
                .composite([{ input: greenMask, top: 0, left: 0 }])
                .toBuffer();

            inputImageBase64 = aiInputBuffer.toString('base64');
            inputMime = 'image/png';
        }

        // --- 3. RUN SIMULATION ---
        const densityLabel = (density || "MEDIUM").toUpperCase();
        const masterRef = await getMasterReferenceServer(densityLabel);

        const prompt = `ROLE: MEDICAL HAIR VISUALIZATION SPECIALIST.
MISSION: HARMONIOUS SURGICAL RESTORATION.
1. BIOLOGICAL HARMONY (PRIORITY #1):
   - LIGHTING INTEGRATION: Analyze the light source, shadows, and highlights of the patient's photo. Apply the EXACT same lighting to the new hair so it melts into the donor hair perfectly.
   - NATURAL HANDSHAKE: Do not create a "box" or "patch". Taper the density at the mask edges to blend seamlessly with the patient's real hair.
   - DIRECTIONAL FLOW: Follow the patient's natural hair direction (forward at forehead, swirl at crown) with 100% precision.
2. DENSITY MAPPING (MASTER REFERENCE):
   - [MASTER CLINICAL REFERENCE]: Use this as your primary frequency standard for follicle count.
   - OPAQUE CORE, SOFT EDGES: The center of the mask should follow high frequency follicle counts, while the perimeter must be soft and tapered.
3. IDENTITY PRESERVATION:
   - [PATIENT PHOTO] is the exclusive source for DNA (Color + Texture + Wave).
   - IGNORE CURRENT THINNING: Restore the area as a successful, fully-grown result.
4. ANATOMY & FRONTOTEMPORAL DESIGN:
   - FRONTAL HAIRLINE: Create an irregular, organic, "micro-jagged" line. No straight lines.
   - TEMPORAL CLOSURE: Populate the frontotemporal corners densely.
FINAL OUTPUT: A realistic medical simulation. ${densityLabel} DENSITY. PERFECT LIGHTING MATCH. INVISIBLE SEAMS.`;

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
                data: inputImageBase64,
                mimeType: inputMime
            }
        });

        // Add Command
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{ parts }],
        });

        let aiResultB64 = "";
        let aiMime = "";
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    aiResultB64 = part.inlineData.data;
                    aiMime = part.inlineData.mimeType;
                    break;
                }
            }
        }

        if (!aiResultB64) {
            return res.status(500).json({ success: false, error: "AI failed to generate results" });
        }

        // --- 4. FINAL COMPOSITION ---
        let finalImageBase64 = aiResultB64;
        if (mask) {
            const finalBuffer = await compositeStrictResultServer(
                Buffer.from(patientBase64, 'base64'),
                Buffer.from(aiResultB64, 'base64'),
                Buffer.from(getBase64Data(mask).data, 'base64')
            );
            finalImageBase64 = finalBuffer.toString('base64');
            aiMime = 'image/png';
        }

        res.json({
            success: true,
            resultImage: `data:${aiMime};base64,${finalImageBase64}`
        });

    } catch (error: any) {
        console.error("API Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check for public API validation
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: "Hair Simulation API is live" });
});

// Serve static assets from front-end build (for production)
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// Handle SPAs - Only catch GET requests that are NOT API calls
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
});

// Global 404 for API
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: `API route not found: ${req.originalUrl}` });
});

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running smoothly on port ${PORT}`);
});
