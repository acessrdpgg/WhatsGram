const {exec} = require('child_process');
const short =  require("../modules/short");
const genCarbon = require("../modules/carbon");
const removebg = require("../modules/removebg");
const {updateHerokuApp , restartDyno, setHerokuVar} = require("../modules/heroku");
const help = require("../modules/help");
const {mute, unmute} = require('../modules/utils');
const pmguard = require('../modules/pmguard');
const config = require('../config');
const parseText = require('../modules/ocr');
const {genQr, readQr} = require("../modules/qr");
const telegraph = require("../modules/telegraph");
const {getYtAudio, getYtVideo, getYtDownloadUrl} = require("../modules/youtube");
const spamMsg = require("../modules/spam");

const isImage = (msg) => msg.type == 'image' || (msg.type === 'document' && (msg.body.endsWith('.jpg') || msg.body.endsWith('.jpeg') || msg.body.endsWith('.png'))) ? true : false;

const { Telegraf } = require("telegraf");
const tgbot2 = new Telegraf(config.TG_BOT_TOKEN);

const handleCreateMsg = async (msg , client , MessageMedia) => {
    if(msg.fromMe) {
        if (msg.body == "!allow" && config.pmguard_enabled == "true" && !msg.to.includes("-")) { // allow and unmute the chat (PMPermit module)
            msg.delete(true);
            pmguard.allow(msg.to.split("@")[0]);
            var chat = await msg.getChat();
            await chat.unmute(true);
            msg.reply("Allowed to direct message!");
        } else if (msg.body === '!ping') {
                // Send a new message to the same chat
                client.sendMessage(msg.from, 'pong');
        } else if (msg.body.startsWith('!desc ')) {
            // Change the group description
            let chat = await msg.getChat();
            if (chat.isGroup) {
                let newDescription = msg.body.slice(6);
                chat.setDescription(newDescription);
            } else {
                msg.reply('This command can only be used in a group!');
            }
        } else if (msg.body === '!leave') {
            // Leave the group
            let chat = await msg.getChat();
            if (chat.isGroup) {
                chat.leave();
            } else {
                msg.reply('This command can only be used in a group!');
            }
        } else if (msg.body.startsWith('!join ')) {
            const inviteCode = msg.body.split(' ')[1];
            try {
                await client.acceptInvite(inviteCode);
                msg.reply('Joined the group!');
            } catch (e) {
                msg.reply('That invite code seems to be invalid.');
            }
        } else if (msg.body === '!groupinfo') {
            let chat = await msg.getChat();
            if (chat.isGroup) {
                msg.reply(`*Group Details*\n\nName: ${chat.name}\nDescription: ${chat.description}\nCreated At: ${chat.createdAt.toString()}\nCreated By: ${chat.owner.user}\nParticipant count: ${chat.participants.length}`);
            } else {
                msg.reply('This command can only be used in a group!');
            }
        } else if (msg.body === '!chats') {
            const chats = await client.getChats();
            client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
        } else if (msg.body === '!mediainfo' && msg.hasMedia) {
                const attachmentData = await msg.downloadMedia();
                msg.reply(`
                        *Media info*
                        MimeType: ${attachmentData.mimetype}
                        Filename: ${attachmentData.filename}
                        Data (length): ${attachmentData.data.length}
                `);
        } else if (msg.body === '!quoteinfo' && msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();

                quotedMsg.reply(`
                        ID: ${quotedMsg.id._serialized}
                        Type: ${quotedMsg.type}
                        Author: ${quotedMsg.author || quotedMsg.from}
                        Timestamp: ${quotedMsg.timestamp}
                        Has Media? ${quotedMsg.hasMedia}
                `);
        } else if (msg.body === '!resendmedia' && msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                if (quotedMsg.hasMedia) {
                        const attachmentData = await quotedMsg.downloadMedia();
                        client.sendMessage(msg.from, attachmentData, { caption: 'Here\'s your requested media.' });
                }
        } else if (msg.body === '!location') {
                msg.reply(new Location(37.422, -122.084, 'Googleplex\nGoogle Headquarters'));
        } else if (msg.location) {
                msg.reply(msg.location);
        } else if (msg.body.startsWith('!status ')) {
                const newStatus = msg.body.split(' ')[1];
                await client.setStatus(newStatus);
                msg.reply(`Status was updated to *${newStatus}*`);
        } else if (msg.body === '!mention') {
                const contact = await msg.getContact();
                const chat = await msg.getChat();
                chat.sendMessage(`Hi @${contact.number}!`, {
                        mentions: [contact]
                });
        } else if (msg.body === '!delete') {
                if (msg.hasQuotedMsg) {
                        const quotedMsg = await msg.getQuotedMessage();
                        if (quotedMsg.fromMe) {
                                quotedMsg.delete(true);
                        } else {
                                msg.reply('I can only delete my own messages');
                        }
                }
        } else if (msg.body === '!pin') {
                const chat = await msg.getChat();
                await chat.pin();
        } else if (msg.body === '!archive') {
                const chat = await msg.getChat();
                await chat.archive();
        } else if (msg.body === '!mute') {
                const chat = await msg.getChat();
                // mute the chat for 20 seconds
                const unmuteDate = new Date();
                unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);
                await chat.mute(unmuteDate);
        } else if (msg.body === '!typing') {
                const chat = await msg.getChat();
                // simulates typing in the chat
                chat.sendStateTyping();
        } else if (msg.body === '!recording') {
                const chat = await msg.getChat();
                // simulates recording audio in the chat
                chat.sendStateRecording();
        } else if (msg.body === '!clearstate') {
                const chat = await msg.getChat();
                // stops typing or recording in the chat
                chat.clearState();
        } else if (msg.body === '!jumpto') {
                if (msg.hasQuotedMsg) {
                        const quotedMsg = await msg.getQuotedMessage();
                        client.interface.openChatWindowAt(quotedMsg.id._serialized);
                }
        } else if (msg.body === '!buttons') {
                let button = new Buttons('Button body',[{body:'bt1'},{body:'bt2'},{body:'bt3'}],'title','footer');
                client.sendMessage(msg.from, button);
        } else if (msg.body === '!list') {
                let sections = [{title:'sectionTitle',rows:[{title:'ListItem1', description: 'desc'},{title:'ListItem2'}]}];
                let list = new List('List body','btnText',sections,'Title','footer');
                client.sendMessage(msg.from, list);
        } else if(msg.body.startsWith('!setpmmsg') && !msg.to.includes("-")){
            msg.delete(true);
            if(config.pmguard_enabled == "true"){
                const pmMsg = msg.body.replace('!setpmmsg ', '');
                const readReq = await pmguard.readPmMsg();
                const setReq = await pmguard.setPmMsg(pmMsg, readReq == 'failed' ? 'insert' : 'update');
                client.sendMessage(msg.to, setReq == 'success' ? 'Pm Message updated sucessfully!': 'Failed to update pm message.')
            }else{
                client.sendMessage(msg.to, '*Error:* Can\'t upadate message, PmGuard is disbaled.')
            }
        }else if(msg.body.startsWith("!short ")){
            msg.delete(true);
            short(msg.body.split('!short ')[1]).then(url => {
            client.sendMessage(msg.to, `${url.startsWith("https://") ? `Here is the shorten URL ${url}` : 'PLease send a valid url to short.'}`);
            })
        }else if(msg.body.startsWith("!carbon ")){
            msg.delete(true);
            genCarbon(msg.body.split('!carbon ')[1]).then(data => {
                const carbon = new MessageMedia(data.mimetype , data.data);
                client.sendMessage(msg.to , carbon);
            })
        }else if(msg.body.startsWith('!term ')){
           msg.delete(true);
            exec(msg.body.split('!term ')[1] , (data , error) => {
                console.log(error);
                client.sendMessage(msg.to , data ? data : error);
            });
        }else if (msg.body === '!update'){
            msg.delete(true);
            updateHerokuApp().then(result => {
                const message = `*${result.message}*, ${result.status ? 'It may take some time so have patient.\n\n*Build Logs:* '+result.build_logs : ''}`;
                client.sendMessage(msg.to , message);
            });
        }else if(msg.body === '!restart'){
            msg.delete(true);
            restartDyno().then(result => {
                const message = `*${result.message}*`;
                client.sendMessage(msg.to , message);
            })
        }else if (msg.body === '!sticker' && msg.hasQuotedMsg){
            msg.delete(true);
            const quotedMessage = await msg.getQuotedMessage();
            if(quotedMessage.hasMedia && isImage(quotedMessage)){
                const stickerData = await quotedMessage.downloadMedia();
                const sticker = await new MessageMedia(stickerData.mimetype , stickerData.data);
                quotedMessage.reply(sticker , null , {sendMediaAsSticker:true});
            }else{
                quotedMessage.reply('Reply to an image to get it converted into sticker!');
            }
        }else if(msg.body.startsWith('!setvar ')){
            msg.delete(true);
            const extractData = (a , b) => msg.body.split(a)[1].split(b)[0].trim();
            const request = await setHerokuVar(extractData('-n' , '-v') , extractData('-v' , '-n'));
            client.sendMessage(msg.to , request.message);
        }else if(msg.body.startsWith('!removebg') && msg.hasQuotedMsg){
            const quotedMessage = await msg.getQuotedMessage();
            if(quotedMessage.hasMedia && isImage(quotedMessage)){
                msg.delete(true);
                msg.reply('Processing....')
                const img = await quotedMessage.downloadMedia();
                const result = await removebg(img.data);
                const noBgImg = new MessageMedia('image/png' , result.img, 'NoBg@WhatsGram.png');
                quotedMessage.reply(noBgImg, null, {sendMediaAsDocument: true});
            }else{ msg.reply('Please reply to an image file.') }
        }else if(msg.body.startsWith('!mute') && !msg.to.includes('-')){
            msg.delete(true);
            const unmuteTime = msg.body.split('!mute ')[1] == undefined ? Infinity :  msg.body.split('!mute ')[1];
            client.sendMessage(msg.to, (await mute(msg.to, unmuteTime, client)).msg);
        }else if(msg.body == '!unmute' && !msg.to.includes("-")){
            msg.delete(true);
            msg.reply((await unmute(msg.to, client)).msg);
        }else if(msg.body == '!del'){
            msg.delete(true);
            if(msg.hasQuotedMsg){
                const quotedMsg = await msg.getQuotedMessage();
                quotedMsg.fromMe ? quotedMsg.delete(true) : msg.reply('*Error:* Can\'t delete that message.')
            }else msg.reply('*Error:* Reply to a message to delete it.')
        }else if(msg.body.startsWith('!ocr') && msg.hasQuotedMsg){
            msg.delete(true);
            const quotedMsg = await msg.getQuotedMessage();
            if(quotedMsg.hasMedia && isImage(quotedMsg)){
                const img = await quotedMsg.downloadMedia();
                const text = await parseText(img.data);
                quotedMsg.reply(text); 
            }else{ quotedMsg.reply('Please reply to an image.')}
        }else if(msg.body.startsWith('!qr')){
            msg.delete(true);
            if(msg.hasQuotedMsg){
                const quotedMsg = await msg.getQuotedMessage();
                if(quotedMsg.type != 'chat'){ quotedMsg.reply('Please reply to any text to generate QrCode.') }
                else {
                    quotedMsg.reply(new MessageMedia('image/png', (await genQr(quotedMsg.body)).qr, 'qr.png'), null)
                } 
            }else{ 
                client.sendMessage(msg.to, new MessageMedia('image/png', (await genQr(msg.body.replace('!qr ', ''))).qr, 'qr.png'), {caption: 'Qr Code for \n\n```'+msg.body.replace('!qr ', '')+'```'})
            }   
        }else if(msg.body.startsWith('!readqr') && msg.hasQuotedMsg){
            msg.delete(true);
            const quotedMsg = await msg.getQuotedMessage();
            if(quotedMsg.hasMedia && isImage(quotedMsg)){
                const qrImg = await quotedMsg.downloadMedia();
                const result = await readQr(qrImg);
                if(result.status){ quotedMsg.reply('This is what we got from QR\n\n```' + result.data + '```') }
                else{ quotedMsg.reply('*Error:* Failed to read QR. Make sure you\'ve passed correct qr.') }
            }
        }else if(msg.body.startsWith('!telegraph') && msg.hasQuotedMsg){
            msg.delete(true);
            const quotedMsg = await msg.getQuotedMessage();
            const data = await quotedMsg.downloadMedia();
            const res = await telegraph(data);
            if(res.status){ quotedMsg.reply(`🔗 *Here is direct link* \n\n👉 ${'```' + res.url}` + '```') }
            else{ quotedMsg.reply('```An error has been occurred while uploading. Make sure you passed correct file.```') }
        }else if(msg.body.startsWith('!yturl')){
            msg.delete(true);
            let url;
            if(msg.hasQuotedMsg){
                const quotedMsg = await msg.getQuotedMessage();
                url = quotedMsg.body;
            }else { url = msg.body.replace('!yturl ', '') }
            const data = await getYtDownloadUrl(url);
            client.sendMessage(msg.to, data.msg);
        }
        else if(msg.body.startsWith('!spam')) {
            const intervals = parseInt(msg.body.replace('!spam ', '').split(' ')[0]);
            const spamText = msg.body.replace('!spam '+intervals, '');

            if(msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                if(quotedMsg.hasMedia && isImage(quotedMsg)) {
                    const sData = await quotedMsg.downloadMedia();
                    const ss = await new MessageMedia(sData.mimetype , sData.data);
                    const sendAsSticker = msg.body.endsWith('sticker') ? true : false;
                    for(let i = 0; i < intervals; i++) {
                        quotedMsg.reply(ss, null , {sendMediaAsSticker: sendAsSticker});
                     }
                } else {
                    for(let i = 0; i < intervals; i++) {
                        quotedMsg.reply(quotedMsg.body);
                    }
                }
            } else {
                for(let i = 0; i < intervals; i++) {
                    client.sendMessage(msg.to, spamText);
                }
            }
            msg.delete(true);
        }
        else if(msg.body.startsWith('!yta')){
            msg.delete(true);
            let url;
            if(msg.hasQuotedMsg){
                const quotedMsg = await msg.getQuotedMessage();
                url = quotedMsg.body;
            }else { url = msg.body.replace('!yta ', '') }
            const data = await getYtAudio(url);
            client.sendMessage(msg.to, 'Downloading....');
            if(data.status == true){
                client.sendMessage(msg.to, new MessageMedia('audio/mpeg' ,data.audio, `${data.name}.mp3`));
            }else{
                client.sendMessage(msg.to, data.msg);
            }
        }else if(msg.body.startsWith('!yt')){
            msg.delete(true);
            let url;
            if(msg.hasQuotedMsg){
                const quotedMsg = await msg.getQuotedMessage();
                url = quotedMsg.body;
            }else { url = msg.body.replace('!yt ', '') }
            const data = await getYtVideo(url);
            client.sendMessage(msg.to, 'Downloading....');
            if(data.status == true){
                client.sendMessage(msg.to, new MessageMedia('video/mkv' ,data.video, `${data.name}.mkv`), {sendMediaAsDocument: true});
            }else{
                client.sendMessage(msg.to, data.msg);
            }
        }
        else if (msg.body === '!info') {
            let info = client.info;
            client.sendMessage(msg.from, `*Connection info*\n\nUser name: ${info.pushname}\nMy number: ${info.wid.user}\nPlatform: ${info.platform}`);
        }
        else if(msg.body.startsWith('!help')) {
            msg.delete(true);
            const helpMsg = await help.waHelp(msg.body);
            client.sendMessage(msg.to , helpMsg);
        } else {
            //if(msg.hasMedia) { console.log("Found Media"); }
            name = msg.to;
            console.log("You -> "+ name + "\n\n" + msg.body);
            tgbot2.telegram.sendMessage(config.TG_OWNER_ID, "You -> " + name + "\n\n" + msg.body, {disable_notification: true});
        }
    }
} 

module.exports = handleCreateMsg;
