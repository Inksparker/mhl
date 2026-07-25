/**
 * Final Training Videos — Aligned with User Manual
 * Each video follows the manual's lesson structure
 */
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const TTS_KEY = 'tts_live_W05edh2izM9E-zmFz8YS8igSX9GhqExp';
const OUTDIR = 'frontend/public/training-videos';
const APP = 'https://storageapp.boosterappsolutions.com';
const W = 1280, H = 720, FPS = 8;

async function tts(text, out) {
  return new Promise((resolve, reject) => {
    const req = https.request('https://gathos.com/api/v1/tts', {
      method: 'POST', headers: { Authorization: `Bearer ${TTS_KEY}`, 'Content-Type': 'application/json' }
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', async () => {
      try {
        const { job_id } = JSON.parse(d);
        for (let i = 0; i < 120; i++) {
          await new Promise(r => setTimeout(r, 4000));
          const pr = await new Promise((rs, rj) => {
            https.get(`https://gathos.com/api/v1/tts/jobs/${job_id}`, {
              headers: { Authorization: `Bearer ${TTS_KEY}` }
            }, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => rs(JSON.parse(b))); }).on('error', rj);
          });
          if (pr.status === 'completed') { fs.writeFileSync(out, Buffer.from(pr.result.audio_base64, 'base64')); resolve(); return; }
          if (pr.status === 'failed') { reject(new Error(pr.error || 'failed')); return; }
        }
        reject(new Error('timeout'));
      } catch (e) { reject(e); }
    })});
    req.on('error', reject);
    req.write(JSON.stringify({ text, voice: 'koko', speed: 1.0, language: 'en' }));
    req.end();
  });
}

async function login(page) {
  await page.goto(`${APP}/login`, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].click({ clickCount: 3 }); await inputs[0].type('admin@mhl.com', { delay: 60 });
    await inputs[1].click({ clickCount: 3 }); await inputs[1].type('Admin123456789', { delay: 60 });
  }
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Sign In')) { await btn.click(); break; }
  }
  await new Promise(r => setTimeout(r, 5000));
}

const videos = [
  {
    name: '01-welcome',
    narration: 'Welcome to OrgVault. This is your company dashboard, the home screen where you can see everything at a glance. The four stats cards show total files in your organization, number of folders, total storage used, and files synced to cloud. Below that, you will see your most recent files with their names, sizes, dates, and tags. Use the company selector in the top right header to switch between different company views. The left sidebar lets you navigate to Files, Data Records, Companies, Users, and Settings.',
    actions: async (page) => {
      await page.goto(`${APP}/dashboard`, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 3000));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 150);
      await new Promise(r => setTimeout(r, 3000));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 0);
    }
  },
  {
    name: '03-upload',
    narration: 'The Files page is where you manage all your documents. There are two ways to upload files. First, you can drag and drop files from your computer directly onto the dashed upload zone. Second, you can click anywhere in the upload zone to browse and select files. When uploading, you can assign files to a folder by typing a folder name. Use nested folders like invoices forward slash 2024 for better organization. Add comma separated tags like important or draft for quick filtering. The maximum file size is five hundred megabytes per file. Files are encrypted with AES 256 GCM before storage.',
    actions: async (page) => {
      await page.goto(`${APP}/dashboard/files`, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 250);
      await new Promise(r => setTimeout(r, 3000));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 0);
    }
  },
  {
    name: '07-records',
    narration: 'Data Records lets you store structured data in custom tables. This is perfect for contacts, invoices, inventory, or any tabular data. To create a table, click the New Table button and enter a name. Tables appear in the left panel. Click a table to view its records. Click Add Record and enter your data in JSON format. Each record is flexible, you can have different fields in each one. Hover over any record to reveal edit and delete buttons. Use the copy button to duplicate records as templates. The search bar helps you find specific records quickly.',
    actions: async (page) => {
      await page.goto(`${APP}/dashboard/records`, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 3000));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 150);
      await new Promise(r => setTimeout(r, 2000));
    }
  },
  {
    name: '04-organize',
    narration: 'Good organization makes files easy to find. Click any folder card to filter files within that folder. Use the breadcrumb trail at the top to navigate back. Click Root to return to the main view. Tags are clickable filters. Click any tag on a file to see all files with that tag. Click the X on the active tag to clear the filter. You can combine search with tag filters for precise results.',
    actions: async (page) => {
      await page.goto(`${APP}/dashboard/files`, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 100);
      await new Promise(r => setTimeout(r, 2000));
    }
  },
  {
    name: '05-search',
    narration: 'Finding files is fast with the search bar. Type any part of the filename and results update instantly as you type. No need to press Enter. Combine search with tag filters for laser precise results. If you cannot find what you are looking for, clear all filters and try different search terms.',
    actions: async (page) => {
      await page.goto(`${APP}/dashboard/files`, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));
      await page.mouse.move(300, 170, { steps: 10 });
      await new Promise(r => setTimeout(r, 1500));
    }
  },
  {
    name: '06-download',
    narration: 'To download or delete files, hover over any file row to reveal action buttons. Click the download icon to get your file. It is automatically decrypted before download. To delete a file, click the trash icon and confirm. Deleted files are soft deleted and can be recovered by an administrator. Deleting files also frees up storage space for your company.',
    actions: async (page) => {
      await page.goto(`${APP}/dashboard/files`, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 120);
      await new Promise(r => setTimeout(r, 2000));
    }
  },
];

