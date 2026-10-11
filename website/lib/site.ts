/**
 * Product facts used by page metadata, structured data (JSON-LD), the sitemap
 * and /llms.txt. Keep these accurate: search engines and AI assistants quote
 * them, and inconsistent facts across pages lower trust.
 */
export const SITE = {
  name: "Oddvision",
  url: "https://oddvision.xyz",
  title: "Oddvision: AI Overlay Chrome Extension for Any Webpage",
  description:
    "Oddvision is a Chrome extension that puts AI on any webpage. Press Alt+1 to capture the page or Alt+4 to snip part of the screen, and get explanations, summaries and step-by-step solutions in an overlay, without switching tabs. Free to try.",
  shortDescription: "An AI overlay for any webpage, driven by four keyboard shortcuts.",
  chromeStoreUrl: "https://chromewebstore.google.com/detail/agckpadpigmebffnhleebpkllfpbggge",
  email: "oddvisionai@gmail.com",
  logo: "/logo.png",
  aiModel: "Google Gemini",
  freeDailyAnalyses: 5,
  captureLimitChars: 4000, // Alt+1 reads the page text from the top, truncated here
  pro: { price: "8.00", currency: "USD", label: "$8.00/month plus tax" },
  lastUpdated: "2026-10-11",
} as const;

export const SHORTCUTS = [
  { keys: "Alt+1", action: "Capture", detail: "Reads the page's text from the top, up to about 4,000 characters." },
  { keys: "Alt+2", action: "Analyze", detail: "Sends what you captured to the AI and shows the answer in the overlay." },
  { keys: "Alt+3", action: "Hide / show", detail: "Toggles the answer overlay." },
  { keys: "Alt+4", action: "Snip", detail: "Select any region of the screen (a chart, diagram, image or code) and get an answer about it." },
] as const;

export const ROLES = [
  { icon: "🎯", name: "Picker", detail: "Picks the best option from a list of choices and says why." },
  { icon: "💡", name: "Explainer", detail: "Explains a concept, term or passage in plain language." },
  { icon: "📝", name: "Summarizer", detail: "Condenses long pages into the key points." },
  { icon: "✍️", name: "Writer", detail: "Drafts and rewrites text, such as email replies." },
  { icon: "🧮", name: "Solver", detail: "Works through math and logic problems step by step." },
  { icon: "⚡", name: "Raw", detail: "A general AI answer with no role constraints." },
  { icon: "🔧", name: "Custom", detail: "Your own instructions, saved as a role." },
] as const;

export type PageEntry = { path: string; title: string; description: string };

/** Indexable pages, in sitemap order. */
export const PAGES: PageEntry[] = [
  { path: "/", title: SITE.title, description: SITE.description },
  {
    path: "/how-it-works",
    title: "How Oddvision Works: 4 Shortcuts to AI on Any Page",
    description: "A step-by-step guide to Oddvision's four keyboard shortcuts (Alt+1 to Alt+4), its seven AI roles, and tips for getting better answers.",
  },
  {
    path: "/use-cases",
    title: "What You Can Do With Oddvision",
    description: "Ways people use Oddvision's AI overlay: studying, coding, reading and research, writing, and reading charts and images.",
  },
  {
    path: "/use-cases/studying",
    title: "AI Study Helper for Chrome",
    description: "Use Oddvision while you study: explain hard concepts, summarize readings, and work through practice problems step by step, right on the page.",
  },
  {
    path: "/use-cases/coding",
    title: "Explain Code and Errors With AI in Chrome",
    description: "Snip a stack trace or capture a docs page and get a plain-language explanation and a fix, without copying code into a chat window.",
  },
  {
    path: "/use-cases/reading-and-research",
    title: "Summarize Any Webpage With AI",
    description: "Turn long articles, reports and terms of service into the key points in seconds with Oddvision's Summarizer role.",
  },
  {
    path: "/use-cases/writing",
    title: "Draft Email Replies With AI in Chrome",
    description: "Capture an email or document and let Oddvision's Writer role draft a reply or rewrite a paragraph in the tone you need.",
  },
  {
    path: "/use-cases/charts-and-images",
    title: "Screenshot to AI: Ask About Charts and Images",
    description: "Press Alt+4, drag over a chart, diagram or image, and get an explanation of what it shows. Works on anything visible in Chrome.",
  },
  {
    path: "/compare/oddvision-vs-chatgpt",
    title: "Oddvision vs. Copy-Pasting Into ChatGPT",
    description: "An honest comparison of asking AI about a webpage with Oddvision's overlay versus copying text into ChatGPT: speed, screenshots, privacy and price.",
  },
  {
    path: "/faq",
    title: "Oddvision FAQ: Price, Privacy and Shortcuts",
    description: "Answers to common questions about Oddvision: what it costs, what data it stores, which browsers it supports and how the shortcuts work.",
  },
  { path: "/privacy", title: "Privacy Policy", description: "What data Oddvision collects, what it never stores, and the services it uses." },
  { path: "/terms", title: "Terms of Service", description: "The terms for using Oddvision and Oddvision Pro." },
  { path: "/refund", title: "Refund Policy", description: "Oddvision Pro's 14-day money-back guarantee and how to request a refund." },
];

export const page = (path: string): PageEntry => {
  const p = PAGES.find((x) => x.path === path);
  if (!p) throw new Error(`Unknown page ${path}`);
  return p;
};
