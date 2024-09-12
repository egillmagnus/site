import { Game } from "./game.js";
import { Board } from "./board.js";
import { Player } from "./player.js";

let playerCount = 0;
const maxPlayers = 4;
const players = [];
var board;
var game;

document.addEventListener('DOMContentLoaded', () => {
    console.log("DomContentLoaded");
    const playerSetupContainer = document.getElementById('player-container');
    const addPlayerButtonContainer = document.getElementById('add-player-button-container');
    const addPlayerButton = document.getElementById('add-player-button');
    const startGameButton = document.getElementById('start-game-button');
    const gameSection = document.getElementById('game-section');
    const playerStatsContainer = document.getElementById('player-stats');
    const canvas = document.getElementById("dartboard");
    board = new Board('dartboard', 500);
    setCanvasSize(canvas);


    loadPlayersFromStorage();

    addPlayerButton.addEventListener('click', () => {
        if (playerCount < maxPlayers) {
            const newPlayer = createPlayerBox(playerCount + 1);
            playerSetupContainer.insertBefore(newPlayer, addPlayerButtonContainer);

            savePlayersToStorage();

            if (playerCount === maxPlayers) {
                addPlayerButtonContainer.style.display = 'none';
            }
            startGameButton.style.display = 'inline-block';
        }
    });

    function removePlayer(playerId) {
        const playerElement = document.getElementById(playerId);
        playerElement.remove();
        playerCount--;

        updatePlayerBoxIDs();

        savePlayersToStorage();

        if (playerCount < maxPlayers) {
            addPlayerButtonContainer.style.display = 'inline-block';
        }

        if (playerCount === 0) {
            startGameButton.style.display = 'none';
        }
    }

    function createPlayerBox(playerNumber) {
        console.log("adding player " + playerNumber);
        const newPlayer = document.createElement('div');
        newPlayer.classList.add('player-box');
        newPlayer.id = `player${playerNumber}`;
        newPlayer.innerHTML = `
            <button class="remove-player"><i class='bx bx-x' ></i></button>
            <label>Spilari ${playerNumber}:</label>
            <input type="text" class="player-name" placeholder="Nafn" value="">
        `;

        const removeButton = newPlayer.querySelector('.remove-player');
        removeButton.addEventListener('click', () => removePlayer(newPlayer.id));

        const playerNameInput = newPlayer.querySelector('.player-name');
        playerNameInput.addEventListener('input', () => {
            savePlayersToStorage();
        });

        newPlayer.querySelector('.player-name').value = "";
        playerSetupContainer.insertBefore(newPlayer, addPlayerButtonContainer);
        playerCount++;
        if (playerCount === maxPlayers) {
            addPlayerButtonContainer.style.display = 'none';
        }
        startGameButton.style.display = 'inline-block';
        savePlayersToStorage();

        return newPlayer;
    }

    function updatePlayerBoxIDs() {
        const remainingPlayers = document.querySelectorAll('.player-box');
        remainingPlayers.forEach((playerBox, index) => {
            const newPlayerNumber = index + 1;
            playerBox.id = `player${newPlayerNumber}`;
            const label = playerBox.querySelector('label');
            if (label) {
                label.textContent = `Leikmaður ${newPlayerNumber}`;
            }
        });

        savePlayersToStorage();
    }

    function savePlayersToStorage() {
        const playerData = [];
        document.querySelectorAll('.player-box').forEach(playerBox => {
            const playerNameInput = playerBox.querySelector('.player-name');
            if (playerNameInput) {
                playerData.push(playerNameInput.value);
            }
        });
        localStorage.setItem('players', JSON.stringify(playerData));
    }

    function loadPlayersFromStorage() {
        const storedPlayers = JSON.parse(localStorage.getItem('players'));

        if (storedPlayers && storedPlayers.length > 0) {
            console.log("Loading players from storage");
            storedPlayers.forEach((playerName, index) => {
                const newPlayer = createPlayerBox(index + 1);
                newPlayer.querySelector('.player-name').value = playerName;
            });

        } else {
            console.log("No player in storage, adding player 1");
            const newPlayer = createPlayerBox(1);
            newPlayer.querySelector('.player-name').value = "";
        }
    }

    startGameButton.addEventListener('click', () => {
        // When the game starts, replace the player name inputs with player info
        for (let i = 1; i <= playerCount; i++) {
            const playerBox = document.querySelector(`#player${i}`);
            const playerNameInput = playerBox.querySelector('.player-name');
            const playerName = playerNameInput ? playerNameInput.value || `Spilari ${i}` : null;

            if (playerName) {
                const newPlayer = new Player(playerName, i);
                players.push(newPlayer);

            }
        }

        game = new Game(players, board);
        game.startGame();
        populatePlayerBoxes();

        document.querySelector('.dartboard-container').classList.add('active');
        document.getElementById('player-container').classList.add('moved-down');
        document.getElementById('game-section').style.display = 'block';

        setCanvasSize(canvas);
    });

    canvas.addEventListener('click', function (event) {
        game.handleBoardClick(event);
        populatePlayerBoxes();
    });

    window.addEventListener("resize", function () {
        setCanvasSize(canvas);
    });

    setCanvasSize(canvas);

});

function populatePlayerBoxes() {

    const playerContainer = document.getElementById('player-container');

    // Clear the playerContainer to reorder the boxes
    playerContainer.innerHTML = '';

    var currentIndex = game.currentPlayerIndex;
    console.log(currentIndex);
    console.log(players);


    for (var index = 0; index < players.length; index++) {
        var playerIndex = (currentIndex + index) % players.length;
        var player = players[playerIndex];
        console.log(playerIndex);
        var playerBox = document.querySelector(`#player${playerIndex + 1}`);

        playerBox = document.createElement('div');
        playerBox.classList.add('player-box');
        playerBox.id = `player${playerIndex + 1}`;

        // Format each throw as "section (multiplier)"
        const previousThrows = player.throws.slice().reverse().map(playerThrow => {
            const scoreToText = ["", "Single ", "Double ", "Triple "];
            var text = scoreToText[playerThrow.multiplier];

            if (playerThrow.section === 0) {
                if (playerThrow.multiplier === 0) {
                    text = "Bust!";
                } else {
                    text = "Out";
                }
            } else {
                text += playerThrow.section;
            }
            if (text == "Double 25") text = "Bullseye";
            return `<li>${text}</li>`;
        }).join('');

        // Update player name and info
        const playerInfo = `
            <div class="player-info">
                <h3>${player.name}</h3>
                <h4>Stig: <span class="remaining-score">${player.score}</span></h4>
                <div class="previous-scores">
                    <h4>Köst:</h4>
                    <ul class="score-list">
                        ${previousThrows || '<li>Engin köst</li>'}
                    </ul>
                </div>
            </div>
        `;

        // Update the player box with the new player info
        playerBox.innerHTML = playerInfo;

        playerContainer.appendChild(playerBox);
    };
}




function setCanvasSize(canvas) {
    var size = Math.min(window.innerWidth * 0.95, window.innerHeight * 0.7);

    var dpr = window.devicePixelRatio || 1;

    canvas.width = size * dpr;
    canvas.height = size * dpr;

    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    var ctx = canvas.getContext('2d');
    board.windowResized(size);
    ctx.scale(dpr, dpr);
}

let menuicon = document.querySelector("#menu-icon");
let navbar = document.querySelector(".navbar")

menuicon.onclick = () => {
    menuicon.classList.toggle("bx-x");
    navbar.classList.toggle("active");
}
