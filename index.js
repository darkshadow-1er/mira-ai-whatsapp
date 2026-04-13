import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

import qrcode from "qrcode-terminal";

let restarting = false;

async function startBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState("auth");
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ["MIRA-AI", "Chrome", "1.0"],
            keepAliveIntervalMs: 30000
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log("📱 Scan QR :");
                qrcode.generate(qr, { small: true });
            }

            if (connection === "open") {
                console.log("✅ BOT CONNECTÉ ET STABLE");
                restarting = false;
            }

            if (connection === "close") {
                const code = lastDisconnect?.error?.output?.statusCode;

                const shouldReconnect =
                    code !== DisconnectReason.loggedOut;

                console.log("❌ Déconnexion. Code:", code);

                if (shouldReconnect && !restarting) {
                    restarting = true;
                    console.log("🔄 Redémarrage du bot...");

                    setTimeout(() => {
                        startBot();
                    }, 5000);
                }
            }
        });

        sock.ev.on("messages.upsert", async ({ messages }) => {
            const msg = messages[0];

            if (!msg.message || msg.key.fromMe) return;

            const text =
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text;

            if (!text) return;

            console.log("📩 Message:", text);

            await sock.sendMessage(msg.key.remoteJid, {
                text: "🤖 MIRA-AI : " + text
            });
        });

        // 🔥 Anti freeze Render
        setInterval(() => {
            console.log("💓 Alive...");
        }, 20000);

    } catch (err) {
        console.log("💥 Crash détecté :", err);

        console.log("🔄 Relance globale...");

        setTimeout(() => {
            startBot();
        }, 5000);
    }
}

// 🔥 Anti crash global Node
process.on("uncaughtException", (err) => {
    console.log("💥 uncaughtException:", err);
    startBot();
});

process.on("unhandledRejection", (err) => {
    console.log("💥 unhandledRejection:", err);
    startBot();
});

startBot();
