/**
 * Full Walkthrough Pipeline — frames captured for complete audio duration
 */
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const TTS_KEY = 'tts_live_W05edh2izM9E-zmFz8YS8igSX9GhqExp';
const OUTDIR = 'frontend/public/training-videos';
const APP_URL = 'https://storageapp.boosterappsolutions.com';
const W = 1280, H = 720, FPS = 10;

async function tts(text, out) {
  return new Promise((resolve, reject) => {
    const req = https.request('https://gathos.com/api/v1/tts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TTS_KEY}`, 'Content-Type': 'application/json' }
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end', async () => {
      const {job_id} = JSON.parse(d);
      for (let i=0;i<90;i++) {
        await new Promise(r=>setTimeout(r,4000));
        const pr = await new Promise((rs,rj)=>{https.get(`https://gathos.com/api/v1/tts/jobs/${job_id}`,{headers:{'Authorization':`Bearer ${TTS_KEY}`}},r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>rs(JSON.parse(b)))}).on('error',rj)});
        if (pr.status==='completed') { fs.writeFileSync(out, Buffer.from(pr.result.audio_base64,'base64')); resolve(); return; }
        if (pr.status==='failed') { reject(new Error(pr.error||'failed')); return; }
      }
      reject(new Error('timeout'));
    })});
    req.on('error', reject);
    req.write(JSON.stringify({text, voice:'koko', speed:1.0, language:'en'}));
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

const videos = [
  {
    name: '01-welcome',
    narration: 'Welcome to OrgVault, your company secure storage platform. This is your dashboard where you can monitor total files, storage used, folders, and recent activity at a glance. Every file you upload is encrypted with AES-256-GCM before storage, providing bank-grade security. Use the left sidebar to navigate between pages. The company selector at the top right lets you switch between different company views.',
    actions: async (page) => {
      await page.goto(`${APP_URL}/dashboard`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 2000));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 120);
      await new Promise(r => setTimeout(r, 2000));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 0);
    },
  },
  {
    name: '02-navigate',
    narration: 'Navigate your workspace using the left sidebar. Dashboard shows your company statistics. Files is where you manage and upload documents. Data Records lets you work with structured data in custom tables. Companies, Users, and Settings are for administration. The company selector at the top lets you switch between company views instantly.',
    actions: async (page) => {
      await page.goto(`${APP_URL}/dashboard`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 3000));
    },
  },
  {
    name: '03-upload',
    narration: 'Go to the Files page to upload your documents. Simply drag and drop files from your computer onto the upload zone, or click anywhere in the zone to browse. Organize files with folders like invoices or reports. Add comma-separated tags like important or draft for quick filtering later. Your files are encrypted automatically before storage.',
    actions: async (page) => {
      await page.goto(`${APP_URL}/dashboard/files`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 2000));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 200);
      await new Promise(r => setTimeout(r, 2500));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 0);
    },
  },
  {
    name: '04-organize',
    narration: 'Keep your files organized with folders and tags. Click any folder card to filter files within that folder. Use the breadcrumb trail at the top to navigate back up to root. Tags are clickable too. Click any tag on a file to see all files with that label. Clear filters anytime by clicking the X on the active tag.',
    actions: async (page) => {
      await page.goto(`${APP_URL}/dashboard/files`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 2000));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 80);
    },
  },
  {
    name: '05-search',
    narration: 'Find files instantly with the search bar. Type any part of the filename and results update as you type. Combine search with tag filters for laser-precise results. If you cannot find what you need, clear all filters and try different search terms for better results.',
    actions: async (page) => {
      await page.goto(`${APP_URL}/dashboard/files`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 2000));
      await page.mouse.move(300, 170, { steps: 5 });
    },
  },
  {
    name: '06-download',
    narration: 'Downloading and deleting files is simple. Hover over any file row to reveal action buttons. Click the download icon to get your file. It is automatically decrypted for you. Click the trash icon and confirm to delete files. Deleting files frees up storage space for your entire company.',
    actions: async (page) => {
      await page.goto(`${APP_URL}/dashboard/files`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 2000));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 100);
    },
  },
  {
    name: '07-records',
    narration: 'Data Records is a flexible database for your company. Select a table from the left panel to view its records. Click Add Record and enter data in JSON format. Each record is flexible and can have different fields. Hover over any record to edit or delete it. Use the copy button to duplicate records as templates for new entries.',
    actions: async (page) => {
      await page.goto(`${APP_URL}/dashboard/records`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 2500));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 100);
    },
  },
  {
    name: '08-storage',
    narration: 'Your company has a storage limit set by your administrator. Check your Dashboard or Settings page for current usage. The usage bar changes color as storage fills up. Blue means healthy, under seventy percent. Amber is a warning at seventy to ninety percent. Red means critical, over ninety percent. Delete old files or contact your admin for more space.',
    actions: async (page) => {
      await page.goto(`${APP_URL}/dashboard`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 2000));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 150);
    },
  },
  {
    name: '09-security',
    narration: 'OrgVault protects your data with enterprise-grade security. AES-256-GCM encryption scrambles every file before storage. Argon2id password hashing means no one can see your password, not even administrators. Your session lasts twenty-four hours with automatic token rotation for safety. Never share your password and always log out on shared computers.',
    actions: async (page) => {
      await page.goto(`${APP_URL}/dashboard/settings`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 2000));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 500);
      await new Promise(r => setTimeout(r, 2500));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 0);
    },
  },
];

