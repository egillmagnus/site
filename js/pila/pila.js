import { Game } from "./game.js";
import { Board } from "./board.js";
import { Player } from "./player.js";

let playerCount = 0;
const maxPlayers = 4;
var players = [];
var ongoingGame = false;
var board;
var game;

document.addEventListener('DOMContentLoaded', () => {
    console.log("DomContentLoaded");
    const playerSetupContainer = document.getElementById('player-container');
    var addPlayerButtonContainer;
    var addPlayerButton;
    const startGameButton = document.getElementById('start-game-button');
    const gameSection = document.getElementById('game-section');
    const canvas = document.getElementById("dartboard");
    const undoButton = document.getElementById("undo-button");

    undoButton.addEventListener('click', () => {
        if (ongoingGame) {
            if (game.undo()) {
                populatePlayerBoxes();
            }
        }
    });
    board = new Board('dartboard', 500);
    setCanvasSize(canvas);

    createAddPlayerButton();
    loadPlayersFromStorage();

    addPlayerButton.addEventListener('click', () => {
        if (playerCount < maxPlayers) {
            const newPlayer = createPlayerBox(playerCount + 1);
            playerSetupContainer.insertBefore(newPlayer, addPlayerButtonContainer);

            savePlayersToStorage();

            if (playerCount === maxPlayers) {
                addPlayerButtonContainer.style.display = 'none';
            }
        }
    });

    function removePlayer(playerId) {
        const playerElement = document.getElementById(playerId);
        playerElement.remove();
        playerCount--;

        updatePlayerBoxIDs();

        savePlayersToStorage();


        if (playerCount === 0) {
            startGameButton.style.display = 'none';
        }

        if (playerCount === 3) {
            addPlayerButtonContainer.style = 'none';
        }
    }

    function createAddPlayerButton() {
        playerSetupContainer.innerHTML += `
      <div class="player-box" id="add-player-button-container">
        <button id="add-player-button" class="btn">Bæta við spilara</button>
      </div>
            `;
        addPlayerButtonContainer = document.getElementById('add-player-button-container');
        addPlayerButton = document.getElementById('add-player-button');
        addPlayerButton.addEventListener('click', () => {
            if (playerCount < maxPlayers) {
                const newPlayer = createPlayerBox(playerCount + 1);
                playerSetupContainer.insertBefore(newPlayer, addPlayerButtonContainer);

                savePlayersToStorage();

                if (playerCount === maxPlayers) {
                    addPlayerButtonContainer.style.display = 'none';
                }
            }
        });
    }

    function createPlayerBox(playerNumber) {
        console.log("adding player " + playerNumber + "player count is: " + playerCount
        );
        const newPlayer = document.createElement('div');
        newPlayer.classList.add('player-box');
        newPlayer.id = `player${playerNumber}`;
        newPlayer.innerHTML = `
            <button class="remove-player"><i class='bx bx-x'></i></button>
            <label class="player-label">Spilari ${playerNumber}:</label>
            <input type="text" class="player-name styled-input" placeholder="Nafn" value="">
        `;

        const removeButton = newPlayer.querySelector('.remove-player');
        removeButton.addEventListener('click', () => {
            removePlayer(newPlayer.id);
            console.log("removingPlayer");
        });

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
            if (playerBox.id != "add-player-button-container") {
                playerBox.id = `player${newPlayerNumber}`;
                const label = playerBox.querySelector('label');
                if (label) {
                    label.textContent = `Spilari ${newPlayerNumber}`;
                }
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (ongoingGame) {
            undoButton.style.display = 'none';
            playerCount = 0;
            console.log("Ongoing game, resetting game");
            document.querySelector('.dartboard-container').classList.remove('active');
            playerSetupContainer.innerHTML = "";
            createAddPlayerButton()
            loadPlayersFromStorage();
            players = [];

            startGameButton.textContent = "Hefja leik"

            ongoingGame = false;

        } else {
            console.log("No game ongoing, starting a new one");
            undoButton.style.display = 'inline-block';
            for (let i = 1; i <= playerCount; i++) {
                console.log(i);
                const playerBox = document.querySelector(`#player${i}`);
                const playerNameInput = playerBox.querySelector('.player-name');
                const playerName = playerNameInput ? playerNameInput.value || `Spilari ${i}` : null;

                if (playerName) {
                    const newPlayer = new Player(playerName, i);
                    players.push(newPlayer);

                }
            }
            ongoingGame = true;
            game = new Game(players, board);
            game.startGame();
            startGameButton.textContent = "Endursetja leik"
            populatePlayerBoxes();

            document.querySelector('.dartboard-container').classList.add('active');
            document.getElementById('game-section').style.display = 'block';

            setCanvasSize(canvas);
        }
    });

    canvas.addEventListener('click', function (event) {
        if (game.handleBoardClick(event)) {
            populatePlayerBoxes();
        }
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

    for (var index = 0; index < players.length; index++) {
        var playerIndex = (currentIndex + index) % players.length;
        var player = players[playerIndex];
        var playerBox = document.querySelector(`#player${playerIndex + 1}`);

        playerBox = document.createElement('div');
        playerBox.classList.add('player-box');
        playerBox.id = `player${playerIndex + 1}`;

        if (game.currentThrow === 0 && players.length > 1) {
            playerBox.classList.add('first-throw');
        }

        // Add dart icons for the first player
        let dartIcons = '';
        if (index === 0) {
            for (let i = 0; i < 3; i++) {
                dartIcons += `
                <svg class="dart-icon" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" style="fill: ${i < (3 - game.currentThrow) ? 'var(--main-color)' : 'gray'};">
                    <path d="m1.0181003 12.976393c0-.1297.21941-.4046.76189-.9548l.61267-.6214.006-.373.006-.373.56697-.5732c.31183-.3152997.64259-.6141997.73501-.6640997.0924-.05 1.28023-1.0989 2.63958-2.331l2.47154-2.2401.0253-.9411c.0284-1.0584.15737-1.5977.509-2.1285.35029-.5289 1.0104997-.85240002 1.5524497-.7609.38486.065.56566.2443.70851.7025.12444.3991.17914.4702.26055.3385.0228-.037.0747-.067.11521-.067.0405 0 .0214.058-.0424.1282-.11231.1241-.1036.1319.26838.24.22274.065.46511.1925.57618.3035.16716.1672.19163.2419.19106.5834-.001.73-.38248 1.2817-1.10854 1.6039-.50848.2257-1.04075.3126-1.9152297.3126h-.79221l-2.23187 2.4734c-1.22753 1.3604-2.28622 2.5599997-2.35266 2.6656997-.0664.1057-.3613.4288-.65525.7179-.54796.5389-.84145.6883-1.13703.579-.11495-.043-.24605.057-.77003.5863-.55462.56-1.00119.9139-1.00119.7934z"/>
                </svg>
                `;
            }
        }

        // Add dart icons container
        const dartIconsContainer = `<div class="dart-icons-container">${dartIcons}</div>`;

        // Format each throw as "section (multiplier)"
        const previousThrows = player.throws.slice().reverse().map(playerThrowAndScore => {
            const scoreToText = ["", "Single ", "Double ", "Triple "];
            const playerThrow = playerThrowAndScore.throw;
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
                ${dartIconsContainer} <!-- Insert the dart icons -->
                <h3>${player.name}</h3>
                <h4>Stig: <span class="score-container"><span class="remaining-score">${player.score}</span></span></h4>
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
    }
};




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
