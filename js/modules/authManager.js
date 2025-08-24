//authManager.js
import { supabase } from './supabaseClient'; // Din Supabase klient-opsætning

async function signUp(email, password) {
  const { user, error } = await supabase.auth.signUp({ email, password });
}

async function signIn(email, password) {
  const { user, error } = await supabase.auth.signInWithPassword({ email, password });
}

// Lyt til login/logout events for at opdatere UI
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Skjul login-form, vis app-indhold, hent brugerens data
  } else if (event === 'SIGNED_OUT') {
    // Vis login-form, ryd data
  }
});