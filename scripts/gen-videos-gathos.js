/**
 * Gathos TTS + Puppeteer + FFmpeg Training Video Pipeline
 * Uses Gathos API for professional voiceover narration
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const puppeteer = require('puppeteer');

// ─── Config ─────────────────────────────────────────────────────────
const GATHOS_URL = 'https://gathos.com/api/v1';
const GATHOS_TTS_KEY = 'tts_live_W05edh2izM9E-zmFz8YS8igSX9GhqExp';
const VOICE = 'koko';
const SPEED = 1.1;
const OUTDIR = 'frontend/public/training-videos';
const W = 1280, H = 720;

// ─── Gathos API ─────────────────────────────────────────────────────
function gathosPost(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(`${GATHOS_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GATHOS_TTS_KEY}`, 'Content-Type': 'application/json' }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(data)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function gathosGet(endpoint) {
  return new Promise((resolve, reject) => {
    https.get(`${GATHOS_URL}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${GATHOS_TTS_KEY}` }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(data)); }
      });
    }).on('error', reject);
  });
}

async function gathosPoll(jobId, interval = 3) {
  for (let i = 0; i < 60; i++) {
    const data = await gathosGet(`/tts/jobs/${jobId}`);
    if (data.status === 'completed') return data;
    if (data.status === 'failed') throw new Error(`TTS failed: ${data.error || 'unknown'}`);
    await new Promise(r => setTimeout(r, interval * 1000));
  }
  throw new Error('TTS job timed out');
}

async function generateTTS(text, outputPath) {
  console.log(`    🎤 Generating TTS...`);
  const { job_id } = await gathosPost('/tts', { text, voice: VOICE, speed: SPEED, language: 'en' });
  console.log(`    Job: ${job_id}`);
  const result = await gathosPoll(job_id);
  const b64 = result.result?.audio_base64 || result.result?.audio;
  if (!b64) throw new Error('No audio in result');
  fs.writeFileSync(outputPath, Buffer.from(b64, 'base64'));
  const dur = getAudioDuration(outputPath);
  console.log(`    ✅ Audio: ${dur.toFixed(1)}s`);
  return dur;
}

function getAudioDuration(audioPath) {
  try {
    const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`, { encoding: 'utf8' });
    return parseFloat(out.trim()) || 5;
  } catch { return 5; }
}

// ─── Slide HTML ─────────────────────────────────────────────────────
function slideHTML(icon, title, color, body) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0}body{width:${W}px;height:${H}px;display:flex;align-items:center;justify-content:center;
background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);font-family:Segoe UI,system-ui,sans-serif;overflow:hidden}
.bg{position:absolute;inset:0;opacity:.04;background:radial-gradient(circle at 50% 50%,#4c6ef5 0%,transparent 50%)}
.c{position:relative;text-align:center;max-width:700px;padding:40px;z-index:1}
.i{font-size:80px;margin-bottom:24px;line-height:1}
.t{font-size:38px;font-weight:700;color:${color};margin-bottom:20px}
.b{font-size:24px;color:#cbd5e1;line-height:1.6}
</style></head><body><div class="bg"></div><div class="c">
<div class="i">${icon}</div><div class="t">${title}</div><div class="b">${body}</div>
</div></body></html>`;
}

// ─── Video Data ─────────────────────────────────────────────────────
const videos = [
  {
    name: '01-welcome', slides: [
      ['🔐','Welcome to OrgVault','#4ade80',"Your company's secure storage platform. Let's get started with the basics."],
      ['🏢','Your Company Vault','#60a5fa','Store, organize, and share files securely with your team members. Everything in one place.'],
      ['🔒','Bank-Grade Security','#a78bfa','Every file is encrypted with AES-256-GCM before it touches the storage. Maximum protection.'],
      ['👥','Team Access Only','#fbbf24','Only people in your company can see your files. Complete data isolation between companies.'],
      ['✅','Ready to Go!','#4ade80','Follow the steps in this lesson to begin using OrgVault today. You are all set!'],
    ]
  },
  {
    name: '02-navigate', slides: [
      ['🧭','Navigation Guide','#60a5fa',"Let's learn how to move around your OrgVault workspace efficiently."],
      ['📊','Your Dashboard','#4ade80','View your company stats at a glance. Total files, storage used, and recent activity.'],
      ['📁','The Files Page','#fbbf24','Upload, organize, and find all your documents in one convenient place.'],
      ['🗄️','Data Records','#a78bfa','Work with structured data in custom tables designed for your company needs.'],
      ['🏢','Company Selector','#60a5fa','Use the dropdown menu in the header to switch between different company views.'],
    ]
  },
  {
    name: '03-upload', slides: [
      ['📤','Uploading Files','#60a5fa','Get your first files into OrgVault quickly and securely. It is simple and fast.'],
      ['🖱️','Drag and Drop','#4ade80','Simply drag files from your computer onto the upload zone. Or click anywhere to browse.'],
      ['📂','Organize with Folders','#fbbf24','Type a folder name like invoices or reports forward slash 2024 to organize your files.'],
      ['🏷️','Add Tags for Filtering','#a78bfa','Add comma-separated tags like important, draft, or client name for quick filtering later.'],
      ['🔐','Encrypted and Stored','#4ade80','Your file is now encrypted with AES-256 and stored securely. You are all set.'],
    ]
  },
  {
    name: '04-organize', slides: [
      ['📂','Stay Organized','#4ade80','Folders and tags make finding files effortless. Keep everything tidy.'],
      ['📁','Folder Navigation','#60a5fa','Click any folder card to filter files within that folder instantly.'],
      ['🏷️','Tag Filtering','#fbbf24','Tags are clickable. Click any tag to see all files with that label.'],
      ['🔄','Breadcrumb Trail','#a78bfa','Use the breadcrumb at the top to navigate back up through your folders.'],
    ]
  },
  {
    name: '05-search', slides: [
      ['🔍','Quick Search','#60a5fa','The search bar finds files by name instantly as you type. It is very fast.'],
      ['⌨️','Live Results','#4ade80','Results update as you type each character. No need to press Enter.'],
      ['🏷️','Combine Filters','#fbbf24','Search plus tag filters equals laser-precise results every single time.'],
      ['🧹','Clear and Retry','#a78bfa',"Can't find something? Clear all filters and try different search terms."],
    ]
  },
  {
    name: '06-download', slides: [
      ['⬇️','File Actions','#60a5fa','Hover over any file to reveal download and delete action buttons.'],
      ['📥','Download Files','#4ade80','Click download. Files are automatically decrypted for you instantly.'],
      ['🗑️','Delete Files','#f87171','Click delete and confirm to remove files you no longer need to keep.'],
      ['💾','Frees Up Space','#fbbf24','Deleting files frees up storage for your entire company. Very important.'],
    ]
  },
  {
    name: '07-records', slides: [
      ['🗄️','Data Records','#60a5fa','A flexible database for your company structured data needs.'],
      ['➕','Adding Records','#4ade80','Click Add Record and enter data in JSON format. Each record is flexible.'],
      ['✏️','Edit and Delete','#fbbf24','Hover over any record to edit or delete it. Changes save instantly.'],
      ['📋','Copy and Reuse','#a78bfa','Use the copy button to duplicate records as templates for new entries.'],
    ]
  },
  {
    name: '08-storage', slides: [
      ['📊','Storage Limits','#60a5fa','Your company has a storage limit set by your system administrator.'],
      ['📈','Monitor Usage','#fbbf24','Check your Dashboard or Settings page for current usage information.'],
      ['🔵','Blue Means Healthy','#60a5fa','Under seventy percent usage. Plenty of space available for new files.'],
      ['🟡','Amber Means Warning','#fbbf24','Seventy to ninety percent. Time to clean up old and unused files.'],
      ['🔴','Red Means Critical','#f87171','Over ninety percent. Uploads may be blocked soon. Contact your admin.'],
    ]
  },
  {
    name: '09-security', slides: [
      ['🔐','Security First','#4ade80','OrgVault protects your data with enterprise-grade security features.'],
      ['🔒','File Encryption','#60a5fa','AES-256-GCM encryption. Every file is scrambled before storage begins.'],
      ['🔑','Password Protection','#a78bfa','Argon2id password hashing. No one can see your password, not even admins.'],
      ['⏰','Session Security','#fbbf24','Twenty-four hour sessions with automatic token rotation for your safety.'],
      ['✅','You Are Protected','#4ade80','Your data is safe and secure in OrgVault. You are completely all set.'],
    ]
  },
];

// ─── Main Pipeline ──────────────────────────────────────────────────
async function generate() {
  console.log('🎬 Gathos TTS Training Video Pipeline\n');
  
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });
  
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });

  for (const v of videos) {
    console.log(`\n📹 ${v.name}`);
    const segs = [];
    
    for (let i = 0; i < v.slides.length; i++) {
      const [icon, title, color, body] = v.slides[i];
      const base = path.join(OUTDIR, `${v.name}_s${i}`);
      
      // 1. Generate TTS audio via Gathos
      const audioPath = base + '.wav';
      const narration = `${title}. ${body}`;
      let duration = 5;
      
      try {
        duration = await generateTTS(narration, audioPath);
        duration = Math.max(duration + 1, 5); // Add 1s padding
      } catch (e) {
        console.log(`    ⚠️ TTS failed: ${e.message}, using silent slide`);
      }
      
      // 2. Generate slide image
      const imgPath = base + '.png';
      const html = slideHTML(icon, title, color, body);
      await page.setContent(html);
      await page.screenshot({ path: imgPath, type: 'png' });
      
      // 3. Combine image + audio into segment
      const segPath = base + '.mp4';
      let cmd;
      if (fs.existsSync(audioPath)) {
        cmd = `ffmpeg -y -loop 1 -i "${imgPath}" -i "${audioPath}" -c:v libx264 -t ${duration} -pix_fmt yuv420p -vf "scale=${W}:${H},format=yuv420p" -shortest "${segPath}"`;
      } else {
        cmd = `ffmpeg -y -loop 1 -i "${imgPath}" -c:v libx264 -t ${duration} -pix_fmt yuv420p -vf "scale=${W}:${H},format=yuv420p" "${segPath}"`;
      }
      
      execSync(cmd, { stdio: 'pipe' });
      segs.push(segPath);
      
      // Cleanup temp files
      try { fs.unlinkSync(imgPath); } catch {}
      try { fs.unlinkSync(audioPath); } catch {}
      
      console.log(`  ✅ Slide ${i+1}/${v.slides.length} (${duration.toFixed(1)}s)`);
    }
    
    // 4. Concatenate segments
    const concatPath = path.join(OUTDIR, `${v.name}.txt`);
    fs.writeFileSync(concatPath, segs.map(f => `file '${path.basename(f)}'`).join('\n'));
    
    const finalPath = path.join(OUTDIR, `${v.name}.mp4`);
    execSync(`ffmpeg -y -f concat -safe 0 -i "${concatPath}" -c:v libx264 -pix_fmt yuv420p -r 30 -movflags +faststart "${finalPath}"`, { stdio: 'pipe' });
    
    // Cleanup
    segs.forEach(f => { try { fs.unlinkSync(f); } catch {} });
    try { fs.unlinkSync(concatPath); } catch {}
    
    const kb = (fs.statSync(finalPath).size / 1024).toFixed(0);
    console.log(`  🎬 ${v.name}.mp4 (${kb} KB)`);
  }
  
  await browser.close();
  console.log('\n🎉 Pipeline complete! All videos generated with Gathos TTS voiceover.');
}

generate().catch(console.error);
