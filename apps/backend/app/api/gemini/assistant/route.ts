import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

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

export async function POST(req: NextRequest) {
    try {
        const { prompt, stain, fabric, queryType, loadDescription } = await req.json();

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
        console.error('Gemini Assistant Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to generate AI laundry recommendations.',
            fallbackResponse: `**Quick Stain & Laundry Tip:**\n\n1. **Act Quickly:** Blot (don't rub) stains with a damp cloth immediately.\n2. **Cold Water First:** Always use cool or lukewarm water for organic stains like blood, sweat, or food.\n3. **Professional Care:** For delicate fabrics like Silk, Wool, or Formal Wear, select Laundelle's **Dry Cleaning** or **Gentle Wash** service for best results!`
        }, { status: 500 });
    }
}
