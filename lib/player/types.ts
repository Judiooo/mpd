export interface AudioTrack {
    index: number
    codec: string
    language: string
    title: string
    channels: number
}

export interface SubtitleTrack {
    index: number
    codec: string
    language: string
    title: string
}

export interface VideoInfo {
    duration: number
    bitrate: number
    videoCodec: string
    width: number
    height: number
    audioTracks: AudioTrack[]
    subtitleTracks: SubtitleTrack[]
}