const axios = require("axios");
const {DataBase} = require("../controllers/commands");
const fs = require("fs");
const path = require("path")
const uniqid = require("uniqid");

const downloadFile = async (ctx) => {
    try{
        let fileName = uniqid();
        let fileId = ""

        if (ctx.update.message.photo){
            const length = ctx.update.message.photo.length;
            fileId = ctx.update.message.photo[length-1].file_id;
            fileName += "-image-image.jpg";
        }
        else if(ctx.update.message.document){
            fileId = ctx.message.document.file_id;
            fileName += `-document-${ctx.message.document.file_name || `-video.gif`}`;
        }
        else if(ctx.update.message.video){
            fileId = ctx.message.video.file_id;
            fileName += `-video-${ctx.message.video.file_name}`;
        }

        const url = await ctx.telegram.getFileLink(fileId);
        const response = await axios({url, responseType: 'stream'});
        await response.data.pipe(fs.createWriteStream(`./public/${fileName}`));
        return fileName;
    }
    catch (e) {
        await ctx.reply("Повторите загрузку файла")
        return null;
    }
}

const sleep = async ms => {
    return await new Promise(resolve => setTimeout(resolve, ms));
}

const getStringTime = date => {
    const checkLength = value => value.toString().length === 1;

    return `${checkLength(date.getDate()) ? `0${date.getDate()}` : date.getDate()}.${checkLength(date.getMonth() + 1) ? `0${date.getMonth() + 1}` : date.getMonth() + 1} `+
        `${checkLength(date.getHours()) ? `0${date.getHours()}` : date.getHours()}:${checkLength(date.getMinutes()) ? `0${date.getMinutes()}` : date.getMinutes()}`
}

const checkTime = (text) => {
    let time = text.split(",");
    for (let i = 0; i < time.length; i++) {
        let temp = time[i].trim().split(":")
        if (time[i].trim().length!==5 ||
            +temp[0]>=24 || +temp[1]>59 ||
            temp[0].length !== 2 || temp[1].length !== 2
        )
            return false
    }
    return true
}

const clearFiles = () => {
    const date = new Date();
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setDate(date.getDate() - 7);

    const folder = path.join(__dirname,"../public");
    const files = fs.readdirSync(folder);
    files.forEach(file=>{
        const filePath = path.join(folder, file);
        const {birthtime} = fs.statSync(filePath);
        if (new Date(birthtime).getTime() < date.getTime())
            try{
                fs.unlink(filePath);

            }
            catch (e) {

            }

    })
    DataBase.clearLogs(date.getTime());
}

const parseTelegramMessage = (telegramData) => {
    const text = telegramData.message.text || telegramData.message.caption
    const entities = telegramData.message.entities || telegramData.message.caption_entities

    if (!entities) {
        return text
    }

    let tags = [];

    entities.forEach((entity) => {
        const startTag = getTag(entity, text);
        let searchTag = tags.filter(tag=>tag.index===entity.offset)
        if (searchTag.length>0)
            searchTag[0].tag+=startTag;
        else
            tags.push({
                index: entity.offset,
                tag: startTag
            });

        const closeTag = startTag.indexOf("<a ")===0 ? "</a>" : "</"+startTag.slice(1);
        searchTag = tags.filter(tag=>tag.index===entity.offset+entity.length)
        if (searchTag.length>0)
            searchTag[0].tag = closeTag+searchTag[0].tag;
        else
            tags.push({
                index: entity.offset+entity.length,
                tag: closeTag
            })
    })
    let html = "";
    for (let i = 0; i<text.length; i++){
        const tag = tags.filter(tag=>tag.index===i);
        tags = tags.filter(tag=>tag.index!==i);
        if (tag.length>0)
            html+=tag[0].tag;
        html+=text[i];
    }
    if (tags.length>0)
        html+=tags[0].tag

return html;
}

const getTag = (entity, text) => {
    const entityText = text.slice(entity.offset, entity.offset + entity.length)

    switch (entity.type) {
        case 'bold':
            return `<strong>`
        case 'text_link':
            return `<a href="${entity.url}" target="_blank">`
        case 'url':
            return `<a href="${entityText}" target="_blank">`
        case 'italic':
            return `<em>`
        case "code":
            return `<code>`
        case "strikethrough":
            return `<s>`
        case "underline":
            return `<u>`
        case "pre":
            return `<pre>`
        case 'mention':
            return `<a href="https://t.me/${entityText.replace('@', '')}" target="_blank">`
        case 'email':
            return `<a href="mailto:${entityText}">`
        case 'phone_number':
            return `<a href="tel:${entityText}">`
    }
}

module.exports = {downloadFile, sleep, getStringTime, checkTime, clearFiles, parseTelegramMessage}