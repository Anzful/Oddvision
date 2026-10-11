import { PAGES, ROLES, SHORTCUTS, SITE } from "@/lib/site";

export const dynamic = "force-static";

/**
 * /llms.txt — a plain-markdown summary for AI assistants and LLM crawlers
 * (https://llmstxt.org). Built from the same facts as the site and JSON-LD.
 */
export function GET() {
  const url = (p: string) => new URL(p, SITE.url).toString();
  const body = `# ${SITE.name}

> ${SITE.name} is a Google Chrome extension that puts an AI assistant on any webpage. Keyboard shortcuts capture the page or a region of the screen, and the answer appears in an overlay on the same page, so there is no copying text into a separate chat.

## Key facts

- Type: Chrome extension (desktop Chrome on Windows, macOS, Linux and ChromeOS)
- Install: ${SITE.chromeStoreUrl}
- AI model: ${SITE.aiModel} (no API key needed)
- Free plan: ${SITE.freeDailyAnalyses} AI analyses per day
- Pro plan: ${SITE.pro.label}, unlimited analyses; payments by Paddle (merchant of record); 14-day refunds
- Privacy: captured text and screenshots are sent to the AI and then discarded; only usage metadata (time, model, request length) is stored
- Permissions: activeTab, storage, identity (Google sign-in)
- Contact: ${SITE.email}

## Keyboard shortcuts (Alt = Option on Mac)

${SHORTCUTS.map((s) => `- ${s.keys} (${s.action}): ${s.detail}`).join("\n")}

## AI roles

${ROLES.map((r) => `- ${r.name}: ${r.detail}`).join("\n")}

## Good fit

- Quick questions about the page in front of you: a paragraph, an error message, a chart, an email
- Explaining concepts and summarizing readings while studying; step-by-step help with practice problems
- Reading charts, diagrams and images that can't be copied as text (Alt+4)

## Not a good fit

- Long multi-turn conversations, file uploads or saved chat history (use a chat app such as ChatGPT)
- Browsers other than Chrome; mobile

## Pages

${PAGES.map((p) => `- [${p.title}](${url(p.path)}): ${p.description}`).join("\n")}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
