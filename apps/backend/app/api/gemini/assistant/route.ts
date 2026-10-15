import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { withErrorHandler, BadRequestError } from '@/lib/api';

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
    if (!aiClient) {
        const apiKey = process.env.GEMINI_API_KEY || '';
        aiClient = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
                headers: {
                    'User-Agent': 'aistudio-build',
                },
            },
        });
    }
    return aiClient;
}

// In-memory IP-based rate limiting (10 requests per minute per IP)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (record.count >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }

    record.count++;
    return true;
}

const MAX_PROMPT_LENGTH = 2000;

async function assistantHandler(req: NextRequest) {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     req.headers.get('x-real-ip') ||
                     'unknown';

    if (!checkRateLimit(clientIp)) {
        return NextResponse.json(
            {
                success: false,
                error: 'Too many requests. AI assistant rate limit exceeded. Please wait a minute before trying again.'
            },
            { status: 429 }
        );
    }

    const body = await req.json().catch(() => ({}));
    const { prompt, stain, fabric, queryType, loadDescription } = body;

    // Validate prompt lengths against quota exhaustion and resource abuse
    const rawInputs = [prompt, stain, fabric, loadDescription].filter(Boolean);
    for (const input of rawInputs) {
        if (typeof input === 'string' && input.length > MAX_PROMPT_LENGTH) {
            throw new BadRequestError(`Input exceeds maximum allowed length of ${MAX_PROMPT_LENGTH} characters.`);
        }
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are "LaundryAI Care Master", an expert professional garment care specialist, textile conservator, stain removal advisor, and laundry consultant for Laundelle.
Provide clear, actionable, friendly, and practical advice.
Format your responses nicely with markdown headings, bullet points, step-by-step instructions, and water temperature / detergent recommendations when relevant.
Always include a brief note on how Laundelle professional laundry/dry-cleaning service can assist with difficult stains or delicate items.`;

    let userMessage = '';
    if (queryType === 'stain') {
        userMessage = `Emergency Stain Treatment Request:
Stain Type: ${stain || 'Unknown stain'}
Fabric Type: ${fabric || 'General fabric'}
Additional Context: ${prompt || 'How do I remove this safely?'}`;
    } else if (queryType === 'load_calculator') {
        userMessage = `Help me calculate the laundry load and recommend Laundelle services:
Load Description: ${loadDescription || prompt}
Please estimate total weight, suggest the best service (Wash & Fold, Dry Cleaning, Ironing, Bed Linen, Shoe Care), and give care instructions.`;
    } else {
        userMessage = prompt || 'What are the best laundry practices for everyday clothes?';
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: userMessage,
            config: {
                systemInstruction,
                temperature: 0.7,
            },
        });

        const replyText = response.text || 'I could not process your laundry request at this moment. Please try again.';
        return NextResponse.json({ success: true, response: replyText });
    } catch (error: any) {
        console.error('Gemini Assistant Provider Error:', error?.message);
        return NextResponse.json({
            success: false,
            error: 'Failed to generate AI laundry recommendations.',
            fallbackResponse: `**Quick Stain & Laundry Tip:**\n\n1. **Act Quickly:** Blot (don't rub) stains with a damp cloth immediately.\n2. **Cold Water First:** Always use cool or lukewarm water for organic stains like blood, sweat, or food.\n3. **Professional Care:** For delicate fabrics like Silk, Wool, or Formal Wear, select Laundelle's **Dry Cleaning** or **Gentle Wash** service for best results!`
        }, { status: 500 });
    }
}

export const POST = withErrorHandler(assistantHandler);