async function generate() {
  console.log('🎬 Full Walkthrough Pipeline\n');
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

  for (const v of videos) {
    // Skip if already exists with reasonable size
    const existingPath = path.join(OUTDIR, `${v.name}.mp4`);
    if (fs.existsSync(existingPath) && fs.statSync(existingPath).size > 200000) {
      console.log(`
📹 ${v.name} — skipping (already exists)`);
      continue;
    }
    console.log(`\n📹 ${v.name}`);
    
    // 1. TTS narration
    const audioPath = path.join(OUTDIR, `${v.name}.wav`);
    console.log('  🎤 Narration...');
    await tts(v.narration, audioPath);
    const audioDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`, {encoding:'utf8'}));
    console.log(`  ✅ ${audioDur.toFixed(1)}s`);

    // 2. Record frames for full audio duration
    console.log('  📸 Recording...');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H });
    await login(page);
    
    // Perform actions (first 5 seconds of visual interest)
    await v.actions(page);
    
    // Continue capturing for the remaining duration
    const framesDir = path.join(OUTDIR, `${v.name}_frames`);
    fs.mkdirSync(framesDir, { recursive: true });
    
    const interval = 1000 / FPS;
    const totalFrames = Math.ceil(audioDur * FPS);
    
    for (let i = 0; i < totalFrames; i++) {
      const framePath = path.join(framesDir, `frame_${String(i).padStart(5, '0')}.png`);
      try { await page.screenshot({ path: framePath, type: 'png' }); } catch {}
      await new Promise(r => setTimeout(r, interval));
      if (i % 20 === 0) process.stdout.write('.');
    }
    
    await browser.close();
    console.log(`\n  ✅ ${totalFrames} frames`);

    // 3. Combine into video
    const finalPath = path.join(OUTDIR, `${v.name}.mp4`);
    execSync(`ffmpeg -y -framerate ${FPS} -i "${framesDir}/frame_%05d.png" -i "${audioPath}" -c:v libx264 -pix_fmt yuv420p -c:a aac -t ${audioDur} -vf "scale=${W}:${H},format=yuv420p" -shortest -movflags +faststart "${finalPath}"`, {stdio:'pipe'});
    
    const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalPath}"`, {encoding:'utf8'}));
    const kb = (fs.statSync(finalPath).size / 1024).toFixed(0);
    console.log(`  🎬 ${v.name}.mp4: ${dur.toFixed(1)}s, ${kb} KB`);

    // Cleanup
    const files = fs.readdirSync(framesDir);
    files.forEach(f => { try { fs.unlinkSync(path.join(framesDir, f)); } catch {} });
    try { fs.rmdirSync(framesDir); } catch {}
    try { fs.unlinkSync(audioPath); } catch {}
    
    // Rate-limit: wait between videos
    console.log('  ⏳ Cooling down...');
    await new Promise(r => setTimeout(r, 10000));
  }
  
  console.log('\n🎉 All 9 walkthrough videos complete!');
}

generate().catch(e => { console.error(e); process.exit(1); });
