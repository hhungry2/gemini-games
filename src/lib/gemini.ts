import { GoogleGenAI } from '@google/genai';

const STORAGE_KEY = 'gemini_games_api_key';

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

export function setStoredApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, key.trim());
  }
}

export function clearStoredApiKey(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function createGeminiClient() {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }
  return new GoogleGenAI({ apiKey });
}

export async function generateGameContent(options: {
  prompt: string;
  systemInstruction?: string;
  model?: string;
}): Promise<string> {
  const ai = createGeminiClient();
  const modelName = options.model || 'gemini-2.5-flash';

  const response = await ai.models.generateContent({
    model: modelName,
    contents: options.prompt,
    config: options.systemInstruction ? {
      systemInstruction: options.systemInstruction,
    } : undefined,
  });

  return response.text || '';
}
