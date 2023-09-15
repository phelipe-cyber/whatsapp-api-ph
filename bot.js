const { Client, Location, List, Buttons, LocalAuth, MessageMedia } = require('./index');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');
const port = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

function delay(t, v) {
  return new Promise(function(resolve) { 
      setTimeout(resolve.bind(null, v), t)
  });
}

app.use(express.json());

app.use(express.urlencoded({
extended: true
}));

app.use(fileUpload({
debug: true
}));

app.use("/", express.static(__dirname + "/"))

app.get('/', (req, res) => {
    res.sendFile('index.html', {
      root: __dirname
    });
  });

const client = new Client({
    authStrategy: new LocalAuth(),
    // proxyAuthentication: { username: 'username', password: 'password' },
    puppeteer: { 
        // args: ['--proxy-server=proxy-server-that-requires-authentication.example.com'],
        headless: true
    }
});

client.initialize();

client.on('loading_screen', (percent, message) => {
    console.log('LOADING SCREEN', percent, message);
});

// client.on('qr', (qr) => {
//     // NOTE: This event will not be fired if a session is specified.
//     console.log('QR RECEIVED', qr);
// });

io.on('connection', function(socket) {
    socket.emit('message', '© BOT-PH - Iniciado');
    socket.emit('qr', './icon.svg');

    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr, (err, url) => {
        socket.emit('qr', url);
        socket.emit('message', '© BOT-PH - QRCode recebido, aponte a câmera  seu celular!');
        });
    });


    client.on('authenticated', () => {
        // console.log('AUTHENTICATED');
        socket.emit('authenticated', '© BOT-PH - Autenticado!');
        socket.emit('message', '© BOT-PH Autenticado!');
        console.log('© BOT-PH Autenticado');
    });

    client.on('auth_failure', msg => {
        // Fired if session restore was unsuccessful
        console.error('AUTHENTICATION FAILURE', msg);
        socket.emit('message', '© BOT-PH - Falha na autenticação, reiniciando...');
        console.error('© BOT-PH Falha na autenticação');
    });

    client.on('ready', () => {
        // console.log('READY');
        socket.emit('ready', '© BOT-PH - Dispositivo pronto!');
        socket.emit('message', '© BOT-PH - Dispositivo pronto!');
        socket.emit('qr', './check.svg')	
        console.log('© BOT-PH Dispositivo pronto');
    });

    client.on('change_state', state => {
        console.log('© BOT-PH Status de conexão: ', state );
    });

    client.on('disconnected', (reason) => {
        socket.emit('message', '© BOT-PH - Cliente desconectado!');
        console.log('© BOT-PH - Cliente desconectado', reason);
        client.initialize();
    });

});

// Send message
app.post('/send-message', [
    body('number').notEmpty(),
    body('message').notEmpty(),
  ], async (req, res) => {
    const errors = validationResult(req).formatWith(({
      msg
    }) => {
      return msg;
    });
  
    if (!errors.isEmpty()) {
      return res.status(422).json({
        status: false,
        message: errors.mapped()
      });
    }
  
    const number = req.body.number;
    const numberDDI = number.substr(0, 2);
    const numberDDD = number.substr(2, 2);
    const numberUser = number.substr(-8, 8);
    const message = req.body.message;
  
    if (numberDDI !== "55") {
      const numberZDG = number + "@c.us";
      client.sendMessage(numberZDG, message).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-PH Mensagem enviada',
        response: response
      });
      }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-PH Mensagem não enviada',
        response: err.text
      });
      });
    }
    else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
      const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
      client.sendMessage(numberZDG, message).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-PH Mensagem enviada',
        response: response
      });
      }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-PH Mensagem não enviada',
        response: err.text
      });
      });
    }
    else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
      const numberZDG = "55" + numberDDD + numberUser + "@c.us";
      client.sendMessage(numberZDG, message).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-PH Mensagem enviada',
        response: response
      });
      }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-PH Mensagem não enviada',
        response: err.text
      });
      });
    }
  });

