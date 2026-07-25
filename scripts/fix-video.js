/**
 * Quick test: regenerate 01-welcome with full narration duration
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

async function gathosTTS(text, out) {
  return new Promise((resolve, reject) => {
    const req = https.request('https://gathos.com/api/v1/tts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TTS_KEY}`, 'Content-Type': 'application/json' }
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end', async () => {
      const {job_id} = JSON.parse(d);
      for (let i=0;i<60;i++) {
        await new Promise(r=>setTimeout(r,3000));
        const pr = await new Promise((rs,rj)=>{https.get(`https://gathos.com/api/v1/tts/jobs/${job_id}`,{headers:{'Authorization':`Bearer ${TTS_KEY}`}},r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>rs(JSON.parse(b)))}).on('error',rj)});
        if (pr.status==='completed') { fs.writeFileSync(out, Buffer.from(pr.result.audio_base64,'base64')); resolve(); return; }
      }
      reject(new Error('timeout'));
    })});
    req.on('error', reject);
    req.write(JSON.stringify({text, voice:'koko', speed:1.0, language:'en'}));
    req.end();
  });
}

(async () => {
  console.log('🎬 Fixing 01-welcome with full duration\n');
  
  // 1. TTS
  const audioPath = path.join(OUTDIR, '01-welcome.wav');
  const narration = 'Welcome to OrgVault, your company secure storage platform. This is your dashboard where you can see total files, storage used, folders, and recent activity at a glance. Every file is encrypted with AES-256-GCM before storage. Use the sidebar to navigate between pages. The company selector at the top lets you switch between company views.';
  
  console.log('🎤 Generating narration...');
  await gathosTTS(narration, audioPath);
  const audioDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`, {encoding:'utf8'}));
  console.log(`✅ Narration: ${audioDur.toFixed(1)}s`);

  // 2. Record frames for the full audio duration
  console.log('📸 Recording frames...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });
  
  // Login
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
  console.log('✅ Logged in');

  // Navigate to dashboard
  await page.goto(`${APP_URL}/dashboard`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // Scroll a bit for visual interest
  await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 100);
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), 0);
  await new Promise(r => setTimeout(r, 1000));

  // Now capture frames for the FULL audio duration
  const framesDir = path.join(OUTDIR, '01_frames');
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
  console.log(`\n✅ ${totalFrames} frames captured`);

  // 3. Combine into video for full audio duration
  const finalPath = path.join(OUTDIR, '01-welcome.mp4');
  execSync(`ffmpeg -y -framerate ${FPS} -i "${framesDir}/frame_%05d.png" -i "${audioPath}" -c:v libx264 -pix_fmt yuv420p -c:a aac -t ${audioDur} -vf "scale=${W}:${H},format=yuv420p" -shortest -movflags +faststart "${finalPath}"`, {stdio:'pipe'});
  
  const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalPath}"`, {encoding:'utf8'}));
  const kb = (fs.statSync(finalPath).size / 1024).toFixed(0);
  console.log(`🎬 01-welcome.mp4: ${dur.toFixed(1)}s, ${kb} KB`);

  // Cleanup
  const files = fs.readdirSync(framesDir);
  files.forEach(f => { try { fs.unlinkSync(path.join(framesDir, f)); } catch {} });
  try { fs.rmdirSync(framesDir); } catch {}
  try { fs.unlinkSync(audioPath); } catch {}
  
  console.log('✅ Done!');
})().catch(e => { console.error(e); process.exit(1); });
