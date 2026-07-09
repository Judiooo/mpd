import { spawn } from "child_process"

export async function checkFFprobe(): Promise<boolean> {

    return new Promise((resolve) => {

        const process = spawn("ffprobe", ["-version"])

        process.on("error", () => resolve(false))

        process.on("exit", (code) => resolve(code === 0))
    })
}