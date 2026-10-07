# Island Clash + Supabase

Deze versie koppelt de bestaande Island Clash-opslag aan één centrale Supabase PostgreSQL-database.
Daardoor kunnen meerdere apparaten dezelfde accounts, klassen/groepen, eilanden, quizzen, voortgang, cijfers, opdrachten, shopgegevens en instellingen gebruiken.

## Bestanden

- `index.html` — Island Clash met cloud-sync
- `supabase-config.js` — hier vul je jouw Supabase URL en publishable key in
- `supabase-database.js` — centrale database-sync van alle `ic_*` gegevens
- `supabase-login.js` — losse Supabase Auth-login-helper
- `schema.sql` — database-tabel + policies

## 1. Supabase-project maken

Maak een gratis Supabase-project. Ga daarna naar `SQL Editor` en voer `schema.sql` volledig uit.

## 2. Configuratie invullen

Open `supabase-config.js` en verander:

```js
url: 'https://YOUR-PROJECT.supabase.co',
publishableKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
```

Gebruik alleen de publishable/anon client key in de browser. Gebruik NOOIT de `service_role` key in `index.html`, `supabase-database.js` of `supabase-login.js`.

## 3. Alle bestanden bij elkaar houden

Zet de vijf bestanden in dezelfde map:

```text
index.html
supabase-config.js
supabase-database.js
supabase-login.js
schema.sql
```

Open/deploy `index.html` via een webserver of hosting.

## 4. Hoe de cloud-sync werkt

Bij de eerste start:

- Als de Supabase-tabel leeg is, worden de bestaande lokale `ic_*` gegevens geüpload.
- Als de database al gegevens bevat, worden die eerst naar de browser gehaald en wordt de pagina opnieuw geladen.
- Daarna worden wijzigingen periodiek en na de bestaande opslagfuncties naar Supabase gesynchroniseerd.

Omdat de app al veel gegevens onder `ic_*` opslaat, worden ook nieuwere instellingen automatisch meegenomen zonder dat voor iedere nieuwe functie een aparte Supabase-kolom nodig is.

## 5. Losse login-helper

`s﻿upabase-login.js` is bewust apart gehouden. Hij exposeert:

```js
await IslandClashSupabaseLogin.login('docent', 'docent1');
```

De helper zet `docent` standaard om naar `docent@islandclash.local`.
Je moet die gebruiker eerst in Supabase Authentication aanmaken en de instellingen van e-mailbevestiging afstemmen op je project.

Je kunt hem in een andere HTML linken met:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-config.js"></script>
<script src="supabase-login.js"></script>
```

## Belangrijke beveiligingswaarschuwing

Deze eenvoudige cloud-sync gebruikt een publieke client-key en publieke tabelpolicies, zodat de oude Island Clash-HTML zonder grote herbouw tussen apparaten kan synchroniseren. Dat betekent dat dit geschikt is voor een privé schoolproject/prototype, maar niet voor gevoelige productiegegevens.

Sla geen echte persoonlijke of gevoelige informatie op en gebruik nooit een Supabase `service_role`/secret key in de browser.
