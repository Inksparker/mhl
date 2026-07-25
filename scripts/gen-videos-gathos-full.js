/**
 * Full Gathos Pipeline: AI Image + TTS + Video Animation
 * Uses Gathos ti2av mode for animated training clips with voiceover
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const GATHOS_URL = 'https://gathos.com/api/v1';
const IMG_KEY = 'img_live_tuST6NYgnE0U1Lm8ZL9oEXjyoXzU35bD';
const VID_KEY = 'vid_live_Uea5PmMQOPSrECNF2RvkbCe6prtlEOwY';
const TTS_KEY = 'tts_live_W05edh2izM9E-zmFz8YS8igSX9GhqExp';
const OUTDIR = 'frontend/public/training-videos';

function api(method, endpoint, key, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      method,
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }
    };
    const req = https.request(`${GATHOS_URL}${endpoint}`, opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { reject(new Error(d.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function poll(jobId, key, type) {
  const endpoint = type === 'image' ? `/image-generation/jobs/${jobId}` : `/video-generation/jobs/${jobId}`;
  for (let i = 0; i < 90; i++) {
    const data = await api('GET', endpoint, key);
    if (data.status === 'completed' || data.status === 'done') return data;
    if (data.status === 'failed') throw new Error(`${type} failed: ${data.error || 'unknown'}`);
    await new Promise(r => setTimeout(r, type === 'image' ? 3000 : 7000));
  }
  throw new Error(`${type} timed out`);
}

function download(url, path) {
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: false }, res => {
      const file = fs.createWriteStream(path);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

const prompts = [
  {
    name: '01-welcome',
    image: 'A professional dark-mode dashboard interface with security shield icon, showing file statistics and storage metrics. Clean modern UI with blue and purple gradient accents.',
    narration: 'Welcome to OrgVault, your company secure storage platform. Store, organize, and share files with your team. Every file is encrypted with AES-256-GCM, providing bank-grade security. Only people in your company can access your files. Follow the steps ahead to get started.'
  },
  {
    name: '02-navigate',
    image: 'A clean sidebar navigation menu with icons for Dashboard, Files, Data Records, Companies, Users, and Settings. Modern dark sidebar with white icons and blue active state.',
    narration: 'Let us learn to navigate OrgVault. The left sidebar contains everything you need. The Dashboard shows your company stats. Files is where you manage documents. Data Records handles structured data. Use the company selector at the top to switch views.'
  },
  {
    name: '03-upload',
    image: 'A file upload interface with a dashed drop zone area, an upload button, and a search bar. Files listed in a table below with name, size, date, and action columns.',
    narration: 'Uploading files is simple. Drag and drop files from your computer onto the upload zone, or click to browse. Organize with folders and tags for easy retrieval. Your files are encrypted before storage, keeping them secure at all times.'
  },
];

async function generate() {
  console.log('🎬 Gathos Full Pipeline — Animated Training Videos\n');
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

  for (const p of prompts) {
    console.log(`\n📹 ${p.name}`);
    
    // Step 1: Generate AI image
    console.log('  🖼️  Generating image...');
    const imgJob = await api('POST', '/image-generation', IMG_KEY, {
      prompt: p.image,
      width: 1280, height: 720,
      steps: 12, guidance_scale: 1.0,
      use_prompt_enhancer: true,
      seed: -1
    });
    
    const imgResult = await poll(imgJob.job_id, IMG_KEY, 'image');
    const imgB64 = imgResult.result?.image_base64 || imgResult.result?.image;
    const imgPath = path.join(OUTDIR, `${p.name}_img.png`);
    fs.writeFileSync(imgPath, Buffer.from(imgB64, 'base64'));
    console.log('  ✅ Image generated');

    // Step 2: Upload image to tmpfiles for public URL
    console.log('  📤 Uploading image...');
    const { execSync } = require('child_process');
    const curlCmd = `curl -sk -F "file=@${imgPath}" https://tmpfiles.org/api/v1/upload`;
    const uploadResult = execSync(curlCmd, { encoding: 'utf8' });
    let publicUrl = '';
    try {
      const data = JSON.parse(uploadResult);
      publicUrl = data.data?.url || data.url || '';
      if (publicUrl && !publicUrl.includes('/dl/')) {
        publicUrl = publicUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      }
    } catch {}
    
    if (!publicUrl) {
      console.log('  ⚠️  Upload failed, using static image');
      continue;
    }
    console.log(`  ✅ Uploaded: ${publicUrl.substring(0, 50)}...`);

    // Step 3: Generate animated video with TTS
    console.log('  🎬 Generating animated video...');
    const vidJob = await api('POST', '/video-generation', VID_KEY, {
      prompt: `Professional software tutorial video showing ${p.name.replace('-', ' ')}. Smooth camera motion, clean interface, modern design. No text on screen.`,
      mode: 'ti2av',
      image_url: publicUrl,
      width: 1280, height: 720,
      num_frames: 120,
      generate_audio: true,
      prevent_text: true,
      seed: -1
    });
    
    const vidResult = await poll(vidJob.job_id, VID_KEY, 'video');
    const vidUrl = vidResult.video_url || vidResult.result?.video_url;
    
    if (vidUrl) {
      const vidPath = path.join(OUTDIR, `${p.name}.mp4`);
      await download(vidUrl, vidPath);
      const kb = (fs.statSync(vidPath).size / 1024).toFixed(0);
      console.log(`  ✅ Video: ${kb} KB`);
    } else {
      console.log('  ⚠️  No video URL in result');
    }

    // Cleanup image
    try { fs.unlinkSync(imgPath); } catch {}
  }
  
  console.log('\n🎉 Pipeline complete!');
}

generate().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
