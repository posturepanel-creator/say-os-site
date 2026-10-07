/* Reproducible runtime acceptance for the consent-gated analytics + lead tracking.
 *
 * Runs the LOCAL repo as it would deploy WITHOUT the Netlify-injected tag (the intended
 * final state) and drives the real consent UI in headless Chromium, one isolated context
 * per scenario. Fully hermetic:
 *   - gtag.js is stubbed (records config/events to a local collector; no real GA contact);
 *   - GA / PostHog / OpenAI destinations are aborted + recorded;
 *   - the n8n lead webhook is MOCKED per scenario, so NO real leads or emails are created.
 *
 * Setup:  cd tests && npm install && npx playwright install chromium
 * Run:    node analytics-acceptance.js      (exit 0 = all pass)
 */
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const PORT = 8791;
const BASE = `http://127.0.0.1:${PORT}`;
const TEST_EMAIL = "qa.tester@example.test";

const MIME = { ".html":"text/html",".css":"text/css",".js":"application/javascript",".json":"application/json",
  ".xml":"application/xml",".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".svg":"image/svg+xml",
  ".ico":"image/x-icon",".webp":"image/webp",".woff2":"font/woff2",".txt":"text/plain" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(REPO, p);
  if (!file.startsWith(REPO) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("nf"); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

const GTAG_SHIM = `window.dataLayer=window.dataLayer||[];(function(){function send(e){try{if(e[0]==='config'){navigator.sendBeacon('/__ga?type=config&tid='+encodeURIComponent(e[1]));}else if(e[0]==='event'){navigator.sendBeacon('/__ga?type=event&en='+encodeURIComponent(e[1])+'&p='+encodeURIComponent(JSON.stringify(e[2]||{})));}}catch(_){}}try{(window.dataLayer||[]).forEach(function(x){send(x);});}catch(_){}var op=window.dataLayer.push;window.dataLayer.push=function(){for(var i=0;i<arguments.length;i++){send(arguments[i]);}return op.apply(this,arguments);};})();`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function waitUntil(fn, ms=4000){ const t=Date.now(); while(Date.now()-t<ms){ if(await fn()) return true; await sleep(60);} return false; }

async function instrument(context, leadRef){
  const rec = { gaLoader:[], ga:[], collectBlocked:[], posthog:[], openai:[], leads:[], leaked:[] };
  await context.route("**/*", async (route) => {
    const req = route.request(); const url = req.url();
    try {
      if (/\/__ga(\?|$)/.test(url)) { rec.ga.push(url); return route.fulfill({ status:204, body:"" }); }
      if (/\/webhook\/new-lead/.test(url)) { let body=null; try{ body=req.postData(); }catch(_){}; rec.leads.push({ url, body }); if (leadRef.status===0) return route.abort(); return route.fulfill({ status: leadRef.status, contentType:"application/json", body: leadRef.body }); }
      if (/googletagmanager\.com\/gtag\/js/.test(url)) { rec.gaLoader.push(url); return route.fulfill({ status:200, contentType:"application/javascript", body: GTAG_SHIM }); }
      if (/google-analytics\.com|analytics\.google\.com/.test(url)) { rec.collectBlocked.push(url); return route.abort(); }
      if (/posthog\.com/.test(url)) { rec.posthog.push(url); return route.abort(); }
      if (/\/assets\/say-posthog\.js/.test(url)) { rec.posthog.push(url); return route.fulfill({ status:200, contentType:"application/javascript", body:"/* posthog stub */" }); }
      if (/openai|oaistatic|logpixel/.test(url)) { rec.openai.push(url); return route.abort(); }
      const h = new URL(url).hostname;
      const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"]; // webfonts, not analytics/PII
      if (FONT_HOSTS.includes(h)) return route.continue();
      if (h !== "127.0.0.1" && h !== "localhost") { rec.leaked.push(url); return route.abort(); }
      return route.continue();
    } catch (e) { try { return route.continue(); } catch(_) { return; } }
  });
  return rec;
}

async function completeQuiz(page){
  for (let i=0;i<14;i++){
    const opt = page.locator('#options .option').first();
    if (await opt.count() && await opt.isVisible().catch(()=>false)) {
      await opt.click().catch(()=>{});
      const next = page.locator('#btn-next');
      if (await next.count() && await next.isEnabled().catch(()=>false)) await next.click().catch(()=>{});
    }
    if (await page.locator('#email-input').isVisible().catch(()=>false)) break;
    await sleep(80);
  }
}

async function openConsentUI(page){ await page.waitForFunction(()=>!!document.querySelector('#say-banner-accept')||!!document.querySelector('#say-cookie-settings-btn'), null, {timeout:5000}).catch(()=>{}); }
async function accept(page){
  await openConsentUI(page);
  if (await page.locator('#say-banner-accept').count()) { await page.click('#say-banner-accept'); return 'banner'; }
  if (await page.locator('#say-cookie-settings-btn').count()) { await page.click('#say-cookie-settings-btn'); await page.waitForSelector('#say-settings-accept',{timeout:3000}); await page.click('#say-settings-accept'); return 'settings'; }
  await page.evaluate(()=>{try{localStorage.setItem('say_consent_analytics','granted')}catch(e){}}); await page.reload({waitUntil:'load'}); return 'ls';
}
async function reject(page){
  await openConsentUI(page);
  if (await page.locator('#say-banner-reject').count()) { await page.click('#say-banner-reject'); return 'banner'; }
  if (await page.locator('#say-cookie-settings-btn').count()) { await page.click('#say-cookie-settings-btn'); await page.waitForSelector('#say-settings-reject',{timeout:3000}); await page.click('#say-settings-reject'); return 'settings'; }
  await page.evaluate(()=>{try{localStorage.setItem('say_consent_analytics','denied')}catch(e){}}); return 'ls';
}

const results = [];
function check(name, cond, detail){ results.push({ name, pass: !!cond, detail: detail||"" }); }

let browser;
async function scen(name, leadBody, leadStatus, fn){
  const leadRef = { status: leadStatus, body: leadBody };
  const context = await browser.newContext();
  try { const rec = await instrument(context, leadRef); const page = await context.newPage(); await fn({ page, rec, leadRef }); }
  catch (e) { check(`${name} [threw]`, false, (e.message||String(e)).split("\n")[0]); }
  finally { await context.close().catch(()=>{}); }
}

async function run(){
  await new Promise(r => server.listen(PORT, "127.0.0.1", r));
  browser = await chromium.launch({ headless:true });
  const P = {
    readiness: `${BASE}/readiness-check/index.html`,
    advanced:  `${BASE}/advanced-skin-readiness-check/index.html`,
    compare:   `${BASE}/compare.html`,
    pricing:   `${BASE}/pricing.html`,
    talent:    `${BASE}/talent.html`,
  };
  const subReadiness = async (page) => { await page.fill('#email-input', TEST_EMAIL); await page.click('#btn-email'); };
  const subAdvanced  = async (page) => { await page.fill('#email-input', TEST_EMAIL); await page.check('#consent-input').catch(()=>{}); await page.click('#btn-followup'); };
  const fillTalent = async (page) => {
    await page.fill('input[name="name"]', "QA Tester");
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.selectOption('select[name="job_title"]', { index: 1 });
    await page.selectOption('select[name="company_size"]', { index: 0 });
    await page.click('#talentForm .form-submit');
  };
  const talentFailAsserts = async (page, label) => {
    const successVisible = await page.locator('#talentSuccess.visible').count();
    const formVisible = await page.locator('#talentForm').isVisible().catch(()=>false);
    const btnEnabled = await page.locator('#talentForm .form-submit').isEnabled().catch(()=>false);
    const emailKept = await page.inputValue('input[name="email"]').catch(()=>"");
    const nameKept = await page.inputValue('input[name="name"]').catch(()=>"");
    const errShown = await page.locator('#talentFormMsg').isVisible().catch(()=>false);
    check(`talent/${label}: success NOT shown (no unacked success)`, successVisible===0, `vis=${successVisible}`);
    check(`talent/${label}: inputs preserved + retry allowed`, formVisible && btnEnabled && emailKept===TEST_EMAIL && nameKept==="QA Tester", `form=${formVisible} btn=${btnEnabled} email=${emailKept===TEST_EMAIL} name=${nameKept==="QA Tester"}`);
    check(`talent/${label}: error message shown`, errShown, `err=${errShown}`);
  };

  // 1. readiness — REJECT
  await scen("readiness/reject", JSON.stringify({status:"success"}), 200, async ({page,rec}) => {
    await page.goto(P.readiness); await reject(page); await completeQuiz(page); await subReadiness(page);
    await waitUntil(()=>rec.leads.length>0); await sleep(400);
    check("readiness/reject: gtag.js NOT loaded", rec.gaLoader.length===0, `loader=${rec.gaLoader.length}`);
    check("readiness/reject: zero GA sends", rec.ga.length===0, `ga=${rec.ga.length}`);
    check("readiness/reject: no real external leak", rec.leaked.length===0, rec.leaked.join(","));
  });

  // 2. readiness — ACCEPT, confirmed save
  await scen("readiness/accept", JSON.stringify({status:"success"}), 200, async ({page,rec}) => {
    await page.goto(P.readiness); const how = await accept(page); await waitUntil(()=>rec.gaLoader.length>0);
    await completeQuiz(page); await waitUntil(()=>rec.ga.some(u=>u.includes("readiness_check_completed")));
    await subReadiness(page); await waitUntil(()=>rec.ga.some(u=>u.includes("email_captured"))); await sleep(300);
    const started=rec.ga.filter(u=>u.includes("readiness_check_started")).length;
    const completed=rec.ga.filter(u=>u.includes("readiness_check_completed")).length;
    const captured=rec.ga.filter(u=>u.includes("email_captured")).length;
    check("readiness/accept: consent via banner", how==='banner', `mechanism=${how}`);
    check("readiness/accept: gtag.js WEBSITE id", rec.gaLoader.some(u=>u.includes("G-SWCB3H6QEF")), rec.gaLoader[0]||"none");
    check("readiness/accept: config -> G-SWCB3H6QEF", rec.ga.some(u=>u.includes("type=config")&&u.includes("G-SWCB3H6QEF")), "");
    check("readiness/accept: NO app id anywhere", !rec.ga.concat(rec.gaLoader).some(u=>u.includes("G-QXYSM1LHV8")), "");
    check("readiness/accept: started once", started===1, `n=${started}`);
    check("readiness/accept: completed once", completed===1, `n=${completed}`);
    check("readiness/accept: email_captured once", captured===1, `n=${captured}`);
    check("readiness/accept: NO email/PII to GA", !rec.ga.some(u=>u.includes("qa.tester")), "");
    check("readiness/accept: email only in mocked lead body", rec.leads.some(l=>(l.body||"").includes(TEST_EMAIL)), "");
  });

  // 3. readiness — FAIL (500)
  await scen("readiness/fail500", "err", 500, async ({page,rec}) => {
    await page.goto(P.readiness); await accept(page); await waitUntil(()=>rec.gaLoader.length>0);
    await completeQuiz(page); await subReadiness(page); await waitUntil(()=>rec.leads.length>0); await sleep(500);
    check("readiness/fail(500): email_captured NOT fired", rec.ga.filter(u=>u.includes("email_captured")).length===0, "");
    check("readiness/fail(500): error shown + button re-enabled", (await page.locator('#form-msg.err').count())>0 && await page.locator('#btn-email').isEnabled().catch(()=>false), "");
  });

  // 4/5. readiness — AMBIGUOUS
  for (const [label, body] of [["200 {}","{}"],["200 empty",""]]) {
    await scen(`readiness/amb ${label}`, body, 200, async ({page,rec}) => {
      await page.goto(P.readiness); await accept(page); await waitUntil(()=>rec.gaLoader.length>0);
      await completeQuiz(page); await subReadiness(page); await waitUntil(()=>rec.leads.length>0); await sleep(500);
      check(`readiness/ambiguous(${label}): email_captured NOT fired`, rec.ga.filter(u=>u.includes("email_captured")).length===0, "");
    });
  }

  // 6. readiness — DEDUP
  await scen("readiness/dedup", JSON.stringify({saved:true}), 200, async ({page,rec}) => {
    await page.goto(P.readiness); await accept(page); await waitUntil(()=>rec.gaLoader.length>0);
    await completeQuiz(page); await subReadiness(page); await waitUntil(()=>rec.ga.some(u=>u.includes("email_captured")));
    await page.evaluate(()=>{ try{ window.submitEmail && window.submitEmail(); }catch(e){} }); await sleep(500);
    check("readiness/dedup: email_captured once despite 2nd submit", rec.ga.filter(u=>u.includes("email_captured")).length===1, `n=${rec.ga.filter(u=>u.includes("email_captured")).length}`);
  });

  // 7. advanced — confirmed + dedup
  await scen("advanced/confirmed", JSON.stringify({saved:true}), 200, async ({page,rec}) => {
    await page.goto(P.advanced); await accept(page); await waitUntil(()=>rec.gaLoader.length>0);
    await completeQuiz(page);
    const have=await page.locator('#email-input').isVisible().catch(()=>false);
    if (have) await subAdvanced(page);
    await waitUntil(()=>rec.ga.some(u=>u.includes("email_captured")));
    await page.locator('#btn-followup').click().catch(()=>{}); await sleep(500);
    check("advanced/confirmed: reached email form", have, `visible=${have}`);
    check("advanced/confirmed: email_captured once", rec.ga.filter(u=>u.includes("email_captured")).length===1, `n=${rec.ga.filter(u=>u.includes("email_captured")).length}`);
    check("advanced/confirmed: WEBSITE id & no app id", rec.gaLoader.some(u=>u.includes("G-SWCB3H6QEF")) && !rec.ga.concat(rec.gaLoader).some(u=>u.includes("G-QXYSM1LHV8")), "");
    check("advanced/confirmed: NO email/PII to GA", !rec.ga.some(u=>u.includes("qa.tester")), "");
  });

  // 8/9. advanced — FAIL / AMBIGUOUS
  await scen("advanced/fail500", "err", 500, async ({page,rec}) => {
    await page.goto(P.advanced); await accept(page); await waitUntil(()=>rec.gaLoader.length>0); await completeQuiz(page);
    if (await page.locator('#email-input').isVisible().catch(()=>false)) await subAdvanced(page);
    await waitUntil(()=>rec.leads.length>0); await sleep(500);
    check("advanced/fail(500): email_captured NOT fired", rec.ga.filter(u=>u.includes("email_captured")).length===0, "");
  });
  await scen("advanced/amb-obj", "{}", 200, async ({page,rec}) => {
    await page.goto(P.advanced); await accept(page); await waitUntil(()=>rec.gaLoader.length>0); await completeQuiz(page);
    if (await page.locator('#email-input').isVisible().catch(()=>false)) await subAdvanced(page);
    await waitUntil(()=>rec.leads.length>0); await sleep(500);
    check("advanced/ambiguous(200 {}): email_captured NOT fired", rec.ga.filter(u=>u.includes("email_captured")).length===0, "");
  });

  // 10/11. compare (Group B) — ACCEPT loads GA + PostHog (no dup); REJECT neither
  await scen("compare/accept", JSON.stringify({status:"success"}), 200, async ({page,rec}) => {
    await page.goto(P.compare); await accept(page); await waitUntil(()=>rec.gaLoader.length>0 && rec.posthog.length>0);
    await page.evaluate(()=>{ try{ window.sayLoadAnalytics && window.sayLoadAnalytics(); }catch(e){} }); await sleep(400);
    const ph=rec.posthog.filter(u=>u.includes("say-posthog.js")).length;
    check("compare/accept: GA website id loaded", rec.gaLoader.some(u=>u.includes("G-SWCB3H6QEF")), "");
    check("compare/accept: PostHog loaded once (no dup)", ph===1, `n=${ph}`);
    check("compare/accept: gtag.js loaded once (no dup)", rec.gaLoader.length===1, `n=${rec.gaLoader.length}`);
    check("compare/accept: no app id", !rec.gaLoader.concat(rec.ga).some(u=>u.includes("G-QXYSM1LHV8")), "");
  });
  await scen("compare/reject", JSON.stringify({status:"success"}), 200, async ({page,rec}) => {
    await page.goto(P.compare); await reject(page); await sleep(700);
    check("compare/reject: no GA", rec.gaLoader.length===0, `n=${rec.gaLoader.length}`);
    check("compare/reject: no PostHog", rec.posthog.length===0, `n=${rec.posthog.length}`);
  });

  // 12. pricing (Group C) — now has first-run banner
  await scen("pricing/accept", JSON.stringify({status:"success"}), 200, async ({page,rec}) => {
    await page.goto(P.pricing);
    const hasBanner = await page.locator('#say-banner-accept').count();
    const how = await accept(page); await waitUntil(()=>rec.gaLoader.length>0); await sleep(300);
    check("pricing: first-run banner present", hasBanner>0, `bannerBtns=${hasBanner}`);
    check("pricing/accept: consent via banner", how==='banner', `mechanism=${how}`);
    check("pricing/accept: GA website id loaded", rec.gaLoader.some(u=>u.includes("G-SWCB3H6QEF")), "");
    check("pricing/accept: no app id", !rec.gaLoader.concat(rec.ga).some(u=>u.includes("G-QXYSM1LHV8")), "");
    check("pricing/accept: oaiq pixel NOT fired on localhost (host gate)", rec.openai.length===0, `n=${rec.openai.length}`);
  });
  await scen("pricing/reject", JSON.stringify({status:"success"}), 200, async ({page,rec}) => {
    await page.goto(P.pricing); await reject(page); await sleep(600);
    check("pricing/reject: no GA", rec.gaLoader.length===0, `n=${rec.gaLoader.length}`);
  });

  // 13. talent (Group C) — now has first-run banner
  await scen("talent/accept", JSON.stringify({status:"success"}), 200, async ({page,rec}) => {
    await page.goto(P.talent);
    const hasBanner = await page.locator('#say-banner-accept').count();
    const how = await accept(page); await waitUntil(()=>rec.gaLoader.length>0); await sleep(300);
    check("talent: first-run banner present", hasBanner>0, `bannerBtns=${hasBanner}`);
    check("talent/accept: consent via banner", how==='banner', `mechanism=${how}`);
    check("talent/accept: GA website id loaded", rec.gaLoader.some(u=>u.includes("G-SWCB3H6QEF")), "");
    check("talent/accept: no app id", !rec.gaLoader.concat(rec.ga).some(u=>u.includes("G-QXYSM1LHV8")), "");
  });

  // 14. talent lead form — success ONLY after explicit storage acknowledgement.
  //     confirmed ({status:"success"} / {saved:true}) -> success shown;
  //     HTTP 500 / network failure / empty 2xx / ambiguous 2xx -> NO success, inputs preserved, retry allowed.
  await scen("talent/confirmed status:success", JSON.stringify({status:"success"}), 200, async ({page,rec}) => {
    await page.goto(P.talent); await fillTalent(page);
    const ok = await waitUntil(async ()=> await page.locator('#talentSuccess.visible').count()>0, 5000);
    check("talent/confirmed(status:success): lead POSTed (mocked)", rec.leads.length>=1, `leads=${rec.leads.length}`);
    check("talent/confirmed(status:success): success shown after ack", ok, `visible=${ok}`);
  });
  await scen("talent/confirmed saved:true", JSON.stringify({saved:true}), 200, async ({page,rec}) => {
    await page.goto(P.talent); await fillTalent(page);
    const ok = await waitUntil(async ()=> await page.locator('#talentSuccess.visible').count()>0, 5000);
    check("talent/confirmed(saved:true): success shown after ack", ok, `visible=${ok}`);
  });
  await scen("talent/http500", "err", 500, async ({page,rec}) => {
    await page.goto(P.talent); await fillTalent(page); await waitUntil(()=>rec.leads.length>0,4000); await sleep(600);
    await talentFailAsserts(page, "http500");
  });
  await scen("talent/network-failure", "", 0, async ({page,rec}) => {
    await page.goto(P.talent); await fillTalent(page); await waitUntil(()=>rec.leads.length>0,4000); await sleep(600);
    await talentFailAsserts(page, "network-failure");
  });
  await scen("talent/empty-2xx", "", 200, async ({page,rec}) => {
    await page.goto(P.talent); await fillTalent(page); await waitUntil(()=>rec.leads.length>0,4000); await sleep(600);
    await talentFailAsserts(page, "empty-2xx");
  });
  await scen("talent/ambiguous-2xx", "{}", 200, async ({page,rec}) => {
    await page.goto(P.talent); await fillTalent(page); await waitUntil(()=>rec.leads.length>0,4000); await sleep(600);
    await talentFailAsserts(page, "ambiguous-2xx");
  });

  await browser.close();
  await new Promise(r => server.close(r));

  const passed = results.filter(r=>r.pass).length;
  console.log("\n================ RUNTIME ACCEPTANCE RESULTS ================");
  for (const r of results) console.log(`${r.pass?"PASS":"FAIL"}  ${r.name}${r.detail?"  ("+r.detail+")":""}`);
  console.log("-----------------------------------------------------------");
  console.log(`${passed}/${results.length} checks passed`);
  if (passed!==results.length) console.log("FAILED:", JSON.stringify(results.filter(r=>!r.pass).map(r=>r.name)));
  process.exit(passed===results.length ? 0 : 1);
}
run().catch(e => { console.error("HARNESS ERROR:", e); process.exit(2); });
