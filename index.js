const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const camPosOverlay = document.getElementById('cam-pos');
const camRotOverlay = document.getElementById('cam-rot');
const objPosOverlay = document.getElementById('obj-pos');
const objRotOverlay = document.getElementById('obj-rot');
const objScaleOverlay = document.getElementById('obj-scale');

const fileInput = document.getElementById('fileInput');
const textureInput = document.getElementById('textureInput');

const verticesCheckbox = document.getElementById('vertices');
const wireFrameCheckbox = document.getElementById('wireframe');
const filledCheckbox = document.getElementById('filled');

const rotationSliderX = document.getElementById('rotX');
const rotationSliderY = document.getElementById('rotY');
const rotationSliderZ = document.getElementById('rotZ');

const positionSliderX = document.getElementById('posX');
const positionSliderY = document.getElementById('posY');
const positionSliderZ = document.getElementById('posZ');

const universalScaleSlider = document.getElementById('scale');
const scaleSliderX = document.getElementById('scaleX');
const scaleSliderY = document.getElementById('scaleY');
const scaleSliderZ = document.getElementById('scaleZ');

const rotationAnimationSlider = document.getElementById('speedRot');
const positionAnimationSlider = document.getElementById('speedPos');
const scaleAnimationSlider = document.getElementById('speedScale');

const animateRotationXCheckbox = document.getElementById('animRotX');
const animateRotationYCheckbox = document.getElementById('animRotY');
const animateRotationZCheckbox = document.getElementById('animRotZ');

const animatePositionXCheckbox = document.getElementById('animPosX');
const animatePositionYCheckbox = document.getElementById('animPosY');
const animatePositionZCheckbox = document.getElementById('animPosZ');

const animateScaleCheckbox = document.getElementById('animScale');

// Drag (not rotating object but moving camera)
let mouseDown = false;
let lastMouse = {x: 0, y: 0};

canvas.addEventListener("mousedown", e => {
    mouseDown = true;
    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
    window.addEventListener("mousemove", OnMouseMove);
    window.addEventListener("mouseup", OnMouseUp);
});

let mouseCanvasPosition = {x: 0, y: 0};

canvas.addEventListener("mousemove", e => {
    mouseCanvasPosition.x = e.clientX;
    mouseCanvasPosition.y = e.clientY;
})

function OnMouseMove(e) {
    if (!mouseDown) return;

    const deltaX = e.clientX - lastMouse.x;
    const deltaY = e.clientY - lastMouse.y;

    //camera.rotation.yaw -= dx / 250;  Euler angles were at its limits
    //camera.rotation.pitch += dy / 250;
    //Quaternions:
    const yawQ   = quatFromAxisAngle({x: 0,y: 1,z: 0}, deltaX * 0.004);
    const pitchQ = quatFromAxisAngle({x: 1,y: 0,z: 0}, deltaY * 0.004);

    camera.rotation = quatMul(yawQ, camera.rotation);
    camera.rotation = quatMul(camera.rotation, pitchQ);

    offsetX -= deltaX;
    offsetY -= deltaY;

    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
}

function OnMouseUp() {
    mouseDown = false;
    window.removeEventListener("mousemove", OnMouseMove);
    window.removeEventListener("mouseup", OnMouseUp);
}

// Cam Forward (just like zooming)
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    // Move/Zoom toward mouse ray
    const ndc = {
        x:  (mouseCanvasPosition.x / canvas.width) * 2 - 1,
        y: -(mouseCanvasPosition.y / canvas.height) * 2 + 1,
    };

    const direction = normalize({
        x: ndc.x,
        y: ndc.y,
        z: 1
    });
    const forward = rotateVecByQuat(direction, camera.rotation);

    const delta = e.deltaY > 0 ? -0.1 : 0.1;

    camera.position.x += forward.x * delta;
    camera.position.z += forward.z * delta;
    camera.position.y += forward.y * delta;

    step += e.deltaY > 0 ? -0.1 : 0.1;
    offsetX += e.deltaY > 0 ? 1 : -1;
    offsetY += e.deltaY > 0 ? 1 : -1;
}, { passive: false });

verticesCheckbox.addEventListener("change", (event) => {
    if (event.target.checked) renderMode = "vertices";
})
wireFrameCheckbox.addEventListener("change", (event) => {
    if (event.target.checked) renderMode = "wireframe";
})
filledCheckbox.addEventListener("change", (event) => {
    if (event.target.checked) renderMode = "filled";
})

fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    objects.push({
        position: {x: 0, y: 0, z: 0},
        rotation: {x: 0, y: 0, z: 0},
        scale: {x: 1, y: 1, z: 1},
        angleSpeed: 0,
        translateSpeed: 0,
        scaleSpeed: 0,
        anglesToAnimate: {x: false, y: false, z: false},
        positionsToAnimate: {x: false, y: false, z: false},
        vertices: [],
        faces: [],
    });

    // Parse obj file
    const reader = new FileReader();
    reader.onload = e => {
        const objText = e.target.result;

        objText.split('\n').forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts[0] === 'v') {
                objects[objects.length - 1].vertices.push({
                    x: parseFloat(parts[1]),
                    y: parseFloat(parts[2]),
                    z: parseFloat(parts[3])
                });
            } else if (parts[0] === 'f') {
                objects[objects.length - 1].faces.push(parts.slice(1).map(s => parseInt(s.split('/')[0]) - 1));
            }
        });

        AddObjectItem(file.name, "Imported");

        setPivotAndScale();
    };

    reader.readAsText(file);
})

function AddObjectItem(file, type) {
    const objectItem = document.createElement('div');
    objectItem.classList.add("object-item");

    const description = document.createElement('div');
    description.classList.add("object-description");
    objectItem.appendChild(description);

    const fileName = document.createElement('span');

    const dots = file.length > 25 ? ".." : "";
    fileName.innerHTML = file.substring(0, 25) + dots;
    fileName.classList.add("object-name");
    description.appendChild(fileName);

    const objectType = document.createElement('span');
    objectType.innerHTML = type;
    objectType.classList.add("object-type");
    description.appendChild(objectType);

    const deleteButton = document.createElement('button');
    deleteButton.classList.add("remove-object");
    deleteButton.innerHTML = "X";
    objectItem.appendChild(deleteButton);

    const objectContainer = document.getElementById("object-list");
    objectContainer.appendChild(objectItem);

    deleteButton.onclick = () => {
        objects.splice([...objectContainer.children].indexOf(objectItem), 1);
        objectItem.remove();
    }
    objectItem.onclick = () => {

        changeActiveObject([...objectContainer.children].indexOf(objectItem));
    }

    changeActiveObject(objects.length - 1);
}

textureInput.addEventListener("change", (event) => {
    if (!event.target.files[0]) {
        texture = undefined;
        return;
    }
    uploadTexture(event.target.files[0]);
})

function setPivotAndScale() {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    objects[currentObject].vertices.forEach(v => {
        if (v.x < minX) minX = v.x;
        if(v.x > maxX) maxX = v.x;
        if(v.y < minY) minY = v.y;
        if(v.y > maxY) maxY = v.y;
        if(v.z < minZ) minZ = v.z;
        if(v.z > maxZ) maxZ = v.z;
    });

    // Make pivot the center
    const pivotX = (minX + maxX) / 2;
    const pivotY = (minY + maxY) / 2;
    const pivotZ = (minZ + maxZ) / 2;


    objects[currentObject].vertices = objects[currentObject].vertices.map(v => ({
        x: v.x - pivotX,
        y: v.y - pivotY,
        z: v.z - pivotZ
    }));

    // comment out or remove to keep real scale
    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;
    const maxSize = Math.max(sizeX, sizeY, sizeZ);

    const scale = 2 / maxSize;

    objects[currentObject].vertices = objects[currentObject].vertices.map(v => ({
        x: v.x * scale,
        y: v.y * scale,
        z: v.z * scale
    }));

}

rotationSliderX.addEventListener('input', updateRotationX);
rotationSliderY.addEventListener('input', updateRotationY);
rotationSliderZ.addEventListener('input', updateRotationZ);

positionSliderX.addEventListener('input', updatePositionX);
positionSliderY.addEventListener('input', updatePositionY);
positionSliderZ.addEventListener('input', updatePositionZ);

universalScaleSlider.addEventListener("input", updateUniversalScale);
scaleSliderX.addEventListener("input", updateScaleX);
scaleSliderY.addEventListener("input", updateScaleY);
scaleSliderZ.addEventListener("input", updateScaleZ);

