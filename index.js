const express = require("express");
const app = express();

const {exec} = require('child_process');
const qrcode = require("qrcode-terminal");
const fs = require("fs");
require("dotenv").config();
var QRCode = require("qrcode");
const {Client , MessageMedia, NoAuth, LocalAuth} = require("whatsapp-web.js");
const { Telegraf } = require("telegraf");
const config = require("./config");
const alive = require('./modules/alive');
const handleMessage = require("./handlers/handleMessage");
const handleCreateMsg = require("./handlers/handleCreateMsg");
const handleTgBot = require("./handlers/handleTgbot");
const {setHerokuVar , errorMsg} = require("./modules/heroku");

const tgbot = new Telegraf(config.TG_BOT_TOKEN);

var path = require('path');

// Set bot commands. 
const cmd = (cmd, desc) => ({command: cmd, description: desc});
tgbot.telegram.setMyCommands([cmd('start', 'Start bot.'), cmd('mar', 'Mark message as read.'), cmd('send', 'Ex: /send ph_no message'), cmd('update', 'Update UB.'), cmd('restart', 'Restart ub.')]);

const client = new Client({
  puppeteer: { headless: true, args: ["--no-sandbox"] },
  authStrategy: new LocalAuth({ clientId: "whatsbot" }),
});

async function generateQr() {
  client.on("qr", async (qr) => {
    await console.log("Kindly check your telegram bot for QR Code.");
    await QRCode.toFile("qr.png", qr);
    await tgbot.telegram.sendPhoto(
      config.TG_OWNER_ID, { source: "qr.png" } , { caption: "Scan it in within 20 seconds...." }
    );
    await qrcode.generate(qr, { small: true });
    setTimeout(() => {
      console.log("Didn't found any response, exiting...");
      return 
    }, 90 * 1000);
  });

  client.on("authenticated", async (session) => { // Take action when user Authenticated successfully.
    sessionData = await session;
    await console.log( JSON.stringify(session) + "\n\nCopy above session and set it to heroku vars as SESSION_DATA" );
  });

  client.on("logout", () => { // Take action when user logout.
    console.log( "Looks like you've been logged out. Please generate session again." );
    if (fs.existsSync("session.json")) fs.unlinkSync("session.json");
  });
}

console.log("Session data not found. Generating QR please wait...");
  generateQr();

client.on("auth_failure" , reason => { // If failed to log in.
  const message = 'Failed to authenticate the client. Please fill env var again or generate session.json again. Generating session data again...';
  console.log(message);
  tgbot.telegram.sendMessage(config.TG_OWNER_ID , message ,
    {disable_notification: true})
  generateQr();
})

client.on("ready", () => { // Take actin when client is ready.
  const message = "Successfully logged in. Ready to rock!";
  console.log(message);
  tgbot.telegram.sendMessage( config.TG_OWNER_ID, message, {disable_notification: true});
  if (fs.existsSync("qr.png")) fs.unlinkSync("qr.png");
});
// Telegram Bot
tgbot.start(ctx => ctx.replyWithMarkdown(`Hey **${ctx.message.from.first_name}**, Welcome! \nI can notify you about new messages of WhatsApp. \n\nPowered by [WhatsGram](https://github.com/acessrdpgg/WhatsGram).`,
  {disable_web_page_preview: true,
   reply_markup:{
    inline_keyboard: [[{text:'WhatsGram Repo', url:'https://github.com/acessrdpgg/WhatsGram'},{text:'YouTube', url:'https://youtube.com/intotechmods'}],
                      [{text:'Developer', url:'https://t.me/BeastAvin'}, {text:'TG Channel', url:'https://t.me/aspcheat'}]]
  }}
));

/*
tgbot.command('TG Channel', ctx => { // Donate Command
  ctx.replyWithMarkdown('Thank you for showing intrest in donating! \nYou can donate me using following methods 👇\n\n*UPI Address*: `siddiquiaffan201@okaxis` \n\nOr you can use following links.',
  {disable_web_page_preview: true,
   reply_markup:{
     inline_keyboard: [[{text: 'Ko-fi', url: 'https://ko-fi.com/affanthebest'}, {text: 'Paypal', url: 'https://paypal.me/affanthebest'}]]
  }})
});
*/

const restart = async (ctx) => {
  if (ctx) await ctx.replyWithMarkdown('Restarting...', {disable_notification: true})
  else tgbot.telegram.sendMessage(config.TG_OWNER_ID, 'Restarting...', {disable_notification: true})
  await client.destroy();
  await client.initialize();
}
tgbot.command('restart', ctx => restart(ctx)); // Restart WhatsApp Client using TG Bot.
setInterval(() => restart(), 1000 * 60 * 60 * 12); // Auto restart WhatsApp client every 12 hours.

tgbot.on("message", (ctx) => { // Listen TG Bot messages and take action
  handleTgBot(ctx , client , MessageMedia);
});

