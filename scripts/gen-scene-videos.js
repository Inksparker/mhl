/**
 * Scene-matched Training Videos
 * Each narration segment gets its own app page capture
 */
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const KEY = 'tts_live_W05edh2izM9E-zmFz8YS8igSX9GhqExp';
const OUT = 'frontend/public/training-videos';
const APP = 'https://storageapp.boosterappsolutions.com';
const W = 1280, H = 720, FPS = 6;

async function gathosTTS(text, out) {
  return new Promise((resolve, reject) => {
    const req = https.request('https://gathos.com/api/v1/tts', {
      method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', async () => {
      const { job_id } = JSON.parse(d);
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 4000));
        const pr = await new Promise((rs, rj) => {
          https.get(`https://gathos.com/api/v1/tts/jobs/${job_id}`, {
            headers: { Authorization: `Bearer ${KEY}` }
          }, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => rs(JSON.parse(b))); }).on('error', rj);
        });
        if (pr.status === 'completed') { fs.writeFileSync(out, Buffer.from(pr.result.audio_base64, 'base64')); resolve(); return; }
        if (pr.status === 'failed') { reject(new Error(pr.error || 'failed')); return; }
      }
    })});
    req.on('error', reject);
    req.write(JSON.stringify({ text, voice: 'koko', speed: 0.95, language: 'en' }));
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

async function captureScene(page, url, duration, name, sceneNum) {
  await page.goto(`${APP}${url}`, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));
  
  const framesDir = path.join(OUT, `${name}_s${sceneNum}_frames`);
  fs.mkdirSync(framesDir, { recursive: true });
  const totalFrames = Math.max(1, Math.ceil(duration * FPS));
  
  for (let i = 0; i < totalFrames; i++) {
    try { await page.screenshot({ path: path.join(framesDir, `f${String(i).padStart(5,'0')}.png`), type: 'png' }); } catch {}
    await new Promise(r => setTimeout(r, 1000 / FPS));
  }
  return framesDir;
}

const trainingVideos = [
  {
    name: '01-welcome',
    scenes: [
      { text: 'Welcome to OrgVault, your company secure storage platform.', url: '/dashboard' },
      { text: 'This is your dashboard, the home screen where you can see everything at a glance.', url: '/dashboard' },
      { text: 'The four stats cards show total files in your organization, number of folders, storage used, and files synced to cloud.', url: '/dashboard' },
      { text: 'Below the cards, you will see your most recently uploaded files with their names, sizes, dates, and tags.', url: '/dashboard' },
      { text: 'Use the company selector in the top right header to switch between different company views.', url: '/dashboard' },
    ],
  },
  {
    name: '02-navigate',
    scenes: [
      { text: 'Navigate your workspace using the left sidebar. It contains everything you need.', url: '/dashboard' },
      { text: 'Dashboard shows your company statistics at a glance. Total files, storage used, and recent activity.', url: '/dashboard' },
      { text: 'Files is where you manage and upload all your documents. Organize with folders and tags.', url: '/dashboard/files' },
      { text: 'Data Records lets you work with structured data in custom tables for your company.', url: '/dashboard/records' },
      { text: 'Companies, Users, and Settings are for administration. The company selector at the top switches views.', url: '/dashboard/companies' },
    ],
  },
  {
    name: '03-upload',
    scenes: [
      { text: 'The Files page is where you manage all your documents. You can find it in the left sidebar.', url: '/dashboard/files' },
      { text: 'There are two ways to upload files. First, drag and drop files from your computer directly onto the dashed upload zone.', url: '/dashboard/files' },
      { text: 'Second, you can click anywhere in the upload zone to browse and select files from your computer.', url: '/dashboard/files' },
      { text: 'When uploading, assign files to a folder by typing a folder name like invoices. Use nested folders for better organization.', url: '/dashboard/files' },
      { text: 'Add comma separated tags like important or draft for quick filtering later. Files are encrypted with AES 256 GCM before storage.', url: '/dashboard/files' },
    ],
  },
  {
    name: '04-organize',
    scenes: [
      { text: 'Good organization makes files easy to find. Use folders and tags to keep everything tidy.', url: '/dashboard/files' },
      { text: 'Click any folder card to filter files within that folder. Each folder shows its file count.', url: '/dashboard/files' },
      { text: 'Use the breadcrumb trail at the top to navigate back up through your folders. Click Root to return to the main view.', url: '/dashboard/files' },
      { text: 'Tags are clickable filters. Click any tag on a file to see all files with that label. Clear the filter with the X button.', url: '/dashboard/files' },
    ],
  },
  {
    name: '05-search',
    scenes: [
      { text: 'Finding files is fast with the search bar at the top of the Files page.', url: '/dashboard/files' },
      { text: 'Type any part of the filename and results update instantly as you type. No need to press Enter.', url: '/dashboard/files' },
      { text: 'Combine search with tag filters for precise results. Clear all filters to start a fresh search.', url: '/dashboard/files' },
      { text: 'If you cannot find something, clear all filters and try different search terms for better results.', url: '/dashboard/files' },
    ],
  },
  {
    name: '06-download',
    scenes: [
      { text: 'To download or delete files, hover over any file row to reveal action buttons.', url: '/dashboard/files' },
      { text: 'Click the download icon to get your file. It is automatically decrypted before download.', url: '/dashboard/files' },
      { text: 'To delete a file, click the trash icon and confirm. Files are soft deleted for safety.', url: '/dashboard/files' },
      { text: 'Deleting files frees up storage space for your company. Contact admin for permanent deletion.', url: '/dashboard/files' },
    ],
  },
  {
    name: '07-records',
    scenes: [
      { text: 'Data Records lets you store structured data in custom tables. Access it from the left sidebar under Data Records.', url: '/dashboard/records' },
      { text: 'To create a new table, click the New Table button at the top right and enter a name like Contacts or Invoices.', url: '/dashboard/records' },
      { text: 'Click Add Record and enter your data in JSON format. Each record can have different fields.', url: '/dashboard/records' },
      { text: 'Hover over any record to reveal edit and delete buttons. Use the copy button to duplicate records as templates.', url: '/dashboard/records' },
      { text: 'The search bar above the records helps you find specific entries by searching their JSON content.', url: '/dashboard/records' },
    ],
  },
  {
    name: '08-storage',
    scenes: [
      { text: 'Your company has a storage limit set by your administrator. Monitor usage from the Dashboard or Settings.', url: '/dashboard' },
      { text: 'The usage bar changes color as storage fills up. Blue means healthy, under seventy percent.', url: '/dashboard' },
      { text: 'Amber is a warning at seventy to ninety percent. Time to clean up old files.', url: '/dashboard/settings' },
      { text: 'Red means critical, over ninety percent. Uploads may be blocked. Contact your admin for more space.', url: '/dashboard/settings' },
    ],
  },
  {
    name: '09-security',
    scenes: [
      { text: 'OrgVault protects your data with enterprise-grade security. Let us review the protections.', url: '/dashboard/settings' },
      { text: 'AES 256 GCM encryption scrambles every file before storage. No one can read your files without the key.', url: '/dashboard/settings' },
      { text: 'Argon2id password hashing ensures no one can see your password, not even administrators.', url: '/dashboard/settings' },
      { text: 'Your session lasts twenty four hours with automatic token rotation. Never share your password and always log out on shared computers.', url: '/dashboard/settings' },
    ],
  },
];

