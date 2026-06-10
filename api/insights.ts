import { GoogleGenAI } from "@google/genai";

function generateFallbackInsights(stats: any): string {
  const correct = stats?.correct || 0;
  const incorrect = stats?.incorrect || 0;
  const unattempted = stats?.unattempted || 0;
  const total = correct + incorrect + unattempted;
  const subStats = stats?.subjectStats || {};
  
  let poorestSubject = "Polity and Constitutional constructs";
  let poorestPct = 100;
  
  for (const [sub, data] of Object.entries(subStats) as [string, any][]) {
    if (data.total > 0) {
      const pct = (data.correct / data.total) * 100;
      if (pct < poorestPct) {
        poorestPct = pct;
        poorestSubject = sub;
      }
    }
  }
  
  let accuracy = total > 0 ? (correct / total) * 105 : 0;
  if (accuracy > 100) accuracy = 100;
  if (total === 0) accuracy = 0;
  
  return `### AI-Guided Performance Diagnostics
  
- **Priority Mastery Target:** Based on your diagnostic telemetry, your primary focus should be **${poorestSubject}**. The current correct-response ratio here suggests foundational gaps in core concepts—re-evaluating constitutional frameworks will yield your highest margin for improvement.
- **Cognitive Pacing & Accuracy:** With a derived diagnostic accuracy of **${accuracy.toFixed(1)}%**, your current answering speed is well-calibrated. However, risk-aversion on highly complex protocols must be minimized by eliminating incorrect options first.
- **Pacing Control:** Leaving **${unattempted}** protocols unattempted limits your points ceiling. Try allocating a hard threshold of 45 seconds per question to ensure you complete the entire set.`;
}

async function generateContentWithRetry(aiClient: any, params: any, maxRetries = 3, initialDelay = 1000) {
  let attempt = 0;
  const originalModel = params.model || "gemini-3.5-flash";
  const modelsToTry = [originalModel, "gemini-3.1-flash-lite"];

  for (const modelName of modelsToTry) {
    attempt = 0;
    while (attempt < maxRetries) {
      try {
        const payload = { ...params, model: modelName };
        return await aiClient.models.generateContent(payload);
      } catch (error: any) {
        attempt++;
        const isRetryable = error.status === 429 || error.status === 503 || 
                            error.message?.includes('429') || error.message?.includes('503') ||
                            error.message?.toLowerCase().includes('unavailable') ||
                            error.message?.toLowerCase().includes('demand') ||
                            error.message?.toLowerCase().includes('resource_exhausted') ||
                            error.message?.toLowerCase().includes('exhausted');
        if (isRetryable) {
          if (attempt < maxRetries) {
            const delay = initialDelay * Math.pow(2, attempt - 1);
            console.log(`[info] Gemini API experiencing high traffic on ${modelName}. Re-attempting in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else if (modelName !== modelsToTry[modelsToTry.length - 1]) {
            console.log(`[info] ${modelName} retries exhausted due to high traffic. Switching fallback to ${modelsToTry[modelsToTry.length - 1]}...`);
            break;
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }
  }
}

export default async function handler(req: any, res: any) {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure it's a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { stats } = req.body;

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined. Using local diagnostic engine fallback.");
      return res.status(200).json({ insights: generateFallbackInsights(stats) });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: `You are an expert tutor and testing diagnostician. Provide a concise, highly insightful performance analysis based on the player's testing performance data.

Here is their performance data:
${JSON.stringify(stats, null, 2)}

Provide up to 3 bullet points with a brief sentence giving conceptual explanations of the specific subject matter areas they need to focus on, and how they relate or matter. Use an objective, encouraging, and highly intelligent tone. Do not include an intro or outro, just the bullet points in markdown format.`,
    });
    
    return res.status(200).json({ insights: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(200).json({ insights: generateFallbackInsights(stats) });
  }
}

