/**
 * Generate MP4 training videos from slide data
 * Pipeline: HTML slides → Puppeteer screenshots → FFmpeg video
 */
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTDIR = path.resolve('org-vault/frontend/public/training-videos');
const WIDTH = 1280;
const HEIGHT = 720;

if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

const SLIDE_HTML = (icon, title, textColor, body) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${WIDTH}px;height:${HEIGHT}px;display:flex;align-items:center;justify-content:center;
background:linear-gradient(135deg,#1f2937,#111827);font-family:'Segoe UI',system-ui,sans-serif;color:#fff;overflow:hidden}
.grid{position:absolute;inset:0;opacity:.03;background-image:radial-gradient(circle,#fff 1px,transparent 1px);background-size:24px 24px}
.content{position:relative;text-align:center;max-width:700px;padding:40px}
.icon{font-size:72px;margin-bottom:20px;line-height:1}
.title{font-size:36px;font-weight:700;color:${textColor};margin-bottom:16px}
.body{font-size:22px;color:#d1d5db;line-height:1.5}
</style></head><body>
<div class="grid"></div>
<div class="content">
  <div class="icon">${icon}</div>
  <div class="title">${title}</div>
  <div class="body">${body}</div>
</div></body></html>`;

const VIDEOS = [
  {
    name: '01-welcome',
    slides: [
      { icon: '🔐', title: 'Welcome to OrgVault', color: '#4ade80', body: 'Your company\'s secure storage platform' },
      { icon: '🏢', title: 'Your Company Vault', color: '#60a5fa', body: 'Store, organize, and share files securely with your team' },
      { icon: '🔒', title: 'Bank-Grade Security', color: '#a78bfa', body: 'Every file is encrypted with AES-256-GCM before storage' },
      { icon: '👥', title: 'Team Access Only', color: '#fbbf24', body: 'Only people in your company can see your files' },
      { icon: '✅', title: 'Ready to Go!', color: '#4ade80', body: 'Follow the steps in this lesson to get started' },
    ],
  },
  {
    name: '02-navigate',
    slides: [
      { icon: '🧭', title: 'Navigation Guide', color: '#60a5fa', body: 'Learn how to move around your OrgVault workspace' },
      { icon: '📊', title: 'Dashboard', color: '#4ade80', body: 'View your company stats — files, storage, and recent activity' },
      { icon: '📁', title: 'Files Page', color: '#fbbf24', body: 'Upload, organize, and find all your documents' },
      { icon: '🗄️', title: 'Data Records', color: '#a78bfa', body: 'Work with structured data in custom tables' },
      { icon: '🏢', title: 'Company Selector', color: '#60a5fa', body: 'Use the dropdown in the header to switch company views' },
    ],
  },
  {
    name: '03-upload',
    slides: [
      { icon: '📤', title: 'Uploading Files', color: '#60a5fa', body: 'Let\'s get your first files into OrgVault' },
      { icon: '🖱️', title: 'Drag & Drop', color: '#4ade80', body: 'Drag files from your computer onto the upload zone, or click to browse' },
      { icon: '📂', title: 'Use Folders', color: '#fbbf24', body: 'Type a folder name like "invoices" or "reports/2024" to organize' },
      { icon: '🏷️', title: 'Add Tags', color: '#a78bfa', body: 'Add comma-separated tags for quick filtering later' },
      { icon: '🔐', title: 'Encrypted & Stored', color: '#4ade80', body: 'Your file is now encrypted with AES-256 and stored securely' },
    ],
  },
  {
    name: '04-organize',
    slides: [
      { icon: '📂', title: 'Stay Organized', color: '#4ade80', body: 'Folders and tags make finding files effortless' },
      { icon: '📁', title: 'Folder Navigation', color: '#60a5fa', body: 'Click any folder card to filter files within that folder' },
      { icon: '🏷️', title: 'Tag Filtering', color: '#fbbf24', body: 'Click any tag on a file to see all files with that label' },
      { icon: '🔄', title: 'Breadcrumb Trail', color: '#a78bfa', body: 'Use the breadcrumb at the top to navigate back up' },
    ],
  },
  {
    name: '05-search',
    slides: [
      { icon: '🔍', title: 'Quick Search', color: '#60a5fa', body: 'The search bar finds files by name instantly' },
      { icon: '⌨️', title: 'Live Results', color: '#4ade80', body: 'Results update as you type — no need to press Enter' },
      { icon: '🏷️', title: 'Combine Filters', color: '#fbbf24', body: 'Search + tag filters = laser-precise results' },
      { icon: '🧹', title: 'Clear & Retry', color: '#a78bfa', body: 'Can\'t find something? Clear all filters and try different terms' },
    ],
  },
  {
    name: '06-download',
    slides: [
      { icon: '⬇️', title: 'File Actions', color: '#60a5fa', body: 'Hover over any file to reveal download and delete buttons' },
      { icon: '📥', title: 'Download Files', color: '#4ade80', body: 'Click Download — files are automatically decrypted' },
      { icon: '🗑️', title: 'Delete Files', color: '#f87171', body: 'Click Delete and confirm to remove files you no longer need' },
      { icon: '💾', title: 'Frees Up Space', color: '#fbbf24', body: 'Deleting files frees up storage for your company' },
    ],
  },
  {
    name: '07-records',
    slides: [
      { icon: '🗄️', title: 'Data Records', color: '#60a5fa', body: 'A flexible database for your company\'s structured data' },
      { icon: '➕', title: 'Adding Records', color: '#4ade80', body: 'Click Add Record and enter data in JSON format' },
      { icon: '✏️', title: 'Edit & Delete', color: '#fbbf24', body: 'Hover over any record to edit or delete it' },
      { icon: '📋', title: 'Copy & Reuse', color: '#a78bfa', body: 'Use the Copy button to duplicate records as templates' },
    ],
  },
  {
    name: '08-storage',
    slides: [
      { icon: '📊', title: 'Storage Limits', color: '#60a5fa', body: 'Your company has a storage limit set by your administrator' },
      { icon: '📈', title: 'Monitor Usage', color: '#fbbf24', body: 'Check your Dashboard or Settings for current usage' },
      { icon: '🔵', title: 'Blue = Healthy', color: '#60a5fa', body: 'Under 70% — plenty of space available' },
      { icon: '🟡', title: 'Amber = Warning', color: '#fbbf24', body: '70-90% — time to clean up old files' },
      { icon: '🔴', title: 'Red = Critical', color: '#f87171', body: 'Over 90% — uploads may be blocked! Contact your admin' },
    ],
  },
  {
    name: '09-security',
    slides: [
      { icon: '🔐', title: 'Security First', color: '#4ade80', body: 'OrgVault protects your data with enterprise-grade security' },
      { icon: '🔒', title: 'File Encryption', color: '#60a5fa', body: 'AES-256-GCM — every file is scrambled before storage' },
      { icon: '🔑', title: 'Password Protection', color: '#a78bfa', body: 'Argon2id hashing — no one can see your password' },
      { icon: '⏰', title: 'Session Security', color: '#fbbf24', body: '24-hour sessions with automatic token rotation' },
      { icon: '✅', title: 'You\'re Protected!', color: '#4ade80', body: 'Your data is safe and secure in OrgVault' },
    ],
  },
];

async function generate() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  for (const video of VIDEOS) {
    console.log(`\n📹 Generating: ${video.name}`);
    const concatLines = [];

    for (let i = 0; i < video.slides.length; i++) {
      const s = video.slides[i];
      const html = SLIDE_HTML(s.icon, s.title, s.color, s.body);
      const imgPath = path.join(OUTDIR, `${video.name}_${i}.png`);

      await page.setContent(html);
      await page.screenshot({ path: imgPath, type: 'png' });
      console.log(`  Slide ${i + 1}/${video.slides.length}: ${s.title}`);

      concatLines.push(`file '${imgPath.replace(/\\/g, '/')}'`);
      concatLines.push('duration 4');
    }

    // Hold last slide
    concatLines.push(`file '${OUTDIR.replace(/\\/g, '/')}/${video.name}_${video.slides.length - 1}.png'`);

    // Write concat file
    const concatPath = path.join(OUTDIR, `${video.name}.txt`);
    fs.writeFileSync(concatPath, concatLines.join('\n'));

    // Generate video with FFmpeg
    const videoPath = path.join(OUTDIR, `${video.name}.mp4`);
    const cmd = `ffmpeg -y -f concat -safe 0 -i "${concatPath}" -c:v libx264 -pix_fmt yuv420p -r 30 -vf "scale=${WIDTH}:${HEIGHT},format=yuv420p" "${videoPath}"`;
    
    try {
      execSync(cmd, { stdio: 'pipe' });
      const size = (fs.statSync(videoPath).size / 1024).toFixed(0);
      console.log(`  ✅ Created: ${video.name}.mp4 (${size} KB)`);
    } catch (e) {
      console.error(`  ❌ Failed: ${e.message}`);
    }

    // Cleanup
    for (let i = 0; i < video.slides.length; i++) {
      try { fs.unlinkSync(path.join(OUTDIR, `${video.name}_${i}.png`)); } catch {}
    }
    try { fs.unlinkSync(concatPath); } catch {}
  }

  await browser.close();
  console.log('\n🎉 All videos generated in:', OUTDIR);
}

generate().catch(console.error);
