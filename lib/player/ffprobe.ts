import { spawn } from "child_process";

export type MediaStreamType = "video" | "audio" | "subtitle";

export interface MediaTrack {
index: number;
codec: string;
language: string;
title: string;
channels?: number;
width?: number;
height?: number;
duration?: number;
}

export interface MediaInfo {
duration: number;
bitrate: number;
videoCodec: string;
width: number;
height: number;
audioTracks: MediaTrack[];
subtitleTracks: MediaTrack[];
}

interface FFprobeStream {
index?: number;
codec_type?: MediaStreamType;
codec_name?: string;
channels?: number;
width?: number;
height?: number;
tags?: {
language?: string;
title?: string;
};
}

interface FFprobeFormat {
duration?: string;
bit_rate?: string;
}

interface FFprobeResult {
streams?: FFprobeStream[];
format?: FFprobeFormat;
}

function normalizeLanguage(value?: string): string {
if (!value) return "und";
return value.trim() || "und";
}

function normalizeTitle(value?: string): string {
if (!value) return "";
return value.trim();
}

function runFFprobe(input: string): Promise<FFprobeResult> {
return new Promise((resolve, reject) => {
const proc = spawn("ffprobe", [
  "-v",
  "quiet",
  "-print_format",
  "json",
  "-show_streams",
  "-show_format",
  input,
]);

let stdout = "";
let stderr = "";

proc.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
});

proc.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

proc.on("error", (err) => {
  reject(new Error(`ffprobe not available: ${err.message}`));
});

proc.on("close", (code) => {
  if (code !== 0) {
    reject(new Error(`ffprobe failed with code ${code}${stderr ? `: ${stderr}` : ""}`));
    return;
  }

  try {
    resolve(JSON.parse(stdout) as FFprobeResult);
  } catch {
    reject(new Error("Failed to parse ffprobe JSON output"));
  }
});

});
}

export async function getMediaInfo(input: string): Promise<MediaInfo> {
const data = await runFFprobe(input);

const streams = data.streams ?? [];
const format = data.format ?? {};

const videoStream = streams.find((s) => s.codec_type === "video");
const audioStreams = streams.filter((s) => s.codec_type === "audio");
const subtitleStreams = streams.filter((s) => s.codec_type === "subtitle");

const duration = Number.parseFloat(format.duration ?? "0") || 0;
const bitrate = Number.parseInt(format.bit_rate ?? "0", 10) || 0;

const audioTracks: MediaTrack[] = audioStreams.map((stream) => ({
index: stream.index ?? 0,
codec: stream.codec_name ?? "unknown",
language: normalizeLanguage(stream.tags?.language),
title: normalizeTitle(stream.tags?.title),
channels: stream.channels ?? 0,
}));

const subtitleTracks: MediaTrack[] = subtitleStreams.map((stream) => ({
index: stream.index ?? 0,
codec: stream.codec_name ?? "unknown",
language: normalizeLanguage(stream.tags?.language),
title: normalizeTitle(stream.tags?.title),
}));

return {
duration,
bitrate,
videoCodec: videoStream?.codec_name ?? "unknown",
width: videoStream?.width ?? 0,
height: videoStream?.height ?? 0,
audioTracks,
subtitleTracks,
};
}
