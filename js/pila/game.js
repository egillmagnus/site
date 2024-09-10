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
        this.board.drawBoard();
    }

    // Handle clicks on the dartboard
    handleBoardClick(event) {
        console.log("board clicked");
        if (!this.isGameOver && !this.board.isZooming) {
            if (!this.isZoomedIn ) {
                console.log("zooming in");
                // First click: zoom in
                this.board.zoomIn(event.offsetX, event.offsetY);  // Zoom in based on click position
                this.isZoomedIn = true;
            } else {
                // Second click: register throw
                console.log("registering throw");
                const playerThrow = this.board.calculatePoints(event.offsetX, event.offsetY);
                
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
        this.board.drawBoard();
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
