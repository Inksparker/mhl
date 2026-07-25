/**
 * App Walkthrough Video Pipeline v2
 * Frame-by-frame capture + Gathos TTS = smooth walkthrough videos
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
const W = 1280, H = 720, FPS = 8;

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
    if (text.includes('Sign In')) { await btn.click(); break; }
  }
  await new Promise(r => setTimeout(r, 4000));
}

async function recordSession(page, name, actions) {
  const framesDir = path.join(OUTDIR, `${name}_frames`);
  fs.mkdirSync(framesDir, { recursive: true });
  
  let frameNum = 0;
  const interval = 1000 / FPS;
  let recording = true;
  
  // Start frame capture loop
  const captureLoop = (async () => {
    while (recording) {
      const framePath = path.join(framesDir, `frame_${String(frameNum).padStart(5, '0')}.png`);
      try {
        await page.screenshot({ path: framePath, type: 'png' });
        frameNum++;
      } catch(e) {
        // Page might be navigating
      }
      await new Promise(r => setTimeout(r, interval));
    }
  })();

  // Perform actions while recording
  for (const action of actions) {
    try {
      if (action.type === 'navigate') {
        await page.goto(`${APP_URL}${action.to}`, { waitUntil: 'networkidle0', timeout: 10000 });
        await new Promise(r => setTimeout(r, 1500));
      } else if (action.type === 'hover') {
        const el = await page.$(action.selector);
        if (el) await el.hover();
        await new Promise(r => setTimeout(r, 1000));
      } else if (action.type === 'click') {
        const el = await page.$(action.selector);
        if (el) await el.click();
        await new Promise(r => setTimeout(r, 1000));
      } else if (action.type === 'scroll') {
        await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), action.y || 200);
        await new Promise(r => setTimeout(r, 1500));
      } else if (action.type === 'wait') {
        await new Promise(r => setTimeout(r, action.ms || 2000));
      } else if (action.type === 'moveMouse') {
        await page.mouse.move(action.x || 600, action.y || 300, { steps: 10 });
        await new Promise(r => setTimeout(r, 500));
      }
    } catch(e) {
      console.log(`    ⚠️ Action failed: ${e.message}`);
    }
  }

  // Stop recording
  await new Promise(r => setTimeout(r, 1000));
  recording = false;
  await captureLoop;

  return { framesDir, frameCount: frameNum };
}

const walkthroughs = [
  {
    name: '01-dashboard',
    narration: 'Welcome to OrgVault. This is your company dashboard. Here you can monitor total files, storage usage, folders, and recent activity. The company selector at the top right lets you switch between company views. Click around to explore your data.',
    actions: [
      { type: 'navigate', to: '/dashboard' },
      { type: 'wait', ms: 3000 },
      { type: 'scroll', y: 100 },
      { type: 'wait', ms: 2000 },
      { type: 'scroll', y: 0 },
      { type: 'wait', ms: 1000 },
    ],
  },
  {
    name: '02-files',
    narration: 'The Files page is your document hub. Drag and drop files onto the upload zone to add them to your company vault. Create folders to organize. Add tags for quick filtering. Use the search bar to find any file instantly. Hover over files to download or delete them.',
    actions: [
      { type: 'navigate', to: '/dashboard/files' },
      { type: 'wait', ms: 3000 },
      { type: 'scroll', y: 200 },
      { type: 'wait', ms: 2000 },
      { type: 'scroll', y: 0 },
      { type: 'moveMouse', x: 600, y: 250 },
      { type: 'wait', ms: 1000 },
    ],
  },
  {
    name: '03-records',
    narration: 'Data Records is a flexible database for your company. Select a table from the left panel to view its records. Click Add Record to create new entries in JSON format. Hover over any record to edit or delete it. Use the copy button to duplicate record data.',
    actions: [
      { type: 'navigate', to: '/dashboard/records' },
      { type: 'wait', ms: 3000 },
      { type: 'scroll', y: 100 },
      { type: 'wait', ms: 2000 },
      { type: 'scroll', y: 0 },
      { type: 'wait', ms: 1000 },
    ],
  },
  {
    name: '04-organize',
    narration: 'Organize your files with folders and tags. Click folder cards to filter. Use the breadcrumb trail at the top to navigate back. Click any tag on a file to see all files with that label. Clear filters anytime with the X button.',
    actions: [
      { type: 'navigate', to: '/dashboard/files' },
      { type: 'wait', ms: 2500 },
      { type: 'scroll', y: 80 },
      { type: 'wait', ms: 1500 },
      { type: 'scroll', y: 200 },
      { type: 'wait', ms: 1500 },
      { type: 'scroll', y: 0 },
      { type: 'wait', ms: 1000 },
    ],
  },
  {
    name: '05-search',
    narration: 'Search for files instantly. Type in the search bar and results update as you type. Combine search with tag filters for precise results. If you cannot find what you need, clear all filters and try different search terms.',
    actions: [
      { type: 'navigate', to: '/dashboard/files' },
      { type: 'wait', ms: 2000 },
      { type: 'moveMouse', x: 200, y: 170 },
      { type: 'wait', ms: 1000 },
      { type: 'scroll', y: 100 },
      { type: 'wait', ms: 1500 },
      { type: 'scroll', y: 0 },
      { type: 'wait', ms: 1000 },
    ],
  },
  {
    name: '06-download',
    narration: 'Download and delete files easily. Hover over any file row to reveal action buttons. Click the download icon to get your file. It is automatically decrypted. Click the trash icon to delete files you no longer need, freeing up storage.',
    actions: [
      { type: 'navigate', to: '/dashboard/files' },
      { type: 'wait', ms: 2000 },
      { type: 'hover', selector: 'tr' },
      { type: 'wait', ms: 2000 },
      { type: 'scroll', y: 100 },
      { type: 'wait', ms: 1500 },
    ],
  },
  {
    name: '07-companies',
    narration: 'Manage companies within your organization. Each company has isolated storage. Use the company selector to switch views. Files in one company are hidden from another. Create new companies for different business units or departments.',
    actions: [
      { type: 'navigate', to: '/dashboard/companies' },
      { type: 'wait', ms: 3000 },
      { type: 'scroll', y: 100 },
      { type: 'wait', ms: 2000 },
      { type: 'scroll', y: 0 },
      { type: 'wait', ms: 1000 },
    ],
  },
  {
    name: '08-users',
    narration: 'Manage your team from the Users page. Add new users with specific roles and company assignments. Edit roles inline by hovering and clicking edit. Deactivate users who leave the organization. Only administrators can manage users.',
    actions: [
      { type: 'navigate', to: '/dashboard/users' },
      { type: 'wait', ms: 3000 },
      { type: 'scroll', y: 150 },
      { type: 'wait', ms: 2000 },
      { type: 'scroll', y: 0 },
      { type: 'wait', ms: 1000 },
    ],
  },
  {
    name: '09-settings',
    narration: 'Configure your organization from the Settings page. Set storage quotas for the organization and individual companies. Monitor usage with color-coded bars. Blue is healthy, amber is a warning, red is critical. Review security settings and encryption status.',
    actions: [
      { type: 'navigate', to: '/dashboard/settings' },
      { type: 'wait', ms: 3000 },
      { type: 'scroll', y: 300 },
      { type: 'wait', ms: 3000 },
      { type: 'scroll', y: 0 },
      { type: 'wait', ms: 1500 },
    ],
  },
];

async function generate() {
  console.log('🎬 Frame-by-Frame Walkthrough Videos\n');
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

  for (const w of walkthroughs) {
    console.log(`\n📹 ${w.name}`);
    
    // 1. Generate TTS narration
    const audioPath = path.join(OUTDIR, `${w.name}.wav`);
    console.log('  🎤 Generating narration...');
    try {
      await gathosTTS(w.narration, audioPath);
      const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`, {encoding:'utf8'})) || 20;
      console.log(`  ✅ Narration: ${dur.toFixed(1)}s`);
    } catch(e) {
      console.log(`  ⚠️ TTS failed: ${e.message}`);
    }

    // 2. Record session
    console.log('  📸 Recording frames...');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H });
    
    await login(page);
    
    const { framesDir, frameCount } = await recordSession(page, w.name, w.actions);
    await browser.close();
    console.log(`  ✅ ${frameCount} frames captured`);

    // 3. Combine frames into video + add audio
    const finalPath = path.join(OUTDIR, `${w.name}.mp4`);
    const dur = fs.existsSync(audioPath) ? 
      parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`, {encoding:'utf8'})) || 15 : 15;
    
    try {
      if (fs.existsSync(audioPath)) {
        execSync(`ffmpeg -y -framerate ${FPS} -i "${framesDir}/frame_%05d.png" -i "${audioPath}" -c:v libx264 -pix_fmt yuv420p -c:a aac -t ${dur} -vf "scale=${W}:${H},format=yuv420p" -shortest -movflags +faststart "${finalPath}"`, {stdio:'pipe'});
      } else {
        execSync(`ffmpeg -y -framerate ${FPS} -i "${framesDir}/frame_%05d.png" -c:v libx264 -pix_fmt yuv420p -t 15 -vf "scale=${W}:${H},format=yuv420p" -movflags +faststart "${finalPath}"`, {stdio:'pipe'});
      }
      
      const kb = (fs.statSync(finalPath).size / 1024).toFixed(0);
      console.log(`  🎬 ${w.name}.mp4 (${kb} KB)`);
    } catch(e) {
      console.log(`  ⚠️ Encoding failed: ${e.message}`);
    }

    // Cleanup
    const files = fs.readdirSync(framesDir);
    files.forEach(f => { try { fs.unlinkSync(path.join(framesDir, f)); } catch {} });
    try { fs.rmdirSync(framesDir); } catch {}
    try { fs.unlinkSync(audioPath); } catch {}
  }
  
  console.log('\n🎉 Walkthrough videos complete!');
}

generate().catch(e => { console.error(e); process.exit(1); });
