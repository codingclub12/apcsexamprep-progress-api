#!/usr/bin/env bash
# Downloads a social video (Reel/TikTok/Short/etc.), pulls its caption text,
# and transcribes the audio locally with Whisper. No accounts, no API keys.
#
# Usage: fetch_transcript.sh <video-url> [output-dir]
#
# On success, prints the path to a combined.md file containing the caption
# and the transcript, and leaves caption.txt / transcript.txt alongside it.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <video-url> [output-dir]" >&2
  exit 1
fi

URL="$1"
OUTDIR="${2:-$(mktemp -d -t reel-to-skill.XXXXXX)}"
mkdir -p "$OUTDIR"

echo "Working directory: $OUTDIR" >&2

for cmd in uvx; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required tool: $cmd (install uv: https://docs.astral.sh/uv/)" >&2
    exit 1
  fi
done

echo "Fetching caption/description..." >&2
uvx yt-dlp --skip-download --write-description -o "$OUTDIR/%(id)s" "$URL" >&2 || true
DESC_FILE=$(find "$OUTDIR" -maxdepth 1 -name '*.description' | head -n1 || true)
if [ -n "${DESC_FILE:-}" ] && [ -f "$DESC_FILE" ]; then
  cp "$DESC_FILE" "$OUTDIR/caption.txt"
else
  echo "(no caption/description found)" > "$OUTDIR/caption.txt"
fi

echo "Downloading and extracting audio..." >&2
uvx yt-dlp -x --audio-format mp3 -o "$OUTDIR/audio.%(ext)s" "$URL" >&2
AUDIO_FILE=$(find "$OUTDIR" -maxdepth 1 -name 'audio.*' | head -n1)
if [ -z "${AUDIO_FILE:-}" ]; then
  echo "Audio extraction failed: no audio file produced" >&2
  exit 1
fi

echo "Transcribing with Whisper locally (this can take a minute)..." >&2
uvx --with openai-whisper --from openai-whisper whisper "$AUDIO_FILE" \
  --model base --output_format txt --output_dir "$OUTDIR" --fp16 False >&2

TRANSCRIPT_FILE=$(find "$OUTDIR" -maxdepth 1 -name 'audio.txt' | head -n1)
if [ -z "${TRANSCRIPT_FILE:-}" ]; then
  echo "Transcription failed: no transcript produced" >&2
  exit 1
fi
cp "$TRANSCRIPT_FILE" "$OUTDIR/transcript.txt"

{
  echo "# Caption / description"
  echo
  cat "$OUTDIR/caption.txt"
  echo
  echo "# Transcript"
  echo
  cat "$OUTDIR/transcript.txt"
} > "$OUTDIR/combined.md"

echo "$OUTDIR/combined.md"
