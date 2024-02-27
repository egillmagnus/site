const density = 'NNNN@#W$9876543210?!abc;:+=-,._     ';

let video, asciiDiv, videoWidth = 200, videoHeight = 80, aspectRatio = 0.5;
let count = 0;
let videoReady = false;

function setup() {
    noCanvas();
    video = createCapture(VIDEO, getAspectRatio);
    video.hide();

    asciiDiv = document.getElementById("ascii-div");
    asciiDiv.classList.add("ascii-art");

    getAspectRatio();

    document.getElementById("log").innerText = aspectRatio;
}

function getAspectRatio() {
    aspectRatio = video.height / video.width;
    adjustVideoSize();
}

function adjustVideoSize() {
    videoReady = false;
    videoWidth = 140
    if(aspectRatio == 0) {
        aspectRatio = 1;
    }
    videoHeight = Math.floor(videoWidth * aspectRatio);

    // Optional: Set minimum and maximum sizes to prevent too small or too large videos// Maximum video width
    // Corresponding maximum height

    // Clamp values to minimum and maximum
    video.size(videoWidth, videoHeight);

    console.log("Resizing...")
    console.log(videoWidth + "x" + videoHeight);
    document.getElementById("log").innerText = aspectRatio;
    videoReady = true;
}

window.addEventListener('resize', adjustVideoSize);

function draw() {
    generateAsciiArt();
}

function generateAsciiArt() {
    try {
        video.loadPixels();
    } catch (error) {
        drawEmpty();
        console.log("Loading pixels failed");
        if (count > 60) {
            video = createCapture(VIDEO, getAspectRatio);
            video.hide();
            adjustVideoSize()
            count = 0;
            return;
        }
        count++;
        return;
    }

    drawHeight = videoHeight;
    drawWidth = videoWidth;

    if(drawHeight == 0 || drawWidth == 0) {
        adjustVideoSize();
    } else {
    let img = '';
    for (let i = 0; i < drawHeight; i++) {
        for (let j = drawWidth -1; j >= 0; j--) {
            const pI = (i * video.width + j) * 4;
            const r = video.pixels[pI];
            const g = video.pixels[pI + 1];
            const b = video.pixels[pI + 2];
            const avg = (0.299*r + 0.587*g + 0.114*b);


            if (avg == 0) {
                c = '-'
            } else {
                c = density[Math.floor(map(avg, 0, 255, density.length-1, 0))];
            }

            if (c == undefined) {
                drawEmpty();
            }
            
            img += c === ' ' ? '&nbsp;' : c;
    
        }
        img += '<br/>';
    }
    asciiDiv.innerHTML = img;
    document.getElementById("log").innerText = count++;

}
}

function drawEmpty() {
    let img = '';
    for (let i = 0; i < videoHeight; i++) {
        for (let j = 0; j < videoWidth; j++) {
            
            img += '_';
        }
        img += '<br/>';
    }
    asciiDiv.innerHTML = img;
}


let menuicon = document.querySelector("#menu-icon");
let navbar = document.querySelector(".navbar")

menuicon.onclick = () => {
    menuicon.classList.toggle("bx-x");
    navbar.classList.toggle("active");
}

