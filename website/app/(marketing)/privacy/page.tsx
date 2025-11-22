export default function Privacy() {
  return (
    <div className="ov-privacy-page">
      <div className="ov-privacy-container">
        <h1>Privacy Policy</h1>
        <p className="ov-privacy-date">
          <em>Last updated: November 22, 2025</em>
        </p>

        <section className="ov-privacy-section">
          <h2>Introduction</h2>
          <p>
            Oddvision is a Chrome extension that helps you capture and analyze
            webpage content using AI. Your privacy is our top priority. This
            policy explains what data we handle and how.
          </p>
        </section>

        <section className="ov-privacy-section">
          <h2>Data We Collect</h2>
          
          <h3>1. Account Information</h3>
          <p>
            When you sign in, we collect the following information via Google OAuth (managed by Supabase):
          </p>
          <ul>
            <li>Email address</li>
            <li>User ID (assigned by our authentication system)</li>
            <li>Subscription status (Free/Pro)</li>
          </ul>
          
          <h3>2. Usage Metadata</h3>
          <p>
            To manage subscription limits and improve service quality, we log the following metadata for each AI request:
          </p>
          <ul>
            <li>Timestamp of the request</li>
            <li>AI Model used (e.g., Llama 3, MiniMax)</li>
            <li>Character count (length) of the prompt</li>
          </ul>
          <p>
            <strong>Important:</strong> We do <strong>NOT</strong> store the actual text content of your prompts or the captured webpage content in our database. We only store the length (character count) for usage tracking.
          </p>

          <h3>3. Website Content (Transient)</h3>
          <p>
            When you press <strong>Alt+1</strong>, Oddvision captures visible
            text from the current webpage.
          </p>
          <ul>
            <li>
              <strong>Trigger:</strong> Manual only (keyboard shortcut)
            </li>
            <li>
              <strong>Processing:</strong> This text is temporarily held in your browser&apos;s memory.
            </li>
            <li>
              <strong>Sharing:</strong> When you press <strong>Alt+2</strong>, the text is sent directly to AI providers (Groq or OpenRouter) for analysis.
            </li>
            <li>
              <strong>No Permanent Storage:</strong> We do not save this content on our servers. It is discarded immediately after the AI response is received.
            </li>
          </ul>
        </section>

        <section className="ov-privacy-section">
          <h2>Third-Party Services</h2>
          <p>
            We use trusted third-party services to provide core functionality. Data shared with them is subject to their respective privacy policies:
          </p>
          <ul>
            <li>
              <strong>Supabase:</strong> Authentication and database hosting.
              (<a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>)
            </li>
            <li>
              <strong>Groq & OpenRouter:</strong> AI inference providers that process your text prompts.
              (<a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer">Groq Policy</a>, <a href="https://openrouter.ai/privacy" target="_blank" rel="noopener noreferrer">OpenRouter Policy</a>)
            </li>
            <li>
              <strong>PayPal:</strong> Payment processing for Pro subscriptions. We do not store credit card details; payments are handled entirely by PayPal.
              (<a href="https://www.paypal.com/us/legalhub/privacy-full" target="_blank" rel="noopener noreferrer">Privacy Policy</a>)
            </li>
          </ul>
        </section>

        <section className="ov-privacy-section">
          <h2>Data Retention</h2>
          <ul>
             <li><strong>Account Data:</strong> Retained as long as your account is active. You can request deletion at any time.</li>
             <li><strong>Usage Logs:</strong> Retained to track usage limits (e.g., weekly resets).</li>
             <li><strong>Local Preferences:</strong> Extension settings (e.g., overlay position) are stored locally in your browser and removed if you uninstall the extension.</li>
          </ul>
        </section>

        <section className="ov-privacy-section">
          <h2>Permissions Explanation</h2>
          <table className="ov-permissions-table">
            <thead>
              <tr>
                <th>Permission</th>
                <th>Why We Need It</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>activeTab</code>
                </td>
                <td>Read visible page text when you press Alt+1</td>
              </tr>
              <tr>
                <td>
                  <code>storage</code>
                </td>
                <td>
                  Save settings locally (e.g. "Enabled/Disabled" state)
                </td>
              </tr>
              <tr>
                <td>
                  <code>identity</code>
                </td>
                <td>
                   Required for Google Sign-In authentication
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="ov-privacy-section">
          <h2>Your Rights</h2>
          <p>You have full control over your data:</p>
          <ul>
            <li>
              <strong>Stop using the extension:</strong> Disable or uninstall
              from <code>chrome://extensions</code>
            </li>
            <li>
              <strong>Manage Account:</strong> You can sign out at any time via the extension popup.
            </li>
            <li>
              <strong>Don&apos;t capture sensitive content:</strong> Only press Alt+1
              when you&apos;re comfortable sharing the visible text with AI
              providers.
            </li>
          </ul>
        </section>

        <section className="ov-privacy-section">
          <h2>Contact</h2>
          <p>
            Questions about this policy? Open an issue on our{" "}
            <a
              href="https://github.com/anzful/Oddvision"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub repository
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