scaleAnimationSlider.addEventListener('input', (event) => {
    objects[currentObject].scaleSpeed = Number(event.target.value);
});
rotationAnimationSlider.addEventListener('input', (event) => {
    objects[currentObject].angleSpeed = Number(event.target.value);
})
positionAnimationSlider.addEventListener('input', (event) => {
    objects[currentObject].translateSpeed = Number(event.target.value);
})

animateRotationXCheckbox.addEventListener('change', (event) => {
    objects[currentObject].anglesToAnimate.x = event.target.checked;
})
animateRotationYCheckbox.addEventListener('change', (event) => {
    objects[currentObject].anglesToAnimate.y = event.target.checked;
})
animateRotationZCheckbox.addEventListener('change', (event) => {
    objects[currentObject].anglesToAnimate.z = event.target.checked;
})

animatePositionXCheckbox.addEventListener('change', (event) => {
    objects[currentObject].positionsToAnimate.x = event.target.checked;
})
animatePositionYCheckbox.addEventListener('change', (event) => {
    objects[currentObject].positionsToAnimate.y = event.target.checked;
})
animatePositionZCheckbox.addEventListener('change', (event) => {
    objects[currentObject].positionsToAnimate.z = event.target.checked;
})

animateScaleCheckbox.addEventListener('change', (event) => {
    objects[currentObject].scaleSpeed = event.target.checked ? scaleAnimationSlider.value : 0;
})

function updateRotationX(value) {
    objects[currentObject].rotation.x = Number(value.target.value) * Math.PI / 180; // Gradmaß zu Bogenmaß
}
function updateRotationY(value) {
    objects[currentObject].rotation.y = Number(value.target.value) * Math.PI / 180; // Gradmaß zu Bogenmaß
}
function updateRotationZ(value) {
    objects[currentObject].rotation.z = Number(value.target.value) * Math.PI / 180; // Gradmaß zu Bogenmaß
}

function updatePositionX(value) {
    objects[currentObject].position.x = Number(value.target.value);
}
function updatePositionY(value) {
    objects[currentObject].position.y = Number(value.target.value);
}
function updatePositionZ(value) {
    objects[currentObject].position.z = Number(value.target.value);
}

function updateUniversalScale(value) {
    const average = Number(objects[currentObject].scale.x + objects[currentObject].scale.y + objects[currentObject].scale.z) / 3;
    const deltaAverage = Number(value.target.value) - average;
    const deltaAverageDistributed = deltaAverage / 3;

    if ((objects[currentObject].scale.x - deltaAverageDistributed <= 0.2 || objects[currentObject].scale.y - deltaAverageDistributed <= 0.2 || objects[currentObject].scale.z - deltaAverageDistributed <= 0.2) && deltaAverageDistributed <= 0) {
        universalScaleSlider.value = average;
        return;
    }

    objects[currentObject].scale.x += deltaAverageDistributed;
    objects[currentObject].scale.y += deltaAverageDistributed;
    objects[currentObject].scale.z += deltaAverageDistributed;

    updateScaleSlider("x");
    updateScaleSlider("y");
    updateScaleSlider("z");
}
function updateScaleX(value) {
    objects[currentObject].scale.x = Number(value.target.value);
    universalScaleSlider.value = Number(objects[currentObject].scale.x + objects[currentObject].scale.y + objects[currentObject].scale.z) / 3;
}
function updateScaleY(value) {
    objects[currentObject].scale.y = Number(value.target.value);
    universalScaleSlider.value = Number(objects[currentObject].scale.x + objects[currentObject].scale.y + objects[currentObject].scale.z) / 3;
}
function updateScaleZ(value) {
    objects[currentObject].scale.z = Number(value.target.value);
    universalScaleSlider.value = Number(objects[currentObject].scale.x + objects[currentObject].scale.y + objects[currentObject].scale.z) / 3;
}

