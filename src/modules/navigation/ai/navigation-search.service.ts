import Groq from "groq-sdk";
import { z } from "zod";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

export const APP_ROUTES = [
  {
    path: "/",
    title: "Home",
    description: "Main dashboard and landing page",
    keywords: ["home", "main", "dashboard"],
  },
  {
    path: "/profile",
    title: "Profile",
    description: "User settings and details",
    keywords: ["profile", "account", "settings", "my info"],
  },
  {
    path: "/ranking",
    title: "Ranking Leaderboard",
    description: "Global ranks and user standings",
    keywords: ["ranking", "rank", "leaderboard", "top users", "my rank"],
  },
  {
    path: "/roadmap",
    title: "Learning Roadmap",
    description: "Personalized learning progression",
    keywords: ["roadmap", "path", "progression", "learning route"],
  },
  {
    path: "/test",
    title: "Exams & Tests",
    description: "Take exams or practice tests",
    keywords: ["test", "exam", "quiz", "practice"],
  },
  {
    path: "/flashcards-list",
    title: "Flashcard Decks",
    description: "Manage and study flashcard decks",
    keywords: ["flashcards", "decks", "vocabulary", "study cards"],
  },
  {
    path: "/forum",
    title: "Community Forum",
    description: "Discuss topics and community posts",
    keywords: ["forum", "community", "discussions", "posts"],
  },
  {
    path: "/chat",
    title: "Community Chat",
    description: "Real-time chat with community members",
    keywords: ["chat", "messages", "live chat"],
  },
  {
    path: "/faq",
    title: "Help & FAQ",
    description: "Frequently asked questions and support",
    keywords: ["faq", "help", "support"],
  },
];

export const RouteSearchResponseSchema = z.object({
  matchedPath: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  suggestedAction: z.string(),
});

export type RouteSearchResponse = z.infer<typeof RouteSearchResponseSchema>;

export class NavigationSearchService {
  async searchRouteByIntent(query: string): Promise<RouteSearchResponse> {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const availableRoutesPrompt = APP_ROUTES.map(
      (r) =>
        `- Path: "${r.path}" | Title: "${r.title}" | Description: "${r.description}" | Keywords: [${r.keywords.join(", ")}]`,
    ).join("\n");

    const systemPrompt = `
You are an intelligent navigation routing engine.
Parse natural language queries and map them to the single best route path from available app routes.

ROUTES:
${availableRoutesPrompt}

RULES:
- Map intent queries (e.g., "My ranking", "where am I on the leaderboard") directly to "/ranking".
- If no clear route matches, set matchedPath to null and confidence to 0.
`;

    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.1,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `User query: "${query}"` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "navigation_route_schema",
          strict: true,
          schema: this.getJsonSchema(),
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Groq returned an empty response");
    }

    const parsed = JSON.parse(content);
    return RouteSearchResponseSchema.parse(parsed);
  }

  private getJsonSchema() {
    return {
      type: "object",
      additionalProperties: false,
      required: ["matchedPath", "confidence", "reasoning", "suggestedAction"],
      properties: {
        matchedPath: {
          type: ["string", "null"],
        },
        confidence: {
          type: "number",
        },
        reasoning: {
          type: "string",
        },
        suggestedAction: {
          type: "string",
        },
      },
    };
  }
}
