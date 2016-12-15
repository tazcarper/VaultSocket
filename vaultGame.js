var io;
var gameSocket;

/**
 * This function is called by index.js to initialize a new game instance.
 *
 * @param sio The Socket.IO library
 * @param socket The socket object for the connected client.
 */
exports.initGame = function (sio, socket) {
    io = sio;
    gameSocket = socket;
    gameSocket.emit('connected', {message: "You are connected!"});

    // Host Events
    gameSocket.on('hostCreateNewGame', hostCreateNewGame);
    gameSocket.on('hostRoomFull', hostPrepareGame);
    gameSocket.on('hostCountdownFinished', hostStartGame);
    gameSocket.on('hostNextRound', hostNextRound);
    gameSocket.on('checkCardAnswer', checkNumber);
    gameSocket.on('hostCardHover', hostHover);
    gameSocket.on('hostCardSelected', hostCardSelected);

    // Player Events
    gameSocket.on('playerJoinGame', playerJoinGame);
    gameSocket.on('playerAnswer', playerAnswer);
}

var cardAnswer = 0;

/* *******************************
 *                             *
 *       HOST FUNCTIONS        *
 *                             *
 ******************************* */


function hostCardSelected(data) {
    io.sockets.in(data.gameId).emit('cardSelected', data);
}


function hostHover(data) {
    io.sockets.in(data.gameId).emit('cardHover', data);
}


/**
 * The 'START' button was clicked and 'hostCreateNewGame' event occurred.
 */
function hostCreateNewGame(userName) {

    // Create a unique Socket.IO Room
    var thisGameId = ( Math.random() * 100000 ) | 0;

    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id, playerName: userName});

    // Join the Room and wait for the players
    this.join(thisGameId.toString());
};

/*
 * Two players have joined. Alert the host!
 * @param gameId The game ID / room ID
 */
function hostPrepareGame(gameId) {
    var sock = this;
    var data = {
        mySocketId: sock.id,
        gameId: gameId
    };
    console.log("All Players Present. Preparing game...");
    io.sockets.in(data.gameId).emit('beginNewGame', data);
}

/*
 * The Countdown has finished, and the game begins!
 * @param gameId The game ID / room ID
 */
function hostStartGame(gameId) {
    console.log('Game Started.');
    sendCards(0, gameId);
};

/**
 * A player answered correctly. Time for the next word.
 * @param data Sent from the client. Contains the current round and gameId (room)
 */
function hostNextRound(data) {
    if (data.round < cardPool.length) {
        // Send a new set of words back to the host and players.
        sendCards(data.round, data.gameId);
    } else {
        // If the current round exceeds the number of words, send the 'gameOver' event.
        io.sockets.in(data.gameId).emit('gameOver', data);
    }
}
/* *****************************
 *                           *
 *     PLAYER FUNCTIONS      *
 *                           *
 ***************************** */

/**
 * A player clicked the 'START GAME' button.
 * Attempt to connect them to the room that matches
 * the gameId entered by the player.
 * @param data Contains data entered via player's input - playerName and gameId.
 */
function playerJoinGame(data) {
    //console.log('Player ' + data.playerName + 'attempting to join game: ' + data.gameId );

    // A reference to the player's Socket.IO socket object
    var sock = this;

    // Look up the room ID in the Socket.IO manager object.
    var room = gameSocket.manager.rooms["/" + data.gameId];

    // If the room exists...
    if (room != undefined) {
        // attach the socket id to the data object.
        data.mySocketId = sock.id;

        // Join the room
        sock.join(data.gameId);

        //console.log('Player ' + data.playerName + ' joining game: ' + data.gameId );

        // Emit an event notifying the clients that the player has joined the room.
        io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

    } else {
        // Otherwise, send an error message back to the player.
        this.emit('error', {message: "This room does not exist."});
    }
}

/**
 * A player has tapped a word in the word list.
 * @param data gameId
 */
function playerAnswer(data) {
    // console.log('Player ID: ' + data.playerId + ' answered a question with: ' + data.answer);

    // The player's answer is attached to the data object.  \
    // Emit an event with the answer so it can be checked by the 'Host'
    io.sockets.in(data.gameId).emit('hostCheckAnswer', data);
}


/* *************************
 *                       *
 *      GAME LOGIC       *
 *                       *
 ************************* */

/**
 * Get a word for the host, and a list of words for the player.
 *
 * @param wordPoolIndex
 * @param gameId The room identifier
 */
function sendCards(cardRound, gameId) {
    console.log(cardRound, gameId)
    var data = getCardCombo(cardRound, gameId);
    io.sockets.in(gameId).emit('newCardsData', data);

}


function getCardCombo(i) {
    console.log('getCarddCombo number = ', i)
    var getNumb = Math.floor(Math.random() * cardPool.length)
    var cards = cardPool[i].cards
    cardAnswer = cardPool[i].answer;
    console.log(cardAnswer)
    var cardData = {
        round: i,
        key: getNumb,
        cardPool: cards
    };

    return cardData;
}


function checkNumber(data) {
    var result;

    console.log(data)
    if (cardAnswer == data.userAnswer.cardNumber) {
        result = 'correct';
    }
    else {
        result = 'incorrect'
    }
    io.sockets.in(data.gameId).emit('returnResult', data, result);
}


var cardPool = [
    {
        "cards": ['zzNEUTRAL_CFM_341_SergeantSally', 'MAGE_CFM_065_VolcanicPotion', 'HUNTER_CFM_337_PiranhaLauncher'],
        "answer": 3,
    },
    {
        "cards": ['zzNEUTRAL_CFM_039_StreetTrickster', 'zzNEUTRAL_CFM_637_PatchesthePirate', 'ROGUE_CFM_694_ShadowSensei', 'WARRIOR_CFM_643_HobartGrapplehammer'],
        "answer": 2
    },
    {
        "cards": ['PALADIN_CFM_639_GrimestreetEnforcer', 'HUNTER_CFM_333_Knuckles', 'zzNEUTRAL_CFM_656_StreetwiseInvestigator', 'zzNEUTRAL_CFM_672_MadamGoya', 'WARRIOR_CFM_631_BrassKnuckles'],
        "answer": 5
    },
    {
        "cards": ['SHAMAN_CFM_696_Devolve', 'PRIEST_CFM_657_KabalSongstealer', 'ROGUE_CFM_630_CounterfeitCoin', 'zzNEUTRAL_CFM_807_AuctionmasterBeardo', 'HUNTER_CFM_316_RatPack'],
        "answer": 3
    }
]