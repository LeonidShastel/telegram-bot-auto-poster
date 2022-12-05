const sqlite3 = require("sqlite3");
const {open} = require("sqlite");

const sortArray = (x, y) =>{
    if (x.name < y.name) {return -1;}
    if (x.name > y.name) {return 1;}
    return 0;
}

class DB {
    constructor() {
        this.db = null;
    }
    async connect(){
        this.db = await open({
            filename: "services/database.db",
            driver: sqlite3.Database
        })
    }

    async getChats(){
        const chats = await this.db.all("SELECT * FROM `chats`");
        return chats.sort(sortArray);
    }

    async deleteChat(chatId){
        await this.db.exec(`DELETE FROM 'chats' WHERE chatId=${chatId}`, err => {
            if (err)
                console.error(`Delete chats error: ${err.message}`)
        })
    }

    async addChat(chatId, name, url){
        await this.db.exec(`INSERT INTO chats (id, chatId, name, url) VALUES (null, ${chatId}, '${name}', '${url}')`, err => {
            if (err)
                console.error(`Add chat error: ${err.message}`);
        })

    }

    async getCurrentChat(chatId){
        try{
            return await this.db.get(`SELECT * FROM chats WHERE chatId=${chatId}`);
        }
        catch (e) {
            console.error(`Get current chat error: ${e.stack}`);
        }
    }

    async getMessagesForCurrentChat(chatId){
        try{
            return await this.db.get(`SELECT * FROM messages WHERE chatId=${chatId} AND state=1 AND time != '"Моментальное"' AND time != '""'`);
        }
        catch (e) {
            console.error(`Get messages error: ${e.stack}`);
        }
    }

    async getCurrentMessage(messageId){
        try{
            return await this.db.get(`SELECT * FROM messages WHERE id=${messageId}`);
        }
        catch (e) {
            console.error(`Get message error: ${e.stack}`);
        }
    }
    async deleteMessage(messageId){
        try{
            await this.db.exec(`DELETE FROM messages WHERE id=${messageId}`);
        }
        catch (e) {
            console.error(`Delete message error: ${e.stack}`)
        }
    }

    async getMessagesByTime(time){
        return await this.db.all(`SELECT * FROM messages WHERE time LIKE '%${time}%' AND state=1`);
    }

    async updateMessage(message){
        try{
            await this.db.exec(`UPDATE messages SET text='${message.text}', filename='${message.filename}', time='${message.time}', state=${message.state ? message.state : 1} WHERE id = ${message.id}`)
        }
        catch (e) {
            console.error(`Update message error: ${e.stack}`)
        }
    }

    async addMessage(text, chats, filename, time, state){
        try{
            const result = [];
            if (time !== "Моментальное")
                for (let i = 0; i< chats.length; i++)
                    await this.db.run(`UPDATE messages SET state=0 WHERE chatId=${chats[i]}`)

            for (let i = 0; i < chats.length; i++) {
                const data = await this.db.run(`INSERT INTO messages (id, text, chatId, filename, time, state) VALUES (null, '${text}', ${chats[i]}, '${filename}', '${JSON.stringify(time)}', ${state})`,[], function(err){
                    if (err)
                        console.error(`Add message error: ${err.message}`);
                })
                result.push(await this.getCurrentMessage(data.lastID));
            }
            return result
        }
        catch (e) {
            console.error(`Add message error: ${e.message}`)
        }
    }

    async stopMessage(messageId){
        try{
            await this.db.run(`UPDATE messages SET state=0 WHERE id=${messageId}`)
        }
        catch (e) {
            console.error(`Stop message error: ${e.message}`)
        }
    }
    async stopMessageAndLeaveChat(messageId){
        try{
            await this.db.run(`UPDATE messages SET state=0, time='""' WHERE id=${messageId}`)
            const message = await this.getCurrentMessage(messageId);
            await this.db.run(`DELETE FROM chats WHERE chatId=${message.chatId}`)
        }
        catch (e) {
            console.error(`Stop message error: ${e.message}`)
        }
    }

    async addLog(text, messageId, chatId, messageUrl, type = "message", chatName = null, chatUrl = null, chatEvent = null){
        try{
            let date = new Date();
            const message = await this.getCurrentMessage(messageId);
            const chat = await this.getCurrentChat(chatId);

            if (type === "message"){
                await this.db.exec(`INSERT INTO logs (id, time, text, messageUrl, chatName, chatUrl, messageText, messageTime, messageFile, type, chatEvent, chatId) VALUES
                            (null, ${date.getTime()}, '${text}','${messageUrl}', '${chat?.name || "потерян доступ к чату"}', '${chat?.url || "потерян доступ к чату"}', '${message.text}', '${message.time.replaceAll("\"", "")}', '${message.filename}', 'message', null, null)`);
            }
            else {
                await this.db.exec(`INSERT INTO logs (id, time, text, messageUrl, chatName, chatUrl, messageText, messageTime, messageFile, type, chatEvent, chatId) VALUES
                            (null, ${date.getTime()}, null, null, '${chatName}', '${chatUrl}', null, null, null, 'chat', '${chatEvent}', ${chatId})`);
            }

        }
        catch (e) {
            console.error(`Add log error: ${e.message}`);
        }
    }

    async getLogs(days){
        let date = new Date();
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setDate(date.getDate()-days + 1);

        return await this.db.all(`SELECT * FROM logs WHERE time>${date.getTime()}`);
    }

    async clearLogs(time){
        try{
            await this.db.run(`DELETE FROM chats WHERE time<${time}`);
        }
        catch (e) {
            console.error(`Error clear logs`);
        }
    }
}

module.exports = DB;