// Send media
app.post('/send-media', [
    body('number').notEmpty(),
    body('caption').notEmpty(),
    body('file').notEmpty(),
  ], async (req, res) => {
    const errors = validationResult(req).formatWith(({
      msg
    }) => {
      return msg;
    });
  
    if (!errors.isEmpty()) {
      return res.status(422).json({
        status: false,
        message: errors.mapped()
      });
    }
  
    const number = req.body.number;
    const numberDDI = number.substr(0, 2);
    const numberDDD = number.substr(2, 2);
    const numberUser = number.substr(-8, 8);
    const caption = req.body.caption;
    const fileUrl = req.body.file;
  
    let mimetype;
    const attachment = await axios.get(fileUrl, {
      responseType: 'arraybuffer'
    }).then(response => {
      mimetype = response.headers['content-type'];
      return response.data.toString('base64');
    });
  
    const media = new MessageMedia(mimetype, attachment, 'Media');
  
    if (numberDDI !== "55") {
      const numberZDG = number + "@c.us";
      client.sendMessage(numberZDG, media, {caption: caption}).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-PH Imagem enviada',
        response: response
      });
      }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-PH Imagem não enviada',
        response: err.text
      });
      });
    }
    else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
      const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
      client.sendMessage(numberZDG, media, {caption: caption}).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-PH Imagem enviada',
        response: response
      });
      }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-PH Imagem não enviada',
        response: err.text
      });
      });
    }
    else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
      const numberZDG = "55" + numberDDD + numberUser + "@c.us";
      client.sendMessage(numberZDG, media, {caption: caption}).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-PH Imagem enviada',
        response: response
      });
      }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-PH Imagem não enviada',
        response: err.text
      });
      });
    }
  });
  
