const axios = require('axios');

async function getPrice(cryptoCode) {
    cryptoCode = cryptoCode.toUpperCase();
    let mainconfig = {
        method: 'get',
        url: 'https://public.coindcx.com/market_data/current_prices'
    };
    return axios(mainconfig)
        .then(async function (response) {
            let data = response.data;
            let cryptoCodeINR = cryptoCode + "INR";
            if (data[cryptoCode] != undefined || data[cryptoCodeINR] != undefined) {
                cryptoCode = data[cryptoCode] == undefined ? cryptoCodeINR : cryptoCode;
                let out = ({
                    name: cryptoCode,
                    price: data[cryptoCode]
                });
                return out;
            } else {
                return "unsupported";
            }
        })
        .catch(function (error) {
            return "error";
        });
}

const getCrypto = async (client,msg,code) => {
    msg.delete(true);
    let data = await getPrice(code);
    if (data == "error") {
        await client.sendMessage(msg.to, `🙇‍♂️ *Error*\n\n` + "```Something unexpected happened while fetching Cryptocurrency Price```");
    }
    if (data == "unsupported") {
        await client.sendMessage(msg.to, `🙇‍♂️ *Error*\n\n` + "```Support for this CryptoCurrency is not yet added```");
    }
    else {
        let date = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        await client.sendMessage(msg.to, `Price of *${data.name}* as of ${date} is *₹ ${data.price}*`);
    }
};

module.exports = getCrypto