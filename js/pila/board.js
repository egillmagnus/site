class Board {
    constructor() {
        // Define scoring sections (optional, for complex rules)
        this.sections = {
            single: [...Array(20).keys()].map(i => i + 1), // Single 1-20
            double: [...Array(20).keys()].map(i => (i + 1) * 2), // Double 2-40
            triple: [...Array(20).keys()].map(i => (i + 1) * 3), // Triple 3-60
            bullseye: 50, // Bullseye is 50
            outerBullseye: 25, // Outer bullseye is 25
        };
    }

    // Validate if the points are valid based on the board layout
    isValidThrow(points) {
        return points >= 0 && points <= 60 || points === 25 || points === 50;
    }

    // Method to calculate throw scores based on section
    calculateScore(section, multiplier = 1) {
        // Logic to calculate score based on the section (single, double, triple)
        if (section === 'bullseye') {
            return this.sections.bullseye;
        } else if (section === 'outerBullseye') {
            return this.sections.outerBullseye;
        }
        // Add more rules if necessary
        return section * multiplier;
    }
}
