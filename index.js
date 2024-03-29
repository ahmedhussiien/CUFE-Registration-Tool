// ---- LIBs
const puppeteer = require("puppeteer");
const dotenv = require("dotenv");
const path = require("path");
var fs = require("fs");
const ocrad = require("async-ocrad");
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
const CHECKBOX = "ChkAccept";
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
    args: ["--start-maximized"],
  });
  const page = (await browser.pages())[0];

  // Go to the login page
  const loginUrl = "https://std.eng.cu.edu.eg/";
  await page.goto(loginUrl);

  // Login
  await fillInput(page, `#${USERNAME_INPUT}`, ID);
  await fillInput(page, `#${PASSSWORD_INPUT}`, PASSWORD);
  await page.$eval(`#${LOGIN_BTN}`, (el) => el.click());
  await page.waitForNavigation(NAVIGATION_WAIT);

  // Go to the registration page
  const regUrl =
    "https://std.eng.cu.edu.eg/SIS/Modules/MetaLoader.aspx?path=~/SIS/Modules/Student/Registration/Registration.ascx";

  await page.goto(regUrl);

  // Check if the registration is open
  let nextBtn = null;
  let checkbox = null;
  let refreshBtn = null;
  let refreshBtnEnabled = true;

  while (!nextBtn) {
    // Check for the next button
    nextBtn = await page.$(`#${REG_START_BTN}`);
    checkbox = await page.$(`#${CHECKBOX}`);

    if (nextBtn) {
      if (checkbox) await checkbox.click();
      await nextBtn.click();
      break;
    }

    // Check for the refresh button: Enabled + Exists
    refreshBtn = await page.$(`#${REFRESH_BTN}`);

    if (refreshBtn)
      refreshBtnEnabled =
        (await (await refreshBtn.getProperty("disabled")).jsonValue()) == false;

    if (refreshBtn && refreshBtnEnabled) {
      await Promise.all([
        refreshBtn.click(),
        page.waitForNavigation(NAVIGATION_WAIT),
      ]);

      console.log("Clicked refresh");
    }

    // Wait for navigation
    await page.waitForNavigation(NAVIGATION_WAIT);
  }

  console.log(`Registration started at ${new Date()}`);

  // Choosing lectures
  let lec;
  for (let i = 0; i < lectures.length; i++) {
    lec = await page.waitForSelector(`#${lectures[i]}`);
    await lec.click();
  }

  // Finalizing registration
  const regNextBtn = await page.waitForSelector(`#${REG_SECOND_PAGE_BTN}`);
  await regNextBtn.click();

  await fillInput(page, `#${EMAIL_INPUT}`, EMAIL);
  await fillInput(page, `#${MOBILE_INPUT}`, MOBILE);
  await fillInput(page, `#${REG_PASSWORD_INPUT}`, PASSWORD);

  const captchaInput = await page.waitForSelector(
    `[name="${CAPTCHA_INPUT_NAME}"]`
  );
  await captchaInput.click();

  // Solving Captcha code
  const captchaCode = await solveCaptchaCode(page);
  console.log("Captcha code:", captchaCode);
  //await fillInput(page, `[name="${CAPTCHA_INPUT_NAME}"]`, captchaCode);

  console.log(
    `Program finished at ${new Date()}. Please double-check on the captcha code and finish your registration`
  );
}

solveCaptchaCode = async (page) => {
  // Get captcha code image
  const captchaImage = await page.$("img");

  if (!captchaImage) {
    return "";
  }

  // Create /imgs directory
  const dir = "./imgs";

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  // Take screenshot of the code
  const captchaImagePath = path.join(
    __dirname,
    `/imgs/${new Date().getTime()}.png`
  );

  await captchaImage.screenshot({
    path: captchaImagePath,
    omitBackground: true,
  });

  // Solve the captcha
  const solvedCaptcha = await ocrad(captchaImagePath);
  return solvedCaptcha.replace(/[\n\r]/g, "").toUpperCase();
};

process.on("unhandledRejection", (...args) => {
  console.error(...args);
});

registerMe().catch((err) => {
  console.log("ERROR!! \n", err);
});