client.on('message', async msg => {
    console.log('MESSAGE RECEIVED', msg);

    if (msg.body == 'ping') {
        // Send a new message as a reply to the current one
        msg.reply('pong');
        
    } else if (msg.body ==='Cardapio') {
        // Send a new message to the same chat
        // client.sendMessage(msg.from, 'pong');
        const nomeContato = msg._data.notifyName;
        const saudacaoes = ['Olá ' + nomeContato + ', tudo bem?\r\n'];
        const saudacao = saudacaoes[Math.floor(Math.random() * saudacaoes.length)];
        msg.reply(saudacao + "Esse é um atendimento automático, e não é monitorado por um humano. \r\n\r\nEscolha uma das opções abaixo para iniciarmos: \r\n\r\n*[ 1 ]* - Cardapio.");

    } else if (msg.body === '1') {
        // Send a new message to the same chat
        // client.sendMessage(msg.from, 'pong');
        // client.sendMessage(msg.from, "https://bedlekburgues.com.br/cardapio-online/");
        
              let button = new Buttons('Button body', [{ body: 'bt1' }, { body: 'bt2' }, { body: 'bt3' }], 'title', 'footer');
              msg.reply(msg.from, button);

    // } else if (msg.body.startsWith('!sendto ')) {
    //     // Direct send a new message to specific id
    //     let number = msg.body.split(' ')[1];
    //     let messageIndex = msg.body.indexOf(number) + number.length;
    //     let message = msg.body.slice(messageIndex, msg.body.length);
    //     number = number.includes('@c.us') ? number : `${number}@c.us`;
    //     let chat = await msg.getChat();
    //     chat.sendSeen();
    //     client.sendMessage(number, message);

    // } else if (msg.body.startsWith('!subject ')) {
    //     // Change the group subject
    //     let chat = await msg.getChat();
    //     if (chat.isGroup) {
    //         let newSubject = msg.body.slice(9);
    //         chat.setSubject(newSubject);
    //     } else {
    //         msg.reply('This command can only be used in a group!');
    //     }
    // } else if (msg.body.startsWith('!echo ')) {
    //     // Replies with the same message
    //     msg.reply(msg.body.slice(6));
    // } else if (msg.body.startsWith('!desc ')) {
    //     // Change the group description
    //     let chat = await msg.getChat();
    //     if (chat.isGroup) {
    //         let newDescription = msg.body.slice(6);
    //         chat.setDescription(newDescription);
    //     } else {
    //         msg.reply('This command can only be used in a group!');
    //     }
    // } else if (msg.body === '!leave') {
    //     // Leave the group
    //     let chat = await msg.getChat();
    //     if (chat.isGroup) {
    //         chat.leave();
    //     } else {
    //         msg.reply('This command can only be used in a group!');
    //     }
    // } else if (msg.body.startsWith('!join ')) {
    //     const inviteCode = msg.body.split(' ')[1];
    //     try {
    //         await client.acceptInvite(inviteCode);
    //         msg.reply('Joined the group!');
    //     } catch (e) {
    //         msg.reply('That invite code seems to be invalid.');
    //     }
    // } else if (msg.body === '!groupinfo') {
    //     let chat = await msg.getChat();
    //     if (chat.isGroup) {
    //         msg.reply(`
    //             *Group Details*
    //             Name: ${chat.name}
    //             Description: ${chat.description}
    //             Created At: ${chat.createdAt.toString()}
    //             Created By: ${chat.owner.user}
    //             Participant count: ${chat.participants.length}
    //         `);
    //     } else {
    //         msg.reply('This command can only be used in a group!');
    //     }
    // } else if (msg.body === '!chats') {
    //     const chats = await client.getChats();
    //     client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
    // } else if (msg.body === '!info') {
    //     let info = client.info;
    //     client.sendMessage(msg.from, `
    //         *Connection info*
    //         User name: ${info.pushname}
    //         My number: ${info.wid.user}
    //         Platform: ${info.platform}
    //     `);
    // } else if (msg.body === '!mediainfo' && msg.hasMedia) {
    //     const attachmentData = await msg.downloadMedia();
    //     msg.reply(`
    //         *Media info*
    //         MimeType: ${attachmentData.mimetype}
    //         Filename: ${attachmentData.filename}
    //         Data (length): ${attachmentData.data.length}
    //     `);
    // } else if (msg.body === '!quoteinfo' && msg.hasQuotedMsg) {
    //     const quotedMsg = await msg.getQuotedMessage();

    //     quotedMsg.reply(`
    //         ID: ${quotedMsg.id._serialized}
    //         Type: ${quotedMsg.type}
    //         Author: ${quotedMsg.author || quotedMsg.from}
    //         Timestamp: ${quotedMsg.timestamp}
    //         Has Media? ${quotedMsg.hasMedia}
    //     `);
    // } else if (msg.body === '!resendmedia' && msg.hasQuotedMsg) {
    //     const quotedMsg = await msg.getQuotedMessage();
    //     if (quotedMsg.hasMedia) {
    //         const attachmentData = await quotedMsg.downloadMedia();
    //         client.sendMessage(msg.from, attachmentData, { caption: 'Here\'s your requested media.' });
    //     }
    //     if (quotedMsg.hasMedia && quotedMsg.type === 'audio') {
    //         const audio = await quotedMsg.downloadMedia();
    //         await client.sendMessage(msg.from, audio, { sendAudioAsVoice: true });
    //     }
    // } else if (msg.body === '!isviewonce' && msg.hasQuotedMsg) {
    //     const quotedMsg = await msg.getQuotedMessage();
    //     if (quotedMsg.hasMedia) {
    //         const media = await quotedMsg.downloadMedia();
    //         await client.sendMessage(msg.from, media, { isViewOnce: true });
    //     }
    // } else if (msg.body === '!location') {
    //     msg.reply(new Location(37.422, -122.084, 'Googleplex\nGoogle Headquarters'));
    // } else if (msg.location) {
    //     msg.reply(msg.location);
    // } else if (msg.body.startsWith('!status ')) {
    //     const newStatus = msg.body.split(' ')[1];
    //     await client.setStatus(newStatus);
    //     msg.reply(`Status was updated to *${newStatus}*`);
    // } else if (msg.body === '!mention') {
    //     const contact = await msg.getContact();
    //     const chat = await msg.getChat();
    //     chat.sendMessage(`Hi @${contact.number}!`, {
    //         mentions: [contact]
    //     });
    // } else if (msg.body === '!delete') {
    //     if (msg.hasQuotedMsg) {
    //         const quotedMsg = await msg.getQuotedMessage();
    //         if (quotedMsg.fromMe) {
    //             quotedMsg.delete(true);
    //         } else {
    //             msg.reply('I can only delete my own messages');
    //         }
    //     }
    // } else if (msg.body === '!pin') {
    //     const chat = await msg.getChat();
    //     await chat.pin();
    // } else if (msg.body === '!archive') {
    //     const chat = await msg.getChat();
    //     await chat.archive();
    // } else if (msg.body === '!mute') {
    //     const chat = await msg.getChat();
    //     // mute the chat for 20 seconds
    //     const unmuteDate = new Date();
    //     unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);
    //     await chat.mute(unmuteDate);
    // } else if (msg.body === '!typing') {
    //     const chat = await msg.getChat();
    //     // simulates typing in the chat
    //     chat.sendStateTyping();
    // } else if (msg.body === '!recording') {
    //     const chat = await msg.getChat();
    //     // simulates recording audio in the chat
    //     chat.sendStateRecording();
    // } else if (msg.body === '!clearstate') {
    //     const chat = await msg.getChat();
    //     // stops typing or recording in the chat
    //     chat.clearState();
    // } else if (msg.body === '!jumpto') {
    //     if (msg.hasQuotedMsg) {
    //         const quotedMsg = await msg.getQuotedMessage();
    //         client.interface.openChatWindowAt(quotedMsg.id._serialized);
    //     }
    // } else if (msg.body === '!buttons') {
    //     let button = new Buttons('Button body', [{ body: 'bt1' }, { body: 'bt2' }, { body: 'bt3' }], 'title', 'footer');
    //     client.sendMessage(msg.from, button);
    // } else if (msg.body === '!list') {
    //     let sections = [{ title: 'sectionTitle', rows: [{ title: 'ListItem1', description: 'desc' }, { title: 'ListItem2' }] }];
    //     let list = new List('List body', 'btnText', sections, 'Title', 'footer');
    //     client.sendMessage(msg.from, list);
    // } else if (msg.body === '!reaction') {
    //     msg.react('👍');
    // } else if (msg.body === '!edit') {
    //     if (msg.hasQuotedMsg) {
    //         const quotedMsg = await msg.getQuotedMessage();
    //         if (quotedMsg.fromMe) {
    //             quotedMsg.edit(msg.body.replace('!edit', ''));
    //         } else {
    //             msg.reply('I can only edit my own messages');
    //         }
    //     }
    // } else if (msg.body === '!updatelabels') {
    //     const chat = await msg.getChat();
    //     await chat.changeLabels([0, 1]);
    // } else if (msg.body === '!addlabels') {
    //     const chat = await msg.getChat();
    //     let labels = (await chat.getLabels()).map(l => l.id);
    //     labels.push('0');
    //     labels.push('1');
    //     await chat.changeLabels(labels);
    // } else if (msg.body === '!removelabels') {
    //     const chat = await msg.getChat();
    //     await chat.changeLabels([]);
    // }
    }
});