function uploadTexture(file) {
    const reader = new FileReader();
    reader.onload = e => {
        texture = new Image();
        texture.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

function changeActiveObject(index) {
    const objectContainer = document.getElementById("object-list");
    objectContainer.children.item(currentObject).classList.remove("selected");
    objectContainer.children.item(index).classList.add("selected");

    currentObject = index;

    // Slider values
    updateRotationSlider("x", 0);
    updateRotationSlider("y", 0);
    updateRotationSlider("z", 0);

    updatePositionSlider("x", 0);
    updatePositionSlider("y", 0);
    updatePositionSlider("z", 0);

    universalScaleSlider.value = Number(objects[currentObject].scale.x + objects[currentObject].scale.y + objects[currentObject].scale.z) / 3;
    updateScaleSlider("x");
    updateScaleSlider("y");
    updateScaleSlider("z");


    // Animation values
    animatePositionXCheckbox.checked = objects[currentObject].positionsToAnimate.x;
    animatePositionYCheckbox.checked = objects[currentObject].positionsToAnimate.y;
    animatePositionZCheckbox.checked = objects[currentObject].positionsToAnimate.z;

    animateRotationXCheckbox.checked = objects[currentObject].anglesToAnimate.x;
    animateRotationYCheckbox.checked = objects[currentObject].anglesToAnimate.y;
    animateRotationZCheckbox.checked = objects[currentObject].anglesToAnimate.z;

    animateScaleCheckbox.checked = objects[currentObject].scaleSpeed > 0;

    positionAnimationSlider.value = objects[currentObject].translateSpeed;
    rotationAnimationSlider.value = objects[currentObject].angleSpeed;
    scaleAnimationSlider.value = objects[currentObject].scaleSpeed;
}

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
});

let movementSpeed = 2;

function move(key, deltaTime) {
    const FORWARD = { x: 0, y: 0, z: 1 };
    const forward = rotateVecByQuat(FORWARD, camera.rotation);

    const SIDEWARD = { x: 1, y: 0, z: 0 };
    const sideward = rotateVecByQuat(SIDEWARD, camera.rotation);

    const speed = movementSpeed * deltaTime;
    const offsetSpeed = -100 * deltaTime;

    switch (key) {
        case "ArrowLeft":
            offsetX -= offsetSpeed;
            camera.position.x -= sideward.x * speed;
            camera.position.y -= sideward.y * speed;
            camera.position.z -= sideward.z * speed;
            break;
        case "ArrowRight":
            offsetX += offsetSpeed;
            camera.position.x += sideward.x * speed;
            camera.position.y += sideward.y * speed;
            camera.position.z += sideward.z * speed;
            break;
        case "ArrowUp":
            step += speed / 1.5;
            offsetX -= speed * 10;
            offsetY -= speed * 10;
            camera.position.x += forward.x * speed;
            camera.position.y += forward.y * speed;
            camera.position.z += forward.z * speed;
            break;
        case "ArrowDown":
            step -= speed / 1.5;
            offsetX += speed * 10;
            offsetY += speed * 10
            camera.position.x -= forward.x * speed;
            camera.position.y -= forward.y * speed;
            camera.position.z -= forward.z * speed;
            break;
        case "a":
            offsetX -= offsetSpeed;
            camera.position.x -= sideward.x * speed;
            camera.position.y -= sideward.y * speed;
            camera.position.z -= sideward.z * speed;
            break;
        case "d":
            offsetX += offsetSpeed;
            camera.position.x += sideward.x * speed;
            camera.position.y += sideward.y * speed;
            camera.position.z += sideward.z * speed;
            break;
        case "w":
            step += speed / 1.5;
            offsetX -= speed * 10;
            offsetY -= speed * 10;
            camera.position.x += forward.x * speed;
            camera.position.y += forward.y * speed;
            camera.position.z += forward.z * speed;
            break;
        case "s":
            step -= speed / 1.5;
            offsetX += speed * 10;
            offsetY += speed * 10;
            camera.position.x -= forward.x * speed;
            camera.position.y -= forward.y * speed;
            camera.position.z -= forward.z * speed;
            break;
        case "Shift":
            movementSpeed = movementSpeed === 2 ? 4 : 2;
            break;
        default:
            break;
    }
}

let keys = [];
window.addEventListener("keydown",
    function(e){
        keys[e.key] = true;
    });

window.addEventListener('keyup',
    function(e){
        keys[e.key] = false;
    });

let offsetX = 0;
let offsetY = 0;

let step = 50;

