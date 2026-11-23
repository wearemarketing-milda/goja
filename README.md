# GOJA klinika – gojaklinika.lt

Statinė svetainė su turinio valdymo sistema (CMS), veikiančia WordPress principu: puslapiai, dukteriniai puslapiai, įrašų tipai ir redirect'ai.

- **Administravimas:** https://gojaklinika.lt/admin ([Sveltia CMS](https://github.com/sveltia/sveltia-cms))
- **Turinys:** `content/` (JSON failai, juos redaguoja CMS)
- **Šablonai:** `src/` ([Eleventy](https://www.11ty.dev/))
- **Publikavimas:** kiekvienas CMS išsaugojimas yra commit'as į `main`, o Vercel per ~1 min. sugeneruoja ir paskelbia svetainę (`npm run build` → `_site/`)

## CMS skyriai

| Skyrius | Failai | Kas valdoma |
|---|---|---|
| Puslapiai | `content/pages/*.json` | Visi puslapiai: turinio blokai (tekstai, nuotraukos, mygtukai, nuorodos), meta title / description, meniu, tėvinis puslapis |
| Specialistai | `content/specialistai/*.json` | Gydytojai: nuotrauka, pareigos, aprašymas, išsilavinimas. Rodomi „Komanda“ ir „Gydytojo prisistatymas“ blokuose |
| Spec. pasiūlymai | `content/pasiulymai/*.json` | Specialieji pasiūlymai (atvaizdavimas svetainėje bus kuriamas vėliau) |
| Redirect'ai | `vercel.json` | 301/308 peradresavimai |
| Nustatymai | `content/settings/general.json` | Kontaktai, logotipai, poraštė, antraštės mygtukas, numatytoji SEO nuotrauka |

**Puslapių hierarchija:** paslaugų puslapiai turi tėvinį puslapį „Paslaugos“. Iš to automatiškai sudaromi submeniu „Paslaugos“, kelio juosta (breadcrumbs), paslaugų kortelės pradžios ir „Paslaugos“ puslapiuose bei `Service` struktūriniai duomenys. Naujas paslaugos puslapis: sukurkite puslapį, kaip tėvinį pasirinkite „Paslaugos“ ir užpildykite „Kortelė“ laukus.

## Vienkartinis paruošimas (prisijungimas prie CMS)

1. GitHub → Settings → Developer settings → **OAuth Apps → New OAuth App**
   - Homepage URL: `https://gojaklinika.lt`
   - Authorization callback URL: `https://gojaklinika.lt/api/callback`
2. Vercel → goja → Settings → Environment Variables:
   - `GITHUB_CLIENT_ID` (Config)
   - `GITHUB_CLIENT_SECRET` (Secret)
3. Redeploy. Tada atsidarykite https://gojaklinika.lt/admin ir spauskite „Sign in with GitHub“.

Redaguoti gali tik tie GitHub vartotojai, kurie turi rašymo teisę į repozitoriją `wearemarketing-milda/goja` (GitHub → Settings → Collaborators).

## Kiti Vercel kintamieji

- `SMTP_USER`, `SMTP_PASS` – registracijos formos laiškams (`api/registracija.js`), siunčiama į info@gojaklinika.lt

## Lokalus darbas

```bash
npm install
npm start        # http://localhost:8080
npm run build    # sugeneruoja _site/
```

Naujas turinio bloko tipas: šablonas `src/_includes/blocks/<tipas>.njk` + laukai `admin/config.yml` (Puslapiai → Turinio blokai → types).