async function generate() {
  console.log('🎬 Scene-Matched Training Videos\n');
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  for (const vid of trainingVideos) {
    console.log(`\n📹 ${vid.name} (${vid.scenes.length} scenes)`);
    
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H });
    await login(page);
    
    const sceneFiles = [];
    
    for (let si = 0; si < vid.scenes.length; si++) {
      const scene = vid.scenes[si];
      console.log(`  Scene ${si + 1}/${vid.scenes.length}`);
      
      // 1. Generate TTS for this scene
      const audioPath = path.join(OUT, `${vid.name}_s${si}.wav`);
      console.log(`    🎤 "${scene.text.substring(0, 50)}..."`);
      await gathosTTS(scene.text, audioPath);
      const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`, { encoding: 'utf8' }));
      console.log(`    ✅ ${dur.toFixed(1)}s`);
      
      // 2. Capture scene on correct page
      const framesDir = await captureScene(page, scene.url, dur, vid.name, si);
      
      // 3. Encode scene video
      const scenePath = path.join(OUT, `${vid.name}_s${si}.mp4`);
      execSync(`ffmpeg -y -framerate ${FPS} -i "${framesDir}/f%05d.png" -i "${audioPath}" -c:v libx264 -pix_fmt yuv420p -c:a aac -t ${dur} -vf "scale=${W}:${H},format=yuv420p" -shortest -movflags +faststart "${scenePath}"`, { stdio: 'pipe' });
      sceneFiles.push(scenePath);
      
      // Cleanup
      fs.rmSync(framesDir, { recursive: true, force: true });
      try { fs.unlinkSync(audioPath); } catch {}
      
      // Rate limit
      await new Promise(r => setTimeout(r, 10000));
    }
    
    await page.close();
    
    // 4. Concatenate all scenes
    const concatPath = path.join(OUT, `${vid.name}.txt`);
    fs.writeFileSync(concatPath, sceneFiles.map(f => `file '${path.basename(f)}'`).join('\n'));
    
    const finalPath = path.join(OUT, `${vid.name}.mp4`);
    execSync(`ffmpeg -y -f concat -safe 0 -i "${concatPath}" -c copy -movflags +faststart "${finalPath}"`, { stdio: 'pipe' });
    
    const finalDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalPath}"`, { encoding: 'utf8' }));
    const kb = (fs.statSync(finalPath).size / 1024).toFixed(0);
    console.log(`  🎬 Final: ${finalDur.toFixed(1)}s, ${kb} KB`);
    
    // Cleanup scenes
    sceneFiles.forEach(f => { try { fs.unlinkSync(f); } catch {} });
    try { fs.unlinkSync(concatPath); } catch {}
    
    await new Promise(r => setTimeout(r, 10000));
  }
  
  await browser.close();
  console.log('\n🎉 Done! Each video now shows the correct page for every narration segment.');
}

generate().catch(e => { console.error(e); process.exit(1); });
