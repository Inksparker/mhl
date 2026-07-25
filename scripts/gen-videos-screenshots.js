/**
 * App Screenshot + Gathos TTS Training Video Pipeline
 * Captures real OrgVault app screens and pairs with AI narration
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

// Login first to get a session token
async function login(page) {
  await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  // Fill login form - use placeholder selectors
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].type('admin@mhl.com');
    await inputs[1].type('Admin123456789');
  }
  const buttons = await page.$$('button');
  // Click the Sign In button (last button in form)
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Sign In')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 3000));
  console.log('  ✅ Logged in');
}

function gathosTTS(text, outputPath) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ text, voice: 'koko', speed: 1.1, language: 'en' });
    const req = https.request(`${GATHOS_URL}/tts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TTS_KEY}`, 'Content-Type': 'application/json' }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', async () => {
        try {
          const { job_id } = JSON.parse(d);
          // Poll for result
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
              const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`, {encoding:'utf8'})) || 5;
              resolve(Math.max(dur + 1, 4));
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

async function captureScreen(page, name) {
  const p = path.join(OUTDIR, `${name}.png`);
  await page.screenshot({ path: p, type: 'png' });
  return p;
}

const scenes = [
  {
    name: '01-welcome',
    narration: 'Welcome to OrgVault, your company secure storage platform. This is your dashboard where you can see total files, storage used, folders, and recent activity at a glance. Every file is encrypted with AES-256-GCM before storage.',
    nav: '/dashboard',
  },
  {
    name: '02-navigate',
    narration: 'Navigate using the left sidebar. Dashboard shows company stats. Files is where you manage documents. Data Records handles structured data. Companies, Users, and Settings are for administration. Use the company selector at the top to switch views.',
    nav: '/dashboard',
  },
  {
    name: '03-upload',
    narration: 'Go to the Files page to upload documents. Simply drag and drop files onto the upload zone, or click to browse. Organize with folders like invoices or reports, and add tags for quick filtering later. Your files are encrypted automatically.',
    nav: '/dashboard/files',
  },
  {
    name: '04-organize',
    narration: 'Keep your files organized with folders and tags. Click any folder card to filter files within that folder. Use the breadcrumb trail at the top to navigate back. Tags are clickable. Click any tag to see all files with that label.',
    nav: '/dashboard/files',
  },
  {
    name: '05-search',
    narration: 'The search bar finds files by name instantly as you type. Results update with every character. Combine search with tag filters for precise results. If you cannot find something, clear all filters and try different search terms.',
    nav: '/dashboard/files',
  },
  {
    name: '06-download',
    narration: 'Hover over any file to reveal download and delete action buttons. Click download to get your file. It is automatically decrypted. Click delete and confirm to remove files you no longer need. Deleting files frees up storage for your company.',
    nav: '/dashboard/files',
  },
  {
    name: '07-records',
    narration: 'Data Records is a flexible database for your company. Select a table from the left panel. Click Add Record and enter data in JSON format. Each record is flexible. Hover over any record to edit or delete it. Use the copy button to duplicate records.',
    nav: '/dashboard/records',
  },
  {
    name: '08-storage',
    narration: 'Your company has a storage limit set by your administrator. Check your Dashboard or Settings page for current usage. Blue means healthy, under seventy percent. Amber is a warning, seventy to ninety percent. Red is critical, over ninety percent. Contact your admin if you need more space.',
    nav: '/dashboard',
  },
  {
    name: '09-security',
    narration: 'OrgVault protects your data with enterprise-grade security. AES-256-GCM encryption scrambles every file before storage. Argon2id password hashing means no one can see your password. Sessions last twenty-four hours with automatic token rotation. Your data is safe and secure.',
    nav: '/dashboard/settings',
  },
];

async function generate() {
  console.log('🎬 App Screenshot + Gathos TTS Pipeline\n');
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });

  // Login
  await login(page);

  for (const s of scenes) {
    console.log(`\n📹 ${s.name}`);
    
    // Navigate to page and screenshot
    await page.goto(`${APP_URL}${s.nav}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000)); // Wait for rendering
    const imgPath = await captureScreen(page, s.name);
    console.log('  📸 Screenshot captured');

    // Generate TTS narration
    const audioPath = path.join(OUTDIR, `${s.name}.wav`);
    console.log('  🎤 Generating narration...');
    let duration = 5;
    try {
      duration = await gathosTTS(s.narration, audioPath);
      console.log(`  ✅ Narration: ${duration.toFixed(1)}s`);
    } catch(e) {
      console.log(`  ⚠️ TTS failed: ${e.message}`);
    }

    // Combine into video
    const segPath = path.join(OUTDIR, `${s.name}_seg.mp4`);
    const finalPath = path.join(OUTDIR, `${s.name}.mp4`);
    
    if (fs.existsSync(audioPath)) {
      execSync(`ffmpeg -y -loop 1 -i "${imgPath}" -i "${audioPath}" -c:v libx264 -t ${duration} -pix_fmt yuv420p -vf "scale=${W}:${H},format=yuv420p" -shortest -movflags +faststart "${finalPath}"`, {stdio:'pipe'});
    } else {
      execSync(`ffmpeg -y -loop 1 -i "${imgPath}" -c:v libx264 -t 5 -pix_fmt yuv420p -vf "scale=${W}:${H},format=yuv420p" -movflags +faststart "${finalPath}"`, {stdio:'pipe'});
    }

    const kb = (fs.statSync(finalPath).size / 1024).toFixed(0);
    console.log(`  🎬 ${s.name}.mp4 (${kb} KB)`);

    // Cleanup
    try { fs.unlinkSync(imgPath); } catch {}
    try { fs.unlinkSync(audioPath); } catch {}
  }

  await browser.close();
  console.log('\n🎉 Pipeline complete!');
}

generate().catch(e => { console.error(e); process.exit(1); });
