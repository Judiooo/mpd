import { spawn } from "child_process"

export function createFFmpeg(args: string[]) {

    return spawn("ffmpeg", args, {

        stdio: [
            "ignore",
            "pipe",
            "pipe"
        ]
    })
}

export async function checkFFmpeg(): Promise<boolean> {

    return new Promise((resolve) => {

        const process = spawn("ffmpeg", ["-version"])

        process.on("error", () => resolve(false))

        process.on("exit", (code) => resolve(code === 0))
    })
}