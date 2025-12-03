// Simple parser for .tori scene files

(function() {

    function parseVec3(str) {
        return str.split(',').map(s => parseFloat(s.trim()));
    }

    function parseRotation(str) {
        // Supports format: "x:45, y:30, z:15" or "x:45" or legacy "x" (single axis)
        const rotations = [];
        const parts = str.split(',').map(s => s.trim()).filter(s => s.length > 0);
        for (const part of parts) {
            if (part.includes(':')) {
                const [axis, angle] = part.split(':').map(s => s.trim());
                rotations.push({ axis: axis.toLowerCase(), angle: parseFloat(angle) * Math.PI / 180 });
            }
        }
        return rotations;
    }

    function parseToriFile(text) {
        const lines = text.split(/\r?\n/);
        const tori = [];

        let current = null;

        for (let raw of lines) {
            const line = raw.trim();

            if (line === "" || line.startsWith("#")) continue;

            if (line.startsWith("torus {")) {
                current = { rotations: [] };
                continue;
            }

            if (line === "}") {
                if (!current) throw new Error("Unexpected '}' in .tori file");
                if (!current.extinction) current.extinction = [0,0,0];
                // Convert legacy axis/angle to rotations array if needed
                if (current.rotations.length === 0 && current.axis && !isNaN(current.angle)) {
                    current.rotations = [{ axis: current.axis, angle: current.angle }];
                }
                tori.push(current);
                current = null;
                continue;
            }

            const m = line.match(/^(\w+)\s*=\s*(.*)$/);
            if (!m) {
                console.warn("Unparsed line in .tori file:", line);
                continue;
            }

            const key = m[1];
            const val = m[2];

            switch (key) {
                case "center":
                    current.center = parseVec3(val);
                    break;

                case "extinction":
                    current.extinction = parseVec3(val);
                    break;

                case "R":
                    current.R = parseFloat(val);
                    break;

                case "r":
                    current.r = parseFloat(val);
                    break;

                case "ior":
                    current.ior = parseFloat(val);
                    break;

                case "axis":
                    current.axis = val.trim();
                    break;

                case "angle":
                    current.angle = parseFloat(val) * Math.PI / 180;
                    break;

                case "rotation":
                    current.rotations = parseRotation(val);
                    break;

                default:
                    console.warn("Unknown key in torus file:", key);
            }
        }

        return tori;
    }

    window.parseToriFile = parseToriFile;

})();
