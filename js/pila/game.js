export class Game {
    constructor(players, board) {
        this.players = players;
        this.board = board;
        this.currentPlayerIndex = 0;
        this.currentThrow = 0;
        this.isGameOver = false;
        this.isZoomedIn = false;
        this.MAX_THROWS = 3;
        this.throws = [];
    }

    startGame() {
        this.board.canvas.addEventListener('click', this.handleBoardClick.bind(this));
        this.board.drawBoard();
    }


    handleBoardClick(event) {
        console.log("board clicked");
        if (!this.isGameOver && !this.board.isZooming) {
            if (!this.isZoomedIn ) {
                console.log("zooming in");
                this.board.zoomIn(event.offsetX, event.offsetY); 
                this.isZoomedIn = true;
                return false;
            } else {
                console.log("registering throw");
                const playerThrow = this.board.calculatePoints(event.offsetX, event.offsetY);

                this.startTurn(playerThrow);

                if (this.currentThrow >= this.MAX_THROWS) {
                    this.nextPlayer();
                }

                this.board.zoomOut();
                this.isZoomedIn = false;
                return true;
            }
        }
        this.board.drawBoard();
        return false;
    }

    startTurn(playerThrow) {
        if (!this.isGameOver) {
            let currentPlayer = this.players[this.currentPlayerIndex];
    
            if (this.board.isValidThrow(playerThrow.calculateScore())) {
                console.log(this.currentThrow);
                if (currentPlayer.addThrow(playerThrow, this.currentThrow)) {
                    
                    this.throws.push( this.currentPlayerIndex );
    
                    console.log(`${currentPlayer.name} scored ${playerThrow.calculateScore()}. Remaining score: ${currentPlayer.score}`);
                    
                    if (currentPlayer.hasWon()) {
                        this.isGameOver = true;
                        console.log(`${currentPlayer.name} wins!`);
                    } else {
                        this.currentThrow++;
                    }
    
                } else {
                    console.log("Bust!");
                    this.currentThrow = this.MAX_THROWS;
                }
    
            } else {
                console.log("Invalid throw!");
            }
        } else {
            console.log("Game is already over!");
        }
    }
    

    nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.currentThrow = 0;
        console.log(`It's ${this.players[this.currentPlayerIndex].name}'s turn!`);
    }

    resetGame() {
        this.isGameOver = false;
        this.players.forEach(player => player.reset());
        this.currentPlayerIndex = 0;
        this.currentThrow = 0;
    }
}
