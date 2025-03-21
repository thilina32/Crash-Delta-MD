const fs = require('fs');
const path = require('path');
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const NodeCache = require('node-cache');
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const msgRetryCounterCache = new NodeCache();
var ctx;
var restart = true
var uData;


async function connectWhatsApp(Num = false,socket = false) {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    uData = JSON.parse(await fs.promises.readFile("setting.json", "utf8"));
    ctx = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' }))
        },
        printQRInTerminal: false,
        logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
        browser: Browsers.macOS("Safari"),
        markOnlineOnConnect: false,
        msgRetryCounterCache
    });
    if(!ctx.authState.creds.registered && Num){
        await delay(1000)
        console.log("Requesting Pairing Code for: " + Num);
        const code = await ctx.requestPairingCode(Num);
        console.log("Pairing Code: " + code);
    }else if(!ctx.authState.creds.registered){
        if(socket){
            socket.emit("getNum",true);
            restart = false;
            //ctx.end();
        }else{
            rl.question("Enter your Phone number (Eg: 9471000***): ", (number) => {
                console.log(`${number}, loading...`);
                //ctx.end();
                connectWhatsApp(number)
                rl.close();
            });
        }
    }

    ctx.ev.on('creds.update', saveCreds);

    ctx.ev.on('connection.update', async ({ connection ,lastDisconnect }) => {
        if (connection === 'open') {
            let sjid = '94719036042@s.whatsapp.net'
            if(uData.Owner.length >5){
                sjid = uData.Owner.length + '@s.whatsapp.net'
            }
            await ctx.sendMessage(sjid, { text: "\nCrash Delta MD TM (Free bot) is connected👋\n" });
            console.log('Bot started successfully.✅');
            if(uData.always_online){
                await ctx.sendPresenceUpdate('available');
            }else{
                await ctx.sendPresenceUpdate('unavailable');
            }
        } else if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to', lastDisconnect?.error, ', reconnecting:', (shouldReconnect && restart));
        
            if(shouldReconnect && restart) {
                connectWhatsApp(Num,socket);
            }else if(shouldReconnect){
                console.log("stoped✅")
            }
        }
    });

    ctx.ev.on('messages.upsert', async ({ messages }) => {
        try {
            messages.forEach( async (m) => {
                console.log(m);
                const texta = require('./plugins/texta.js');
                const d = await texta(m);
                if(!d.jid) return
                uData = JSON.parse(await fs.promises.readFile("setting.json", "utf8"));
                
                if(d.jid.includes("@s.whatsapp.net") || d.jid.includes("@g.us")){
                    if(uData.auto_recoding){
                        await ctx.sendPresenceUpdate('recording', d.jid)
                    }
                }else if(d.jid=="status@broadcast") {
                    if(uData.auto_status_seen){
                        await ctx.readMessages([m.key])
                        await delay(1000)
                        if(uData.auto_status_react){
                            const me = await ctx.user.id;

                            const emojis = [
                                '🔥', '😊', '🎉', '👍', '💫', '🥳', '✨',
                                '😎', '🌟', '❤️', '😂', '🤔', '😅', '🙌', '👏',
                                '💪', '🤩', '🎶', '💜', '👀', '🤗', '🪄', '😋',
                                '🤝', '🥰', '😻', '🆒', '🙈', '😇', '🎈', '😇', '🥳', '🧐', '🥶', '☠️', '🤓', '🤖', '👽', '🐼', '🇭🇹'
                            ];
            
                            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            
                           await ctx.sendMessage(
                                m.key.remoteJid,
                                { react: { key: m.key, text: randomEmoji } },
                                { statusJidList: [m.key.participant, me] }
                            );
                        }
                    }
                }
                
            });
        } catch (error) {
            console.error('An error occurred:', error);
        }
    });

    ctx.react = async (m, r) => {
        try {
            const reactionMessage = {
                react: {
                    text: r,
                    key: m.key,
                },
            };
            return await ctx.sendMessage(m.key.remoteJid, reactionMessage);
        } catch (error) {
            console.error('Failed to send reaction:', error);
        }
    };
}


const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { exec } = require("child_process");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

//app.use(express.static("public")); // Serve frontend files
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "log.html"));
});
app.get("/console", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
io.on("connection", (socket) => {
    //console.log("User connected");


    const originalLog = console.log;

    console.log = function (...args) {
        const logMessage = args.map(arg => 
            typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg
        ).join(" "); 

        socket.emit("output", logMessage);
        originalLog.apply(console, args); // Original console.log execute කරයි
    };

    socket.on("log", async(c) => {
        uData = JSON.parse(await fs.promises.readFile("setting.json", "utf8"));
        socket.emit("logu",(c.pw === uData.web_code));
    })
    socket.on("run-command", (cmd) => {
        exec(cmd, (error, stdout, stderr) => {
        

            if (error) {
                socket.emit("output", `Error: ${error.message}`);
                return;
            }
            if (stderr) {
                socket.emit("output", `Stderr: ${stderr}`);
                return;
            }
            socket.emit("output", stdout);
        });
    });
    socket.on("load",async(c)=>{
        socket.emit("load", (ctx?.ws?.socket?.readyState || -1)); 
        
        console.log((ctx?.ws?.socket?.readyState || -1));
        socket.emit("output", "state : "+ (ctx?.ws?.socket?.readyState || -1));

        uData = JSON.parse(await fs.promises.readFile("setting.json", "utf8"));
        socket.emit("sset",{
            auto_status_seen : uData.auto_status_seen,
            auto_recoding : uData.auto_recoding,
            auto_status_react :uData.auto_status_react,
            always_online :uData.always_online
        })
    })
    socket.on("app",(d)=>{
        if(d.start){
            restart = true;
            let pn = false
            if(d.pn){pn = d.pn}
            connectWhatsApp(pn,socket).catch((error) => {
                console.error('Error starting WhatsApp bot:', error);
            });
        }else if(d.stop){
            restart = false;
            console.log("stoping....");
            ctx.end();
        }
        setTimeout(() => {
            socket.emit("load", ctx?.ws?.socket?.readyState || -1); 
            
        }, 2000);
    })
    socket.on("sset",async(c)=>{
        console.log(c)
        uData = JSON.parse(await fs.promises.readFile("setting.json", "utf8"));
        uData[c[0]] = c[1];
        await fs.promises.writeFile("setting.json", JSON.stringify(uData, null, 4), "utf8");
    })
});

server.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});

if (fs.existsSync('session/creds.json')) {
    connectWhatsApp().catch((error) => {
        console.error('Error starting WhatsApp bot:', error);
    });
}else{
    fs.readFile("setting.json", "utf8", (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            return;
        }
        const jsonData = JSON.parse(data);
        console.log("caking setting..")
        if(jsonData.Bot_number.length > 9){
            connectWhatsApp(jsonData.Bot_number).catch((error) => {
                console.error('Error starting WhatsApp bot:', error);
            });
            
        }else if(jsonData.auto_log){
            connectWhatsApp().catch((error) => {
                console.error('Error starting WhatsApp bot:', error);
            });
        }
    });
}


