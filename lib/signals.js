var signals = { _in: {}, _out: {} };

/*	-----------------------------
	EVENTS FROM CLIENTS TO SERVER
	-----------------------------	*/

//	when new player enter game
//	PARAMS:
//	userId - id of entering player
//	playerName - nick of entering player
signals._in.playerEnter = 'playerEnter';

//	when player leaves game
//	PARAMS:
//	playerName - nick of leaving player
signals._in.playerQuit = 'playerQuit';

//	to get asking player's name
//	NO PARAMS
signals._in.getPlayerName = 'getPlayerName';

//	to set new name for asking player
//	PARAMS:
//	playerName - new name to set
signals._in.setPlayerName = 'setPlayerName';

//	to get list of tables with it's preferences
//	NO PARAMS
signals._in.listTables = 'listTables';

//	to get full table info
//	PARAMS:
//	id - table id (sent to all who joined table)
signals._in.getTableInfo = 'getTableInfo';

//	to join table
//	PARAMS:
//	[optional] id - table id to enter exactly this table
//	[optional] preferences - stringified object with such fields:
//		capacity - maximum of players can play on this table, defaults to 7
//		playersToStart - minimum of players to begin playing, defaults to 2
//		smallBlind - amount of small blinds, defaults to 1
//		bigBlind - amount of big blinds, defaults to 2
//		minBuyIn - minimal buy-in amount, defaults to 10
//		maxBuyIn - maximum buy-in amount, defaults to unlimited
//	buyIn - chips with which player joins table
//	* if no "id" param is provided, first table with free chair will be chosen
//		or one will be created if no tables exist
//	* if no "preferences" param is provided, default values will be used
signals._in.joinTable = 'joinTable';

//	to leave table
//	PARAMS:
//	id - table id (sent to all who joined table)
signals._in.leaveTable = 'leaveTable';

//	to sit on chair
//	PARAMS:
//	id - table id (sent to all who joined table)
//	chairNumber - number of chair to sit on
//	* param "chairNumber" may contain string "any" to determine it isn't matter on which chair to sit on
signals._in.sitOnChair = 'sitOnChair';

//	to leave chair
//	PARAMS:
//	id - table id (sent to all who joined table)
//	chairNumber - number of current chair player sitting on
signals._in.leaveChair = 'leaveChair';

//	do check
//	NO PARAMS
signals._in.g_check = 'g_check';

//	do bet/raise
//	PARAMS:
//	amount - amount of cash to bet
signals._in.g_bet = 'g_bet';

//	do call
//	NO PARAMS
signals._in.g_call = 'g_call';

//	do fold
//	NO PARAMS
signals._in.g_fold = 'g_fold';

//	recieve current game info (like chips on table, last player turned etc.)
//	PARAMS:
//	id - table id (sent to all who joined table)
signals._in.getGameState = 'getGameState';

//	to get player's state
//	PARAMS:
//	playerName - name of player to get info of
signals._in.getPlayerState = 'getPlayerState';

/*	-----------------------------
	EVENTS FROM SERVER TO CLIENTS
	-----------------------------	*/

//	when someone joined table
//	PARAMS:
//	playerName - who joined table
signals._out.otherJoinedTable = 'otherJoinedTable';

//	when someone left table
//	PARAMS:
//	playerName - who left table
signals._out.otherLeftTable = 'otherLeftTable';

//	when someone sat on chair
//	PARAMS:
//	playerName - who sat on chair
//	chairNumber - on which chair he sat
signals._out.otherSatOnChair = 'otherSatOnChair';

//	when someone left chair
//	PARAMS:
//	playerName - who left chair
//	chairNumber - which chair he left
signals._out.otherLeftChair = 'otherLeftChair';

//	when someone checked
//	PARAMS:
//	playerName - who checked
signals._out.g_otherChecked = 'g_otherChecked';

//	when someone bet
//	PARAMS:
//	playerName - who bet
//	amount - how much he bet
signals._out.g_otherBet = 'g_otherBet';

//	when someone called
//	PARAMS:
//	playerName - who called
signals._out.g_otherCalled = 'g_otherCalled';

//	when someone folded
//	PARAMS:
//	playerName - who folded
signals._out.g_otherFolded = 'g_otherFolded';

//	when client must to act now
//	NO PARAMS
signals._out.playersTurn = 'playersTurn';

//	when someone wins
//	PARAMS:
//	prize - how much winner has won
//	playerName - winner's nickname
//	cards - his cards
//	chips - full amount of his chips
//	hand - hand with which he won
//	rank - rank of his hand
signals._out.g_win = 'g_win';

/*	----------------
	UNIVERSAL EVENTS
	----------------	*/

//	this event is emited any time client emited some event and the result was successfully
//	it always has an identifier of initial event as first param and response data as second
//	for example, if client emited "getPlayerState" event and provided correct playerName,
//	this event will be emited with response like this:
//	{
//		initial: 'getPlayerState',
//		result: { ... }
//	}
signals._out.success = 'r_success';

//	this event is emited any time client emited some event and the result was fail
//	it always has an identifier of initial event as first param and error data as second
//	for example, if client emited "getPlayerState" event and provided invalid playerName,
//	this event will be emited with response like this:
//	{
//		initial: 'getPlayerState',
//		error: { ... }
//	}
signals._out.error = 'r_error';

module.exports = signals;