const browser = await puppeteer.launch({
  headless: HEADLESS, // "new" recomendado en cloud
  userDataDir: USER_DATA_DIR || undefined,
  defaultViewport: null,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--no-default-browser-check",
    "--disable-notifications",
    "--disable-infobars",
  ],
});
