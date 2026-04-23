import tls from "tls";
import { ContactMessage } from "@/lib/contact-db";

type ImapConfig = {
    host: string;
    port: number;
    user: string;
    pass: string;
    mailbox: string;
};

function readImapConfig(): ImapConfig | null {
    const host = process.env.IMAP_HOST?.trim();
    const user = process.env.IMAP_USER?.trim();
    const pass = process.env.IMAP_PASS?.trim();
    const port = Number(process.env.IMAP_PORT || "993");
    const mailbox = (process.env.IMAP_MAILBOX || "INBOX").trim();

    if (!host || !user || !pass || Number.isNaN(port)) {
        return null;
    }

    return {
        host,
        port,
        user,
        pass,
        mailbox,
    };
}

class ImapClient {
    private socket: tls.TLSSocket;
    private buffer = "";
    private tagCounter = 1;

    constructor(socket: tls.TLSSocket) {
        this.socket = socket;
    }

    static async connect(config: ImapConfig) {
        const socket = tls.connect({
            host: config.host,
            port: config.port,
            servername: config.host,
            rejectUnauthorized: process.env.NODE_ENV === "production",
        });

        const client = new ImapClient(socket);
        await client.waitForGreeting();
        return client;
    }

    private waitForGreeting() {
        return new Promise<void>((resolve, reject) => {
            const onData = (chunk: Buffer) => {
                this.buffer += chunk.toString("utf8");
                if (this.buffer.includes("\r\n")) {
                    cleanup();
                    resolve();
                }
            };

            const onError = (error: Error) => {
                cleanup();
                reject(error);
            };

            const cleanup = () => {
                this.socket.off("data", onData);
                this.socket.off("error", onError);
            };

            this.socket.on("data", onData);
            this.socket.on("error", onError);
        });
    }

    async command(command: string): Promise<string> {
        const tag = `A${String(this.tagCounter++).padStart(4, "0")}`;
        const fullCommand = `${tag} ${command}\r\n`;

        return new Promise<string>((resolve, reject) => {
            let output = "";

            const onData = (chunk: Buffer) => {
                output += chunk.toString("utf8");
                if (output.includes(`\r\n${tag} OK`) || output.startsWith(`${tag} OK`)) {
                    cleanup();
                    resolve(output);
                    return;
                }

                if (
                    output.includes(`\r\n${tag} NO`) ||
                    output.includes(`\r\n${tag} BAD`) ||
                    output.startsWith(`${tag} NO`) ||
                    output.startsWith(`${tag} BAD`)
                ) {
                    cleanup();
                    reject(new Error(`IMAP command failed: ${command}`));
                }
            };

            const onError = (error: Error) => {
                cleanup();
                reject(error);
            };

            const cleanup = () => {
                this.socket.off("data", onData);
                this.socket.off("error", onError);
            };

            this.socket.on("data", onData);
            this.socket.on("error", onError);
            this.socket.write(fullCommand);
        });
    }

    close() {
        this.socket.end();
    }
}

function escapeImapString(value: string) {
    return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function parseSearchIds(searchOutput: string): string[] {
    const lines = searchOutput.split("\r\n");
    const searchLine = lines.find((line) => line.startsWith("* SEARCH "));

    if (!searchLine) {
        return [];
    }

    return searchLine
        .replace("* SEARCH ", "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
}

export async function deleteContactMessageEmail(
    message: ContactMessage
): Promise<{ attempted: boolean; deletedCount: number }> {
    const config = readImapConfig();
    if (!config) {
        return { attempted: false, deletedCount: 0 };
    }

    const subject = `New Contact Form Message from ${message.name}`;
    const escapedSubject = escapeImapString(subject);
    const escapedEmail = escapeImapString(message.email);
    const escapedName = escapeImapString(message.name);

    const client = await ImapClient.connect(config);

    try {
        await client.command(`LOGIN "${escapeImapString(config.user)}" "${escapeImapString(config.pass)}"`);
        await client.command(`SELECT "${escapeImapString(config.mailbox)}"`);

        const searchResult = await client.command(
            `SEARCH SUBJECT "${escapedSubject}" TEXT "${escapedEmail}" TEXT "${escapedName}"`
        );
        const ids = parseSearchIds(searchResult);

        if (ids.length === 0) {
            await client.command("LOGOUT");
            return { attempted: true, deletedCount: 0 };
        }

        const targetId = ids[ids.length - 1];
        await client.command(`STORE ${targetId} +FLAGS (\\Deleted)`);
        await client.command("EXPUNGE");
        await client.command("LOGOUT");

        return { attempted: true, deletedCount: 1 };
    } finally {
        client.close();
    }
}