function clean() {
    ctx.fillStyle = '#090a0d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#1a1e29';
    ctx.lineWidth = 1;

    const currentStep = step;

    for (let x = offsetX % step; x < canvas.width; x += currentStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = offsetY % step; y < canvas.height; y += currentStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawLine(p1, p2) {
    // Make || instead of && if faces should vanish strictly behind cam
    if(!p1.shouldRender && !p2.shouldRender) return;
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p1.newX, p1.newY);
    ctx.lineTo(p2.newX, p2.newY);
    ctx.stroke();
}

let texture;

function fillFaces(color, points) {
    for (let i = 0; i < points.length; i++) {
        if(!points[i].shouldRender) {
            if(i === points.length - 1) return;
            continue;
        }
        break;
    }
    //if(points.some( p => !p.shouldRender)) return; If faces should vanish strictly behind cam
    ctx.beginPath();
    ctx.moveTo(points[0].newX, points[0].newY);

    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].newX, points[i].newY);
    }
    ctx.closePath();

    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 1;

    if(texture) {
        ctx.strokeStyle="transparent";
        ctx.stroke();
        ctx.fillStyle = ctx.createPattern(texture, "repeat");
    } else {
        ctx.fillStyle = color;
        ctx.stroke();
    }
    ctx.fill();
}

function project3D(x, y, z) {
    if (z <= 0.01) { // Near clipping plane - z shouldn't be negative
        z = 0.01; // Safely comment out or remove if faces should vanish strictly behind cam
        return {x: x/z,y: y/z, shouldRender: false}; // You can safely set x and y to 0 if faces should vanish strictly behind cam (improves performance)
    }
    x=x/z;
    y=y/z;

    return {x, y, shouldRender: true};
}

function correctCoordinates({plainX, plainY}) {
    const aspectRatio = canvas.width / canvas.height;

    // 0.5 * canvas.width(plainX + 1): map -1..1 => 0..2 => 0..1 => 0..canvas.width
    const x = 0.5 * canvas.width * plainX / aspectRatio + 0.5 * canvas.width;
    const y = 0.5 * canvas.height * (-plainY + 1);

    return {x, y}
}

function correctAndProject3D({x, y, z}) {
    // camera translation
    x -= camera.position.x;
    y -= camera.position.y;
    z -= camera.position.z;

    // camera rotation
    ({x,y,z} = rotateVecByQuat({x,y,z}, quatInverse(camera.rotation)));

    let {x: threeX, y: threeY, shouldRender} = project3D(x, y, z);
    let {x: correctedX, y: correctedY} = correctCoordinates({plainX: threeX, plainY: threeY});

    return {newX: correctedX, newY: correctedY, shouldRender};
}

function setVertex({x, y, z}) {
    const s = 5;
    let {newX, newY, shouldRender} = correctAndProject3D({x, y, z});
    if(!shouldRender) return;

    newX-=s/2;
    newY-=s/2;

    ctx.fillStyle = 'purple';
    ctx.fillRect(newX, newY, s, s);
}

function translate({x, y, z}, dx, dy, dz) {
    dx = Number(parseFloat(dx).toFixed(10));
    dy = Number(parseFloat(dy).toFixed(10));
    dz = Number(parseFloat(dz).toFixed(10));
    return {x: x + dx, y: y + dy, z: z + dz};
}

function rotate_around_x({x, y, z}, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {x: x, y: y*cos - z*sin, z: y*sin +z*cos};
}
function rotate_around_y({x, y, z}, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {x: x*cos - z*sin, y: y, z: x*sin + z*cos};
}
function rotate_around_z({x, y, z}, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {x: x*cos - y*sin, y: x*sin + y*cos, z: z};
}

function scale({x, y, z}, {x: factorX, y: factorY, z: factorZ}) {
    return {x: x*factorX, y: y*factorY, z: z*factorZ};
}

const FPS = 90;

let objects = [];
let currentObject = 0;

let camera = {
    position: {x: 0, y: 0, z: -2},
    rotation: {},
};
camera.rotation = quat(0, 0, 0, 1);

