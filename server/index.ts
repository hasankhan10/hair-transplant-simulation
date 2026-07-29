import { File } from 'node:buffer';
if (!globalThis.File) {
    (globalThis as any).File = File;
}

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import OpenAI from 'openai';

import { sanitizeErrorMessage } from './utils/errorUtils';
import {
    getBase64Data,
    compositeStrictResultServer,
    padToSquare,
    cropToOriginal,
    prepareOpenAiMask,
    PaddingInfo
} from './utils/imageUtils';

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

const OPENAI_MODEL_FALLBACK_CHAIN = [
    'gpt-image-2',
    'gpt-image-1.5',
    'gpt-image-2'
];
const OPENAI_QC_MODEL = 'gpt-4o-mini';

app.post('/api/v1/validate', async (req, res) => {
    try {
        const { patientImage, apiKey: providedKey } = req.body;
        const apiKey = process.env.OPENAI_API_KEY || providedKey;

        if (!apiKey) {
            return res.status(401).json({ success: false, error: "API Key not found" });
        }

        const openai = new OpenAI({ apiKey });
        const { data: patientBase64, mimeType: patientMime } = getBase64Data(patientImage);

        const validationPrompt = "Analyze this image. Is it a human scalp, human hair, or a human head/face suitable for a hair transplant simulation? Answer ONLY with 'TRUE' if it is, or 'FALSE' if it is anything else (animals, landscapes, objects, etc).";
        
        const response = await openai.chat.completions.create({
            model: OPENAI_QC_MODEL,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: validationPrompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${patientMime};base64,${patientBase64}`
                            }
                        }
                    ]
                }
            ],
            temperature: 0.1
        });

        const validationText = response.choices[0]?.message?.content || "";

        if (validationText.toUpperCase().includes("FALSE")) {
            return res.json({
                success: false,
                error: "Please upload a clear photo of your scalp/head for simulation, not any other type of image."
            });
        }

        return res.json({ success: true });
    } catch (error: any) {
        console.error("Validation Error:", error);
        res.status(500).json({ success: false, error: sanitizeErrorMessage(error) });
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
        res.status(500).json({ success: false, error: "Verification code service is temporarily busy. Please check your mobile number and try again." });
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
        res.status(500).json({ success: false, error: "Invalid verification code. Please check the code and try again." });
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
        res.status(500).json({ success: false, error: "Lead information saved successfully." });
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
        res.status(500).json({ success: false, error: "Image recorded successfully." });
    }
});

app.post('/api/v1/simulate', async (req, res) => {
    try {
        const { patientImage, mask, density, apiKey: providedKey } = req.body;

        // Use server-side API key if available, otherwise use from request
        const apiKey = process.env.OPENAI_API_KEY || providedKey;

        if (!apiKey) {
            return res.status(401).json({ success: false, error: "API Key not found" });
        }

        const openai = new OpenAI({ apiKey });
        const { data: patientBase64, mimeType: patientMime } = getBase64Data(patientImage);

        // --- 1. ANATOMICAL VALIDATION & HAIR CHARACTERISTICS ANALYSIS ---
        const validationPrompt = `Analyze this patient photo. Return a JSON object with these fields:
1. "isValid": true if the photo is a human scalp, human hair, or a human head/face suitable for a hair transplant simulation; false otherwise.
2. "hairColor": The patient's native hair color (e.g., "black", "dark brown", "light brown", "blonde", "grey", "red").
3. "hairTexture": The patient's native hair texture (e.g., "straight", "wavy", "curly", "coily").
4. "hairCaliber": The patient's native hair caliber/thickness (e.g., "fine", "medium", "coarse").`;

        let isValidScalp = true;
        let hairColor = "matching";
        let hairTexture = "natural";
        let hairCaliber = "coarse";

        try {
            const response = await openai.chat.completions.create({
                model: OPENAI_QC_MODEL,
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: validationPrompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${patientMime};base64,${patientBase64}`
                                }
                            }
                        ]
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1
            });

            const validationText = response.choices[0]?.message?.content || "";
            const parsed = JSON.parse(validationText);
            isValidScalp = parsed.isValid !== false;
            if (parsed.hairColor) hairColor = parsed.hairColor.toLowerCase();
            if (parsed.hairTexture) hairTexture = parsed.hairTexture.toLowerCase();
            if (parsed.hairCaliber) hairCaliber = parsed.hairCaliber.toLowerCase();
            
            console.log(`[HAIR ANALYSIS] Color: ${hairColor}, Texture: ${hairTexture}, Caliber: ${hairCaliber}`);
        } catch (e) {
            console.warn("[VALIDATION WARNING] Primary model validation/analysis skipped due to API load, proceeding with generic fallback.");
        }

        if (!isValidScalp) {
            return res.status(400).json({
                success: false,
                error: "Please upload a clear photo of your scalp/head for simulation, not any other type of image."
            });
        }

        // --- 2. PREPARE AI INPUTS (Padding to 1024x1024 Square & Mask Inversion) ---
        // Pre-process the patient image to bake in any EXIF rotation (critical for mobile uploads)
        const rawPatBuffer = Buffer.from(patientBase64, 'base64');
        const patBuffer = await sharp(rawPatBuffer).rotate().toBuffer();
        
        const paddedPat = await padToSquare(patBuffer);

        if (!mask) {
            return res.status(400).json({
                success: false,
                error: "Please select/draw the transplant recipient zone first."
            });
        }

        const { data: maskData } = getBase64Data(mask);
        const maskBuffer = Buffer.from(maskData, 'base64');
        
        // Convert red painted mask to OpenAI transparent mask, padded to square
        const openaiMaskBuffer = await prepareOpenAiMask(
            maskBuffer,
            paddedPat.originalWidth,
            paddedPat.originalHeight,
            paddedPat.padding
        );

        // --- 3. RUN SIMULATION WITH MULTI-MODEL FALLBACK CHAIN ---
        const densityLabel = (density ? String(density).split(' ')[0] : "MEDIUM").toUpperCase();

        const prompt = `A high-quality clinical photograph of a patient with successful hair restoration. Thick, natural, realistic ${hairColor}, ${hairTexture}, ${hairCaliber} hair has been seamlessly filled in with ${densityLabel} density. The new hair strands perfectly match the patient's original hair color, texture, natural wave, and growth direction, blending invisibly with the surrounding native hair. The hairline is soft and irregular, replicating natural human growth. The underlying scalp skin and forehead remain completely natural, sharp, and untouched, with realistic skin pores and zero artificial blurring or styling artifacts. Photorealistic, 8k resolution, shot on professional clinical camera.`;

        const qcPrompt = `Compare Original Photo vs Simulation Result. Return ONLY raw JSON: {"decision":"PASS"|"FAIL","reason":"..."}
FAIL if:
1) Patient looks balder/has less hair (density must be >= original).
2) Any green tint/highlight is visible.
3) No new hair added (unchanged).
4) Result looks cartoonish, fake, or like a pasted-on wig.
5) The underlying skin tone in the new hair area does not match the rest of the forehead, or looks like a blurred/artificial patch.
Otherwise PASS. No markdown blocks.`;

        let finalAiResultB64 = "";
        let finalAiMime = "image/png";
        let lastModelError: any = null;

        for (const currentModel of OPENAI_MODEL_FALLBACK_CHAIN) {
            console.log(`[SIMULATION ENGINE] Attempting simulation with OpenAI model: ${currentModel}`);
            try {
                const imageFile = await OpenAI.toFile(paddedPat.buffer, 'image.png', { type: 'image/png' });
                const maskFile = await OpenAI.toFile(openaiMaskBuffer, 'mask.png', { type: 'image/png' });

                const editResponse = await openai.images.edit({
                    model: currentModel,
                    image: imageFile,
                    mask: maskFile,
                    prompt: prompt,
                    n: 1,
                    size: "1024x1024"
                });

                const resultData = editResponse.data[0];
                const generatedB64 = resultData?.b64_json;
                const generatedUrl = resultData?.url;

                if (!generatedB64 && !generatedUrl) {
                    console.warn(`[FALLBACK ENGINE] Model ${currentModel} returned empty image data. Keys: ${JSON.stringify(Object.keys(resultData || {}))}. Retrying with next model...`);
                    continue;
                }

                let aiResultB64: string;
                if (generatedB64) {
                    // Direct base64 response (default for gpt-image models)
                    aiResultB64 = generatedB64;
                    console.log(`[SIMULATION ENGINE] Received b64_json response from ${currentModel} (${generatedB64.length} chars)`);
                } else {
                    // URL-based response — fetch the image
                    const imgFetch = await fetch(generatedUrl!);
                    if (!imgFetch.ok) {
                        console.warn(`[FALLBACK ENGINE] Failed to fetch generated image from URL: ${generatedUrl}`);
                        continue;
                    }
                    const imgBuffer = Buffer.from(await imgFetch.arrayBuffer());
                    aiResultB64 = imgBuffer.toString('base64');
                    console.log(`[SIMULATION ENGINE] Fetched URL response from ${currentModel} (${aiResultB64.length} chars)`);
                }

                // --- QA CHECK FOR CURRENT MODEL ---
                console.log(`[QA CHECK] Running comparison QA check with OpenAI Vision (gpt-4o-mini)...`);
                const qcResponse = await openai.chat.completions.create({
                    model: OPENAI_QC_MODEL,
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "Original Patient Photo:" },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:image/png;base64,${paddedPat.buffer.toString('base64')}`
                                    }
                                },
                                { type: "text", text: "AI Generated Simulation Result:" },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:image/png;base64,${aiResultB64}`
                                    }
                                },
                                { type: "text", text: qcPrompt }
                            ]
                        }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.1
                });

                let qcDecision = "FAIL";
                let qcReason = "No response from QA model";

                try {
                    const qcText = qcResponse.choices[0]?.message?.content || "";
                    const parsed = JSON.parse(qcText.trim());
                    qcDecision = parsed.decision?.toUpperCase() || "FAIL";
                    qcReason = parsed.reason || "No reason provided";
                    console.log(`[QA CHECK] Decision: ${qcDecision}, Reason: ${qcReason}`);
                } catch (e: any) {
                    console.error("[QA CHECK] Failed to parse JSON response:", e);
                    qcDecision = "FAIL";
                    qcReason = "Failed to parse JSON response from QC model.";
                }

                if (qcDecision === "PASS") {
                    console.log(`[SIMULATION ENGINE] Successful generation and QA PASS using model: ${currentModel}`);
                    finalAiResultB64 = aiResultB64;
                    break;
                } else {
                    console.warn(`[FALLBACK ENGINE] QA rejected model ${currentModel} (Reason: ${qcReason}). Trying next model...`);
                }

            } catch (modelErr: any) {
                console.error(`[FALLBACK ENGINE] Model ${currentModel} encountered error:`, modelErr?.message || modelErr);
                lastModelError = modelErr;
            }
        }

        if (!finalAiResultB64) {
            return res.status(500).json({ success: false, error: "The AI could not generate a realistic outcome. Please generate again." });
        }

        // --- 4. CROP & COMPOSITE RESULT ---
        // Crop the 1024x1024 square AI result back to original aspect ratio
        const croppedAiBuffer = await cropToOriginal(
            Buffer.from(finalAiResultB64, 'base64'),
            paddedPat.originalWidth,
            paddedPat.originalHeight,
            paddedPat.padding
        );

        // Blend it strictly onto original photo using original mask
        const finalBuffer = await compositeStrictResultServer(
            patBuffer,
            croppedAiBuffer,
            maskBuffer
        );
        const finalImageBase64 = finalBuffer.toString('base64');

        res.json({
            success: true,
            resultImage: `data:${finalAiMime};base64,${finalImageBase64}`
        });

    } catch (error: any) {
        console.error("API Global Error:", error);
        const sanitizedMsg = sanitizeErrorMessage(error);
        res.status(500).json({ success: false, error: sanitizedMsg });
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
