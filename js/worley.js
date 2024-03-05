var canvas;
let points = []
let npoints = 20;
let debth;
let halfdebth;
let maxDist;
let litur = false;
let redOffset;
function setup() {
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    canvas = createCanvas(floor(window.innerWidth*0.9), floor(window.innerHeight*0.7));
    adjustVideoSize();
    pixelDensity(1);
    canvas.parent("worley");
    console.log("Canvas size: ", width, height);
    loadPixels();
    console.log("Pixels array length: ", pixels.length);
    debth = width;
    for (let i = 0; i < npoints; i++) {
        points.push(createVector(random(width), random(height), random(debth)));
    }
    halfdebth = (debth/2);
    maxDist = halfdebth*halfdebth;
    redOffset = maxDist*0.5;

    const liturButton = document.getElementById('liturButton');
    liturButton.addEventListener('click', function() {
        litur = !litur; // Toggle the color mode
        liturButton.textContent = litur ? 'Slökkva á lit' : 'Kveikja á lit';
  });

  window.addEventListener('resize', adjustVideoSize);
}


function draw() {
    loadPixels();
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let dist1 = Infinity;
            for (let i = 0; i < points.length; i++) {
                let v = points[i];
                let dx = x - v.x;
                let dy = y - v.y;
                let dz = halfdebth - v.z;
                let dSquared = dx * dx + dy * dy + dz * dz;
                if (dSquared < dist1) {
                    dist1 = dSquared;
                }
            }

            let r;
            let g;
            let b;
            if(litur) {
                r = map(dist1, 0, ((maxDist-redOffset)/2), 255, 10);
                g = constrain(map(dist1, 0, maxDist/2, 10, 255), 0, 255);;
                b = map(dist1, 0, maxDist-1, 255, 10);
            } else {
                r = map(dist1, 0, maxDist-1, 15, 255);
                g = map(dist1, 0, maxDist-1, 15, 255);
                b = map(dist1, 0, maxDist-1, 15, 255);
            }
            let index = (x + y * width) * 4; // *4 for every pixel's RGBA values
            pixels[index] = r; // R
            pixels[index + 1] = g; // G
            pixels[index + 2] = b; // B
            pixels[index + 3] = 255; // Alpha
        }
    }
    updatePixels();

    for (let i = 0; i < npoints; i++) {
        if (points[i].z <= 0) {
            points.splice(i, 1, createVector(random(width), random(height), debth)); 
        } else {
            points[i].z -= 1;
        }
    }
}

function adjustVideoSize() {
    if (windowWidth < 800) {
        resizeCanvas(floor(window.innerWidth*0.9), floor(window.innerHeight*0.7));
    } else {
        resizeCanvas(floor(window.innerWidth*0.7), floor(window.innerHeight*0.7));
    }
}

let menuicon = document.querySelector("#menu-icon");
let navbar = document.querySelector(".navbar")

menuicon.onclick = () => {
    menuicon.classList.toggle("bx-x");
    navbar.classList.toggle("active");
}