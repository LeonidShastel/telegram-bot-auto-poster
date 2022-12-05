const {
    mainMenu,
} = require("../utils/buttons");
const DB = require("../services/DB");
const {ADMINS_ID} = require("../config/consts");

const showMainMenu = ctx => ctx.reply(`Главное меню`, {parse_mode: "HTML", ...mainMenu})

const startCreateMessage = ctx => ctx.scene.enter('createMessage');
const startListChats = ctx => ctx.scene.enter('listChats');
const startLogs = ctx => ctx.scene.enter('logsScene');

const sendContentMessage = async (ctx, message, caption = null, keyboard = null) => {
    caption = caption || message.text;
    let config = {}
    if (keyboard)
        config = {...keyboard}
    if (!message.filename){
        return await ctx.reply(caption, {parse_mode: "HTML", ...keyboard})
    }
    config.caption = caption;
    const filepath = `./public/${message.filename}`;
    if (message.filename.indexOf("-animation-")>-1)
        return await ctx.replyWithAnimation({source: filepath}, {caption: caption, parse_mode: "HTML", ...keyboard})
    else if (message.filename.indexOf("-video-")>-1)
        return await ctx.replyWithVideo({source: filepath}, {caption: caption, parse_mode: "HTML", ...keyboard})
    else if (message.filename.indexOf("-image-")>-1)
        return await ctx.replyWithPhoto({source: filepath}, {caption: caption, parse_mode: "HTML", ...keyboard})
    else
        return await ctx.replyWithDocument({source: filepath}, {caption: caption, parse_mode: "HTML", ...keyboard})
}

const sendMessageToAdmins = async (ctx, text)  => {
    await Promise.all(ADMINS_ID.map(async(id)=>{
        try{
            await ctx.telegram.sendMessage(id, text, {parse_mode: "HTML"})
        }
        catch (e) {
            console.log(`Send to admins error: ${e.message}`)
        }
    }))
}

const DataBase = new DB();

module.exports = {
    showMainMenu,
    startCreateMessage,
    startListChats,
    startLogs,
    sendContentMessage,
    sendMessageToAdmins,
    DataBase
}