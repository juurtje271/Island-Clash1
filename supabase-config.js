/* Island Clash — Supabase configuratie
 * Vul alleen deze waarden in. Gebruik NOOIT een service_role/secret key in de browser.
 */
window.ISLAND_CLASH_SUPABASE = {
  enabled: true,
  url: 'https://YOUR-PROJECT.supabase.co',
  // Supabase noemt dit de publishable key (voorheen vaak anon key genoemd).
  publishableKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
  stateTable: 'ic_global_state',
  stateRowId: 'main',

  // Optioneel: gebruik Supabase Auth voor de aparte login-helper.
  useSupabaseAuthLogin: false,
  loginEmailDomain: 'islandclash.local'
};
