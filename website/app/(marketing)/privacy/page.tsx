export default function Privacy() {
  return (
    <div className="ov-privacy-page">
      <div className="ov-privacy-container">
        <h1>Privacy Policy</h1>
        <p className="ov-privacy-date">
          <em>Last updated: November 11, 2025</em>
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
          <h3>Account Information</h3>
          <p>
            If you choose to sign in, we collect your email address via Google OAuth
            to manage your subscription and authenticate your usage.
          </p>
          
          <h3>Usage Data</h3>
          <p>
            We log usage statistics to help us improve the service and manage limits.
            This includes:
          </p>
          <ul>
            <li>Number of prompts sent</li>
            <li>AI model used</li>
            <li>Length of the prompt (character count)</li>
            <li>Timestamp of usage</li>
          </ul>
          <p>
            <strong>We do NOT store the actual content</strong> of your prompts or the 
            captured text in our database. The text is processed transiently by the 
            AI provider and then discarded.
          </p>

          <h3>Website Content</h3>
          <p>
            When you press <strong>Alt+1</strong>, Oddvision captures visible
            text from the current webpage. This text is sent to AI providers
            (Groq or OpenRouter) for analysis only when you press{" "}
            <strong>Alt+2</strong>.
          </p>
          <ul>
            <li>
              <strong>Trigger:</strong> Manual only (keyboard shortcut)
            </li>
            <li>
              <strong>Storage:</strong> Temporarily held in memory until AI
              responds, then immediately discarded
            </li>
            <li>
              <strong>Sharing:</strong> Sent only to Groq or OpenRouter APIs
              using shared API credentials
            </li>
            <li>
              <strong>No server storage:</strong> We don&apos;t store, log, or save
              any captured content on our servers
            </li>
          </ul>

          <h3>How AI Providers Receive Data</h3>
          <p>
            Oddvision uses shared API keys (provided by the extension) to send
            your captured text to free AI services. This means:
          </p>
          <ul>
            <li>
              AI providers (Groq, OpenRouter) receive the text you capture for
              processing
            </li>
            <li>
              These providers process requests according to their own privacy
              policies (see links below)
            </li>
            <li>
              The extension uses shared credentials, so providers cannot
              identify individual users
            </li>
            <li>
              Responses return directly to your browser and are displayed in the
              overlay
            </li>
            <li>
              No data is stored by Oddvision—everything stays between your
              browser and the AI provider
            </li>
          </ul>
        </section>

        <section className="ov-privacy-section">
          <h2>Data We Do NOT Collect</h2>
          <p>Oddvision does not collect, store, or transmit:</p>
          <ul>
            <li>
              Personal identifiable information (name, email, address, etc.)
            </li>
            <li>Browsing history or web activity tracking</li>
            <li>Location data</li>
            <li>Financial information</li>
            <li>Health information</li>
            <li>Analytics or usage statistics</li>
          </ul>
        </section>

        <section className="ov-privacy-section">
          <h2>Third-Party Services</h2>
          <p>
            Oddvision sends captured text to AI providers (Groq, OpenRouter)
            using built-in API credentials. These services have their own
            privacy policies:
          </p>
          <ul>
            <li>
              <a
                href="https://groq.com/privacy-policy/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Groq Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="https://openrouter.ai/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                OpenRouter Privacy Policy
              </a>
            </li>
          </ul>
          <p>
            <strong>We do not control these services.</strong> Review their
            policies to understand how they handle your data.
          </p>
        </section>

        <section className="ov-privacy-section">
          <h2>Data Retention</h2>
          <p>
            <strong>Captured text:</strong> Held in memory only while processing
            your request. Discarded immediately after AI responds.
          </p>
          <p>
            <strong>Account & Usage Metadata:</strong> Stored securely in our database (Supabase)
            to provide your account history and subscription status.
          </p>
          <p>
            <strong>User preferences:</strong> Overlay position and display
            settings are stored locally in your browser using{" "}
            <code>chrome.storage.local</code>.
          </p>
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
                  Save overlay and display preferences in your browser (no
                  personal data or API keys stored)
                </td>
              </tr>
              <tr>
                <td>
                  <code>api.groq.com</code>
                </td>
                <td>Send requests to Groq AI (if you use Groq)</td>
              </tr>
              <tr>
                <td>
                  <code>openrouter.ai</code>
                </td>
                <td>Send requests to OpenRouter (if you use OpenRouter)</td>
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
              <strong>Review stored data:</strong> Open Chrome DevTools →
              Application → Storage → Extensions (only overlay preferences are
              stored)
            </li>
            <li>
              <strong>Don&apos;t capture sensitive content:</strong> Only press Alt+1
              when you&apos;re comfortable sharing the visible text with AI
              providers
            </li>
          </ul>
        </section>

        <section className="ov-privacy-section">
          <h2>Children&apos;s Privacy</h2>
          <p>
            Oddvision is not directed at children under 13. We do not knowingly
            collect data from children.
          </p>
        </section>

        <section className="ov-privacy-section">
          <h2>Changes to This Policy</h2>
          <p>
            We may update this policy occasionally. Changes will be posted on
            this page with an updated &quot;Last updated&quot; date.
          </p>
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