function quat(x, y, z, w) {
    return { x, y, z, w };
}
function quatFromAxisAngle(axis, angle) {
    const half = angle * 0.5;
    const s = Math.sin(half);
    return {
        x: axis.x * s,
        y: axis.y * s,
        z: axis.z * s,
        w: Math.cos(half)
    };
}
function quatMul(a, b) {
    return {
        w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
        x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
        y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
        z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w
    };
}
function quatInverse(q) {
    return { x:-q.x, y:-q.y, z:-q.z, w:q.w };
}
function rotateVecByQuat(v, q) {
    const qv = { x:v.x, y:v.y, z:v.z, w:0 };
    const qi = quatInverse(q);
    const r  = quatMul(quatMul(q, qv), qi);
    return { x:r.x, y:r.y, z:r.z };
}
function quaternionToEulerDegrees({x, y, z, w}) {
    const len = Math.hypot(x, y, z, w);
    x /= len;
    y /= len;
    z /= len;
    w /= len;

    const sinr_cosp = 2 * (w * x + y * z);
    const cosr_cosp = 1 - 2 * (x * x + y * y);
    let roll = Math.atan2(sinr_cosp, cosr_cosp);

    let sinp = 2 * (w * y - z * x);
    let pitch;
    if (Math.abs(sinp) >= 1) {
        pitch = Math.sign(sinp) * Math.PI / 2;
    } else {
        pitch = Math.asin(sinp);
    }

    const siny_cosp = 2 * (w * z + x * y);
    const cosy_cosp = 1 - 2 * (y * y + z * z);
    let yaw = Math.atan2(siny_cosp, cosy_cosp);

    const rad2deg = 180 / Math.PI;
    roll *= rad2deg;
    pitch *= rad2deg;
    yaw *= rad2deg;

    const wrap360 = angle => (angle + 360) % 360;

    return {
        x: wrap360(roll),
        y: wrap360(pitch),
        z: wrap360(yaw)
    };
}

function normalize(v) {
    const length = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
    return {
        x: v.x / length,
        y: v.y / length,
        z: v.z / length
    };
}

function updateRotationSlider(angle, deltaTime) {
    if (angle === 'x') {
        rotationSliderX.value = objects[currentObject].rotation[angle] * 180 / Math.PI; // Bogenmaß zu Gradmaß
    } else if (angle === 'y') {
        rotationSliderY.value = objects[currentObject].rotation[angle] * 180 / Math.PI; // Bogenmaß zu Gradmaß
    } else if (angle === 'z') {
        rotationSliderZ.value = objects[currentObject].rotation[angle] * 180 / Math.PI; // Bogenmaß zu Gradmaß
    }
    return objects[currentObject].angleSpeed * 2 * Math.PI * deltaTime;
}

function updatePositionSlider(axis, deltaTime) {
    if (axis === 'x') {
        positionSliderX.value = objects[currentObject].position[axis];
    } else if (axis === 'y') {
        positionSliderY.value = objects[currentObject].position[axis];
    } else if (axis === 'z') {
        positionSliderZ.value = objects[currentObject].position[axis];
    }
    return objects[currentObject].translateSpeed * deltaTime;
}

function updateScaleSlider(axis) {
    if (axis === 'x') {
        scaleSliderX.value = objects[currentObject].scale[axis];
    } else if (axis === 'y') {
        scaleSliderY.value = objects[currentObject].scale[axis];
    } else if (axis === 'z') {
        scaleSliderZ.value = objects[currentObject].scale[axis];
    }
}

function animate(deltaTime) {
    objects[currentObject].rotation.x += objects[currentObject].anglesToAnimate.x ? updateRotationSlider("x", deltaTime) : 0;
    objects[currentObject].rotation.y += objects[currentObject].anglesToAnimate.y ? updateRotationSlider("y", deltaTime) : 0;
    objects[currentObject].rotation.z += objects[currentObject].anglesToAnimate.z ? updateRotationSlider("z", deltaTime) : 0;

    objects[currentObject].position.x += objects[currentObject].positionsToAnimate.x ? updatePositionSlider("x", deltaTime) : 0;
    objects[currentObject].position.y += objects[currentObject].positionsToAnimate.y ? updatePositionSlider("y", deltaTime) : 0;
    objects[currentObject].position.z += objects[currentObject].positionsToAnimate.z ? updatePositionSlider("z", deltaTime) : 0;

    objects[currentObject].scale.x += objects[currentObject].scaleSpeed * deltaTime;
    objects[currentObject].scale.y += objects[currentObject].scaleSpeed * deltaTime;
    objects[currentObject].scale.z += objects[currentObject].scaleSpeed * deltaTime;
    if (objects[currentObject].scaleSpeed !== 0)
        universalScaleSlider.value = Number(objects[currentObject].scale.x + objects[currentObject].scale.y + objects[currentObject].scale.z) / 3;
}

let renderMode = "filled";

