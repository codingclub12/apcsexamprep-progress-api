---
name: reel-to-skill
description: Turns a short-form video link (Instagram Reel, TikTok, YouTube Short, or similar "here's how I did X" clip) into a brand new, working Claude Code skill by downloading it, transcribing it locally, and handing the workflow it describes to the official skill-creator. Use this whenever the user shares a reel/TikTok/short link and asks to turn it into a skill, save the workflow it shows, or "make this a Claude Code thing" - even if they just paste the URL with something like "can you build this" or "make this repeatable". Also use when the user describes a video they watched (not just a link) and wants the technique it teaches turned into a reusable skill.
---

# Reel to Skill

Some of the best Claude Code workflows show up first as a 60-second video, not
a spec. This skill closes that gap: point it at a link, and it produces a
draft skill built from what the video actually demonstrates, using
skill-creator to do the actual skill-authoring so its quality bar and
conventions carry over automatically.

This skill's job stops at "produce a good, faithful transcript of the
workflow and start skill-creator on it." It does not draft SKILL.md itself,
run evals, or optimize triggering - skill-creator already does all of that
well, and reimplementing it here would just drift out of sync.

## Why local transcription

Whisper runs locally and free via `uvx`, no API key and no audio ever leaves
the machine. That matters for reels that might contain personal or
unreleased material the user hasn't published anywhere else - don't reach for
a hosted transcription API for this.

## Steps

1. **Get the URL.** If the user only described the video, ask for the link -
   a transcript beats a secondhand summary because it catches the exact
   commands, flags, and tool names the creator used, which are easy to
   mishear or paraphrase wrong from memory.

2. **Download, extract caption, and transcribe.** Run the bundled script:

   ```bash
   scripts/fetch_transcript.sh "<video-url>"
   ```

   This uses `uvx yt-dlp` to grab the video's caption/description text (the
   creator's own summary is often the clearest one-line statement of intent)
   and to extract the audio track, then transcribes that audio locally with
   `uvx ... whisper`. It needs `uv` installed (https://docs.astral.sh/uv/)
   and `ffmpeg` on PATH (yt-dlp and Whisper both shell out to it). Neither
   yt-dlp nor Whisper needs an account or API key for public content.

   The script prints the path to a `combined.md` with the caption followed by
   the transcript. Read that file.

   If the download or transcription fails (private/deleted video, no
   `ffmpeg`, geo-restriction, captioning off), say so plainly and ask the
   user for a transcript or a description of the steps instead of retrying
   blindly - don't burn multiple attempts against a source that's genuinely
   unreachable.

3. **Read the transcript before doing anything else with it.** A raw
   transcript is usually messy: filler words, a hook before the actual
   content starts, a sponsor read in the middle. Skim it yourself and form a
   clear picture of the actual workflow - the concrete tools, commands, and
   sequence of steps the creator used - before passing anything along.
   skill-creator will do its own interview, but it works far better when the
   opening context already states the workflow plainly instead of handing it
   a wall of spoken-word transcript to parse cold.

4. **Hand it to skill-creator.** Invoke the `skill-creator` skill and open
   with a short, clean statement of the workflow you extracted (not the raw
   transcript dump), then include the transcript underneath for reference:

   ```
   I want to turn a video into a new Claude Code skill. Here's the workflow
   it demonstrates: <your own 2-4 sentence summary of what the creator did,
   in order>.

   Raw transcript + caption for reference:
   <contents of combined.md>
   ```

   Let skill-creator run its normal process from there - the interview, the
   draft, test cases, evals if warranted. Don't skip steps of skill-creator's
   process or pre-answer its interview questions on the user's behalf; the
   video is a starting point; the user may want to adjust scope, naming, or
   triggering once they see the draft.

5. **Report back.** Once skill-creator finishes, tell the user what skill got
   created and where it lives, and mention anything skill-creator flagged
   about how it interpreted the video (e.g., steps it skipped, dependencies
   it substituted).

## Notes

- `fetch_transcript.sh` downloads to a temp directory by default (or pass a
  second argument to control where). Video/audio files can be large - clean
  the directory up once the transcript is captured if it's not otherwise
  useful.
- Whisper's `base` model is the default in the script: fast and free, and
  accurate enough for spoken tutorial narration. Only reach for a bigger
  model (edit the `--model` flag) if the transcript comes back garbled -
  heavy accents, music over dialogue, multiple overlapping speakers.
- This skill only ever fetches content the user gives a URL for. Don't go
  looking for "similar videos" or a creator's other content on your own.
