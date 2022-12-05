// кнопки для бота
const { Markup } = require('telegraf');
const { CMD_TEXT } = require('../config/consts');

const mainMenu =
    Markup.keyboard([
        [CMD_TEXT.createMessage],
        [CMD_TEXT.listChats],
        [CMD_TEXT.logs]
    ]).resize()

const backButtonMenu =
    Markup.keyboard([
        [CMD_TEXT.menu],
    ]).resize()

const backWithMainButtons =
    Markup.keyboard([
        [CMD_TEXT.back],
        [CMD_TEXT.menu]
    ]).resize()

const createMessageEnterMessage =
    Markup.keyboard([
        [CMD_TEXT.skip],
        [CMD_TEXT.back],
        [CMD_TEXT.menu]
    ]).resize()

const createMessageEnterFile =
    Markup.keyboard([
        [CMD_TEXT.skip],
        [CMD_TEXT.menu]
    ]).resize()

const createMessageSelectChat = (chats) => {
    const buttons = chats.map(chat=>[chat.name])
    buttons.push([CMD_TEXT.createMessageFinishSelectChats], [CMD_TEXT.back],
        [CMD_TEXT.menu])

    return Markup.keyboard([
        ...buttons
    ]).resize()
}

const createMessageGraph =
    Markup.keyboard([
        [CMD_TEXT.createMessageInstantPublishing],
        [CMD_TEXT.createMessageCreateGraph],
        [CMD_TEXT.back],
        [CMD_TEXT.menu]
    ]).resize()


const listChatsSelectChat = (chats) => {
    const buttons = chats.map(chat=>[chat.name])
    buttons.push([CMD_TEXT.menu])
    return Markup.keyboard(buttons).resize()
}

const listChatsEditChat = messageId => {
    const buttons = [];
    buttons.push([Markup.button.callback(CMD_TEXT.listChatsEditMessage, `editMessage-${messageId}`)]);
    buttons.push([Markup.button.callback(CMD_TEXT.listChatsEditTime, `editTime-${messageId}`)]);
    buttons.push([Markup.button.callback(CMD_TEXT.listChatsEditFile, `editFile-${messageId}`)]);
    buttons.push([Markup.button.callback(CMD_TEXT.listChatsStopSending, `stopSending-${messageId}`)]);
    buttons.push([Markup.button.callback(CMD_TEXT.listChatsLeaveChat, `leaveChat-${messageId}`)])

    return Markup.inlineKeyboard(buttons).resize()
}

const listChatsCreateMessage = chatId => {
    const buttons = [];
    buttons.push([Markup.button.callback(CMD_TEXT.listChatsCreateSending, `createMessage/${chatId}`)])
    buttons.push([Markup.button.callback(CMD_TEXT.listChatsLeaveChat, `leaveChat/${chatId}`)])

    return Markup.inlineKeyboard(buttons).resize()
}

const listChatsCreateMessageEnterFile =
    Markup.keyboard([
        [CMD_TEXT.skip],
        [CMD_TEXT.listChatsRestartScene],
        [CMD_TEXT.menu]
    ]).resize()

const listChatsCreateMessageEnterText =
    Markup.keyboard([
        [CMD_TEXT.skip],
        [CMD_TEXT.back],
        [CMD_TEXT.listChatsRestartScene],
        [CMD_TEXT.menu]
    ]).resize()

const logsSelectPeriod =
    Markup.keyboard([
        [CMD_TEXT.logsPerDay],
        [CMD_TEXT.logsPerThreeDays],
        [CMD_TEXT.logsPerWeek],
        [CMD_TEXT.menu]
    ]).resize()

const logsShowMessage = (chatId, messageId) => {
    const buttons = {inline_keyboard: []};
    buttons.inline_keyboard.push([{
        text: CMD_TEXT.logsShowMessage,
        callback_data: `showMessage/${chatId}/${messageId}`
    }])
    return buttons;
}

module.exports = {
    mainMenu,
    backButtonMenu,
    backWithMainButtons,
    createMessageGraph,
    createMessageEnterMessage,
    createMessageEnterFile,
    createMessageSelectChat,
    listChatsSelectChat,
    listChatsEditChat,
    logsShowMessage,
    logsSelectPeriod,
    listChatsCreateMessage,
    listChatsCreateMessageEnterFile,
    listChatsCreateMessageEnterText
}