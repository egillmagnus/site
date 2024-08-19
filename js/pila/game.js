class Game {
    constructor(players, board) {
        this.players = players;
        this.board = board;
        this.currentPlayerIndex = 0;
        this.isGameOver = false;
    }

    // Start a new turn
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
                    this.nextPlayer();
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
    }

    // Reset the game
    resetGame() {
        this.isGameOver = false;
        this.players.forEach(player => player.reset());
        this.currentPlayerIndex = 0;
    }
}
