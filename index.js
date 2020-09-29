// ---- LIBs
const puppeteer = require("puppeteer");
const dotenv = require("dotenv");
dotenv.config();

// ---- USER CONSTANTS
const ID = process.env.ID;
const PASSWORD = process.env.PASSWORD;
const EMAIL = process.env.EMAIL;
const MOBILE = process.env.MOBILE;

const lectures = require("./lectures.json").lectures;

// ---- WEBSITE CONSTANTS
const USERNAME_INPUT = "txtUsername";
const PASSSWORD_INPUT = "txtPassword";
const LOGIN_BTN = "ext-gen24";
const REG_START_BTN = "ctl07_ButMessageShown";
const REG_SECOND_PAGE_BTN = "ctl07_nextPage";
const REFRESH_BTN = "ctl07_ButCheckOpen";
const EMAIL_INPUT = "ctl07_txtEmail";
const MOBILE_INPUT = "ctl07_txtTel";
const REG_PASSWORD_INPUT = "ctl07_txtPassword";
const CAPTCHA_INPUT_NAME = "ctl07$CaptchaControl1";

const NAVIGATION_WAIT = {
  timeout: 0,
  waitUntil: "domcontentloaded",
};

// ---- HELPER FUNCTIONS
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const fillInput = async (page, id, value) => {
  const input = await page.waitForSelector(id);
  await input.click({ clickCount: 3 });
  await input.type(value);
};

// ---- MAIN PROGRAM

async function registerMe() {
  // Run Chromium
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });
  const page = await browser.newPage();

  // Go to the login page
  const loginUrl = "https://std.eng.cu.edu.eg/";
  await page.goto(loginUrl);

  // Login
  await fillInput(page, `#${USERNAME_INPUT}`, ID);
  await fillInput(page, `#${PASSSWORD_INPUT}`, PASSWORD);
  await page.$eval(`#${LOGIN_BTN}`, (el) => el.click());
  await page.waitForNavigation(NAVIGATION_WAIT);

  // Go to the registration page
  const regLogin =
    "https://std.eng.cu.edu.eg/SIS/Modules/MetaLoader.aspx?path=~/SIS/Modules/Student/Registration/Registration.ascx";

  await page.goto(regLogin);

  // Check if the registration is open
  let refreshBtnEnabled = true;
  let nextBtn = null;
  let refreshBtn = null;

  while (!nextBtn || refreshBtnEnabled) {
    // Check for the next button
    nextBtn = await page.$(`#${REG_START_BTN}`);
    if (nextBtn) {
      await nextBtn.click();
      break;
    }

    // Check for the refresh button: Enabled + Exists
    refreshBtn = await page.$(`#${REFRESH_BTN}`);

    if (refreshBtn)
      refreshBtnEnabled = await (await refreshBtn.getProperty("enabled")) //TODO: change property
        .jsonValue();

    if (refreshBtn && refreshBtnEnabled) await refreshBtn.click();

    // Sleep 10 ms
    await sleep(10);
  }

  // Choosing lectures
  let lec;
  for (let i = 0; i < lectures.length; i++) {
    lec = await page.waitForSelector(`#${lectures[i]}`);
    await lec.click();
  }

  // Finalizing registration
  let regNextBtn = await page.waitForSelector(`#${REG_SECOND_PAGE_BTN}`);
  await regNextBtn.click();

  await fillInput(page, `#${EMAIL_INPUT}`, EMAIL);
  await fillInput(page, `#${MOBILE_INPUT}`, MOBILE);
  await fillInput(page, `#${REG_PASSWORD_INPUT}`, PASSWORD);

  const captchaInput = await page.waitForSelector(
    `[name="${CAPTCHA_INPUT_NAME}"]`
  );
  await captchaInput.click();
}

process.on("unhandledRejection", (...args) => {
  console.error(...args);
});

registerMe().catch((err) => {
  console.log("ERROR!! \n", err);
});
