const { Scenes, Telegraf, session} = require('telegraf');
const { CMD_TEXT, ADMINS_ID} = require('./config/consts');

const {
    showMainMenu,
    startCreateMessage, startListChats, DataBase, startLogs, sendMessageToAdmins
} = require('./controllers/commands');

const {createMessageScene} = require("./controllers/createMessageScene")
const {listChatsScene} = require("./controllers/listChatsScene");
const {logsScene} = require("./controllers/logsScene");
const Listener = require("./services/Listener");

const bot = new Telegraf(process.env.BOT_TOKEN);

const ListenerClient = new Listener(bot);
const stage = new Scenes.Stage([ createMessageScene, listChatsScene, logsScene ])

const setupBot = () => {
    bot.use(session({ collectionName: 'sessions' }));
    bot.use(stage.middleware())
    bot.use(async (ctx, next) => {
        if (!ctx.update?.my_chat_member &&
            (ctx.update.message?.chat?.type !== "private" || ADMINS_ID.indexOf(ctx.update.message.from.id) === -1) ||
            (ctx.update?.my_chat_member?.new_chat_member?.status === "kicked" && ctx.update?.my_chat_member?.chat?.type === "private") ||
            (ctx.update?.my_chat_member?.new_chat_member?.status === "member" && ctx.update?.my_chat_member?.chat?.type === "private")
        )
            return

        if (ctx.update?.my_chat_member?.new_chat_member?.user?.username === process.env.BOT_NAME &&
            (ctx.update?.my_chat_member?.new_chat_member?.status === "administrator" || ctx.update?.my_chat_member?.new_chat_member?.status === "member")
            && ctx.update?.my_chat_member.chat.type !== "private"
        ){
            await DataBase.addChat(ctx.update.my_chat_member.chat.id, ctx.update.my_chat_member.chat.title || ctx.update.my_chat_member.chat.username, ctx.update.my_chat_member.chat.username ? `https://t.me/${ctx.update.my_chat_member.chat.username}` : "частная группа");
            let text = `<b>Бот вступил в чат</b>❗\n\n`+
                `Чат: ${ctx.update.my_chat_member.chat.title}\n`+
                `ID чата: ${ctx.update.my_chat_member.chat.id}\n`+
                `Сслыка: ${ctx.update.my_chat_member.chat.username ? `https://t.me/${ctx.update.my_chat_member.chat.username}` : "частная группа"}`;
            await DataBase.addLog(null, null, ctx.update.my_chat_member.chat.id,
                null, "chat", ctx.update.my_chat_member.chat.title,
                ctx.update.my_chat_member.chat.username ? `https://t.me/${ctx.update.my_chat_member.chat.username}` : "частная группа",
                `Вступление в чат`)

            sendMessageToAdmins(ctx, text)
        }
        else if (ctx.update?.my_chat_member?.new_chat_member?.user?.username === process.env.BOT_NAME &&
            (ctx.update?.my_chat_member?.new_chat_member?.status === "kicked" || ctx.update?.my_chat_member?.new_chat_member?.status === "left")){
            try{
                const messageChat = await DataBase.getMessagesForCurrentChat(ctx.update.my_chat_member.chat.id);
                let text = `<b>Бот удален из чата</b>❗\n\n`+
                    `Чат: ${ctx.update.my_chat_member.chat.title}\n`+
                    `ID чата: ${ctx.update.my_chat_member.chat.id}\n`+
                    `Сслыка: ${ctx.update.my_chat_member.chat.username ? `https://t.me/${ctx.update.my_chat_member.chat.username}` : "частная группа"}\n`+
                    `<b>Отправка сообщений в этот чат остановлена</b>`

                await DataBase.addLog(null, null, ctx.update.my_chat_member.chat.id,
                    null, "chat", ctx.update.my_chat_member.chat.title,
                    ctx.update.my_chat_member.chat.username ? `https://t.me/${ctx.update.my_chat_member.chat.username}` : "частная группа",
                    `Покинул чат`)
                if (!messageChat)
                    await DataBase.deleteChat(ctx.update.my_chat_member.chat.id)
                else
                    await DataBase.stopMessageAndLeaveChat(messageChat.id);
                sendMessageToAdmins(ctx, text);
            }
            catch (e) {
                console.log(`Kicker error: ${e.message}`)
            }
        }
        return next()
    })

    bot.start(showMainMenu);
    bot.hears(CMD_TEXT.menu, showMainMenu)
    bot.hears(CMD_TEXT.createMessage, startCreateMessage)
    bot.hears(CMD_TEXT.listChats, startListChats)
    bot.hears(CMD_TEXT.logs, startLogs)

    return bot;
}


module.exports = {
    setupBot,
    ListenerClient,
    bot
}