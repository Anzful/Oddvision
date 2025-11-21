// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UI Elements
const authButton = document.getElementById('authButton');
const userDisplay = document.getElementById('userDisplay');

// Check initial session
async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  updateUI(session);
  
  // Listen for auth changes
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    updateUI(session);
  });
}

// Update UI based on session
function updateUI(session) {
  if (session) {
    if (authButton) {
      authButton.textContent = 'Sign Out';
      authButton.onclick = signOut;
    }
    if (userDisplay) {
      userDisplay.textContent = session.user.email;
      userDisplay.style.display = 'block';
    }
  } else {
    if (authButton) {
      authButton.textContent = 'Log In with Google';
      authButton.onclick = signInWithGoogle;
    }
    if (userDisplay) {
      userDisplay.style.display = 'none';
    }
  }
}

// Sign In
async function signInWithGoogle() {
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/website/login.html' // Adjust based on deployment
    }
  });
  if (error) console.error('Login error:', error.message);
}

// Sign Out
async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) console.error('Logout error:', error.message);
}

// Run
checkSession();

