import { Throw } from './throw.js';
export class Player {
    constructor(name, id, initialScore = 501) {
        this.name = name;
        this.score = initialScore;
        this.id = id;
        this.throws = [];
    }

    addThrow(playerThrow) {
        var points = playerThrow.calculateScore();
        
        if (this.score - points >= 0) {
            if (this.score - points === 0) {
                if (playerThrow.multiplier === 2) {
                    this.throws(playerThrow);
                    console.log(`${this.name} wins with a double!`);
                    return true; 
                } else {
                    this.throws.push(new Throw(0, 0));
                    console.log(`${this.name} did not finish on a double!`);
                    return false;
                }
            }

            if ( this.score - points === 1 ) {
                this.throws.push(new Throw(0, 2));
                return false;
            }

            this.throws.push(playerThrow);
            this.score -= points;
            return true;
        } else {
            console.log(`${this.name} bust!`);
            this.throws.push(new Throw(0, 0));
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
