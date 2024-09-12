import { Throw } from './throw.js';
export class Player {
    constructor(name, id, initialScore = 501) {
        this.name = name;
        this.score = initialScore;
        this.id = id;
        this.throws = [];
    }

    addThrow(playerThrow, throwNumber) {
        var points = playerThrow.calculateScore();
        const scoreBeforeThrow = this.score;
        if (this.score - points >= 0) {
            if (this.score - points === 0) {
                if (playerThrow.multiplier === 2) {
                    this.throws.push( {throw: playerThrow, score: scoreBeforeThrow } );
                    this.score -= points;
                    console.log(`${this.name} wins with a double!`);
                    return true; 
                } else {
                    this.handleBust(throwNumber);
                    console.log(`${this.name} did not finish on a double!`);
                    return false;
                }
            }

            if ( this.score - points === 1 ) {
                this.handleBust(throwNumber);
                return false;
            }
            this.throws.push( { throw: playerThrow, score: scoreBeforeThrow });
            this.score -= points;
            return true;
        } else {
            console.log(`${this.name} bust!`);
            this.handleBust(throwNumber);
            return false;
        }
    }

    handleBust(throwNumber){
        if( throwNumber === 0 ) {
            this.throws.push( { throw: new Throw(0, 0), score: this.score } );
        } else {
            const newScoreIndex = this.throws.length - throwNumber;
            console.log(newScoreIndex);
            this.throws.push( { throw: new Throw(0, 0), score: this.throws[newScoreIndex] } )
            this.score = this.throws[newScoreIndex].score;
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