async function generate() {
  console.log('🎬 Training Manual Walkthrough Videos\n');
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

  // Setup browser once
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  
  for (const v of videos) {
    console.log(`\n📹 ${v.name}`);
    const mp4Path = path.join(OUTDIR, `${v.name}.mp4`);
    
    // Skip if already full-length
    if (fs.existsSync(mp4Path)) {
      try {
        const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${mp4Path}"`, { encoding: 'utf8' }));
        if (dur > 15) { console.log(`  ✅ Already ${dur.toFixed(1)}s — skipping`); continue; }
      } catch {}
    }

    // TTS
    const audioPath = path.join(OUTDIR, `${v.name}.wav`);
    console.log('  🎤 Generating narration...');
    try {
      await tts(v.narration, audioPath);
    } catch (e) {
      console.log(`  ⚠️ TTS failed: ${e.message}. Retrying...`);
      await new Promise(r => setTimeout(r, 15000));
      await tts(v.narration, audioPath);
    }
    const audioDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`, { encoding: 'utf8' }));
    console.log(`  ✅ Narration: ${audioDur.toFixed(1)}s`);

    // Record session
    console.log('  📸 Recording...');
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H });
    await login(page);
    await v.actions(page);

    // Capture frames for full audio duration
    const framesDir = path.join(OUTDIR, `${v.name}_frames`);
    if (fs.existsSync(framesDir)) {
      fs.rmSync(framesDir, { recursive: true, force: true });
    }
    fs.mkdirSync(framesDir, { recursive: true });
    const totalFrames = Math.ceil(audioDur * FPS);
    
    for (let i = 0; i < totalFrames; i++) {
      try { await page.screenshot({ path: path.join(framesDir, `f${String(i).padStart(5, '0')}.png`), type: 'png' }); } catch {}
      await new Promise(r => setTimeout(r, 1000 / FPS));
      if (i % 25 === 0) process.stdout.write('.');
    }
    await page.close();
    console.log(` ${totalFrames} frames`);

    // Encode video
    execSync(`ffmpeg -y -framerate ${FPS} -i "${framesDir}/f%05d.png" -i "${audioPath}" -c:v libx264 -pix_fmt yuv420p -c:a aac -t ${audioDur} -vf "scale=${W}:${H},format=yuv420p" -shortest -movflags +faststart "${mp4Path}"`, { stdio: 'pipe' });
    
    const finalDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${mp4Path}"`, { encoding: 'utf8' }));
    const kb = (fs.statSync(mp4Path).size / 1024).toFixed(0);
    console.log(`  🎬 ${finalDur.toFixed(1)}s, ${kb} KB`);

    // Cleanup
    fs.rmSync(framesDir, { recursive: true, force: true });
    try { fs.unlinkSync(audioPath); } catch {}
    
    // Cooldown for Gathos rate limit
    console.log('  ⏳ Cooling down...');
    await new Promise(r => setTimeout(r, 15000));
  }
  
  await browser.close();
  console.log('\n🎉 All videos generated!');
}

generate().catch(e => { console.error(e); process.exit(1); });
