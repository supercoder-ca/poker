var _l = console.log;

var uuid = require('uuid');

var engine = require('./engine/logic.js');
var signals = require('./signals');
var _out = signals._out;
var _in = signals._in;

var handlerBuilder = (config, io, storage) => {
	var _e = (socket, e) => { socket.emit(_out.error, e); return false; };
	var _r = (socket, r) => { socket.emit(_out.success, r); return false; }
	var _s = (socketId) => { return io.sockets.connected[socketid]; };

	var db = { tables: {}, players: {} };
	var game = {};

	var createTable = (preferences) => {
		var table = {};
		table.id = uuid.v1();
		table.freeChairs = preferences.capacity;
		table.bank = 0;
		table.players = {};
		table.playersCount = 0;
		table.chairs = [];
		table.preferences = preferences;
		table.engine = engine.newTable({
			minBlind: table.preferences.smallBlind,
			maxBlind: table.preferences.bigBlind,
			maxPlayers : table.preferences.capacity
		});

		table.engine.on('gameOver', () => {
			table.engine.initNewRound();
		});

		table.engine.on('win', (winner, prize) => {
			for (let playerSocketId in table.players) {
				_s(playerSocketId).emit(_out.g_win, {
					prize,
					playerName: winner.playerName,
					cards: winner.cards,
					chips: winner.chips,
					hand: winner.hand.message,
					rank: winner.hand.rank
				});
				if (winner.playerName === db.players[playerSocketId]) {
					storage.query('UPDATE users SET coins = ? WHERE user_id = ?',
						[winner.chips, db.players[playerSocketId].userId],
						(e, result) => { if (e) return _e(_s(playerSocketId), e); });
				};
			};
		});

		table.engine.on('turn', (player) => {
			for (let playerSocketId in table.players) {
				if (db.players[playerSocketId].playerName === player.playerName) {
					_s(playerSocketId).emit(_out.playersTurn);
					table.currentPlayer = player;
					break;
				};
			};
		});

		for (var i = 0; i < 9; i++) table.chairs.push({ busy: false });

		storage.query('INSERT INTO counttablejoined set ?', {
			tableId: table.id,
			tableData: JSON.stringify(table)
		}, (e, result) => {});

		return table;
	};

	var joinTable = (socket, id) => {
		return new Promise((go, stop) => {
			db.tables[id].players[socket.id] = { chair: undefined };
			db.tables[id].playersCount += 1;
			return go();
		});
	};

	var leaveChair = (socket, id, chairNumber) => {
		return new Promise((go, stop) => {
			db.tables[id].chairs[db.tables[id].players[socket.id].chair].busy = false;
			db.tables[id].players[socket.id].chair = undefined;
			db.tables[id].freeChairs += 1;
			db.tables[id].engine.removePlayer(db.players[socket.id].playerName);
			return go();
		});
	};

	var leaveTable = (socket, id) => {
		return new Promise((go, stop) => {
			leaveChair(socket, id, db.tables[id].players[socket.id].chair).then(() => {
				delete db.tables[id].players[socket.id];
				db.tables[id].playersCount -= 1;
				return go();
			}).catch((e) => { return stop(e); });
		});
	};

	var sitOnChair = (socket, id, chairNumber) => {
		return new Promise((go, stop) => {
			db.tables[id].chairs[chairNumber].busy = socket.id;
			db.tables[id].players[socket.id].chair = chairNumber;
			db.tables[id].freeChairs -= 1;
			db.tables[id].engine.addPlayer({
				playerName: db.players[socket.id].playerName,
				chips: db.players[socket.id].chips
			});
			return go();
		});
	};

	var handler = (socket) => {
		var _eh = (initial, error) => { _e(socket, { initial, error }); };
		var _rh = (initial, result) => { _r(socket, { initial, result }); };

		socket.on(_in.playerEnter, (userId, playerName) => {
			if (db.players[socket.id]) return _eh(_in.playerEnter, new Error('Player is already playing'));
			storage.query('SELECT coins FROM users WHERE user_id = ?', [userId], (e, rows, fields) => {
				if (e) return _eh(_in.playerEnter, e);
				if (!rows.length) return _eh(_in.playerEnter, new Error('No such player'));
				var chips = rows[0].coins;
				db.players[socket.id] = {
					playerName,
					chips,
					userId
				};
				return _rh(_in.playerEnter, { playerName });
			});
		});
		socket.on(_in.playerQuit, (playerName) => {
			if (!db.players[socket.id]) return _eh(_in.playerQuit, new Error('Player is not logged in'));
			delete db.players[socket.id];
			return _rh(_in.playerQuit, { playerName });
		});
		socket.on(_in.getPlayerName, () => {
			if (!db.players[socket.id]) return _eh(_in.getPlayerName, new Error('Player is not logged in'));
			return _rh(_in.getPlayerName, { playerName: db.players[socket.id].playerName });
		});
		socket.on(_in.setPlayerName, (playerName) => {
			if (!db.players[socket.id]) return _eh(_in.setPlayerName, new Error('Player is not logged in'));
			db.players[socket.id].playerName = playerName;
			return _rh(_in.setPlayerName, { playerName });
		})

		socket.on(_in.listTables, () => {
			if (db.tables.length) {
				var tablesPreferences = [];
				for (let i in db.tables) {
					tablesPreferences.push({
						id: i,
						preferences: db.tables[i].preferences
					});
				};
				return _rh(_in.listTables, tablesPreferences);
			} else return _eh(_in.listTables, new Error('no tables'));
		});
		socket.on(_in.getTableInfo, (id) => {
			return (db.tables[id]
				? _rh(_in.getTableInfo, db.tables[id])
				: _eh(_in.getTableInfo, new Error('No such table'))
			);
		});
		socket.on(_in.joinTable, (id, preferences, buyIn) => {
			if (!id) id = uuid.v1();
			var defaultPreferences = {
				capacity: 7,
				playersToStart: 2,
				smallBlind: 1,
				bigBlind: 2,
				minBuyIn: 10,
				maxBuyIn: undefined
			};
			if (!preferences) preferences = defaultPreferences;
			else try { preferences = JSON.parse(preferences);
			} catch (parseE) { preferences = defaultPreferences; };
			var userId = db.players[socket.id].userId;
			storage.query('SELECT coins FROM users WHERE user_id = ?', [userId], (e, rows, fields) => {
				if (e) return _eh(_in.joinTable, e);
				if (!rows.length) return _eh(_in.joinTable, new Error('No such player'));
				var chips = rows[0].coins;
				if (buyIn > chips) return _eh(_in.joinTable, new Error('Player does not have so much chips'));
				if (!db.tables[id]) db.tables[id] = createTable(preferences);
				joinTable(socket, id).then(() => {
					for (let playerSocketId in db.tables[id].players) {
						_s(playerSocketId).emit(_out.otherJoinedTable, {
							playerName: db.players[socket.id].playerName
						});
					};
					return _rh(_in.joinTable, { id });
				}).catch((e) => { return _eh(_in.joinTable, e); });
			});
		});
		socket.on(_in.leaveTable, (id) => {
			leaveTable(socket, id).then(() => {
				for (let playerSocketId in db.tables[id].players) {
					_s(playerSocketId).emit(_out.otherLeftTable, {
						playerName: db.players[socket.id].playerName
					});
				};
				if (db.tables[id].playersCount === 0) {
					storage.query('DELETE FROM counttablejoined WHERE tableId = ?', [id], (e, result) => {
						if (e) return _eh(_in.leaveTable, e);
					});
					delete db.tables[id];
				};
				return _rh(_in.leaveTable, { id });
			}).catch((e) => { return _eh(_in.leaveTable, e); });
		});

		socket.on(_in.sitOnChair, (id, chairNumber = 'any') => {
			if (!db.tables[id]) return _eh(_in.sitOnChair, new Error('No such table'));
			if (db.tables[id].freeChairs <= 0) return _eh(_in.sitOnChair, new Error('No free chairs on this table'));
			if (chairNumber === 'any') {
				var freeChair = undefined;
				for (var i = 0; i < 9; i++) {
					if (!db.tables[id].chairs[i].busy) {
						freeChair = i;
						break;
					};
				};
				if (freeChair === undefined) return _eh(_in.sitOnChair, new Error('No free chairs on this table'));
			};
			if ((chairNumber + 1) > table.chairs.length) return _eh(_in.sitOnChair, new Error('Invalid chair number'));
			if (table.chairs[chairNumber].busy) return _eh(_in.sitOnChair, new Error('Selected chair is already busy'));

			sitOnChair(socket, id, chairNumber).then(() => {
				if (db.tables[id].playersCount >= db.tables[id].preferences.playersToStart)
					db.tables[id].engine.startGame();
				for (let playerSocketId in db.tables[id].players) {
					_s(playerSocketId).emit(_out.otherSatOnChair, {
						playerName: db.players[socket.id].playerName,
						chairNumber
					});
				};
				return _rh(_in.sitOnChair, { id, chairNumber });
			}).catch((e) => { return _eh(_in.sitOnChair, e); });
		});

		socket.on(_in.leaveChair, (id, chairNumber) => {
			if (!db.tables[id]) return _eh(_in.leaveChair, new Error('No such table'));
			if ((chairNumber + 1) > table.chairs.length) return _eh(_in.leaveChair, new Error('Invalid chair number'));
			if (!table.chairs[chairNumber].busy || table.players[socket.id].chair !== chairNumber)
				return _eh(_in.leaveChair, new Error('Selected chair is not busy'));

			leaveChair(socket, id, chairNumber).then(() => {
				for (let playerSocketId in db.tables[id].players) {
					_s(playerSocketId).emit(_out.otherLeftChair, {
						playerName: db.players[socket.id].playerName,
						chairNumber
					});
					if (playerSocketId === socket.id) {
						storage.query('UPDATE users SET coins = ? WHERE user_id = ?',
							[db.players[playerSocketId].chips, db.players[playerSocketId].userId],
						(e, result) => { if (e) return _e(_s(playerSocketId), e); });
					};
				};
				return _rh(_in.leaveChair, { id, chairNumber });
			}).catch((e) => { return _eh(_in.leaveChair, e); });
		});

		socket.on(_in.g_check, () => {
			if (db.players[socket.id].playerName !== table.currentPlayer.playerName)
				return _eh(_in.g_check, new Error('Not your turn now'));
			table.currentPlayer.check();
			for (let playerSocketId in db.tables[id].players) {
				_s(playerSocketId).emit(_out.g_otherChecked, {
					playerName: db.players[socket.id].playerName
				});
			};
			return _rh(_in.g_check, {});
		});
		socket.on(_in.g_bet, (amount) => {
			if (db.players[socket.id].playerName !== table.currentPlayer.playerName)
				return _eh(_in.g_bet, new Error('Not your turn now'));
			table.currentPlayer.bet(amount);
			for (let playerSocketId in db.tables[id].players) {
				_s(playerSocketId).emit(_out.g_otherBet, {
					playerName: db.players[socket.id].playerName,
					amount
				});
			};
			return _rh(_in.g_bet, {});
			//	TODO CHECKS
		});
		socket.on(_in.g_call, () => {
			if (db.players[socket.id].playerName !== table.currentPlayer.playerName)
				return _eh(_in.g_call, new Error('Not your turn now'));
			table.currentPlayer.call();
			for (let playerSocketId in db.tables[id].players) {
				_s(playerSocketId).emit(_out.g_otherCalled, {
					playerName: db.players[socket.id].playerName
				});
			};
			return _rh(_in.g_call, {});
		});
		socket.on(_in.g_fold, () => {
			if (db.players[socket.id].playerName !== table.currentPlayer.playerName)
				return _eh(_in.g_fold, new Error('Not your turn now'));
			table.currentPlayer.g_otherFolded();
			for (let playerSocketId in db.tables[id].players) {
				_s(playerSocketId).emit(_out.g_otherFolded, {
					playerName: db.players[socket.id].playerName
				});
			};
			return _rh(_in.g_fold, {});
		});

		socket.on(_in.getGameState, (id) => {
			if (!db.tables[id]) return _eh(_in.getGameState, new Error('No such table'));
			return _rh(_in.getGameState, db.tables[id].engine.toJSON());
		});

		socket.on(_in.getPlayerState, (playerName) => {
			for (let i in db.players)
				if (db.players[i].playerName === playerName)
					return _rh(_in.getPlayerState, db.players[i]);
			return _eh(_in.getPlayerState, new Error('No such player'));
		});

		socket.on('disconnect', () => { _l('client disconnected'); });
	};

	return handler;
};

module.exports = handlerBuilder;