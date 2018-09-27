var _l = console.log;

//var isSecure = !(!!process.env.PORT || !!process.env.IP);
var isSecure = false;

var path = require('path');
var config = require('./config');
var protocol = isSecure ? require('https') : require('http');
var mysql = require('mysql');
var fs = require('fs');
var storage = mysql.createConnection(config.dbConnection);

/*var httpHandler = (request, response) => {
	response.writeHead(200);
	response.write(fs.readFileSync('./socket.io.js', 'utf8'));
	response.end();
};*/
var rtc, signals;

if (isSecure) {
	rtc = protocol.createServer({
		key: fs.readFileSync(path.join(__dirname, config.https.privateKeyFilename)),
		cert: fs.readFileSync(path.join(__dirname, config.https.certFilename))
	}, httpHandler);
	signals = protocol.createServer({
		key: fs.readFileSync(path.join(__dirname, config.https.privateKeyFilename)),
		cert: fs.readFileSync(path.join(__dirname, config.https.certFilename))
	}, httpHandler);
} else {
	rtc = protocol.createServer();
	signals = protocol.createServer();
};

var io = require('socket.io')(signals);
io.set('origins', '*:*');

rtc = rtc.listen(config.rtc.port, config.rtc.ip, () => {
	var tuple = rtc.address();
	console.log('RTC is ready for connections at ', tuple.address + ':' + tuple.port);
});
signals = signals.listen(config.signals.port, config.signals.ip, () => {
	var tuple = signals.address();
	console.log('Main app is ready for connections at ', tuple.address + ':' + tuple.port);
});

require('./lib/rtc/rtcServer.js')(rtc, (socket) => {
	try {
		var params = socket.handshake.query;
		if (!params.socketCustomEvent) params.socketCustomEvent = 'custom-message';
		socket.on(params.socketCustomEvent, (message) => {
			try { socket.broadcast.emit(params.socketCustomEvent, message);
			} catch (e1) {};
		});
	} catch (e) {};
});

var handler = require('./lib/handler')(config, io, storage);

io.sockets.on('connection', handler);