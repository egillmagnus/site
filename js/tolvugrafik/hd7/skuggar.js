
const canvas = document.querySelector('#c');

const scene = new THREE.Scene();
scene.background = new THREE.Color('black');

const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
camera.position.set(0, 3, 5);

const controls = new THREE.OrbitControls(camera, canvas);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshPhongMaterial({ color: 0x44aa88 });
const cube = new THREE.Mesh(geometry, material);
cube.castShadow = true;
cube.receiveShadow = true;
cube.position.x += 1;
scene.add(cube);

const ballGeometry = new THREE.SphereGeometry(0.5, 20, 20);
const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xaa8844 });
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.castShadow = true;
ball.receiveShadow = true;
ball.position.x += -1;
scene.add(ball);

const planeGeometry = new THREE.PlaneGeometry(20, 20);
const planeMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.receiveShadow = true;
plane.rotation.x = -0.5 * Math.PI;
plane.position.set(0, -0.5, 0);
scene.add(plane);

const light = new THREE.PointLight(0xFFFFFF, 1);
light.castShadow = true;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
light.position.set(0, 1, 0);
scene.add(light);

const helper = new THREE.PointLightHelper(light, 0.1);
scene.add(helper);

const light2 = new THREE.PointLight(0xFFAAFF, 1);
light2.castShadow = true;
light2.shadow.mapSize.width = 1024;
light2.shadow.mapSize.height = 1024;
light2.position.set(2, 1, 2);
scene.add(light2);

const helper2 = new THREE.PointLightHelper(light2, 0.1);
scene.add(helper2);

function updateLight() {
    helper.color = light.color;
    helper.update();
}

function updateLight2() {
    helper2.color = light2.color;
    helper2.update();
}

window.addEventListener("resize", function () {
    setCanvasSize(canvas);
});

class ColorGUIHelper {
    constructor(object, prop) {
        this.object = object;
        this.prop = prop;
    }
    get value() {
        return `#${this.object[this.prop].getHexString()}`;
    }
    set value(hexString) {
        this.object[this.prop].set(hexString);
    }
}

function makeXYZGUI(gui, vector3, name, onChangeFn) {
    const folder = gui.addFolder(name);
    folder.add(vector3, 'x', -10, 10).onChange(onChangeFn);
    folder.add(vector3, 'y', 0, 10).onChange(onChangeFn);
    folder.add(vector3, 'z', -10, 10).onChange(onChangeFn);
    folder.open();
}

const gui = new dat.GUI();

const lightFolder = gui.addFolder('Light 1');
lightFolder.addColor(new ColorGUIHelper(light, 'color'), 'value').name('color').onChange(updateLight);
lightFolder.add(light, 'intensity', 0, 2, 0.01);
lightFolder.add(light, 'distance', 0, 40).onChange(updateLight);
makeXYZGUI(lightFolder, light.position, 'position', updateLight);

const light2Folder = gui.addFolder('Light 2');
light2Folder.addColor(new ColorGUIHelper(light2, 'color'), 'value').name('color').onChange(updateLight2);
light2Folder.add(light2, 'intensity', 0, 2, 0.01);
light2Folder.add(light2, 'distance', 0, 40).onChange(updateLight2);
makeXYZGUI(light2Folder, light2.position, 'position', updateLight2);

const clock = new THREE.Clock();

const animate = function () {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();


    ball.position.y = Math.sin(time) * 1 + 1;


    cube.position.z = Math.sin(time) * 2;

    controls.update();
    renderer.render(scene, camera);
};


function setCanvasSize(canvas) {

    var size = Math.min(window.innerWidth * 0.95, window.innerHeight * 0.8);


    var dpr = window.devicePixelRatio || 1;


    canvas.width = size * dpr;
    canvas.height = size * dpr;


    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';


    renderer.setSize(size, size, false);


    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
}

setCanvasSize(canvas);

animate();
