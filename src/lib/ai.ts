import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

const MODEL = "gemini-flash-lite-latest";

export async function gerarTexto(prompt: string, maxOutputTokens = 1024): Promise<string> {
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens },
  });
  return result.response.text().trim();
}

// Usado pelo agente de prospecção: aterra a resposta em busca real do Google.
export async function gerarTextoComBusca(prompt: string, maxOutputTokens = 3000): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ googleSearch: {} } as any],
  });
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens },
  });
  return result.response.text().trim();
}
