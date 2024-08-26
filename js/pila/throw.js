export class Throw {
    constructor(section, multiplier) {
        this.section = section;
        this.multiplier = multiplier;
    }

    calculateScore() {
        return this.section * this.multiplier;
    }
}
