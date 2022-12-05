const { Scenes } = require('telegraf');
const { CMD_TEXT } = require('../config/consts');
const { showMainMenu } = require('../controllers/commands');
const {
    listChatsEditChat, backButtonMenu, mainMenu, listChatsCreateMessage, listChatsCreateMessageEnterFile,
    createMessageEnterMessage, listChatsCreateMessageEnterText, backWithMainButtons
} = require('../utils/buttons');
const {DataBase, sendContentMessage} = require("./commands");
const {downloadFile, checkTime, parseTelegramMessage} = require("../utils/utils");
const path = require("path");

let historyMessages = [];
let editMessage = {};
let createMessageData = {};

const selectChats = async ctx => {
    try{
        if (ctx?.update?.callback_query)
            return;

        const response = await ctx.reply("Список чатов", {...backButtonMenu});
        historyMessages.push({
            id: -1,
            message: response
        })
        const chats = await DataBase.getChats();

        for (let i = 0; i<chats.length; i++){
            try{
                const message = await DataBase.getMessagesForCurrentChat(chats[i].chatId);
                if (!message){
                    let text = `<b>Название:</b> ${chats[i].name}\n`+
                        `<b>Ссылка:</b> ${chats[i].url}\n`+
                        `<b>Время:</b> не задано\n`+
                        `<b>Сообщение:</b> не задано`;

                    const response = await ctx.reply(text, {parse_mode: "HTML", ...listChatsCreateMessage(chats[i].chatId)});
                    historyMessages.push({
                        id: chats[i].chatId,
                        message: response
                    })
                    continue;
                }

                let text = `<b>Название</b>: ${chats[i].name}\n`+
                    `<b>Ссылка</b>: ${chats[i].url}\n`+
                    `<b>Время</b>: ${message.time.replaceAll("\"", "").length===0 ? "не задано" : message.time.replaceAll("\"", "")}\n`+
                    `<b>Сообщение</b>: ${message.text}`;

                const response = await sendContentMessage(ctx, message, text, {...listChatsEditChat(message.id)});
                historyMessages.push({
                    id: message.id,
                    message: response
                })
            }
            catch (e) {
                console.log(`Chat list error ${chats[i].chatId}: ${e.message}`);
            }
        }
    }
    catch (e) {
        console.error(`Select chats error: ${e.stack}`)
    }
}

