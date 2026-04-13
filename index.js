import makeWASocket, {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} from "@whiskeysockets/baileys";

let restarting = false;

async function startBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState("auth");
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            browser: ["MIRA-AI", "Chrome", "1.0"],
            keepAliveIntervalMs: 30000
        });

        sock.ev.on("creds.update", saveCreds);

        // 🔥 MET TON NUMERO ICI (format international sans +)
        const number = "257XXXXXXXX"; // exemple Burundi

        // 🔥 PAIRING CODE (UNE SEULE FOIS)
        if (!sock.authState.creds.registered) {
            const code = await sock.requestPairingCode(number);
            console.log("🔑 CODE WHATSAPP :", code);
        }

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === "open") {
                console.log("✅ MIRA-AI CONNECTÉ !");

                await sock.sendMessage(sock.user.id, {
                    text: "🤖 MIRA-AI est connecté avec succès !"
                });

                restarting = false;
            }

            if (connection === "close") {
                const code = lastDisconnect?.error?.output?.statusCode;

                const shouldReconnect =
                    code !== DisconnectReason.loggedOut;

                console.log("❌ Déconnexion. Reconnexion :", shouldReconnect);

                if (shouldReconnect && !restarting) {
                    restarting = true;

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

            console.log("📩 Message :", text);

            await sock.sendMessage(msg.key.remoteJid, {
                text: "🤖 MIRA-AI : " + text
            });
        });

        // 🔥 KEEP ALIVE
        setInterval(() => {
            console.log("💓 MIRA-AI actif...");
        }, 20000);

    } catch (err) {
        console.log("💥 Crash :", err);

        setTimeout(() => {
            startBot();
        }, 5000);
    }
}

startBot();
