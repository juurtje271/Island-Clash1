/* Island Clash — aparte Supabase login-helper
 * Dit bestand kan zelfstandig aan een pagina worden gekoppeld.
 * Het gebruikt Supabase Auth email/password en nooit een service_role key.
 *
 * Voor username -> email gebruikt het de instelling loginEmailDomain uit supabase-config.js.
 * Voorbeeld: docent -> docent@islandclash.local
 */
(function(){
  'use strict';
  const cfg = window.ISLAND_CLASH_SUPABASE || {};
  let client = null;

  function makeEmail(username){
    const value = String(username || '').trim();
    if(value.includes('@')) return value.toLowerCase();
    const domain = String(cfg.loginEmailDomain || 'islandclash.local').trim().replace(/^@/,'');
    return `${value.toLowerCase()}@${domain}`;
  }

  function getClient(){
    if(client) return client;
    if(!window.supabase || typeof window.supabase.createClient !== 'function'){
      throw new Error('supabase-js is niet geladen.');
    }
    if(!cfg.url || !cfg.publishableKey || String(cfg.publishableKey).includes('YOUR_')){
      throw new Error('Vul eerst supabase-config.js in.');
    }
    client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return client;
  }

  async function login(username, password){
    const sb = getClient();
    const { data, error } = await sb.auth.signInWithPassword({
      email: makeEmail(username),
      password: String(password || '')
    });
    if(error) throw error;
    return data;
  }

  async function signup(username, password, metadata){
    const sb = getClient();
    const { data, error } = await sb.auth.signUp({
      email: makeEmail(username),
      password: String(password || ''),
      options: { data: metadata || {} }
    });
    if(error) throw error;
    return data;
  }

  async function currentSession(){
    const sb = getClient();
    const { data, error } = await sb.auth.getSession();
    if(error) throw error;
    return data.session;
  }

  async function logout(){
    const sb = getClient();
    const { error } = await sb.auth.signOut();
    if(error) throw error;
  }

  function onAuthStateChange(callback){
    const sb = getClient();
    return sb.auth.onAuthStateChange(callback);
  }

  window.IslandClashSupabaseLogin = {
    makeEmail,
    login,
    signup,
    currentSession,
    logout,
    onAuthStateChange,
    getClient
  };
})();
