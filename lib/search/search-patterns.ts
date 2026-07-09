export const QUALITY_PATTERNS = [
  { value: '2160p', regex: /\b(2160p|4k|uhd)\b/i },
  { value: '1080p', regex: /\b(1080p|1080i|fhd|fullhd)\b/i },
  { value: '720p', regex: /\b720p\b/i },
  { value: '480p', regex: /\b(480p|dvdrip|tvrip|satrip)\b/i },
]

export const SOURCE_PATTERNS = [
  { value: 'BluRay', regex: /\b(blu-?ray|bdrip|bdremux|remux)\b/i },
  { value: 'WEB-DL', regex: /\bweb[ .-]?dl\b/i },
  { value: 'WEBRip', regex: /\bwebrip\b/i },
  { value: 'HDTV', regex: /\bhdtv\b/i },
  { value: 'DVDRip', regex: /\bdvdrip\b/i },
  { value: 'CAM', regex: /\bcam(rip)?\b/i },
  { value: 'TS', regex: /\b(ts|telesync)\b/i },
]

export const CODEC_PATTERNS = [
  { value: 'AV1', regex: /\bav1\b/i },
  { value: 'HEVC', regex: /\b(x265|h265|hevc)\b/i },
  { value: 'AVC', regex: /\b(x264|h264|avc)\b/i },
]

export const HDR_PATTERNS = [
  /\bhdr10\+\b/i,
  /\bhdr10\b/i,
  /\bhdr\b/i,
  /\bdolby.?vision\b/i,
  /\bdv\b/i,
]

export const AUDIO_PATTERNS = [
  { value: 'TrueHD', regex: /\btruehd\b/i },
  { value: 'DTS-HD MA', regex: /\bdts.?hd.?ma\b/i },
  { value: 'DTS-HD', regex: /\bdts.?hd\b/i },
  { value: 'DTS', regex: /\bdts\b/i },
  { value: 'Atmos', regex: /\batmos\b/i },
  { value: 'AAC', regex: /\baac\b/i },
  { value: 'AC3', regex: /\bac-?3\b/i },
]

export const SEASON_PATTERNS = [
  /\bs(\d{1,2})e\d{1,2}\b/i,
  /\bs(\d{1,2})\b/i,
  /\bseason\s*(\d{1,2})\b/i,
  /\b(\d{1,2})\s*season\b/i,
  /\bсезон\s*(\d{1,2})\b/i,
  /\b(\d{1,2})\s*сезон\b/i,
  /\b(\d{1,2})x\d{1,2}\b/i,
]

export const EPISODE_PATTERNS = [
  /\bs\d{1,2}e(\d{1,2})\b/i,
  /\b\d{1,2}x(\d{1,2})\b/i,
  /\bepisode\s*(\d{1,2})\b/i,
  /\bep\s*(\d{1,2})\b/i,
  /\bсерия\s*(\d{1,2})\b/i,
  /\b(\d{1,2})\s*серия\b/i,
]

export const YEAR_PATTERN = /\b(19\d{2}|20\d{2})\b/

export const TRASH_PATTERNS = [
  /\bost\b/i,
  /\bsoundtrack\b/i,
  /\btrailer\b/i,
  /\bbonus\b/i,
  /\bsample\b/i,
  /\bextras?\b/i,
  /\bcollection\b/i,
  /\bboxset\b/i,
  /\bcam\b/i,
  /\btelesync\b/i,
]