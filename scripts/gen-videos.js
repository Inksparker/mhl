const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTDIR = 'frontend/public/training-videos';
const W = 1280, H = 720;

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

const videos = [
  {
    name: '01-welcome', slides: [
      ['🔐','Welcome to OrgVault','#4ade80',"Your company's secure storage platform. Let's get started."],
      ['🏢','Your Company Vault','#60a5fa','Store, organize, and share files securely with your team members.'],
      ['🔒','Bank-Grade Security','#a78bfa','Every file is encrypted with AES-256-GCM before it touches the storage.'],
      ['👥','Team Access Only','#fbbf24','Only people in your company can see your files. Complete data isolation.'],
      ['✅','Ready to Go!','#4ade80','Follow the steps in this lesson to begin using OrgVault today.'],
    ]
  },
  {
    name: '02-navigate', slides: [
      ['🧭','Navigation Guide','#60a5fa',"Let's learn how to move around your OrgVault workspace."],
      ['📊','Your Dashboard','#4ade80','View company stats: total files, storage used, and recent activity.'],
      ['📁','The Files Page','#fbbf24','Upload, organize, and find all your documents in one place.'],
      ['🗄️','Data Records','#a78bfa','Work with structured data in custom tables for your company.'],
      ['🏢','Company Selector','#60a5fa','Use the dropdown in the header to switch between company views.'],
    ]
  },
  {
    name: '03-upload', slides: [
      ['📤','Uploading Files','#60a5fa','Get your first files into OrgVault quickly and securely.'],
      ['🖱️','Drag and Drop','#4ade80','Drag files from your computer onto the upload zone, or click to browse.'],
      ['📂','Organize with Folders','#fbbf24','Type a folder name like invoices or reports/2024 to organize your files.'],
      ['🏷️','Add Tags','#a78bfa','Add comma-separated tags like important, draft, or client name for quick filtering.'],
      ['🔐','Encrypted and Stored','#4ade80','Your file is now encrypted with AES-256 and stored securely.'],
    ]
  },
  {
    name: '04-organize', slides: [
      ['📂','Stay Organized','#4ade80','Folders and tags make finding files effortless.'],
      ['📁','Folder Navigation','#60a5fa','Click any folder card to filter files within that folder.'],
      ['🏷️','Tag Filtering','#fbbf24','Tags are clickable. Click any tag to see all files with that label.'],
      ['🔄','Breadcrumb Trail','#a78bfa','Use the breadcrumb at the top to navigate back up through folders.'],
    ]
  },
  {
    name: '05-search', slides: [
      ['🔍','Quick Search','#60a5fa','The search bar finds files by name instantly as you type.'],
      ['⌨️','Live Results','#4ade80','Results update as you type. No need to press Enter.'],
      ['🏷️','Combine Filters','#fbbf24','Search plus tag filters equals laser-precise results.'],
      ['🧹','Clear and Retry','#a78bfa',"Can't find something? Clear all filters and try different search terms."],
    ]
  },
  {
    name: '06-download', slides: [
      ['⬇️','File Actions','#60a5fa','Hover over any file to reveal download and delete action buttons.'],
      ['📥','Download Files','#4ade80','Click download. Files are automatically decrypted for you.'],
      ['🗑️','Delete Files','#f87171','Click delete and confirm to remove files you no longer need.'],
      ['💾','Frees Up Space','#fbbf24','Deleting files frees up storage for your entire company.'],
    ]
  },
  {
    name: '07-records', slides: [
      ['🗄️','Data Records','#60a5fa','A flexible database for your company structured data.'],
      ['➕','Adding Records','#4ade80','Click Add Record and enter data in JSON format. Each record is flexible.'],
      ['✏️','Edit and Delete','#fbbf24','Hover over any record to edit or delete it. Changes save instantly.'],
      ['📋','Copy and Reuse','#a78bfa','Use the copy button to duplicate records as templates for new entries.'],
    ]
  },
  {
    name: '08-storage', slides: [
      ['📊','Storage Limits','#60a5fa','Your company has a storage limit set by your administrator.'],
      ['📈','Monitor Usage','#fbbf24','Check your Dashboard or Settings page for current usage.'],
      ['🔵','Blue Means Healthy','#60a5fa','Under 70 percent usage. Plenty of space available.'],
      ['🟡','Amber Means Warning','#fbbf24','70 to 90 percent. Time to clean up old files.'],
      ['🔴','Red Means Critical','#f87171','Over 90 percent. Uploads may be blocked. Contact your admin.'],
    ]
  },
  {
    name: '09-security', slides: [
      ['🔐','Security First','#4ade80','OrgVault protects your data with enterprise-grade security.'],
      ['🔒','File Encryption','#60a5fa','AES-256-GCM. Every file is scrambled before storage.'],
      ['🔑','Password Protection','#a78bfa','Argon2id hashing. No one can see your password, not even admins.'],
      ['⏰','Session Security','#fbbf24','24-hour sessions with automatic token rotation for safety.'],
      ['✅','You Are Protected','#4ade80','Your data is safe and secure in OrgVault. You are all set.'],
    ]
  },
];

async function generate() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });

  for (const v of videos) {
    process.stdout.write(v.name + ' ');
    const segs = [];
    
    for (let i = 0; i < v.slides.length; i++) {
      const [icon, title, color, body] = v.slides[i];
      const html = slideHTML(icon, title, color, body);
      const img = path.join(OUTDIR, `${v.name}_s${i}.png`);
      const seg = path.join(OUTDIR, `${v.name}_s${i}.mp4`);
      
      await page.setContent(html);
      await page.screenshot({ path: img, type: 'png' });
      
      const cmd = `ffmpeg -y -loop 1 -i "${img}" -c:v libx264 -t 5 -pix_fmt yuv420p -vf "scale=${W}:${H},format=yuv420p" "${seg}"`;
      execSync(cmd, { stdio: 'pipe' });
      segs.push(seg);
      fs.unlinkSync(img);
      process.stdout.write('.');
    }
    
    // Concat segments
    const concatPath = path.join(OUTDIR, `${v.name}.txt`);
    // Use just filenames since concat file is in same dir as segments
    const lines = segs.map(f => `file '${path.basename(f)}'`);
    fs.writeFileSync(concatPath, lines.join('\n'));
    
    const finalPath = path.join(OUTDIR, `${v.name}.mp4`);
    const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatPath}" -c:v libx264 -pix_fmt yuv420p -r 30 -movflags +faststart "${finalPath}"`;
    execSync(concatCmd, { stdio: 'pipe' });
    
    // Cleanup
    segs.forEach(f => { try { fs.unlinkSync(f); } catch {} });
    try { fs.unlinkSync(concatPath); } catch {}
    
    const kb = (fs.statSync(finalPath).size / 1024).toFixed(0);
    console.log(` ${kb} KB`);
  }
  
  await browser.close();
  console.log('\nAll 9 videos generated!');
}

generate().catch(console.error);
