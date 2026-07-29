/**
 * Sanitizes internal server / openai API errors into warm, reassuring clinical messages.
 * Ensures raw JSON, stack traces, and 500 status strings are NEVER exposed to the client.
 */
export function sanitizeErrorMessage(error: any): string {
    const rawMessage = typeof error === 'string' ? error : (error?.message || String(error));
    console.error("[SERVER INTERNAL ERROR LOG]:", rawMessage);

    let lower = rawMessage.toLowerCase();

    // Handle stringified JSON errors (e.g. {"error":{"code":500...}})
    if (rawMessage.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(rawMessage);
            const nested = parsed.error?.message || parsed.message || parsed.error;
            if (typeof nested === 'string') lower = nested.toLowerCase();
        } catch (e) {
            // Keep original lower string
        }
    }

    if (lower.includes('scalp') || lower.includes('photo') || lower.includes('clear')) {
        return "Please upload a clear photo of your scalp/head for simulation, not any other type of image.";
    }

    return "Our AI simulation engine is currently experiencing high demand. Please click 'Generate Simulation' again in a moment for your high-density preview.";
}
