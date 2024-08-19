class Player {
    constructor(name, initialScore = 501) {
        this.name = name;
        this.score = initialScore;
        this.throws = [];
    }

    addThrow(points) {
        if (this.score - points >= 0) {
            this.throws.push(points);
            this.score -= points;
        } else {
            console.log(`${this.name} bust!`);
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