// client.on('message_create', (msg) => {
//     // Fired on all message creations, including your own
//     if (msg.fromMe) {
//         // do stuff here
//     }
// });

// client.on('message_revoke_everyone', async (after, before) => {
//     // Fired whenever a message is deleted by anyone (including you)
//     console.log(after); // message after it was deleted.
//     if (before) {
//         console.log(before); // message before it was deleted.
//     }
// });

// client.on('message_revoke_me', async (msg) => {
//     // Fired whenever a message is only deleted in your own view.
//     console.log(msg.body); // message before it was deleted.
// });

// client.on('message_ack', (msg, ack) => {
//     /*
//         == ACK VALUES ==
//         ACK_ERROR: -1
//         ACK_PENDING: 0
//         ACK_SERVER: 1
//         ACK_DEVICE: 2
//         ACK_READ: 3
//         ACK_PLAYED: 4
//     */

//     if (ack == 3) {
//         // The message was read
//     }
// });

// client.on('group_join', (notification) => {
//     // User has joined or been added to the group.
//     console.log('join', notification);
//     notification.reply('User joined.');
// });

// client.on('group_leave', (notification) => {
//     // User has left or been kicked from the group.
//     console.log('leave', notification);
//     notification.reply('User left.');
// });

// client.on('group_update', (notification) => {
//     // Group picture, subject or description has been updated.
//     console.log('update', notification);
// });

