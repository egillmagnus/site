import { Throw } from './Throw.js';  // Import the Throw class

export class Game {
    constructor(players, board) {
        this.players = players;
        this.board = board;
        this.currentPlayerIndex = 0;
        this.currentThrow = 0;
        this.isGameOver = false;
        this.isZoomedIn = false;
        this.MAX_THROWS = 3;
    }

    // Start the game, attach click event to the dartboard
    startGame() {
        this.board.canvas.addEventListener('click', this.handleBoardClick.bind(this));
    }

    // Handle clicks on the dartboard
    handleBoardClick(event) {
        if (!this.isGameOver) {
            if (!this.isZoomedIn) {
                // First click: zoom in
                this.board.zoomIn(event.clientX, event.clientY);  // Zoom in based on click position
                this.isZoomedIn = true;
            } else {
                // Second click: register throw
                const section = this.board.calculateSectionFromClick(event.clientX, event.clientY);
                const multiplier = this.board.calculateMultiplier(section);  // Calculate the multiplier (1x, 2x, 3x)
                const playerThrow = new Throw(section, multiplier);  // Create a new Throw instance
                const points = playerThrow.calculateScore();  // Calculate the score

                this.startTurn(points);

                // If three throws have been made, proceed to the next player
                if (this.currentThrow >= this.MAX_THROWS) {
                    this.nextPlayer();
                }

                // Reset zoom for the next throw
                this.board.zoomOut();
                this.isZoomedIn = false;
            }
        }
    }

    // Start a new turn for the current player
    startTurn(points) {
        if (!this.isGameOver) {
            let currentPlayer = this.players[this.currentPlayerIndex];

            if (this.board.isValidThrow(points)) {
                currentPlayer.addThrow(points);
                console.log(`${currentPlayer.name} scored ${points}. Remaining score: ${currentPlayer.score}`);

                if (currentPlayer.hasWon()) {
                    this.isGameOver = true;
                    console.log(`${currentPlayer.name} wins!`);
                } else {
                    this.currentThrow++;
                }
            } else {
                console.log("Invalid throw!");
            }
        } else {
            console.log("Game is already over!");
        }
    }

    // Proceed to the next player
    nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.currentThrow = 0;
        console.log(`It's ${this.players[this.currentPlayerIndex].name}'s turn!`);
    }

    // Reset the game
    resetGame() {
        this.isGameOver = false;
        this.players.forEach(player => player.reset());
        this.currentPlayerIndex = 0;
        this.currentThrow = 0;
    }
}
