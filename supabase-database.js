/* Island Clash — Supabase database bridge
 * Slaat alle bestaande Island Clash localStorage-data als één cloud snapshot op.
 * Hierdoor worden accounts, klassen/groepen, eilanden, quizzen, voortgang,
 * cijfers, opdrachten, shop, instellingen en andere ic_* gegevens tussen apparaten gesynchroniseerd.
 *
 * BELANGRIJK: dit is een eenvoudige browser-directe sync voor een school/prototype.
 * Voor productiegebruik met gevoelige persoonsgegevens moet je RLS + Auth of een
 * server-side backend gebruiken. Zet NOOIT de service_role key in dit bestand.
 */
(function(){
  'use strict';

  const cfg = window.ISLAND_CLASH_SUPABASE || {};
  const FLAG = 'ic_cloud_boot_done_v1';
  let client = null;
  let saveTimer = null;
  let bootPromise = null;
  let syncing = false;

  function toast(msg, type){
    try { if (typeof window.showToast === 'function') window.showToast(msg, type || 'info'); } catch(e){}
  }

  function validConfig(){
    return !!(cfg.enabled && /^https:\/\/[^\s]+\.supabase\.co$/i.test(String(cfg.url||'')) && cfg.publishableKey && !String(cfg.publishableKey).includes('YOUR_'));
  }

  function getClient(){
    if(client) return client;
    if(!validConfig() || !window.supabase || typeof window.supabase.createClient !== 'function') return null;
    client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return client;
  }

  function collectLocalState(){
    const data = {};
    try {
      for(let i=0;i<localStorage.length;i++){
        const key = localStorage.key(i);
        if(key && key.startsWith('ic_')) data[key] = localStorage.getItem(key);
      }
    } catch(e){
      console.warn('Island Clash cloud: localStorage uitlezen mislukt', e);
    }
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      data
    };
  }

  function applyLocalState(snapshot){
    const data = snapshot && snapshot.data && typeof snapshot.data === 'object' ? snapshot.data : {};
    try {
      Object.keys(data).forEach(key => {
        if(!key.startsWith('ic_')) return;
        const value = data[key];
        if(value === null || value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, String(value));
      });
      return true;
    } catch(e){
      console.error('Island Clash cloud: clouddata toepassen mislukt', e);
      return false;
    }
  }

  async function readCloud(){
    const sb = getClient();
    if(!sb) return null;
    const { data, error } = await sb
      .from(cfg.stateTable || 'ic_global_state')
      .select('id,state,updated_at')
      .eq('id', cfg.stateRowId || 'main')
      .maybeSingle();
    if(error){ throw error; }
    return data || null;
  }

  async function writeCloud(){
    const sb = getClient();
    if(!sb) return false;
    const payload = {
      id: cfg.stateRowId || 'main',
      state: collectLocalState(),
      updated_at: new Date().toISOString()
    };
    const { error } = await sb
      .from(cfg.stateTable || 'ic_global_state')
      .upsert(payload, { onConflict: 'id' });
    if(error) throw error;
    return true;
  }

  async function syncFromCloud(){
    const row = await readCloud();
    if(row && row.state && row.state.data && Object.keys(row.state.data).length){
      applyLocalState(row.state);
      return { found: true, updatedAt: row.updated_at || row.state.savedAt || null };
    }
    return { found: false };
  }

  async function syncToCloud(){
    if(syncing) return false;
    syncing = true;
    try {
      const ok = await writeCloud();
      return ok;
    } catch(e){
      console.error('Island Clash cloud save:', e);
      toast('☁️ Database opslaan mislukt. Controleer je Supabase-configuratie.', 'error');
      return false;
    } finally {
      syncing = false;
    }
  }

  function queueSave(){
    if(!validConfig()) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(()=>{ syncToCloud().catch(()=>{}); }, 1200);
  }

  function wrapSaveFunction(name){
    try{
      if(typeof window[name] !== 'function' || window[name].__cloudWrapped) return;
      const original = window[name];
      const wrapped = function(){
        const result = original.apply(this, arguments);
        queueSave();
        return result;
      };
      wrapped.__cloudWrapped = true;
      window[name] = wrapped;
    }catch(e){ console.warn('Cloud wrapper', name, e); }
  }

  function installHooks(){
    [
      'saveEverything','saveAccounts','saveQuizzes','saveQuizSets','saveAppSettings',
      'saveAccountGroups','saveShopCatalog'
    ].forEach(wrapSaveFunction);

    document.addEventListener('visibilitychange', ()=>{
      if(document.visibilityState === 'hidden') queueSave();
    });
    window.addEventListener('pagehide', ()=>{ queueSave(); });

    // Vang ook direct opslag via de bestaande autosave op.
    setInterval(queueSave, 12000);
  }

  async function boot(){
    if(bootPromise) return bootPromise;
    bootPromise = (async function(){
      if(!validConfig()){
        console.info('Island Clash cloud sync uitgeschakeld: vul supabase-config.js in.');
        return {enabled:false};
      }
      const sb = getClient();
      if(!sb){
        console.warn('Island Clash cloud sync: supabase-js is niet geladen.');
        return {enabled:false};
      }

      const alreadyBooted = (()=>{ try{return sessionStorage.getItem(FLAG)==='1';}catch(e){return false;} })();
      try {
        if(!alreadyBooted){
          const remote = await syncFromCloud();
          if(remote.found){
            try{ sessionStorage.setItem(FLAG,'1'); }catch(e){}
            // De app heeft alle state al tijdens script-evaluatie geladen; herladen zorgt
            // dat accounts, klassen en alle andere runtime-variabelen uit clouddata komen.
            toast('☁️ Cloudgegevens geladen. Island Clash wordt vernieuwd...', 'success');
            setTimeout(()=>location.reload(), 180);
            return {enabled:true, reloaded:true};
          }
          // Eerste apparaat / lege database: upload de bestaande lokale gegevens.
          await syncToCloud();
          try{ sessionStorage.setItem(FLAG,'1'); }catch(e){}
          toast('☁️ Island Clash gekoppeld aan de database.', 'success');
        }
        installHooks();
        return {enabled:true};
      } catch(e){
        console.error('Island Clash cloud boot:', e);
        toast('☁️ Databaseverbinding mislukt. De lokale opslag blijft actief.', 'warning');
        try{ sessionStorage.setItem(FLAG,'1'); }catch(err){}
        installHooks();
        return {enabled:true,error:e};
      }
    })();
    return bootPromise;
  }

  window.IslandClashCloud = {
    enabled: validConfig,
    client: getClient,
    collectLocalState,
    applyLocalState,
    syncFromCloud,
    syncToCloud,
    queueSave,
    boot
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else setTimeout(boot, 0);
})();