// client.on('change_state', state => {
//     console.log('CHANGE STATE', state);
// });

// // Change to false if you don't want to reject incoming calls
// let rejectCalls = true;

// client.on('call', async (call) => {
//     console.log('Call received, rejecting. GOTO Line 261 to disable', call);
//     if (rejectCalls) await call.reject();
//     await client.sendMessage(call.from, `[${call.fromMe ? 'Outgoing' : 'Incoming'}] Phone call from ${call.from}, type ${call.isGroup ? 'group' : ''} ${call.isVideo ? 'video' : 'audio'} call. ${rejectCalls ? 'This call was automatically rejected by the script.' : ''}`);
// });

// client.on('disconnected', (reason) => {
//     console.log('Client was logged out', reason);
// });

// client.on('contact_changed', async (message, oldId, newId, isContact) => {
//     /** The time the event occurred. */
//     const eventTime = (new Date(message.timestamp * 1000)).toLocaleString();

//     console.log(
//         `The contact ${oldId.slice(0, -5)}` +
//         `${!isContact ? ' that participates in group ' +
//             `${(await client.getChatById(message.to ?? message.from)).name} ` : ' '}` +
//         `changed their phone number\nat ${eventTime}.\n` +
//         `Their new phone number is ${newId.slice(0, -5)}.\n`);

//     /**
//      * Information about the @param {message}:
//      * 
//      * 1. If a notification was emitted due to a group participant changing their phone number:
//      * @param {message.author} is a participant's id before the change.
//      * @param {message.recipients[0]} is a participant's id after the change (a new one).
//      * 
//      * 1.1 If the contact who changed their number WAS in the current user's contact list at the time of the change:
//      * @param {message.to} is a group chat id the event was emitted in.
//      * @param {message.from} is a current user's id that got an notification message in the group.
//      * Also the @param {message.fromMe} is TRUE.
//      * 
//      * 1.2 Otherwise:
//      * @param {message.from} is a group chat id the event was emitted in.
//      * @param {message.to} is @type {undefined}.
//      * Also @param {message.fromMe} is FALSE.
//      * 
//      * 2. If a notification was emitted due to a contact changing their phone number:
//      * @param {message.templateParams} is an array of two user's ids:
//      * the old (before the change) and a new one, stored in alphabetical order.
//      * @param {message.from} is a current user's id that has a chat with a user,
//      * whos phone number was changed.
//      * @param {message.to} is a user's id (after the change), the current user has a chat with.
//      */
// });

// client.on('group_admin_changed', (notification) => {
//     if (notification.type === 'promote') {
//         /** 
//           * Emitted when a current user is promoted to an admin.
//           * {@link notification.author} is a user who performs the action of promoting/demoting the current user.
//           */
//         console.log(`You were promoted by ${notification.author}`);
//     } else if (notification.type === 'demote')
//         /** Emitted when a current user is demoted to a regular user. */
//         console.log(`You were demoted by ${notification.author}`);
// });

server.listen(port, function() {
    // console.log('Aplicação rodando na porta *: ' + port + ' . Acesse no link: http://localhost:' + port);
});