const checkChat = async ctx => {
    try{
        if (!ctx.update.callback_query)
            return;

        if (ctx.update.callback_query.data.split("/").length===2){
            const data = ctx.update.callback_query.data.split("/");
            if (data[0] === "leaveChat"){
                historyMessages = await Promise.all(historyMessages.map(async el=>{
                    if (el!==undefined && el?.id !== +data[1])
                        return el
                    if (el!==undefined)
                        await ctx.deleteMessage(el.message.message_id)
                }))
                historyMessages = historyMessages.filter(el=>el!==undefined);

                try{
                    await ctx.telegram.leaveChat(data[1]);
                }
                catch (e) {
                    historyMessages.push({
                        id: -1,
                        message: await ctx.reply("Чат удален и не доступен")
                    })
                }
                return
            }

            await ctx.wizard.selectStep(2);
            createMessageData.chats = [+data[1]];
            createMessageData.step = 0;
            createMessageData.filename = "";
            createMessageData.message = "";
            historyMessages.push({
                id: -1,
                message: await ctx.reply("Выберите файл", {...listChatsCreateMessageEnterFile})
            })
            return;
        }

        const data = ctx.update.callback_query.data.split("-");

        editMessage = {
            operation: data[0],
            message: await DataBase.getCurrentMessage(+data[1])
        }

        if (editMessage.operation === "leaveChat"){
            historyMessages = await Promise.all(historyMessages.map(async el=>{
                if (el!==undefined && el?.id !== editMessage?.message?.id)
                    return el
                if (el!==undefined)
                    await ctx.deleteMessage(el.message.message_id)
            }))
            const chat = await DataBase.getCurrentChat(editMessage.message.chatId)
            await DataBase.stopMessageAndLeaveChat(editMessage.message.id, editMessage.message.chatId);
            try{
                await ctx.telegram.leaveChat(editMessage.message.chatId);
            }
            catch (e) {

            }
            historyMessages = historyMessages.filter(mess=>mess!==undefined);
            historyMessages.push({id: -1, message: await ctx.reply(chat ? `Чат "${chat.name}" удален` : "Удален недоступный чат", {...backButtonMenu})})
            return;
        }
        else if(editMessage.operation !== "stopSending")
            historyMessages = await Promise.all(historyMessages.map(async el=>{
                try{
                    if (el.id === editMessage.message.id)
                        return el
                    await ctx.deleteMessage(el.message.message_id)
                }
                catch (e) {

                }
            }))

        historyMessages = historyMessages.filter(mess=>mess!==undefined);

        if (editMessage.operation === "stopSending"){
            const editMessageInTelegram = historyMessages.filter(el=>el.id===editMessage.message.id)
            let text = editMessageInTelegram[0].message?.caption ? editMessageInTelegram[0].message.caption.split("\n") : editMessageInTelegram[0].message.text.split("\n");
            text = text.map(el=>`<b>${el.split(": ")[0]}: </b>${el.split(": ").slice(1).join(": ")}`)
            text = text.map(el=>el.indexOf("Время:")>-1 ? "<b>Время:</b> не задано" : el);
            text = text.map(el=>el.indexOf("Сообщение:")>-1 ? "<b>Сообщение:</b> не задано" : el);
            text = text.join("\n");

            if(editMessageInTelegram[0].message?.caption){
                historyMessages.push({
                    id: editMessage.message.id,
                    message: await ctx.editMessageMedia({type: "photo", media: `AgACAgIAAxkBAAIfgmON4gFNYObvUYfFeX0SWmbeOHBbAALSwzEbtAVoSAi5g_DZETN3AQADAgADcwADKwQ`, caption: text, parse_mode: "HTML"}, {...listChatsCreateMessage(editMessage.message.chatId)})
                })
            }
            else {
                historyMessages.push({
                    id: editMessage.message.id,
                    message: await ctx.editMessageText({text: text}, {parse_mode: "HTML", ...listChatsCreateMessage(editMessage.message.chatId)})
                })
            }
            // await ctx.deleteMessage();
            // const response = await ctx.reply(text, {parse_mode: "HTML", ...listChatsCreateMessage(editMessage.message.chatId)});
            // historyMessages.push({
            //     id: editMessage.message.chatId,
            //     message: response
            // })
            await DataBase.stopMessage(editMessage.message.id);
            return;
        }

        await ctx.editMessageReplyMarkup({reply_markup: null})
        let text = "";
        switch (editMessage.operation) {
            case "editMessage":
                text = "Отправьте текст сообщения";
                break;
            case "editTime":
                text = "Отправьте новое время";
                break;
            case "editFile":
                text = "Отправьте новый файл";
                break;
        }

        historyMessages.push({id: -1, message: await ctx.reply(text)});
        await ctx.wizard.selectStep(1);
    }
    catch (e) {
        console.error(`193 row: `+e.message);
    }
}

const waitEdit = async ctx => {
    try{
        if (editMessage.operation === "editFile"){
            let filePath = await downloadFile(ctx);
            if (filePath === null)
                return;

            editMessage.message.filename = filePath;
        }
        else if (editMessage.operation === "editMessage"){
            if (editMessage.message.filename !== "" && ctx.message.text.length>255){
                historyMessages.push({
                    id: -1,
                    message: await ctx.reply(`Превышено ограничено в количество символов (${ctx.message.text.length}/255), повторите ввод`)
                });
                return;
            }

            editMessage.message.text = parseTelegramMessage(ctx);
        }
        else if (editMessage.operation === "editTime"){
            if (!checkTime(ctx.message.text)){
                await ctx.deleteMessage();
                historyMessages.push({
                    id: -1,
                    message: await ctx.reply("Неверный формат времени"),
                });
                return;
            }
            editMessage.message.time = ctx.message.text;
        }


        await DataBase.updateMessage(editMessage.message);
        const updateMessage = historyMessages.filter(mess=>mess.id !== -1)[0];
        let caption = updateMessage.message.caption ? updateMessage.message.caption.split("\n") : updateMessage.message.text.split("\n");
        try {
            await ctx.deleteMessage(updateMessage.message_id)
        }
        catch (e) {
            console.log(updateMessage);
            console.log(historyMessages);
        }

        caption = caption.slice(0, 2).join("\n");
        caption += `\nВремя: ${editMessage.message.time.replaceAll("\"", "").length===0 ? "не задано" : editMessage.message.time.replaceAll("\"", "")}\n`+
            `Сообщение: ${editMessage.message.text}`;
        await sendContentMessage(ctx, editMessage.message, caption);
        await ctx.reply('Данные обновлены', {...mainMenu});
        await ctx.scene.leave();
    }
    catch (e) {
        console.error(`Wait edit error: ${e.stack}`)
    }
}