client.on("message", async (message) => { // Listen incoming WhatsApp messages and take action
  handleMessage(message , config.TG_OWNER_ID , tgbot, client);
});

client.on('message_create' , async (msg) => { 
  if (msg.body == "!alive") { // Alive command
    msg.delete(true)
    let chat = await msg.getChat();
    var aliveMsgData = await alive(await client.info.getBatteryStatus());
    client.sendMessage(msg.to, new MessageMedia(aliveMsgData.mimetype, aliveMsgData.data, aliveMsgData.filename), { caption: aliveMsgData.startMessage })
  } else {
    if(msg.body.startsWith("!")) {
	try {
	    handleCreateMsg(msg, client , MessageMedia);
	} catch (error) {
            console.log(error);
        }
    }
  }
})

const getMediaInfo = (msg) => {
  switch (msg.type) {
      case 'image': return { fileName: 'image.png', tgFunc: tgbot.telegram.sendPhoto.bind(tgbot.telegram) }; break;
      case 'video': return { fileName: 'video.mp4', tgFunc: tgbot.telegram.sendVideo.bind(tgbot.telegram) }; break;
      case 'audio': return { fileName: 'audio.m4a', tgFunc: tgbot.telegram.sendAudio.bind(tgbot.telegram) }; break;
      case 'ptt': return { fileName: 'voice.ogg', tgFunc: tgbot.telegram.sendVoice.bind(tgbot.telegram) }; break;
      case 'sticker': return { fileName: 'sticker.webp', tgFunc: tgbot.telegram.sendDocument.bind(tgbot.telegram) }; break;
      default: return { fileName: 'tmp.txt', tgFunc: tgbot.telegram.sendDocument.bind(tgbot.telegram) }; break;
  }
}
/*
client.on('media_uploaded', async (msg) => {
    //if(config.SELF_LOGS != "true") return;
    
    var chat = await msg.getChat();
    const name = `${chat.isGroup ? `[GROUP] ${chat.name}`
                : `<a href="https://wa.me/${msg.to.split("@")[0]}?chat_id=${msg.to.split("@")[0]}&message_id=${msg.id.id}"><b>${chat.name}</b></a>`
                }`;

    const dlmedia = await msg.downloadMedia();
    console.log('Media uploaded: '+dlmedia);
    if(dlmedia) {
        const mediaInfo = await getMediaInfo(msg);
        const fname = './' + (dlmedia.filename || mediaInfo.fileName).replaceAll(' ', '_');
        const messageData = {
	    document: { source: fname },
	    options: { caption: 'You -> ' + name + (msg.body ? '\n\n<b>Caption:</b>\n\n' + msg.body : ''), disable_web_page_preview: true, parse_mode: "HTML" }
        }
        console.log('FileName: '+fname);
        fs.writeFile(fname, dlmedia.data, "base64", (err) => {
	if(err) console.log(err);
	else mediaInfo.tgFunc(config.TG_OWNER_ID, messageData.document, messageData.options)
				.then(() => { exec('rm '+fname, (data, err) => { if(err) console.log(err); }) });
        });
    }
})
*/

client.on('incoming_call', async (callData) => {
    tgbot.telegram.sendMessage(config.TG_OWNER_ID, 
        '<b>CALL RECIEVED :</b>' + '\n\n' +
        '<b>By (ID) : </b><code>' + callData.id + '</code>\n' +
        '<b>Who called (peerJid) : </b><code>' + callData.peerjid + '</code>\n' +
        '<b>Is Video Call : </b><code>' + callData.isVideo + '</code>\n' +
        '<b>Is Group : </b><code>' + callData.isGroup + '</code>\n' +
        '<b>CanHandleLocally : </b><code>' + callData.canHandleLocally + '</code>\n' +
        '<b>Is Outgoing : </b><code>' + callData.isOutgoing + '</code>\n' +
        '<b>webClientShouldHandle : </b><code>' + callData.webClientShouldHandle + '</code>\n' +
        ((callData.participants) ? '<b>Participants : </b><code>' + callData.participants + '</code>' : '')
        , { parse_mode: "HTML" });
})

client.on("disconnect", (issue) => {
  console.log( "WhatsApp has been disconnected due to" + issue + ". Please restart your dyno or do npm start." );
}); 

tgbot.launch(); // Initialize Telegram Bot
client.initialize(); // Initialize WhatsApp Client


app.get("/", (req, res) => {
  res.send(
    '<h1>This server is powered by Whatsbot<br><a href="https://github.com/tuhinpal/WhatsBot">https://github.com/tuhinpal/WhatsBot</a></h1>'
  );
});

app.use(
  "/public",
  express.static("public"),
  require("serve-index")("public", { icons: true })
); // public directory will be publicly available

app.listen(process.env.PORT || 8080, () => {
  console.log(`Server listening at Port: ${process.env.PORT || 8080}`);
});
