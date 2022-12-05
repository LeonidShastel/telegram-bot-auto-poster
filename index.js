require('dotenv').config({ path: './config/.env' })

const { setupBot, ListenerClient} = require('./bot');
const {DataBase} = require("./controllers/commands");

(async function () {
    try {
        await DataBase.connect()

        console.log("Bot started")
        ListenerClient.startListener()
        await setupBot().launch()
    } catch (error) {
        console.log('Ошибка запуска: ', error)
    }
}())
