"""Encode original runtime frames. FFmpeg is optional for Astro builds."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--frames', type=Path, required=True)
parser.add_argument('--output', type=Path, default=Path('public/media'))
args = parser.parse_args()
ffmpeg = os.environ.get('FFMPEG_BIN') or shutil.which('ffmpeg')
if not ffmpeg:
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
args.output.mkdir(parents=True, exist_ok=True)
result = []
for scene in ['cave', 'alba']:
    frames = sorted(args.frames.glob(f'{scene}-*.png'))
    if len(frames) != 64:
        raise ValueError(f'{scene}: expected 64 original frames, found {len(frames)}')
    output = args.output / f'{scene}-loop.mp4'
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '12', '-i', str(args.frames / f'{scene}-%03d.png'), '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)], check=True)
    result.append({'scene': scene, 'frames': 64, 'fps': 12, 'size': [960, 540], 'codec': 'H.264', 'bytes': output.stat().st_size})
print(json.dumps(result, indent=2))
