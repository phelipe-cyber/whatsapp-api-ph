const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
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
  authStrategy: new LocalAuth({ clientId: 'bot-zdg' }),
  puppeteer: { headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ] }
});

client.initialize();

io.on('connection', function(socket) {
  socket.emit('message', '© BOT-PH - Iniciado');
  socket.emit('qr', './icon.svg');
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      io.emit('qr', url);
      io.emit('message', '© BOT-PH QRCode recebido, aponte a câmera  seu celular!');
    });
});

client.on('ready', () => {
    io.emit('ready', '© BOT-PH Dispositivo pronto!');
    io.emit('message', '© BOT-PH Dispositivo pronto!');
    io.emit('qr', './check.svg')	
    console.log('© BOT-PH Dispositivo pronto');
});

client.on('authenticated', () => {
    io.emit('authenticated', '© BOT-PH Autenticado!');
    io.emit('message', '© BOT-PH Autenticado!');
    console.log('© BOT-PH Autenticado');
});

client.on('auth_failure', function() {
    io.emit('message', '© BOT-PH Falha na autenticação, reiniciando...');
    console.error('© BOT-PH Falha na autenticação');
});

client.on('change_state', state => {
  console.log('© BOT-PH Status de conexão: ', state );
});

client.on('disconnected', (reason) => {
  oi.emit('message', '© BOT-PH Cliente desconectado!');
  console.log('© BOT-PH Cliente desconectado', reason);
  client.initialize();
});

// Send message
app.post('/send-message', async (req, res) => {

  const { number, message } = req.body;

  if (!number || !message) {
    return res.status(400).json({
      status: false,
      message: 'Número e mensagem são obrigatórios.',
    });
  }

  try {
    const state = await client.getState();
    if (state !== 'CONNECTED') {
      return res.status(503).json({
        status: false,
        message: `BOT-PH não conectado. Estado atual: ${state}`,
      });
    }

    const numberZDG = `${number}@c.us`;
    const response = await client.sendMessage(numberZDG, message);

    return res.status(200).json({
      status: true,
      message: 'BOT-PH Mensagem enviada com sucesso!',
      response,
    });
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.message);

    return res.status(500).json({
      status: false,
      message: 'BOT-PH Mensagem não enviada',
      response: error.message,
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

server.listen(port, '0.0.0.0', () => {
  console.log('Aplicação rodando na porta *: ' + port + ' . Acesse no link: http://localhost:' + port);
});