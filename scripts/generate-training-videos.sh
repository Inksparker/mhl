#!/bin/bash
# Generate training videos using FFmpeg
# Creates MP4 videos with slides, text, and transitions

OUTDIR="org-vault/frontend/public/training-videos"
mkdir -p "$OUTDIR"

# Video settings
WIDTH=1280
HEIGHT=720
FPS=1
BG="#111827"
TEXT_COLOR="white"
TITLE_COLOR="#60a5fa"

create_video() {
  local name=$1
  local title=$2
  shift 2
  local slides=("$@")
  
  local slide_count=${#slides[@]}
  local concat_file="$OUTDIR/${name}_concat.txt"
  rm -f "$concat_file"
  
  # Generate each slide as an image
  for i in "${!slides[@]}"; do
    local slide_text="${slides[$i]}"
    local img="$OUTDIR/${name}_slide_${i}.png"
    
    # Split title and body (format: "TITLE|BODY")
    local slide_title="${slide_text%%|*}"
    local slide_body="${slide_text#*|}"
    
    ffmpeg -y -f lavfi -i "color=c=${BG}:s=${WIDTH}x${HEIGHT}:d=1" \
      -vf "drawtext=text='${slide_title}':fontsize=48:fontcolor=${TITLE_COLOR}:x=(w-text_w)/2:y=(h-text_h)/2-80:fontfile=/Windows/Fonts/segoeui.ttf,
           drawtext=text='${slide_body}':fontsize=28:fontcolor=${TEXT_COLOR}:x=(w-text_w)/2:y=(h-text_h)/2+20:fontfile=/Windows/Fonts/segoeui.ttf" \
      -frames:v 1 "$img" 2>/dev/null
    
    echo "file '${img}'" >> "$concat_file"
    echo "duration 4" >> "$concat_file"
  done
  
  # Last slide stays for 2 more seconds
  echo "file '${OUTDIR}/${name}_slide_$((slide_count-1)).png'" >> "$concat_file"
  
  # Combine into video
  ffmpeg -y -f concat -safe 0 -i "$concat_file" \
    -c:v libx264 -pix_fmt yuv420p -r 30 \
    -vf "scale=${WIDTH}:${HEIGHT},format=yuv420p" \
    "$OUTDIR/${name}.mp4" 2>/dev/null
  
  echo "Created: ${name}.mp4 ($(du -h "$OUTDIR/${name}.mp4" | cut -f1))"
  
  # Cleanup images
  rm -f "$OUTDIR/${name}_slide_"*.png "$concat_file"
}

# ─── Video 1: Welcome ───────────────────────────────────────────
create_video "01-welcome" "Welcome to OrgVault" \
  "Welcome to OrgVault|Your company's secure storage platform" \
  "Your Company Vault|Store and share files securely with your team" \
  "Bank-Grade Security|AES-256-GCM encryption protects every file" \
  "Team Access Only|Only people in your company can see your files" \
  "Ready to Go!|Follow the steps below to start using OrgVault"

echo "Done!"
