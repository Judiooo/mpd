import { NextRequest } from "next/server";
import { spawn } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
        return new Response("Missing url", { status: 400 });
    }

    const audioTrack = Number(req.nextUrl.searchParams.get("audio") ?? "0");
    const subtitleTrackParam = req.nextUrl.searchParams.get("subtitle");
    const subtitleTrack = subtitleTrackParam ? Number(subtitleTrackParam) : null;
    const startTime = Number(req.nextUrl.searchParams.get("start") ?? "0");

    const args = ["-hide_banner", "-loglevel", "error"];
    if (!Number.isNaN(startTime) && startTime > 0) {
        args.push("-ss", String(startTime));
    }

    args.push("-i", url, "-map", "0:v:0", "-map", `0:a:${Number.isNaN(audioTrack) ? 0 : audioTrack}`);

    if (subtitleTrack !== null && !Number.isNaN(subtitleTrack)) {
        args.push("-map", `0:s:${subtitleTrack}`);
        args.push("-c:s", "mov_text");
    } else {
        args.push("-sn");
    }

    args.push(
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "frag_keyframe+empty_moov+faststart",
        "-f",
        "mp4",
        "pipe:1",
    );

    const ffmpeg = spawn("ffmpeg", args);
    const stream = new ReadableStream({
        start(controller) {
            ffmpeg.stdout.on("data", (chunk) => {
                controller.enqueue(chunk);
            });

            ffmpeg.stdout.on("end", () => {
                controller.close();
            });

            ffmpeg.stderr.on("data", (chunk) => {
                console.error(chunk.toString());
            });

            ffmpeg.on("close", () => {
                controller.close();
            });

            ffmpeg.on("error", (err) => {
                controller.error(err);
            });
        },
        cancel() {
            ffmpeg.kill("SIGKILL");
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "video/mp4",
            "Cache-Control": "no-store",
            "Transfer-Encoding": "chunked",
        },
    });
}
