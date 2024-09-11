import { Game } from "./game.js";
import { Board } from "./board.js";
import { Player } from "./player.js"; 

let playerCount = 0;
const maxPlayers = 4;
const players = [];
var board;

document.addEventListener('DOMContentLoaded', () => {
    console.log("DomContentLoaded");
    const playerSetupContainer = document.getElementById('player-container');
    const addPlayerButtonContainer = document.getElementById('add-player-button-container');
    const addPlayerButton = document.getElementById('add-player-button');
    const startGameButton = document.getElementById('start-game-button');
    const gameSection = document.getElementById('game-section');
    const playerStatsContainer = document.getElementById('player-stats');

    loadPlayersFromStorage();

    addPlayerButton.addEventListener('click', () => {
        if (playerCount < maxPlayers) {
            const newPlayer = createPlayerBox(playerCount+1);
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
            <label>Leikmaður ${playerNumber}:</label>
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

        if ( storedPlayers && storedPlayers.length > 0) {
            console.log("Loading players from storage");
            storedPlayers.forEach((playerName, index) => {
                const newPlayer = createPlayerBox( index + 1);
                newPlayer.querySelector('.player-name').value = playerName;
            });

        } else {
            console.log("No player in storage, adding player 1");
            const newPlayer = createPlayerBox(1);
            newPlayer.querySelector('.player-name').value = "";
        }
    }

    startGameButton.addEventListener('click', () => {
        for (let i = 1; i <= playerCount; i++) {
            const playerNameInput = document.querySelector(`#player${i} .player-name`);
            const playerName = playerNameInput ? playerNameInput.value || `Player ${i}` : null;

            if (playerName) {
                players.push(new Player(playerName));
                playerNameInput.disabled = true;
            }
        }

        board = new Board('dartboard');
        const game = new Game(players, board);

        game.startGame();

        gameSection.style.display = 'block';

        displayPlayerStats();
    });

    function displayPlayerStats() {
        playerStatsContainer.innerHTML = '';
        players.forEach(player => {
            const playerStat = document.createElement('div');
            playerStat.classList.add('player-stat');
            playerStat.innerHTML = `
                <strong>${player.name}</strong>: ${player.score} points
            `;
            playerStatsContainer.appendChild(playerStat);
        });
    }

    document.getElementById('dartboard').addEventListener('click', () => {
        if (players.length > 0) {
            displayPlayerStats();
        }
    });


    const canvas = document.getElementById("dartboard");
    window.addEventListener("resize", function () {
        setCanvasSize(canvas);
        board.windowResized();
    });

    setCanvasSize(canvas);

});


function setCanvasSize(canvas) {
    var size = Math.min(window.innerWidth * 0.95, window.innerHeight * 0.8);
    canvas.width = size * 0.9;
    canvas.height = size * 0.9;
    
    canvas.style.width = (canvas.width / 2) + 'px';
    canvas.style.height = (canvas.height / 2) + 'px';
}

let menuicon = document.querySelector("#menu-icon");
let navbar = document.querySelector(".navbar")

menuicon.onclick = () => {
    menuicon.classList.toggle("bx-x");
    navbar.classList.toggle("active");
}
