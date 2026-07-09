import { ChildProcess } from "child_process"

class ProcessManager {

    private processes = new Map<string, ChildProcess>()

    add(id: string, process: ChildProcess) {

        this.kill(id)

        this.processes.set(id, process)
    }

    get(id: string) {

        return this.processes.get(id)
    }

    kill(id: string) {

        const process = this.processes.get(id)

        if (!process)
            return

        try {

            process.kill("SIGKILL")

        } catch {}

        this.processes.delete(id)
    }

    killAll() {

        for (const id of this.processes.keys()) {

            this.kill(id)
        }
    }
}

export const playerProcesses = new ProcessManager()