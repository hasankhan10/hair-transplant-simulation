
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

// 1. Request Logging for Production Debugging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// 2. Security & Parsers
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
 * Server-side image composition using Sharp
 */
async function compositeStrictResultServer(
    originalBuffer: Buffer,
    aiResultBuffer: Buffer,
    maskBuffer: Buffer
): Promise<Buffer> {
    const originalMetadata = await sharp(originalBuffer).metadata();

    // 1. Create a feathered mask (8px blur like in the browser)
    const featheredMask = await sharp(maskBuffer)
        .resize(originalMetadata.width, originalMetadata.height)
        .blur(8)
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
            }],
            config: {
                temperature: 0.1,
                topP: 0.9
            }
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


// 1. In-memory OTP Store (Standard TTL strategy)
interface OtpEntry {
    code: string;
    expiresAt: number;
}
const otpStore = new Map<string, OtpEntry>();
const OTP_TTL = 10 * 60 * 1000; // 10 minutes

app.post('/api/v1/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ success: false, error: "Phone number is required" });

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Store in memory with expiry
        otpStore.set(phone, {
            code: otpCode,
            expiresAt: Date.now() + OTP_TTL
        });

        // Config from .env.local
        const username = process.env.ALOTS_USERNAME;
        const apikey = process.env.ALOTS_API_KEY;
        const sender = process.env.ALOTS_SENDER_ID;
        const route = process.env.ALOTS_ROUTE;
        const templateID = process.env.ALOTS_TEMPLATE_ID;
        let messageTemplate = process.env.ALOTS_MESSAGE_TEMPLATE || "";

        // Properly format message for Alots/DLT
        // The DLT template usually expects the exact text with {#var#} replaced
        const finalMessage = messageTemplate.replace('{#var#}', otpCode).replace(/^"|"$/g, '');

        const alotsUrl = `https://alots.in/sms-panel/api/http/index.php?username=${username}&apikey=${apikey}&apirequest=Text&sender=${sender}&mobile=${phone}&message=${encodeURIComponent(finalMessage)}&route=${route}&TemplateID=${templateID}&format=JSON`;

        console.log(`[OTP] Dispatching to ${phone} via Alots.in`);

        const response = await fetch(alotsUrl);
        const data = await response.json();

        // Alots JSON response typically contains 'status' or 'response'
        const isSuccess = data.status?.toLowerCase() === 'success' ||
            data.response?.toLowerCase().includes('success') ||
            data.status === 'OK';

        if (isSuccess) {
            return res.json({ success: true, message: "OTP sent successfully" });
        } else {
            console.error("Alots Error Response:", data);
            return res.status(500).json({ success: false, error: data.message || "Gateway failed to deliver SMS. Check SenderID/TemplateID." });
        }
    } catch (error: any) {
        console.error("OTP Send Exception:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/v1/verify-otp', async (req, res) => {
    try {
        const { phone, code } = req.body;
        const entry = otpStore.get(phone);

        if (!entry) {
            return res.status(400).json({ success: false, error: "OTP expired or not requested" });
        }

        if (Date.now() > entry.expiresAt) {
            otpStore.delete(phone);
            return res.status(400).json({ success: false, error: "OTP has expired" });
        }

        if (entry.code === code) {
            otpStore.delete(phone); // Clear after successful verification
            return res.json({ success: true, message: "OTP verified successfully" });
        } else {
            return res.status(400).json({ success: false, error: "Invalid verification code" });
        }
    } catch (error: any) {
        console.error("OTP Verify Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/v1/leads', async (req, res) => {
    try {
        const { name, age, gender, phone } = req.body;
        const scriptUrl = process.env.GOOGLE_SHEET_APPS_SCRIPT_URL;

        if (!scriptUrl) {
            console.warn("GOOGLE_SHEET_APPS_SCRIPT_URL not set. Skipping sheet update.");
            return res.json({ success: true, message: "Lead captured locally (Sheet URL missing)" });
        }

        // We use a simple fetch to the Google Apps Script Web App
        const response = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                age,
                gender,
                phone,
                timestamp: new Date().toISOString()
            })
        });

        res.json({ success: true });
    } catch (error: any) {
        console.error("Lead Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/v1/update-lead-image', async (req, res) => {
    try {
        const { phone, imageUrl } = req.body;
        const scriptUrl = process.env.GOOGLE_SHEET_APPS_SCRIPT_URL;

        if (!scriptUrl) {
            return res.status(400).json({ success: false, error: "Sheet URL missing" });
        }

        // Send to Google Apps Script telling it to update the existing row
        await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'updateImage',
                phone,
                imageUrl
            })
        });

        res.json({ success: true });
    } catch (error: any) {
        console.error("Update Image Error:", error);
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

        // --- 2. PREPARE AI INPUT (Adding the Highlight Mask) ---
        // We use a semi-transparent yellow highlight so the AI can still see the scalp texture underneath!
        let inputImageBase64 = patientBase64;
        let inputMime = patientMime;

        if (mask) {
            const { data: maskData } = getBase64Data(mask);
            const patBuffer = Buffer.from(patientBase64, 'base64');
            const maskBuffer = Buffer.from(maskData, 'base64');

            const metadata = await sharp(patBuffer).metadata();

            // Create a semi-transparent neon green mask layer (35% opacity)
            const highlightLayer = await sharp({
                create: {
                    width: metadata.width!,
                    height: metadata.height!,
                    channels: 4,
                    background: { r: 0, g: 255, b: 0, alpha: 0.35 } // Semi-Transparent Neon Green
                }
            }).png().toBuffer();

            // Mask the highlight layer with the user's mask
            const greenMask = await sharp(highlightLayer)
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
        const densityLabel = (density ? String(density).split(' ')[0] : "MEDIUM").toUpperCase();

        const systemPrompt = `ROLE: EXPERT CLINICAL HAIR RESTORATION AI
TASK: Perform a photorealistic, high-fidelity surgical hair transplant simulation.

INSTRUCTIONS:
1. RECIPIENT ZONE TARGET (CRITICAL): The semi-transparent neon green highlight marks the EXACT recipient zone where the transplant is planned. You must draw new, naturally growing hair over this entire green area. Do NOT leave any green highlight visible. Every highlighted pixel must be replaced/covered by realistic, natural-looking hair.
2. HAIR COLOR & HIGHLIGHT MATCHING (CRITICAL):
   - The color of the generated hair MUST EXACTLY match the patient's native hair color.
   - Distinguish between natural light reflections (gloss/sheen from overhead lights) and actual gray/white hair. The patient has dark/black hair; do NOT generate gray, white, or silver hair strands unless the patient's hair is already predominantly gray. Keep the hair solid black/dark.
3. NATIVE HAIR CLONING:
   - Visually extract, clone, and synthesize the texture, wave/curl pattern, and flow direction of the healthy hair from the donor zone (the sides and back of the patient's head).
   - Use this cloned texture to fill the green area.
   - IMPORTANT: Do NOT clone the thinning, balding, or sparse properties of the patient's top scalp. The new hair must be healthy, thick, robust, and fully formed.
4. DENSITY TARGET (${densityLabel}): 
   - LOW: Conservative hair density (30-35 grafts/cm²). The scalp is partially visible under the new hair.
   - MEDIUM: Standard clinical density (45-50 grafts/cm²). Full, natural-looking hair coverage with minimal scalp visibility under bright light. Healthy and natural volume.
   - HIGH: Maximum density hair restoration (60+ grafts/cm²). Generate extremely thick, dense, and voluminous hair. The scalp must be completely covered and 100% hidden under a lush layer of dense hair. Absolutely no thinning or bald spots must remain.
5. NATURAL HAIRLINE & BLENDING:
   - Create a natural, irregular, micro-jagged frontal hairline with individual follicular units at the edge (no straight, blocky, or artificial-looking hairpiece lines).
   - Feather and taper the new hair flawlessly into the patient's surrounding native hair so there is no visible seam or transition boundary.

CRITICAL CONSTRAINTS:
- NO REDUCTION OF DENSITY / NO BALDNESS CREATION: Under no circumstances should you make the patient look balder than they are. If the patient has existing native hair inside the highlighted area, you must only ADD more hair to make it look thicker and fuller. Do NOT erase existing hair or create empty/bald patches.
- NO GREEN ALLOWED: Every green highlighted pixel must be completely replaced by realistic hair. No green tint, outline, or halo may remain.
- The final output must be a seamless, high-resolution, photorealistic clinical simulation.`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [
                {
                    parts: [
                        { text: "Here is the input image showing the patient with a semi-transparent green mask overlay marking the target recipient zone where you must draw the new hair:" },
                        {
                            inlineData: {
                                data: inputImageBase64,
                                mimeType: inputMime
                            }
                        }
                    ]
                }
            ],
            config: {
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                temperature: 0.2,
                topP: 0.85
            }
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

        // --- 4. AI QUALITY CONTROL (QA) CHECK BEFORE COMPOSITION ---
        // We pass BOTH the original patient image and the simulated AI result image so Gemini can compare them side-by-side.
        const qcPrompt = `Compare the Original Patient Photo with the AI Generated Simulation Result.
Answer ONLY 'PASS' if the simulation successfully added hair or increased density, and look natural.
Answer ONLY 'FAIL' if any of the following are true:
1) The patient looks balder, has less hair, or has a new bald spot in the simulation compared to their original photo (NO REVERSE RESULTS: the output must have more or equal hair density, never less).
2) There is any visible green tint or green pixels remaining.
3) No new hair was generated in the target area.
4) The generated hair looks completely fake (like a solid black block, cartoon lines, or a literal wig pasted on).

Decision (PASS/FAIL):`;
        
        const qcResult = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{
                parts: [
                    { text: "Original Patient Photo:" },
                    { inlineData: { data: patientBase64, mimeType: patientMime } },
                    { text: "AI Generated Simulation Result:" },
                    { inlineData: { data: aiResultB64, mimeType: aiMime } },
                    { text: qcPrompt }
                ]
            }],
            config: {
                temperature: 0.1,
                topP: 0.9
            }
        });

        let qcText = "";
        if (qcResult.candidates?.[0]?.content?.parts) {
            for (const part of qcResult.candidates[0].content.parts) {
                if ('text' in part) qcText += part.text;
            }
        }

        if (qcText.toUpperCase().includes("FAIL")) {
            return res.status(400).json({ 
                success: false, 
                error: "The AI generated an unnatural result. Please click Generate Simulation again for a better outcome." 
            });
        }

        // --- 5. FINAL COMPOSITION ---
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

// 4. Global 404 for API
// This ensures that any bad /api request returns a JSON 404 instead of a 405 from the static server
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: `API route not found: ${req.originalUrl}` });
});

// 5. Serve static assets from front-end build (for production)
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// 6. Handle SPAs - Only catch GET requests that are NOT API calls
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distPath, 'index.html'));
    }
    // If it's a POST/PUT/DELETE to a non-existent API, it ends here
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, error: "API Endpoint not found" });
    }
    next();
});

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running smoothly on port ${PORT}`);
});
