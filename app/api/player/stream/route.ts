import { NextRequest } from "next/server";
import { spawn } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {

    const url = req.nextUrl.searchParams.get("url");

    if (!url) {

        return new Response("Missing url", {
            status: 400
        });

    }

    const audioTrack = req.nextUrl.searchParams.get("audio") ?? "0";

    const ffmpeg = spawn("ffmpeg", [

        "-hide_banner",

        "-loglevel",
        "error",

        "-i",
        url,

        "-map",
        "0:v:0",

        "-map",
        `0:a:${audioTrack}`,

        "-c:v",
        "copy",

        "-c:a",
        "aac",

        "-b:a",
        "192k",

        "-movflags",
        "frag_keyframe+empty_moov",

        "-f",
        "mp4",

        "pipe:1"

    ]);

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

        }

    });

    return new Response(stream, {

        headers: {

            "Content-Type": "video/mp4",

            "Cache-Control": "no-store",

            "Transfer-Encoding": "chunked"

        }

    });

}