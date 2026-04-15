globalThis.OddvisionConfig = {
    // SUPABASE CONFIGURATION (these are meant to be public)
    supabaseUrl: 'https://czetxxmjcvfiavwzcvqb.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6ZXR4eG1qY3ZmaWF2d3pjdnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjU0MDAsImV4cCI6MjA3OTI0MTQwMH0.E098WUiAP7AykQepyJR58cqU6Li6B2JrZdrSag06iVw',
  
    // Founder IDs (hardcoded for security - can't be DB-compromised)
    founderIds: [
      '90a2510d-c654-4fc7-be85-dbd9e9860cd9',  // Luka GAU
      '082047c2-ee68-47c1-ab9d-a705ace1fe99', // Anzor 1
      'e8480407-3af4-492a-b99c-0cb065f80e08', // Anzor 2
      '78f727f0-f60c-4187-b013-eeedef2170db', // Anzor 3
    ]
  
    // NOTE: AI API keys (Groq, OpenRouter) are now stored as Supabase Edge Function secrets
    // They never touch the client - see deployment instructions in supabase/README.md
  };