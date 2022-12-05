require('dotenv').config({ path: './config/.env' })

const { setupBot, ListenerClient} = require('./bot');
const {DataBase} = require("./controllers/commands");

(async function () {
    try {
        await DataBase.connect()

        ListenerClient.startListener()
        await setupBot().launch()

        console.log("</ Бот успешно запущен >")
    } catch (error) {
        console.log('Ошибка запуска: ', error)
    }
}())
