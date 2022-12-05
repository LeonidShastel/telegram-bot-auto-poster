const { Telegraf, Scenes } = require('telegraf');
const { CMD_TEXT } = require('../config/consts');
const { showMainMenu } = require('../controllers/commands');
const {
    mainMenu, createMessageEnterMessage, createMessageEnterFile, createMessageSelectChat, createMessageGraph
} = require('../utils/buttons');
const {DataBase} = require("./commands");
const {downloadFile, checkTime, parseTelegramMessage} = require("../utils/utils");


let data = {}

const enterMessage = Telegraf.on('text', async ctx=>{
    try{
        if (data.filePath !== "" && ctx.message.text.length>255){
            await ctx.reply(`Превышено ограничено в количество символов (${ctx.message.text.length}/255), повторите ввод`);
            return;
        }

        data.message = parseTelegramMessage(ctx);
        const chats = await DataBase.getChats();
        await ctx.reply(`Выберите чаты`, {...createMessageSelectChat(chats)});
        await ctx.wizard.next();
    }
    catch (e) {
        console.error(`Enter message error: ${e.stack}`)
    }
})

const enterFile = Telegraf.on('message', async ctx=> {
    try{
        let fileId = null;
        await ctx.reply('Файл загружается на сервер, ожидайте');
        const filePath = await downloadFile(ctx, fileId);
        if (filePath === null)
            return;

        data.filePath = filePath;
        await ctx.wizard.next();
        if (!ctx.update.message.caption){
            await ctx.reply(`Введите сообщение`, {...createMessageEnterMessage});
            return;
        }

        if (ctx.update.message.caption.length>255){
            await ctx.reply(`Превышено ограничено в количество символов (${ctx.update.message.caption.length}/255), повторите ввод`);
            return;
        }

        data.message = parseTelegramMessage(ctx.update);
        const chats = await DataBase.getChats();
        await ctx.reply(`Подпись добавлена к письму\nВыберите чаты`, {...createMessageSelectChat(chats)});
        await ctx.wizard.next();
    }
    catch (e) {
        console.error(`Enter file error: ${e.stack}`)
    }
})

const selectChats = Telegraf.on('text', async ctx => {
    try{
        if(ctx.message.text === CMD_TEXT.createMessageFinishSelectChats && data.chats.length === 0){
            await ctx.reply("Выберите чаты");
            return;
        }

        if (ctx.message.text === CMD_TEXT.createMessageFinishSelectChats){
            await ctx.reply(`Выберите действие`, {...createMessageGraph});
            await ctx.wizard.next();
            return;
        }

        const chats = await DataBase.getChats();

        const selectedChat = chats.filter(chat=>chat.name === ctx.message.text)[0];
        if (!selectedChat){
            await ctx.reply(`Чат недоступен`);
            return;
        }
        if (data.chats.indexOf(selectedChat.chatId)>-1){
            await ctx.reply("Чат уже добавлен");
            return;
        }

        data.chats.push(selectedChat.chatId);

        const filterChats = chats.filter(chat=>data.chats.indexOf(chat.chatId) === -1);
        await ctx.reply(`Чат ${ctx.message.text} добавлен`, {...createMessageSelectChat(filterChats)});
    }
    catch (e) {
        console.error(`Select chats error: ${e.stack}`);
    }
});

const enterGraph = Telegraf.on('text', async ctx=>{
    try{
        if(ctx.message.text === CMD_TEXT.createMessageCreateGraph){
            await ctx.reply(`Введите время в формате (18:30, 20:40, 23:10)`);
        }
        else if(ctx.message.text === CMD_TEXT.createMessageInstantPublishing){
            const messages = await DataBase.addMessage(data.message, data.chats, data.filePath, "Моментальное" , 0);

            const {ListenerClient} = require("../bot");
            ListenerClient.sendMessage(messages);

            await ctx.reply(`Сообщения отправлены`, {...mainMenu});
            await ctx.scene.leave();
        }
        else {
            if (!checkTime(ctx.message.text)){
                await ctx.reply("Неверный формат времени");
                return;
            }

            data.time = ctx.message.text;

            await DataBase.addMessage(data.message, data.chats, data.filePath, data.time, 1);
            await ctx.reply(`Сообщение сохраненно`, {...mainMenu});
            await ctx.scene.leave();
        }
    }
    catch (e) {
        console.error(`Enter graph error: ${e.stack}`);
    }
})

const createMessageScene = new Scenes.WizardScene('createMessage', enterFile, enterMessage, selectChats, enterGraph)

createMessageScene.enter(async ctx => {
    data = {
        message: "",
        filePath: "",
        chats: [],
        time: ""
    };

    return await ctx.reply('Выберите файл', {
        ...createMessageEnterFile
    })
});

createMessageScene.hears(CMD_TEXT.menu, async ctx => {
    await ctx.scene.leave();
    return showMainMenu(ctx);
})

createMessageScene.hears(CMD_TEXT.skip, async ctx => {
    switch (ctx.wizard.cursor) {
        case 0:
            await ctx.reply('Введите сообщение', {...createMessageEnterMessage});
            await ctx.wizard.next();
            break;
        case 1:
            if (data.filePath === "" && data.message === ""){
                await ctx.reply("Добавьте изображение или текст");
                break;
            }
            const chats = await DataBase.getChats();
            await ctx.reply('Выберите чаты', {...createMessageSelectChat(chats)});
            await ctx.wizard.next();
            break;
    }
})

createMessageScene.hears(CMD_TEXT.back, async ctx=>{
    switch (ctx.wizard.cursor) {
        case 1:
            await ctx.reply('Выберите файл', {...createMessageEnterFile});
            await ctx.wizard.back();
            break;
        case 2:
            data.chats = []
            await ctx.reply('Введите сообщение', {...createMessageEnterMessage});
            await ctx.wizard.back();
            break;
        case 3:
            data.chats = []
            let chats = await DataBase.getChats();
            await ctx.reply('Выберите чаты', {...createMessageSelectChat(chats)})
            await ctx.wizard.back();
            break;
    }
})


// экспортируем сцену
module.exports = {
    createMessageScene
};