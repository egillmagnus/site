import { Game } from './Game.js';
import { Board } from './Board.js';

let playerCount = 0;
const maxPlayers = 4;
const players = [];

document.addEventListener('DOMContentLoaded', () => {
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

            // Save players to localStorage whenever a new player is added
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

        // Update player box IDs and labels after removal
        updatePlayerBoxIDs();

        // Save updated player data to localStorage
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

        // Attach event listener to the remove button
        const removeButton = newPlayer.querySelector('.remove-player');
        removeButton.addEventListener('click', () => removePlayer(newPlayer.id));

        // Attach event listener to the player name input field to save to localStorage on change
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

    // Update the IDs and labels of the remaining player boxes after removal
    function updatePlayerBoxIDs() {
        const remainingPlayers = document.querySelectorAll('.player-box');
        remainingPlayers.forEach((playerBox, index) => {
            const newPlayerNumber = index + 1;
            playerBox.id = `player${newPlayerNumber}`; // Update the id
            const label = playerBox.querySelector('label');
            if (label) {
                label.textContent = `Leikmaður ${newPlayerNumber}`; // Update the label
            }
        });

        // Save updated player data to localStorage
        savePlayersToStorage();
    }

    // Save player names and count to localStorage
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

    // Load player data from localStorage on page load
    function loadPlayersFromStorage() {
        const storedPlayers = JSON.parse(localStorage.getItem('players'));

        if ( storedPlayers && storedPlayers.length > 0) {
            console.log("Loading players from storage");
            storedPlayers.forEach((playerName, index) => {
                const newPlayer = createPlayerBox( index + 1);
                newPlayer.querySelector('.player-name').value = playerName;
            });

            // Ensure buttons are correctly displayed based on loaded data
        } else {
            console.log("No player in storage, adding player 1");
            const newPlayer = createPlayerBox(1);
            newPlayer.querySelector('.player-name').value = "";
        }
    }

    // Start game functionality
    startGameButton.addEventListener('click', () => {
        // Collect player names and make them uneditable
        for (let i = 1; i <= playerCount; i++) {
            const playerNameInput = document.querySelector(`#player${i} .player-name`);
            const playerName = playerNameInput ? playerNameInput.value || `Player ${i}` : null;

            if (playerName) {
                players.push({ name: playerName, score: 501 }); // Initial score for each player is 501
                playerNameInput.disabled = true; // Disable the input after game starts
            }
        }

        const board = new Board('dartboard');
        const game = new Game(players, board);

        game.startGame();

        // Hide player setup and show the game section
        gameSection.style.display = 'block';

        // Display player stats
        displayPlayerStats();
    });

    // Display player stats
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

    // Example dartboard click event (you can replace this logic with your own)
    document.getElementById('dartboard').addEventListener('click', () => {
        // Simulate score deduction for the current player
        if (players.length > 0) {
            const currentPlayer = players[0]; // Just an example for the first player
            const points = Math.floor(Math.random() * 60) + 1; // Simulate a random throw
            currentPlayer.score -= points;
            if (currentPlayer.score < 0) currentPlayer.score = 0; // Ensure score doesn't go negative

            // Update player stats
            displayPlayerStats();
        }
    });
});


let menuicon = document.querySelector("#menu-icon");
let navbar = document.querySelector(".navbar")

menuicon.onclick = () => {
    menuicon.classList.toggle("bx-x");
    navbar.classList.toggle("active");
}
