import puppeteer from "puppeteer";
import "dotenv/config";

/* ========== Config (CLI > .env > default) ========== */
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.join("=")];
  })
);

const URL =
  args.url ||
  process.env.URL ||
  "https://www.tuenlinea.com/tuawards/revelacion-musical";
const HEADLESS =
  (args.headless ?? process.env.HEADLESS ?? "false") === "true"
    ? true
    : (args.headless ?? process.env.HEADLESS ?? "false") === "new"
    ? "new"
    : false;
const USER_DATA_DIR = args.userDataDir || process.env.USER_DATA_DIR || null;

/** Número de clics objetivo */
const TARGET_CLICKS = Number(args.clicks || process.env.CLICKS || 10);

/** Intervalo aleatorio [segundos] */
const MIN_SEC = Number(args.minSec || process.env.MIN_SEC || 3);
const MAX_SEC = Number(args.maxSec || process.env.MAX_SEC || 25);

/** Tiempo máximo para encontrar el botón en cada ciclo (ms) */
const FIND_TIMEOUT_MS = Number(
  args.findTimeoutMs || process.env.FIND_TIMEOUT_MS || 8000
);

/** Selectores candidatos del bloque “Santi Casas” */
const CANDIDATE_SELECTORS = [
  '[data-side-share*="Santi Casas"]',
  'div.w-option:has-text("Santi Casas")',
  'div:has-text("Santi Casas")',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/* ========== Utilidades ========== */
async function tryDismissConsents(page) {
  const texts = [
    "Aceptar",
    "Acepto",
    "Accept",
    "I agree",
    "Entendido",
    "Continuar",
  ];
  for (const t of texts) {
    page.click(`button:has-text("${t}")`, { timeout: 0 }).catch(() => {});
  }
}

/** Busca en página + todos los iframes y hace click en cuanto encuentra el target */
async function fastFindAndClick(page, selectors, totalTimeoutMs) {
  const deadline = Date.now() + totalTimeoutMs;

  while (Date.now() < deadline) {
    tryDismissConsents(page);

    const frames = [page, ...page.frames()];
    for (const frame of frames) {
      // 1) CSS directos
      for (const sel of selectors) {
        try {
          const h = await frame.$(sel);
          if (h) {
            await h.click();
            return true;
          }
        } catch {}
      }
      // 2) Fallback: texto por XPath (Locator)
      try {
        const loc = frame.locator('xpath//div[contains(., "Santi Casas")]');
        const box = await loc.boundingBox().catch(() => null);
        if (box) {
          await loc.click();
          return true;
        }
      } catch {}
    }
    await sleep(25);
  }
  throw new Error(
    'No se encontró el botón "Santi Casas" dentro del tiempo límite'
  );
}

/* ========== Main ========== */
(async () => {
  console.log("=== Auto Clicker (Puppeteer) ===");
  console.log({
    URL,
    HEADLESS,
    USER_DATA_DIR,
    TARGET_CLICKS,
    MIN_SEC,
    MAX_SEC,
    FIND_TIMEOUT_MS,
  });

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    userDataDir: USER_DATA_DIR || undefined,
    defaultViewport: null,
    args: [
      "--no-default-browser-check",
      "--disable-notifications",
      "--disable-infobars",
    ],
  });

  const pages = await browser.pages();
  const page = pages.length ? pages[0] : await browser.newPage();

  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(30000);

  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
  );

  let done = 0;
  while (done < TARGET_CLICKS) {
    try {
      console.log(`Recargando página… (click ${done + 1}/${TARGET_CLICKS})`);
      await page.goto(URL, { waitUntil: "domcontentloaded" });
      await page.bringToFront();

      // Pequeña espera para montar iframes
      await sleep(800);

      await fastFindAndClick(page, CANDIDATE_SELECTORS, FIND_TIMEOUT_MS);
      done++;
      console.log(`✔ Click #${done} @ ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      console.error(`❌ Intento fallido (click ${done + 1}): ${err.message}`);
      // No incrementa done; vuelve a intentar después de un intervalo corto
    }

    if (done < TARGET_CLICKS) {
      const waitSec = randInt(MIN_SEC, MAX_SEC);
      console.log(`Esperando ${waitSec}s antes del siguiente intento…`);
      await sleep(waitSec * 1000);
    }
  }

  console.log(`✅ Completado: ${done}/${TARGET_CLICKS} clics realizados.`);
  await browser.close();
  process.exit(0);
})();
