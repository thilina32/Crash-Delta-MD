function isValidUrl(url) {
    const urlPattern = new RegExp(
        '^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR IP (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$',
        'i'
    );
    return !!url && urlPattern.test(url);
}


async function helder(m, t2 = null) {
    if(!m.key.fromMe){
        console.log(JSON.stringify(m))
    let t = t2 ?? m.message?.extendedTextMessage?.text ?? m.message?.templateButtonReplyMessage?.selectedId ?? m.message?.conversation ??  m.message?.buttonsResponseMessage?.selectedButtonId ?? "";
    if(m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson){
        t = JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id
    }
    
    const cmdlist = ['mp3', 'song', 'img', 'modapk', 'apk', 'paper', 'video', 'gimage', 'reset', 'movie', "sticker","ringtone","fb","mode","bot","add"];

    const iscmd = t.startsWith('.');
    const com = iscmd ? t.split(' ')[0]?.replace('.', '') : null;

    const isValidCommand = cmdlist.includes(com);

    const url = t.split(' ')[1] || null;
    const isValid = isValidUrl(url);

    const data = {
        jid: m.key.remoteJid,
        id: m.key.id,
        me: m.key.fromMe,
        text: t,
        iscmd: iscmd && isValidCommand,
        command: isValidCommand ? com : null,
        args: t.split(' ')?.slice(1).join(' ') || null,
        url: isValid ? url : null, 
        ex: m.message?.extendedTextMessage?.contextInfo?.expiration || m.message?.audioMessage?.contextInfo?.expiration || m.message?.templateButtonReplyMessage?.contextInfo?.expiration || m.message?.interactiveResponseMessage?.contextInfo?.expiration || m.message?.buttonsResponseMessage?.contextInfo?.expiration || 0
    };
    return data;
    }else{
        const data = {
            text: false
        };
    
        return data;
    }
    
}

module.exports = helder;
