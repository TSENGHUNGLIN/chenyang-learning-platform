import { ENV } from "./env";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, Content } from "@google/generative-ai";

// ============================================================================
// Type Definitions (unchanged)
// ============================================================================

export type Role = "system" | "user" | "assistant" | "tool" | "function";
export type TextContent = { type: "text"; text: string };
export type ImageContent = { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };
export type FileContent = { type: "file_url"; file_url: { url: string; mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" } };
export type MessageContent = string | TextContent | ImageContent | FileContent;
export type Message = { role: Role; content: MessageContent | MessageContent[]; name?: string; tool_call_id?: string };
export type Tool = { type: "function"; function: { name: string; description?: string; parameters?: Record<string, unknown> } };
export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = { type: "function"; function: { name: string } };
export type ToolChoice = ToolChoicePrimitive | ToolChoiceByName | ToolChoiceExplicit;
export type InvokeParams = { messages: Message[]; tools?: Tool[]; toolChoice?: ToolChoice; tool_choice?: ToolChoice; maxTokens?: number; max_tokens?: number; outputSchema?: OutputSchema; output_schema?: OutputSchema; responseFormat?: ResponseFormat; response_format?: ResponseFormat };
export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
export type InvokeResult = { id: string; created: number; model: string; choices: Array<{ index: number; message: { role: Role; content: string | Array<TextContent | ImageContent | FileContent>; tool_calls?: ToolCall[] }; finish_reason: string | null }>; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } };
export type JsonSchema = { name: string; schema: Record<string, unknown>; strict?: boolean };
export type OutputSchema = JsonSchema;
export type ResponseFormat = { type: "text" } | { type: "json_object" } | { type: "json_schema"; json_schema: JsonSchema };

// ============================================================================
// Gemini API Integration
// ============================================================================

let genAI: GoogleGenerativeAI | null = null;

function isGeminiAvailable(): boolean {
  console.log("[LLM] Checking Gemini availability...");
  console.log("[LLM] GEMINI_API_KEY exists:", !!ENV.geminiApiKey);
  console.log("[LLM] GEMINI_API_KEY length:", ENV.geminiApiKey.length);
  return !!ENV.geminiApiKey;
}

function initializeGemini() {
  if (genAI) return;
  try {
    genAI = new GoogleGenerativeAI(ENV.geminiApiKey);
    console.log("[LLM] Google Gemini initialized successfully");
  } catch (error) {
    console.error("[LLM] Failed to initialize Google Gemini:", error);
    throw new Error("Failed to initialize Google Gemini");
  }
}

// Transforms OpenAI-style messages to Gemini-style content
function transformMessagesToGemini(messages: Message[]): Content[] {
    const history: Content[] = [];
    let systemInstruction = "";

    for (const msg of messages) {
        let role: 'user' | 'model' = 'user'; // Default role

        if (msg.role === 'system') {
            const content = Array.isArray(msg.content) ? msg.content.map(c => (c as TextContent).text).join(' ') : msg.content as string;
            systemInstruction += content + "\n";
            continue; // Skip adding system messages directly to history
        }
        if (msg.role === 'assistant') {
            role = 'model';
        }

        const content = Array.isArray(msg.content) ? msg.content.map(c => (c as TextContent).text).join(' ') : msg.content as string;

        history.push({ role, parts: [{ text: content }] });
    }

    // Prepend system instruction to the first user message if it exists
    if (systemInstruction && history.length > 0 && history[0].role === 'user') {
        const firstUserContent = history[0].parts[0].text;
        history[0].parts[0].text = `${systemInstruction}\n\n${firstUserContent}`;
    } else if (systemInstruction) {
        // If no user message, add a new user message with the system instruction
        history.unshift({ role: 'user', parts: [{ text: systemInstruction }] });
    }

    return history;
}

async function invokeGemini(params: InvokeParams): Promise<InvokeResult> {
  initializeGemini();
  if (!genAI) throw new Error("Gemini not initialized");

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const generationConfig: GenerationConfig = {
    maxOutputTokens: params.maxTokens || params.max_tokens || 8192,
    temperature: 0.7,
  };

  // Handle JSON output format if requested
  const responseFormat = params.responseFormat || params.response_format;
  if (responseFormat?.type === "json_schema" && responseFormat.json_schema) {
    generationConfig.responseMimeType = "application/json";
    // Clean schema: remove fields not supported by Gemini
    const cleanSchema = JSON.parse(JSON.stringify(responseFormat.json_schema.schema));
    removeUnsupportedFields(cleanSchema);
    generationConfig.responseSchema = cleanSchema;
  } else if (responseFormat?.type === "json_object") {
    generationConfig.responseMimeType = "application/json";
  }

  // Helper function to remove unsupported fields from schema
  function removeUnsupportedFields(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return;
    
    // Remove unsupported fields
    delete obj.additionalProperties;
    delete obj.strict;
    
    // Recursively clean nested objects
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        removeUnsupportedFields(obj[key]);
      }
    }
  }

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  const history = transformMessagesToGemini(params.messages);

  const result = await model.generateContent({
      contents: history,
      generationConfig,
      safetySettings,
  });

  const response = result.response;
  const candidate = response.candidates?.[0];

  if (!candidate) {
    throw new Error("LLM invoke failed: No candidate response from Gemini");
  }

  const content = candidate.content.parts.map(part => part.text).join("");

  return {
    id: `gemini-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: "gemini-2.5-flash",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: content,
        },
        finish_reason: candidate.finishReason || "STOP",
      },
    ],
    usage: {
      prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
      completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: response.usageMetadata?.totalTokenCount || 0,
    },
  };
}

// ============================================================================
// OpenAI-Compatible (Forge) API Integration (Fallback)
// ============================================================================

const ensureArray = (value: MessageContent | MessageContent[]): MessageContent[] => (Array.isArray(value) ? value : [value]);
const normalizeContentPart = (part: MessageContent): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") return { type: "text", text: part };
  if (part.type === "text" || part.type === "image_url" || part.type === "file_url") return part;
  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map(part => (typeof part === "string" ? part : JSON.stringify(part))).join("\n");
    return { role, name, tool_call_id, content };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return { role, name, content: contentParts[0].text };
  }
  return { role, name, content: contentParts };
};

const resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";

const assertForgeApiKey = () => {
  console.log("[LLM] Checking Forge API key...");
  console.log("[LLM] FORGE_API_KEY exists:", !!ENV.forgeApiKey);
  if (!ENV.forgeApiKey) {
    console.error("[LLM] No API key configured!");
    console.error("[LLM] GEMINI_API_KEY:", ENV.geminiApiKey ? "(set but not used)" : "(not set)");
    console.error("[LLM] FORGE_API_KEY:", ENV.forgeApiKey ? "(set)" : "(not set)");
    throw new Error("No API key configured. Please set GEMINI_API_KEY or a fallback API key.");
  }
}

async function invokeForge(params: InvokeParams): Promise<InvokeResult> {
  assertForgeApiKey();
  const payload: Record<string, unknown> = {
    model: "gemini-2.5-flash",
    messages: params.messages.map(normalizeMessage),
    max_tokens: 32768,
    thinking: { "budget_tokens": 128 }
  };

  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${ENV.forgeApiKey}` },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`);
  }

  return (await response.json()) as InvokeResult;
}

// ============================================================================
// Main Exported Function
// ============================================================================

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  // Priority 1: Google Gemini
  if (isGeminiAvailable()) {
    console.log("[LLM] Using Google Gemini API");
    try {
      return await invokeGemini(params);
    } catch (error) {
      console.error("[LLM] Gemini API call failed, falling back...", error);
      // Fallback to Forge if Gemini fails
    }
  }

  // Priority 2: OpenAI-Compatible (Forge) Fallback
  console.log("[LLM] Using OpenAI-compatible (Forge) API as fallback");
  return await invokeForge(params);
}
