const {sleep, clearFiles} = require("../utils/utils");
const {DataBase} = require("../controllers/commands");
const {ADMINS_ID} = require("../config/consts");

class Listener {

    constructor(bot) {
        this.bot = bot;
        this.date = new Date();
        this.lastClear = new Date();
    }

    async startListener(){
        setInterval(clearFiles,  6.048*Math.pow(10, 8));

        await sleep((60-this.date.getSeconds())*1000);

        while (true){
            try{
                await this.sendMessage()
            }
            catch (e) {
                console.error(`Error listener: ${e.stack}`);
                await sleep(60000 - (new Date().getTime() - this.date.getTime()));
            }
        }
    }

    async sendMessage(customMessages = null){
        try {
            let messages = customMessages;

            if (customMessages === null){
                this.date = new Date();
                const time = `${this.date.getHours().toString().length > 1 ? this.date.getHours() : `0${this.date.getHours()}`}:`+
                    `${this.date.getMinutes().toString().length > 1 ? this.date.getMinutes() : `0${this.date.getMinutes()}`}`
                messages = await DataBase.getMessagesByTime(time);
            }

            for (let i = 0; i < messages.length; i++) {
                try{
                    let message;
                    if (messages[i].filename.indexOf("-animation-") !== -1)
                        message = await this.bot.telegram.sendAnimation(messages[i].chatId, {
                            source: `./public/${messages[i].filename}`
                        }, {
                            caption: messages[i].text,
                            parse_mode: "HTML"
                        })
                    else if(messages[i].filename.indexOf("-video-") !== -1)
                        message = await this.bot.telegram.sendVideo(messages[i].chatId, {
                            source: `./public/${messages[i].filename}`
                        }, {
                            caption: messages[i].text,
                            parse_mode: "HTML"
                        })
                    else if (messages[i].filename.indexOf("-image-") !== -1){
                        message = await this.bot.telegram.sendPhoto(messages[i].chatId, {
                            source: `./public/${messages[i].filename}`
                        }, {
                            caption: messages[i].text,
                            parse_mode: "HTML"
                        })
                    }
                    else if(messages[i].filename)
                        message = await this.bot.telegram.sendDocument(messages[i].chatId, {
                            source: `./public/${messages[i].filename}`
                        }, {
                            caption: messages[i].text,
                            parse_mode: "HTML"
                        })
                    else
                        message = await this.bot.telegram.sendMessage(messages[i].chatId, messages[i].text, {parse_mode: "HTML"})

                    let url = "?????????????? ????????????";
                    if (message?.chat?.username)
                        url = `https://t.me/${message?.chat?.username}/${message.message_id}`;

                    await DataBase.addLog(`???????????????? ??????????????`, messages[i].id, messages[i].chatId, url)
                }
                catch (e) {
                    await DataBase.addLog('???????????? ???????????????? ??????????????????', messages[i].id, messages[i].chatId, "")
                    const chat = await DataBase.getCurrentChat(messages[i].chatId);
                    let text = e.message;
                    if (chat)
                        text = `???????????? ???????????????? ??????????????????\n\n??????????: ${messages[i].text}\nID ???????? ${messages[i].chatId}\n?????? ????????: ${chat?.name}\n\nError: ${e.message}`
                    else
                        text = `???????????? ???????????????? ??????????????????\n\n??????????: ${messages[i].text}\nID ???????? ${messages[i].chatId}\n?????? ????????: ?????? ???????????? ???? ????????\n\nError: ${e.message}`
                    await Promise.all(ADMINS_ID.map(async admin=>{
                        await this.bot.telegram.sendMessage(admin, text, {parse_mode: "HTML"});
                    }))
                }
            }

            if (customMessages === null)
                await sleep(60000 - (new Date().getTime() - this.date.getTime()));
        }
        catch (e) {
            console.error(e.message)
        }
    }
}

module.exports = Listener;