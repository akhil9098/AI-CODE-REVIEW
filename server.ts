import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Helper function to lazily initialize GoogleGenAI with proper validation
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    throw new Error(
      "GEMINI_API_KEY is not configured or holds a placeholder. Please set your Gemini API Key in Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// 1. Health API
app.get("/api/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// 2. Review Code API
app.post("/api/review", async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || typeof code !== "string" || code.trim() === "") {
      return res.status(400).json({ error: "Code content cannot be empty." });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are an expert AI Senior Software Engineer, Security Auditor, and Performance expert.
Your job is to thoroughly analyze the user's provided code and return a highly detailed code review in JSON.

Be objective, thorough, and highly accurate. Focus specifically on:
1. Bug detection: Syntactical bugs, logical fallacies, edge-case crashes, null/undefined pointers, or exception pathways.
2. Security suggestions: Vulnerabilities (e.g., SQL injection, XSS, SSRF, hardcode keys, unsafe Deserialization, weak cryptography, prototype pollution).
3. Performance improvements: Inefficient algorithms (O(N^2) where O(N) is possible), memory leaks, excessive network calls, unnecessary state changes, unoptimized loops.
4. Comprehensive rating parameters: Specific scores for Readability, Security, Performance, and Maintainability.

Rules:
- Line numbers must accurately match the user's sub-segments (1-indexed matching the physical input line order).
- Provide clear, functional, corrected non-vulnerable code snippets when proposing changes.
- Ensure all comments and descriptions are direct, helpful, and highly constructive. No corporate fluff.`;

    const modelPrompt = `Please review the following ${language || 'automatically detected'} code:
\`\`\`
${code}
\`\`\`

Analyze for bugs, security weaknesses, performance issues, and calculate detailed metrics.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: modelPrompt,
      config: {
        systemInstruction,
        temperature: 0.2, // low temperature for highly analytical/stable reviews
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: {
              type: Type.INTEGER,
              description: "Code quality score from 0 to 100."
            },
            summary: {
              type: Type.STRING,
              description: "A quick overall feedback summary (2-3 sentences) on the core strengths and main concerns."
            },
            bugs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "A unique short id, e.g. b1, b2." },
                  lineNumber: { type: Type.INTEGER, description: "Line number where the bug is located, if applicable (1-indexed)." },
                  lineRange: { type: Type.STRING, description: "Line range, e.g. '12-15', if applicable." },
                  severity: { type: Type.STRING, description: "severity level: low, medium, or high" },
                  title: { type: Type.STRING, description: "Short title summarizing the bug" },
                  description: { type: Type.STRING, description: "Detailed explanation of what the bug is, why it occurs, and its impact." },
                  originalSnippet: { type: Type.STRING, description: "The bad portion of the original code" },
                  fixedSnippet: { type: Type.STRING, description: "The corrected replacement code" }
                },
                required: ["id", "severity", "title", "description", "originalSnippet", "fixedSnippet"]
              }
            },
            securityIssues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "A unique short id, e.g. s1, s2." },
                  vulnType: { type: Type.STRING, description: "E.g., SQL Injection, XSS, Leak, Hardcoded API Key..." },
                  riskLevel: { type: Type.STRING, description: "risk level: low, medium, high, or critical" },
                  title: { type: Type.STRING, description: "Short title summarizing the vulnerability" },
                  lineNumber: { type: Type.INTEGER, description: "Vulnerability line number (1-indexed)" },
                  description: { type: Type.STRING, description: "Explanation of the risk and vulnerability scenario." },
                  mitigation: { type: Type.STRING, description: "How to correct this issue permanently." },
                  sampleSafeCode: { type: Type.STRING, description: "Remediated safe code snippet" }
                },
                required: ["id", "vulnType", "riskLevel", "title", "description", "mitigation"]
              }
            },
            performanceImprovements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "A unique short id, e.g. p1, p2." },
                  impact: { type: Type.STRING, description: "Impact rating: low, medium, or high" },
                  title: { type: Type.STRING, description: "Core performance recommendation title" },
                  description: { type: Type.STRING, description: "Detailed reason why the performance improves and math/complexity info." },
                  originalCode: { type: Type.STRING, description: "Slow code bit" },
                  improvedCode: { type: Type.STRING, description: "Fast/efficient code bit" }
                },
                required: ["id", "impact", "title", "description", "originalCode", "improvedCode"]
              }
            },
            metrics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Metric title, e.g., 'Readability', 'Security', 'Performance', 'Maintainability'" },
                  score: { type: Type.INTEGER, description: "Score from 0 to 100" },
                  description: { type: Type.STRING, description: "Concrete feedback clarifying the score reasons." }
                },
                required: ["name", "score", "description"]
              }
            }
          },
          required: ["overallScore", "summary", "bugs", "securityIssues", "performanceImprovements", "metrics"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Received an empty response from Gemini.");
    }

    const reviewReport = JSON.parse(text.trim());
    return res.json(reviewReport);
  } catch (err: any) {
    console.error("Code Review Error:", err);
    return res.status(500).json({
      error: err.message || "An error occurred during the code review pipeline.",
    });
  }
});

// 3. AI Code Assistant Chat API
app.post("/api/chat", async (req, res) => {
  try {
    const { code, language, history, latestMessage, reportSummary } = req.body;

    if (!latestMessage || typeof latestMessage !== "string") {
      return res.status(400).json({ error: "Message cannot be empty." });
    }

    const ai = getGeminiClient();

    // Prepare contents list following chats structure or generateContent directly
    // Let's create a Chat instance using `ai.chats.create`
    const systemInstruction = `You are an expert AI Senior Technical Mentor.
You are helping a developer understand their code quality report and the specific bugs/security weaknesses discovered in their code.

Context Information:
- Code Language: ${language || "Unknown"}
- Current Code:
\`\`\`
${code || "No code provided"}
\`\`\`
- Review Summary: ${reportSummary || "Review has not completed yet"}

Provide clear, helpful, accurate code advice. If they ask how to rewrite something, explain step by step and give complete or partial samples in code blocks. Keep answers focused, descriptive, and technical yet readable.`;

    const chatInstance = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    // Populate conversation history to preserve state
    if (history && Array.isArray(history) && history.length > 0) {
      // Reconstruct the history if needed, or we can simply feed it sequentially
      // For api.chats, we can push messages, but we can also just call sendMessage.
      // Let's build a single generateContent call if the history size is small, or use chats.sendMessage.
      // Actually, standard generative chats allow passing messages before sending a message.
      // However, to be highly reliable and simple, let's execute generateContent with history formatted in context.
    }

    // Let's compile the prompt containing user history
    const historyBlock = (history || [])
      .map((msg: any) => `${msg.role === "user" ? "Developer" : "AI Mentor"}: ${msg.content}`)
      .join("\n\n");

    const completePrompt = `Here is the conversation history:
${historyBlock}

Developer: ${latestMessage}

AI Mentor:`;

    const chatResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: completePrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return res.json({ response: chatResponse.text });
  } catch (err: any) {
    console.error("AI Assistant Chat Error:", err);
    return res.status(500).json({
      error: err.message || "An error occurred in the AI Mentor Chat.",
    });
  }
});

// 4. Vite Dev Server + Static Hosting Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite HMR wrapper...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode (hosting dist static bundle)...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