const createMessage  = async ctx => {
    if (createMessageData.step === 0){
        let filename = await downloadFile(ctx);
        if (filename === null)
            return;

        createMessageData.filename = filename;

        if (!ctx.update.message.caption){
            createMessageData.step = 1
            historyMessages.push({
                id: -1,
                message: await ctx.reply(`Введите сообщение`, {...listChatsCreateMessageEnterText})
            })
            return;
        }

        if (ctx.update.message.caption.length>255){
            historyMessages.push({
                id: -1,
                message: await ctx.reply(`Превышено ограничено в количество символов (${ctx.update.message.caption.length}/255), повторите ввод вместе с медиа`)
            })
            return;
        }

        createMessageData.message = parseTelegramMessage(ctx.update);
        createMessageData.step = 2;

        historyMessages.push({
            id: -1,
            message: await ctx.reply(`Введите время в формате (18:30, 20:40, 23:10)`, {...backWithMainButtons})
        })
    }
    else if (createMessageData.step === 1){
        if (ctx.message.text.length>255){
            historyMessages.push({
                id: -1,
                message: await ctx.reply(`Превышено ограничено в количество символов (${ctx.message.text.length}/255), повторите ввод`)
            })
            return;
        }

        createMessageData.message = parseTelegramMessage(ctx);
        createMessageData.step = 2
        historyMessages.push({
            id: -1,
            message: await ctx.reply(`Введите время в формате (18:30, 20:40, 23:10)`, {...backWithMainButtons})
        })
    }
    else if (createMessageData.step === 2) {
        if (!checkTime(ctx.message.text)){
            historyMessages.push({
                id: -1,
                message: await ctx.reply("Неверный формат времени")
            })
            return;
        }

        createMessageData.time = ctx.message.text;

        await DataBase.addMessage(createMessageData.message, [createMessageData.chats], createMessageData.filename, createMessageData.time, 1);
        historyMessages.push({
            id: -1,
            message: await ctx.reply(`Сообщение сохраненно`, {...mainMenu})
        })

        await restartScene(ctx);
    }
}

const restartScene = async ctx => {
    await Promise.all(historyMessages.map(async el=>{
        try{
            await ctx.deleteMessage(el.message?.message_id)
        }
        catch (e) {

        }
    }))
    ctx.wizard.selectStep(0);
    createMessageData = {}
    historyMessages = [];
    await selectChats(ctx)
}

const listChatsScene = new Scenes.WizardScene('listChats', checkChat, waitEdit, createMessage)

listChatsScene.enter(async ctx => {
    createMessageData = {}
    historyMessages = [];
    await selectChats(ctx)
})

listChatsScene.hears(CMD_TEXT.menu,async ctx => {
    await ctx.scene.leave();
    return showMainMenu(ctx);
})

listChatsScene.hears(CMD_TEXT.listChatsRestartScene, restartScene)

listChatsScene.leave(async ctx=>{
    await Promise.all(historyMessages.map(async el=>{
       try{
           await ctx.deleteMessage(el.message?.message_id)
       }
       catch (e) {

       }
    }))
})

listChatsScene.hears(CMD_TEXT.back, async ctx => {
    if (ctx.wizard.cursor !== 2)
        return;

    if (createMessageData.step === 2){
        createMessageData.message = "";
        createMessageData.step = 1;
        historyMessages.push({
            id: -1,
            message: await ctx.reply(`Введите сообщение`, {...listChatsCreateMessageEnterText})
        })
    }
    else if(createMessageData.step === 1){
        createMessageData.filename = "";
        createMessageData.step = 0;
        historyMessages.push({
            id: -1,
            message: await ctx.reply("Выберите файл", {...listChatsCreateMessageEnterFile})
        })
    }
})

listChatsScene.hears(CMD_TEXT.skip, async ctx => {
    if (ctx.wizard.cursor !== 2)
        return

    if (createMessageData.step===0){
        createMessageData.step = 1;
        historyMessages.push({
            id: -1,
            message: await ctx.reply(`Введите сообщение`, {...listChatsCreateMessageEnterText})
        })
    }
    else if (createMessageData.step===1){
        if (createMessageData.filename==="" && createMessageData.message===""){
            historyMessages.push({
                id: -1,
                message: await ctx.reply(`Добавьте медиа или текст`)
            })
            return
        }
        createMessageData.step = 2;
        historyMessages.push({
            id: -1,
            message: await ctx.reply(`Введите время в формате (18:30, 20:40, 23:10)`, {...backWithMainButtons})
        })
    }
})

module.exports = {listChatsScene};