const dictionary = require("urban-dictionary");

async function ud(term) {
  try {
    return await dictionary.define(term);
  } catch (error) {
    return "error";
  }
}

const urbandict = async (client, msg) => {
  let word = msg.body.replace("!ud ", ""); 

  msg.delete(true);
  let data = await ud(word);
  if (data == "error") {
    await client.sendMessage(
      msg.to,
      `🙇‍♂️ *Error*\n\n` +
        "```Something Unexpected Happened while Lookup on Urban Dictionary```"
    );
  } else {
    await client.sendMessage(
      msg.to,
      "*Term:* ```" +
        word +
        "```\n\n" +
        "*Definition:* ```" +
        data[0].definition +
        "```\n\n" +
        "*Example:* ```" +
        data[0].example +
        "```"
    );
  }
};

module.exports = urbandict