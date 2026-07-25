/**
 * Professional Training Video Generator
 * Pipeline: TTS Narration → Slide Images → FFmpeg Video with Audio
 */
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { EdgeTTS } = require('edge-tts');

const OUTDIR = path.resolve('org-vault/frontend/public/training-videos');
const WIDTH = 1280;
const HEIGHT = 720;
const VOICE = 'en-US-AriaNeural'; // Professional US English female voice

if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

// Slide HTML template
const SLIDE_HTML = (icon, title, textColor, body) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${WIDTH}px;height:${HEIGHT}px;display:flex;align-items:center;justify-content:center;
background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);font-family:'Segoe UI',system-ui,sans-serif;color:#fff;overflow:hidden}
.bg{position:absolute;inset:0;opacity:.04;background:radial-gradient(circle at 50% 50%,#4c6ef5 0%,transparent 50%)}
.content{position:relative;text-align:center;max-width:700px;padding:40px;z-index:1}
.icon{font-size:80px;margin-bottom:24px;line-height:1;filter:drop-shadow(0 4px 8px rgba(0,0,0,.3))}
.title{font-size:38px;font-weight:700;color:${textColor};margin-bottom:20px;text-shadow:0 2px 4px rgba(0,0,0,.3)}
.body{font-size:24px;color:#cbd5e1;line-height:1.6;text-shadow:0 1px 2px rgba(0,0,0,.2)}
.bar{position:absolute;bottom:0;left:0;height:4px;background:${textColor};border-radius:0 2px 0 0}
</style></head><body>
<div class="bg"></div>
<div class="content">
  <div class="icon">${icon}</div>
  <div class="title">${title}</div>
  <div class="body">${body}</div>
</div>
</body></html>`;

const VIDEOS = [
  {
    name: '01-welcome',
    slides: [
      { icon: '🔐', title: 'Welcome to OrgVault', color: '#4ade80', body: 'Your company\'s secure storage platform. Let\'s get started.' },
      { icon: '🏢', title: 'Your Company Vault', color: '#60a5fa', body: 'Store, organize, and share files securely with your team members.' },
      { icon: '🔒', title: 'Bank-Grade Security', color: '#a78bfa', body: 'Every file is encrypted with AES-256-GCM before it touches the storage.' },
      { icon: '👥', title: 'Team Access Only', color: '#fbbf24', body: 'Only people in your company can see your files. Complete data isolation.' },
      { icon: '✅', title: 'Ready to Go!', color: '#4ade80', body: 'Follow the steps in this lesson to begin using OrgVault today.' },
    ],
  },
  {
    name: '02-navigate',
    slides: [
      { icon: '🧭', title: 'Navigation Guide', color: '#60a5fa', body: 'Let\'s learn how to move around your OrgVault workspace.' },
      { icon: '📊', title: 'Your Dashboard', color: '#4ade80', body: 'View company stats: total files, storage used, and recent activity.' },
      { icon: '📁', title: 'The Files Page', color: '#fbbf24', body: 'Upload, organize, and find all your documents in one place.' },
      { icon: '🗄️', title: 'Data Records', color: '#a78bfa', body: 'Work with structured data in custom tables for your company.' },
      { icon: '🏢', title: 'Company Selector', color: '#60a5fa', body: 'Use the dropdown in the header to switch between company views.' },
    ],
  },
  {
    name: '03-upload',
    slides: [
      { icon: '📤', title: 'Uploading Files', color: '#60a5fa', body: 'Let\'s get your first files into OrgVault quickly and securely.' },
      { icon: '🖱️', title: 'Drag and Drop', color: '#4ade80', body: 'Drag files from your computer onto the upload zone, or click to browse.' },
      { icon: '📂', title: 'Organize with Folders', color: '#fbbf24', body: 'Type a folder name like invoices or reports forward slash 2024 to organize.' },
      { icon: '🏷️', title: 'Add Tags', color: '#a78bfa', body: 'Add comma-separated tags like important, draft, or client name for quick filtering.' },
      { icon: '🔐', title: 'Encrypted and Stored', color: '#4ade80', body: 'Your file is now encrypted and stored securely. You\'re all set.' },
    ],
  },
];

async function generateAudio(text, outputPath) {
  try {
    const tts = new EdgeTTS();
    await tts.synthesize(text, VOICE, {
      rate: '-5%',    // Slightly slower for clarity
      pitch: '+0Hz',
      output: outputPath,
    });
    return true;
  } catch (e) {
    console.error(`  TTS failed: ${e.message}`);
    return false;
  }
}

async function getAudioDuration(audioPath) {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
      { encoding: 'utf8' }
    );
    return parseFloat(result.trim());
  } catch {
    return 4; // default 4 seconds if probe fails
  }
}

async function generate() {
  console.log('🚀 Starting professional video pipeline...\n');
  console.log('Voice:', VOICE);
  
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  for (const video of VIDEOS) {
    console.log(`\n📹 Generating: ${video.name}`);
    
    const slideFiles = [];
    
    for (let i = 0; i < video.slides.length; i++) {
      const s = video.slides[i];
      const baseName = `${video.name}_slide${i}`;
      
      // 1. Generate TTS audio from body text
      const audioPath = path.join(OUTDIR, `${baseName}.mp3`);
      const narrationText = `${s.title}. ${s.body}`;
      
      console.log(`  🎤 Slide ${i + 1}/${video.slides.length}: Narrating "${s.title}"...`);
      const hasAudio = await generateAudio(narrationText, audioPath);
      
      let duration = 5; // default duration
      if (hasAudio) {
        duration = await getAudioDuration(audioPath);
        console.log(`     Audio: ${duration.toFixed(1)}s`);
      }
      
      // 2. Generate slide image
      const html = SLIDE_HTML(s.icon, s.title, s.color, s.body);
      const imgPath = path.join(OUTDIR, `${baseName}.png`);
      
      await page.setContent(html);
      await page.screenshot({ path: imgPath, type: 'png' });
      
      // 3. Combine image + audio into video segment
      const segPath = path.join(OUTDIR, `${baseName}.mp4`);
      let cmd;
      
      if (hasAudio) {
        cmd = `ffmpeg -y -loop 1 -i "${imgPath}" -i "${audioPath}" -c:v libx264 -t ${duration} -pix_fmt yuv420p -vf "scale=${WIDTH}:${HEIGHT},format=yuv420p" -shortest "${segPath}"`;
      } else {
        cmd = `ffmpeg -y -loop 1 -i "${imgPath}" -c:v libx264 -t ${duration} -pix_fmt yuv420p -vf "scale=${WIDTH}:${HEIGHT},format=yuv420p" "${segPath}"`;
      }
      
      try {
        execSync(cmd, { stdio: 'pipe' });
        slideFiles.push(segPath);
        console.log(`  ✅ Slide ${i + 1} complete (${duration.toFixed(1)}s)`);
      } catch (e) {
        console.error(`  ❌ Slide ${i + 1} failed: ${e.message}`);
        // Fallback: use still image as video
        slideFiles.push(imgPath);
      }
    }
    
    // 4. Concatenate all slide segments into final video
    const concatPath = path.join(OUTDIR, `${video.name}_concat.txt`);
    const lines = slideFiles.map(f => `file '${f.replace(/\\/g, '/')}'`);
    fs.writeFileSync(concatPath, lines.join('\n'));
    
    const finalPath = path.join(OUTDIR, `${video.name}.mp4`);
    const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatPath}" -c:v libx264 -pix_fmt yuv420p -r 30 -vf "scale=${WIDTH}:${HEIGHT},format=yuv420p" -movflags +faststart "${finalPath}"`;
    
    try {
      execSync(concatCmd, { stdio: 'pipe' });
      const sizeKB = (fs.statSync(finalPath).size / 1024).toFixed(0);
      console.log(`\n  🎬 Final video: ${video.name}.mp4 (${sizeKB} KB)`);
    } catch (e) {
      console.error(`  ❌ Concatenation failed: ${e.message}`);
    }
    
    // Cleanup temp files
    for (const f of slideFiles) {
      try { fs.unlinkSync(f); } catch {}
    }
    try { fs.unlinkSync(concatPath); } catch {}
    
    // Cleanup audio and image files
    const dirFiles = fs.readdirSync(OUTDIR);
    for (const f of dirFiles) {
      if (f.startsWith(video.name + '_') && (f.endsWith('.mp3') || f.endsWith('.png'))) {
        try { fs.unlinkSync(path.join(OUTDIR, f)); } catch {}
      }
    }
  }
  
  await browser.close();
  
  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('📁 Generated videos:');
  for (const video of VIDEOS) {
    const p = path.join(OUTDIR, `${video.name}.mp4`);
    if (fs.existsSync(p)) {
      const kb = (fs.statSync(p).size / 1024).toFixed(0);
      console.log(`  ✅ ${video.name}.mp4 — ${kb} KB`);
    }
  }
  console.log('='.repeat(50));
  console.log('\n🎉 Pipeline complete!');
}

generate().catch(console.error);
