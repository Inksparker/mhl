/**
 * App Walkthrough Video Pipeline
 * Records actual app interactions (clicks, navigation, typing) + Gathos TTS
 */
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const GATHOS_URL = 'https://gathos.com/api/v1';
const TTS_KEY = 'tts_live_W05edh2izM9E-zmFz8YS8igSX9GhqExp';
const OUTDIR = 'frontend/public/training-videos';
const APP_URL = 'https://storageapp.boosterappsolutions.com';
const W = 1280, H = 720;

function gathosTTS(text, outputPath) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ text, voice: 'koko', speed: 1.0, language: 'en' });
    const req = https.request(`${GATHOS_URL}/tts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TTS_KEY}`, 'Content-Type': 'application/json' }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', async () => {
        try {
          const { job_id } = JSON.parse(d);
          for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 3000));
            const pollRes = await new Promise((rs, rj) => {
              https.get(`${GATHOS_URL}/tts/jobs/${job_id}`, {
                headers: { 'Authorization': `Bearer ${TTS_KEY}` }
              }, r => { let b=''; r.on('data',c=>b+=c); r.on('end',()=>rs(JSON.parse(b))); }).on('error',rj);
            });
            if (pollRes.status === 'completed') {
              const b64 = pollRes.result?.audio_base64 || pollRes.result?.audio;
              fs.writeFileSync(outputPath, Buffer.from(b64, 'base64'));
              resolve();
              return;
            }
          }
          reject(new Error('TTS timeout'));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function login(page) {
  await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].click({ clickCount: 3 });
    await inputs[0].type('admin@mhl.com', { delay: 50 });
    await inputs[1].click({ clickCount: 3 });
    await inputs[1].type('Admin123456789', { delay: 50 });
  }
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Sign In')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 4000));
}

async function recordWalkthrough(name, audioPath, actions) {
  const videoPath = path.join(OUTDIR, `${name}_raw.webm`);
  const finalPath = path.join(OUTDIR, `${name}.mp4`);
  
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(APP_URL, []);
  await page.setViewport({ width: W, height: H });

  // Login
  await login(page);

  // Start screen recording
  const stream = await page.screencast({ format: 'webm', quality: 80, everyNthFrame: 1 });
  
  const chunks = [];
  stream.on('data', chunk => chunks.push(chunk));
  
  let writer = null;
  try {
    writer = fs.createWriteStream(videoPath);
    stream.pipe(writer);
  } catch(e) {
    console.log('  Recording setup...');
  }

  // Perform actions
  for (const action of actions) {
    if (action.type === 'navigate') {
      await page.goto(`${APP_URL}${action.to}`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 1500));
    } else if (action.type === 'hover') {
      await page.hover(action.selector);
      await new Promise(r => setTimeout(r, 800));
    } else if (action.type === 'click') {
      await page.click(action.selector);
      await new Promise(r => setTimeout(r, 1000));
    } else if (action.type === 'scroll') {
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), action.y || 200);
      await new Promise(r => setTimeout(r, 1500));
    } else if (action.type === 'wait') {
      await new Promise(r => setTimeout(r, action.ms || 2000));
    } else if (action.type === 'highlight') {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) { el.style.outline = '3px solid #4c6ef5'; el.style.outlineOffset = '2px'; }
      }, action.selector);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  await new Promise(r => setTimeout(r, 1000));
  await stream.destroy();
  if (writer) writer.end();
  await new Promise(r => setTimeout(r, 1000));
  await browser.close();

  // Combine video + audio with FFmpeg
  if (fs.existsSync(videoPath) && fs.existsSync(audioPath)) {
    const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`, {encoding:'utf8'})) || 15;
    try {
      execSync(`ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v libx264 -c:a aac -t ${dur} -pix_fmt yuv420p -vf "scale=${W}:${H},format=yuv420p" -shortest -movflags +faststart "${finalPath}"`, {stdio:'pipe'});
    } catch(e) {
      // If webm fails, fallback to just audio over black
      execSync(`ffmpeg -y -f lavfi -i "color=c=#1a1a2e:s=${W}x${H}:d=${dur}" -i "${audioPath}" -c:v libx264 -c:a aac -pix_fmt yuv420p -shortest -movflags +faststart "${finalPath}"`, {stdio:'pipe'});
    }
  }

  // Cleanup
  try { fs.unlinkSync(videoPath); } catch {}
  
  if (fs.existsSync(finalPath)) {
    const kb = (fs.statSync(finalPath).size / 1024).toFixed(0);
    return kb;
  }
  return '0';
}

const walkthroughs = [
  {
    name: '01-welcome',
    narration: 'Welcome to OrgVault. This is your company dashboard. Here you can see total files, storage used, folders, and recent activity. Notice the company selector at the top right. Let us explore the features.',
    actions: [
      { type: 'navigate', to: '/dashboard' },
      { type: 'wait', ms: 2000 },
      { type: 'scroll', y: 100 },
      { type: 'wait', ms: 2000 },
    ],
  },
  {
    name: '02-files',
    narration: 'The Files page is where you manage all your documents. You can upload files by dragging and dropping them onto the upload zone. Organize with folders and tags. Use the search bar to find files quickly.',
    actions: [
      { type: 'navigate', to: '/dashboard/files' },
      { type: 'wait', ms: 2000 },
      { type: 'scroll', y: 150 },
      { type: 'wait', ms: 1500 },
      { type: 'hover', selector: 'button' },
      { type: 'wait', ms: 1000 },
    ],
  },
  {
    name: '03-records',
    narration: 'Data Records lets you store structured information. Create tables for contacts, invoices, or any data you need. Add records in JSON format. Each record is flexible and can have different fields. Edit or delete records by hovering over them.',
    actions: [
      { type: 'navigate', to: '/dashboard/records' },
      { type: 'wait', ms: 2500 },
      { type: 'scroll', y: 100 },
      { type: 'wait', ms: 2000 },
    ],
  },
];

async function generate() {
  console.log('🎬 App Walkthrough Video Pipeline\n');
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

  for (const w of walkthroughs) {
    console.log(`\n📹 ${w.name}`);
    
    // Generate TTS narration first
    const audioPath = path.join(OUTDIR, `${w.name}.wav`);
    console.log('  🎤 Generating narration...');
    try {
      await gathosTTS(w.narration, audioPath);
      console.log('  ✅ Narration ready');
    } catch(e) {
      console.log(`  ⚠️ TTS failed: ${e.message}`);
    }

    // Record walkthrough
    console.log('  📹 Recording walkthrough...');
    try {
      const kb = await recordWalkthrough(w.name, audioPath, w.actions);
      console.log(`  🎬 ${w.name}.mp4 (${kb} KB)`);
    } catch(e) {
      console.log(`  ⚠️ Recording failed: ${e.message}`);
    }

    try { fs.unlinkSync(audioPath); } catch {}
  }
  
  console.log('\n🎉 Walkthrough videos complete!');
}

generate().catch(e => { console.error(e); process.exit(1); });
