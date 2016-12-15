;
jQuery(function ($) {
    'use strict';

    var IO = {

        /**
         Connect client and server together on init
         */
        init: function () {
            IO.socket = io.connect();
            IO.bindEvents();
        },

        /**
         Event listeners for methods called from the Socket.IO server (vaultGame.js)
         */
        bindEvents: function () {
            IO.socket.on('connected', IO.onConnected);
            IO.socket.on('newGameCreated', IO.onNewGameCreated);
            IO.socket.on('playerJoinedRoom', IO.playerJoinedRoom);
            IO.socket.on('beginNewGame', IO.beginNewGame);
            IO.socket.on('newCardsData', IO.onNewCardsData);
            IO.socket.on('hostCheckAnswer', IO.hostCheckAnswer);
            IO.socket.on('gameOver', IO.gameOver);
            IO.socket.on('error', IO.error);
            IO.socket.on('returnResult', IO.submitResult);

            IO.socket.on('cardHover', IO.cardInteraction)
            IO.socket.on('cardSelected', IO.cardInteraction);

        },


        // Card interaction when something is clicked. Add highlights, remove highlights, ect...

        cardInteraction: function (data) {

            var playerCards = $('.cardPool');
            if (App.myRole === 'Player') {
                // if (data.type === 'mouseover') {
                //     playerCards.find("[data-key='" + data.key + "']").parent().addClass('highlight')
                // }
                // if (data.type === 'mouseout') {
                //     playerCards.find("[data-key='" + data.key + "']").parent().removeClass('highlight')
                // }
                if (data.type === 'click') {
                    $('.cardImage').remove();
                    $('.cardBack').css({'opacity': '1'});
                    $('.selectedCard').remove();
                    $('.highlight').removeClass('highlight')
                    var curCard = playerCards.find("[data-key='" + data.key + "']");
                    var curParent = curCard.parent();
                    curParent.addClass('highlight')
                    curCard.css({'opacity': '0'});
                    var cardImg = $('<img class="selectedCard"/>');
                    cardImg.attr('src', data.src);
                    curParent.append(cardImg)
                    // playerCards.find("[data-key='" + data.key + "']").attr('src', data.src)

                }

            }
        },


        /**
         * Return result of submitted answer. Switch roles if correct. Gameover if not correct.
         * @param data {{ gameId: int, mySocketId: * }}
         */
        submitResult: function (data, result) {

            if (result === 'correct') {
                console.log('correct')
                App.currentRound += 1;
                data.round = App.currentRound;

                if (App.myRole === 'Host') {
                    App.myRole = 'Player'
                }
                else {
                    App.myRole = 'Host'
                }
                IO.socket.emit('hostNextRound', data);
            }
            else {
                console.log('wrong');
                $('body').css({'background': 'red'})
                alert('Wrong answer. TODO: gameover stuff')
            }

        },

        /**
         * The client is successfully connected!
         */
        onConnected: function () {
            // Cache a copy of the client's socket.IO session ID on the App
            App.mySocketId = IO.socket.socket.sessionid;
            // console.log(data.message);
        },

        /**
         * A new game has been created and a random game ID has been generated.
         * @param data {{ gameId: int, mySocketId: * }}
         */
        onNewGameCreated: function (data) {
            console.log('start data', data)
            App.Host.gameInit(data);
        },

        /**
         * A player has successfully joined the game.
         * @param data {{playerName: string, gameId: int, mySocketId: int}}
         */
        playerJoinedRoom: function (data) {
            // When a player joins a room, do the updateWaitingScreen funciton.
            // There are two versions of this function: one for the 'host' and
            // another for the 'player'.
            //
            // So on the 'host' browser window, the App.Host.updateWiatingScreen function is called.
            // And on the player's browser, App.Player.updateWaitingScreen is called.
            App[App.myRole].updateWaitingScreen(data);
        },

        /**
         * Both players have joined the game. Start it
         * @param data
         */
        beginNewGame: function (data) {
            App.doCountdown(data);
        },

        /**
         * A new set of cards for the round is returned from the server.
         * @param data
         */
        onNewCardsData: function (data) {
            // Update the current round
            App.currentRound = data.round;

            // Change the cards for the Host and Player
            console.log(App.myRole)
            App[App.myRole].newCards(data);
        },

        /**
         * Do something for gameover
         * @param data
         */
        gameOver: function (data) {
            App[App.myRole].endGame(data);
        },

        /**
         * An error has occurred.
         * @param data
         */
        error: function (data) {
            alert(data.message);
        }

    };

    var App = {

        /**
         * Keep track of the gameId, which is identical to the ID
         * of the Socket.IO Room used for the players and host to communicate
         *
         */
        gameId: 0,

        /**
         * This is used to differentiate between 'Host' and 'Player' browsers.
         */
        myRole: '',   // 'Player' or 'Host'

        /**
         * The Socket.IO socket object identifier. This is unique for
         * each player and host. It is generated when the browser initially
         * connects to the server when the page loads for the first time.
         */
        mySocketId: '',

        /**
         * Identifies the current round. Starts at 0
         */
        currentRound: 0,

        /* *************************************
         *                Setup                *
         * *********************************** */

        /**
         * This runs when the page initially loads.
         */
        init: function () {
            App.cacheElements();
            App.showInitScreen();
            App.bindEvents();

            // Initialize the fastclick library
            FastClick.attach(document.body);
        },

        /**
         * Create references to on-screen elements used throughout the game.
         */
        cacheElements: function () {
            App.$doc = $(document);

            // Templates
            App.$gameArea = $('#gameArea');
            App.$templateIntroScreen = $('#intro-screen-template').html();
            App.$templateNewGame = $('#create-game-template').html();
            App.$templateJoinGame = $('#join-game-template').html();
            App.$loadingGame = $('#countdown-game-template').html();
            App.$hostGame = $('#host-game-template').html();
            App.$playerGame = $('#player-game-template').html();

        },


        /**
         * Start the game countdown
         */
        doCountdown: function () {
            // Prepare the game screen with new HTML
            App.$gameArea.html(App.$loadingGame);
            App.doTextFit('#hostWord');

            // Begin the on-screen countdown timer
            var $secondsLeft = $('#hostWord');
            App.countDown($secondsLeft, 2, function () {
                $('#wordArea').hide();
                if (App.myRole === 'Host') {
                    App.$gameArea.html(App.$hostGame);
                    IO.socket.emit('hostCountdownFinished', App.gameId);
                }
                else {
                    App.$gameArea.html(App.$playerGame);
                }

            });
        },

        /**
         * Create some click handlers for the various buttons that appear on-screen.
         */
        bindEvents: function () {
            // Host
            App.$doc.on('click', '#btnCreateGame', App.Host.onCreateClick);
            App.$doc.on('click', '#submitCardNumber', App.Host.checkCardAnswer);
            App.$doc.on('mouseover mouseout', '.cardImage', App.Host.hoverEffect);
            App.$doc.on('click', '.cardImage', App.Host.selectCard);


            // Player
            App.$doc.on('click', '#btnJoinGame', App.Player.onJoinClick);
            App.$doc.on('click', '#btnStart', App.Player.onPlayerStartClick);


        },

        /* *************************************
         *             Game Logic              *
         * *********************************** */

        /**
         * Show the initial Anagrammatix Title Screen
         * (with Start and Join buttons)
         */
        showInitScreen: function () {
            App.$gameArea.html(App.$templateIntroScreen);

        },


        /* *******************************
         *         HOST CODE           *
         ******************************* */
        Host: {

            /**
             * Contains references to player data
             */
            players: [],

            /**
             * Flag to indicate if a new game is starting.
             * This is used after the first game ends, and players initiate a new game
             * without refreshing the browser windows.
             */
            isNewGame: false,

            /**
             * Keep track of the number of players that have joined the game.
             */
            numPlayersInRoom: 0,

            /**
             * A reference to the correct answer for the current round.
             */
            currentCorrectAnswer: '',

            selectCard: function (data) {
                console.log(data)
                $('.selected').removeClass('selected')
                $(data.currentTarget).parent().addClass('selected');
                var cardData = {
                    key: data.currentTarget.dataset.key,
                    type: data.type,
                    gameId: App.gameId,
                    src: data.currentTarget.currentSrc
                }
                IO.socket.emit('hostCardSelected', cardData);
            },

            hoverEffect: function (data) {

                var cardData = {
                    key: data.currentTarget.dataset.key,
                    type: data.type,
                    gameId: App.gameId
                }
                IO.socket.emit('hostCardHover', cardData);
            },


            /**
             * Handler for the "Start" button on the Title Screen.
             */
            onCreateClick: function () {
                console.log('Clicked "Create A Game!!!!"');

                App.$gameArea.html(App.$templateNewGame);
                $('#nameButton').on('click', function (e) {
                    if ($('#inputPlayerName').val() !== '') {
                        $('.details').show();
                        $('#nameButton, #inputPlayerName').hide();
                        var userName = $('#inputPlayerName').val();
                        IO.socket.emit('hostCreateNewGame', userName);
                    }
                    else {
                        console.log('enter name')
                    }
                })
            },


            /**
             * The Host screen is displayed for the first time.
             * @param data{{ gameId: int, mySocketId: * }}
             */
            gameInit: function (data) {
                App.gameId = data.gameId;
                App.mySocketId = data.mySocketId;
                App.myRole = 'Host';
                App.Host.numPlayersInRoom = 1;

                $('.infoName').hide();
                $('#playersWaiting').show();

                //  App[App.myRole].updateWaitingScreen(data);

                App.Host.players.push(data)

                // uncomment to start with 1 person
                // IO.socket.emit('hostRoomFull', App.gameId);

                $('#playersWaiting')
                    .append('<p style="font-weight: bold;">' + data.playerName + '</p>');


                App.Host.displayNewGameScreen();
                console.log("Game started with ID: " + App.gameId + ' by host: ' + App.mySocketId);
            },

            /**
             * Show the Host screen containing the game URL and unique game ID
             */
            displayNewGameScreen: function () {
                // Fill the game screen with the appropriate HTML


                // Display the URL on screen
                $('#gameURL').append('<p>' + window.location.href + '</p>');


                // Show the gameId / room id on screen
                $('#spanNewGameCode').text(App.gameId);
            },

            /**
             * Update the Host screen when the first player joins
             * @param data{{playerName: string}}
             */
            updateWaitingScreen: function (data) {
                // If this is a restarted game, show the screen.
                if (App.Host.isNewGame) {
                    App.Host.displayNewGameScreen();
                }
                // Update host screen
                $('#playersWaiting')
                    .append('<p>Player ' + data.playerName + ' joined the game.</p>');


                // Store the new player's data on the Host.
                App.Host.players.push(data);


                // Increment the number of players in the room
                App.Host.numPlayersInRoom += 1;

                // If two players have joined, the game can be started by the host.
                if (App.Host.numPlayersInRoom === 2) {


                    // Let the server know th egame can start once start game is clicked.
                    var startButton = $('#startGame');
                    startButton.text('START GAME');
                    startButton.on('click', function (e) {
                        IO.socket.emit('hostRoomFull', App.gameId);
                    })
                    //    IO.socket.emit('hostRoomFull',App.gameId);
                }
            },

            checkCardAnswer: function () {
                var userAnswers = {
                    cardNumber: $('#cardNumber').val().trim()
                }
                var data = {
                    gameId: App.gameId,
                    userAnswer: userAnswers,
                    round: App.Host.currentRound
                }
                IO.socket.emit('checkCardAnswer', data);
            },


            /**
             * Show the new cards
             * @param data{{round: *, key: *, cardPool: Array}}
             */
            newCards: function (data) {
                App.$gameArea.html(App.$hostGame);
                // Insert the new cards into the DOM
                $('#hostWord, #wordArea').hide();
                console.log(data);
                $('.cardPool').html('');
                for (var i = 0; i < data.cardPool.length; i++) {
                    var cardImg = $('<img class="cardImage" data-key="' + i + '"/>');
                    cardImg.attr('src', '/images/' + data.cardPool[i] + '.png');
                    var cardImgContainer = $('<div class="imgContainer" />').append(cardImg)
                    $('.cardPool').append(cardImgContainer)
                }


                // Update the data for the current round
                App.Host.currentCorrectAnswer = data.answer;
                App.Host.currentRound = data.round;
            },


            /**
             * All rounds done. Show victory
             * @param data
             */
            endGame: function () {
                $('#gameArea')
                    .html('<div class="gameOver"><img src="http://art.ngfiles.com/images/170000/170688_oman1996_victory-cat.png" alt=""></div>')

            }


        },


        /* *****************************
         *        PLAYER CODE        *
         ***************************** */

        Player: {

            /**
             * A reference to the socket ID of the Host
             */
            hostSocketId: '',

            /**
             * The player's name entered on the 'Join' screen.
             */
            myName: '',

            /**
             * Click handler for the 'JOIN' button
             */
            onJoinClick: function () {


                // Display the Join Game HTML on the player's screen.
                App.$gameArea.html(App.$templateJoinGame);
            },

            /**
             * The player entered their name and gameId (hopefully)
             * and clicked Start.
             */
            onPlayerStartClick: function () {
                // console.log('Player clicked "Start"');

                // collect data to send to the server
                var data = {
                    gameId: +($('#inputGameId').val()),
                    playerName: $('#inputPlayerName').val() || 'anon'
                };

                // Send the gameId and playerName to the server
                IO.socket.emit('playerJoinGame', data);

                // Set the appropriate properties for the current player.
                App.myRole = 'Player';
                App.Player.myName = data.playerName;
            },


            /**
             * Display the waiting screen for player 1
             * @param data
             */
            updateWaitingScreen: function (data) {
                console.log('player join')
                if (IO.socket.socket.sessionid === data.mySocketId) {
                    console.log('true')
                    App.myRole = 'Player';
                    App.gameId = data.gameId;

                    $('#playerWaitingMessage').append('<p>Joined Game ' + data.gameId + '. Please wait for game to begin.</p>');

                }
            },


            /**
             * Show the list of words for the current round.
             * @param data{{round: *, word: *, answer: *, list: Array}}
             */
            newCards: function (data) {
                App.$gameArea.html(App.$playerGame);
                $('#hostWord, #wordArea').hide();
                $('.cardPool').html('');

                for (var i = 0; i < data.cardPool.length; i++) {
                    var cardImg = $('<img class="cardBack" data-key="' + i + '"/>');
                    cardImg.attr('src', '/images/cardback_0.png');
                    var cardImgContainer = $('<div class="imgContainer" />').append(cardImg)
                    $('.cardPool').append(cardImgContainer)
                }
            },

            /**
             * Show the "Game Over" screen.
             */
            endGame: function () {
                $('#gameArea')
                    .html('<div class="gameOver"><img src="/images/cat.png" alt=""></div>')

            }
        },


        /* **************************
         UTILITY CODE
         ************************** */

        /**
         * Display the countdown timer on the Host screen
         *
         * @param $el The container element for the countdown timer
         * @param startTime
         * @param callback The function to call when the timer ends.
         */
        countDown: function ($el, startTime, callback) {

            // Display the starting time on the screen.
            $el.text(startTime);
            App.doTextFit('#hostWord');

            // console.log('Starting Countdown...');

            // Start a 1 second timer
            var timer = setInterval(countItDown, 1000);

            // Decrement the displayed timer value on each 'tick'
            function countItDown() {
                startTime -= 1
                $el.text(startTime);
                App.doTextFit('#hostWord');

                if (startTime <= 0) {
                    // console.log('Countdown Finished.');

                    // Stop the timer and do the callback.
                    clearInterval(timer);
                    callback();
                    return;
                }
            }

        },

        /**
         * Make the text inside the given element as big as possible
         * See: https://github.com/STRML/textFit
         *
         * @param el The parent element of some text
         */
        doTextFit: function (el) {
            textFit(
                $(el)[0],
                {
                    alignHoriz: true,
                    alignVert: false,
                    widthOnly: true,
                    reProcess: true,
                    maxFontSize: 300
                }
            );
        }

    };

    IO.init();
    App.init();

}($));