function frame() {
    const deltaTime = 1/FPS;
    clean();

    for (const key in keys) {
        if (keys[key]) move(key, deltaTime);
    }

    if (objects.length === 0) {
        setTimeout(frame, 1000/FPS);
        return;
    }
    animate(deltaTime);

    for (const object of objects) {

        switch (renderMode) {
            case "vertices":
                for (let vertex of object.vertices) {
                    setVertex(translate(rotate_around_y(rotate_around_x(rotate_around_z(scale(vertex, object.scale), object.rotation.z), object.rotation.y), object.rotation.x), object.position.x, object.position.y, object.position.z));
                }
                break;
            case "wireframe":
                for (let face of object.faces) {
                    for (let i = 0; i < face.length; i++) {
                        const firstPoint = object.vertices[face[i]];
                        const secondPoint = object.vertices[face[(i + 1) % face.length]];
                        drawLine(correctAndProject3D(translate(rotate_around_y(rotate_around_x(rotate_around_z(scale(firstPoint, object.scale), object.rotation.z), object.rotation.y), object.rotation.x), object.position.x, object.position.y, object.position.z)),
                            correctAndProject3D(translate(rotate_around_y(rotate_around_x(rotate_around_z(scale(secondPoint, object.scale), object.rotation.z), object.rotation.y), object.rotation.x), object.position.x, object.position.y, object.position.z)));
                    }
                }
                break;
            case "filled":
                for (let i= 0; i < object.faces.length; i++) {
                    let points = object.faces[i].map(index => object.vertices[index]);

                    for (let i = 0; i < points.length; i++) {
                        points[i] = correctAndProject3D(translate(rotate_around_y(rotate_around_x(rotate_around_z(scale(points[i], object.scale), objects[currentObject].rotation.z), object.rotation.y), object.rotation.x), object.position.x, object.position.y, object.position.z));
                    }
                    const hue = 220 + (i * 15);
                    fillFaces(`hsla(${hue}, 70%, 60%, 0.6)`, points);
                }
                break;
        }
    }
    camPosOverlay.innerText = `[${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}]`;
    objPosOverlay.innerText = `[${objects[currentObject].position.x.toFixed(2)}, ${objects[currentObject].position.y.toFixed(2)}, ${objects[currentObject].position.z.toFixed(2)}]`;

    const camRotation = quaternionToEulerDegrees(camera.rotation);
    camRotOverlay.innerText = `[${camRotation.x.toFixed(2)}, ${camRotation.y.toFixed(2)}, ${camRotation.z.toFixed(2)}]`;
    objRotOverlay.innerText = `[${(objects[currentObject].rotation.x / Math.PI * 180).toFixed(2)}, ${(objects[currentObject].rotation.y / Math.PI * 180).toFixed(2)}}, ${(objects[currentObject].rotation.z / Math.PI * 180).toFixed(2)}}]`;

    objScaleOverlay.innerText = `[${objects[currentObject].scale.x.toFixed(2)}, ${objects[currentObject].scale.y.toFixed(2)}, ${objects[currentObject].scale.z.toFixed(2)}]`;

    setTimeout(frame, 1000/FPS)
}

setTimeout(frame, 1000/FPS)

objects.push({
    position: {x: 0, y: 0, z: 0},
    rotation: {x: 0.45, y: 0, z: 0}, // Bogenmaß
    scale: {x: 1, y: 1, z: 1},
    angleSpeed: 0,
    translateSpeed: 0,
    scaleSpeed: 0,
    anglesToAnimate: {x: false, y: false, z: false},
    positionsToAnimate: {x: false, y: false, z: false},
    vertices: [
        { x:-0.5, y:-0.5, z:-0.5 },
        { x: 0.5, y:-0.5, z:-0.5 },
        { x: 0.5, y: 0.5, z:-0.5 },
        { x:-0.5, y: 0.5, z:-0.5 },
        { x:-0.5, y:-0.5, z: 0.5 },
        { x: 0.5, y:-0.5, z: 0.5 },
        { x: 0.5, y: 0.5, z: 0.5 },
        { x:-0.5, y: 0.5, z: 0.5 },
    ],
    faces: [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
        [0, 1, 5, 4],
        [3, 2, 6, 7],
        [1, 2, 6, 5],
        [0, 3, 7, 4],
    ],
});
AddObjectItem("Cube", "Primitive");

objects.push({
    position: {x: 0, y: 0, z: 0},
    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 1, y: 1, z: 1},
    angleSpeed: 0,
    translateSpeed: 0,
    scaleSpeed: 0,
    anglesToAnimate: {x: false, y: false, z: false},
    positionsToAnimate: {x: false, y: false, z: false},
    vertices: [],
    faces: [],
});