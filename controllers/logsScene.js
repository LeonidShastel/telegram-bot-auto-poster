const {Scenes, Extra} = require("telegraf");
const {DataBase, showMainMenu, sendContentMessage} = require("./commands");
const {logsSelectPeriod, logsShowMessage, listChatsEditChat} = require("../utils/buttons");
const {CMD_TEXT} = require("../config/consts");
const {getStringTime} = require("../utils/utils");

const viewingLogs = ctx => {

}

const sendLogs = async (ctx, days) => {
    try{
        const logs = await DataBase.getLogs(days);
        if (logs.length === 0)
            return await ctx.reply("Логи за этот период не найдены");

        for (let i = 0; i < logs.length; i++) {
            try{
                const date = new Date();
                date.setTime(logs[i].time);

                if (logs[i].type === "message"){
                    let text = `${getStringTime(date)}\n\n`+
                        `<b>Тип</b>: ${logs[i].messageTime === "Моментальное" ? "Моментальное" : "По расписанию"}\n`+
                        `<b>Чат</b>: ${logs[i].chatName}\n`+
                        `<b>Ссылка</b>: ${logs[i].chatUrl}\n`+
                        `<b>Ссылка на пост</b>: ${logs[i].messageUrl === "-" ? "частная группа" : logs[i].messageUrl}\n`+
                        `<b>Сообщение</b>:\n${logs[i].messageText}`

                    // await ctx.replyWithHTML(text, {disable_web_page_preview: true, reply_markup: logsShowMessage(logs[i].chatId, logs[i].messageId)})
                    if (!logs[i].messageFile){
                        await ctx.reply(text, {parse_mode: "HTML"});
                        continue;
                    }

                    const filepath = `./public/${logs[i].messageFile}`;
                    if (filepath.indexOf("-animation-")>-1)
                        await ctx.replyWithAnimation({source: filepath}, {caption: text, parse_mode: "HTML"})
                    else if (filepath.indexOf("-video-")>-1)
                        await ctx.replyWithVideo({source: filepath}, {caption: text, parse_mode: "HTML"})
                    else if (filepath.indexOf("-image-")>-1)
                        await ctx.replyWithPhoto({source: filepath}, {caption: text, parse_mode: "HTML"})
                    else
                        await ctx.replyWithDocument({source: filepath}, {caption: text, parse_mode: "HTML"})
                }
                else if(logs[i].type === "chat"){
                    let text = `${getStringTime(date)}\n\n`+
                        `<b><u>${logs[i].chatEvent}</u></b>\n`+
                        `<b>Чат</b>: ${logs[i].chatName}\n`+
                        `<b>ID чата:</b> ${logs[i].chatId}\n`+
                        `<b>Ссылка</b>: ${logs[i].chatUrl}\n`

                    await ctx.reply(text, {parse_mode: "HTML"})
                }
            }
            catch (e) {
                console.error(e.message)
            }
        }
    }
    catch (e) {
        console.error(`Send logs error: ${e.stack}`);
    }
}

const logsScene = new Scenes.WizardScene('logsScene', viewingLogs)

logsScene.enter(async ctx => {
    await ctx.reply(`Выберите период`, {...logsSelectPeriod})
})
logsScene.hears(CMD_TEXT.menu,async ctx => {
    await ctx.scene.leave();
    return showMainMenu(ctx);
})
logsScene.hears(CMD_TEXT.logsPerDay, async ctx => await sendLogs(ctx, 1))
logsScene.hears(CMD_TEXT.logsPerThreeDays, async ctx => await sendLogs(ctx, 3))
logsScene.hears(CMD_TEXT.logsPerWeek, async ctx => await sendLogs(ctx, 7))

module.exports = {logsScene};