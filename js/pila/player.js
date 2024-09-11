export class Player {
    constructor(name, initialScore = 501) {
        this.name = name;
        this.score = initialScore;
        this.throws = [];
    }

    addThrow(playerThrow) {
        var points = playerThrow.calculateScore();
        
        if (this.score - points >= 0) {
            this.throws.push(playerThrow);
            this.score -= points;
            
            if (this.score === 0) {
                if (playerThrow.multiplier === 2) {
                    console.log(`${this.name} wins with a double!`);
                    return true; 
                } else {
                    console.log(`${this.name} did not finish on a double!`);
                    return false;
                }
            }
            
            return true;
        } else {
            console.log(`${this.name} bust!`);
            return false;
        }
    }

    hasWon() {
        return this.score === 0;
    }

    reset(initialScore = 501) {
        this.score = initialScore;
        this.throws = [];
    }
}
