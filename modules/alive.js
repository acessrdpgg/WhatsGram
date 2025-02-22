const config = require('../config');
const axios = require('axios');

async function alive(battery, client) {
    let batteryInfo ;
    battery.plugged ? batteryInfo = `${battery.battery}% (Charging)`
    :  batteryInfo = `${battery.battery}%`;

    return ({
        startMessage: `*WhatsGram @BeastAvin*\n\n*Platfrom:* ${client.info.platform}\n*Battery Info:* ${battery.plugged}\n*Official Github Repo 👇👇*\n` + "```https://github.com/acessrdpgg/WhatsGram```",
        mimetype: "image/jpeg",
        data: Buffer.from(((await axios.get('https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/WhatsApp_logo.svg/2560px-WhatsApp_logo.svg.png', { responseType: 'arraybuffer' })).data)).toString('base64'),
        filename: "aliveMedia.jpg"
    })
}

module.exports = alive;
