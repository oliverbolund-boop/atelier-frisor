# Atelier — demo af frisørside

En klikbar demo af en minimalistisk, helt sort frisørside med online booking. Lavet som designforslag til portfolio. Siden er sat til `noindex`, så den ikke dukker op på Google.

## Indhold

- Forside med røg-animation, "næste ledige tid" og bookknap
- Sådan arbejder vi, priser, holdet, galleri, anmeldelser, gavekort og kontakt med kort
- Booking i fire trin: behandling og tilvalg → frisør → dag og tid → oplysninger → bekræftelse med kalenderfil
- Fridage per frisør, venteliste, "husk mig"
- Dansk og engelsk
- Privatlivspolitik, cookies og handelsbetingelser (udkast med pladsholdere)

Bookingen er en demo: ledige tider er opdigtede, og intet sendes nogen steder hen.

## Kør lokalt

```bash
npm install
npm run dev
```

## Udgiv gratis

**Netlify:** Add new site → Import an existing project → vælg dette repo. Build command `npm run build`, publish directory `dist` (står også i `netlify.toml`). Tilføj derefter et underdomæne, fx `atelier.ditdomæne.dk`, under Domain management.

**Vercel:** Add New → Project → importér repoet. Vercel genkender Vite selv.

## Rediger

- Tekster, priser, frisører og juridiske sider: `src/content.js`
- Layout og logik: `src/App.jsx`
- Farver, skrift og breakpoints: `src/styles.css`
- Billeder: `public/img/` (fotos fra Unsplash, gratis licens)

Pladsholdere som `[Adresse]`, `[Telefon]` og `[CVR-nummer]` skal udfyldes, hvis siden bruges til en rigtig salon. De juridiske tekster er udkast og ikke juridisk rådgivning.
