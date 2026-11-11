// MOTIONAI - Intelligent Motion Detection System

// HTML ELEMENTS
const video = document.getElementById("camera");
const canvas = document.getElementById("motionCanvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusText = document.getElementById("status");
const counter = document.getElementById("counter");

const sensitivitySlider =
    document.getElementById("sensitivity");

const sensitivityValue =
    document.getElementById("sensitivityValue");


// SENSITIVITY CONTROL
let sensitivity = 5;

sensitivitySlider.addEventListener("input", function () {
    sensitivity = Number(this.value);
    sensitivityValue.textContent = sensitivity;
});


// SYSTEM VARIABLES
let cameraStream = null;
let previousFrame = null;
let motionEvents = 0;
let detectionTimer = null;
let wasMoving = false;
let lastEventTime = 0;


// SAMPLE CANVAS
const sampleCanvas = document.createElement("canvas");

sampleCanvas.width = 160;
sampleCanvas.height = 120;

const sampleCtx = sampleCanvas.getContext("2d", {
    willReadFrequently: true
});


// WAIT FOR VIDEO READY
function waitForVideo() {

    return new Promise((resolve, reject) => {

        if (video.videoWidth > 0 && video.videoHeight > 0) {
            resolve();
            return;
        }

        video.onloadedmetadata = () => {
            resolve();
        };

        video.onerror = () => {
            reject(new Error("Camera video could not load."));
        };

    });
}


// START CAMERA
async function startCamera() {

    if (cameraStream) return;

    try {

        if (!navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia) {

            throw new Error(
                "Camera API unavailable. Open MotionAI using HTTPS in a supported browser."
            );

        }

        statusText.textContent = "Requesting Camera Permission...";
        statusText.style.color = "#38bdf8";

        startBtn.disabled = true;

        cameraStream = await navigator.mediaDevices.getUserMedia({

            video: {
                facingMode: {
                    ideal: "environment"
                }
            },

            audio: false

        });

        video.srcObject = cameraStream;
        video.muted = true;
        video.playsInline = true;

        await video.play();

        await waitForVideo();

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        previousFrame = null;
        wasMoving = false;

        statusText.textContent = "Monitoring Active";
        statusText.style.color = "#22c55e";

        detectionTimer = setInterval(detectMotion, 150);

    }

    catch (error) {

        console.error("MotionAI Camera Error:", error);

        stopCamera();

        if (error.name === "NotAllowedError") {

            statusText.textContent =
                "Camera Permission Denied";

        } else if (error.name === "NotFoundError") {

            statusText.textContent =
                "No Camera Found";

        } else if (error.name === "NotReadableError") {

            statusText.textContent =
                "Camera Is Busy";

        } else {

            statusText.textContent =
                "Camera Error: " + error.message;

        }

        statusText.style.color = "#ef4444";

    }

}


// MOTION DETECTION
function detectMotion() {

    if (!video.videoWidth || !video.videoHeight) {
        return;
    }

    sampleCtx.drawImage(
        video,
        0,
        0,
        sampleCanvas.width,
        sampleCanvas.height
    );

    const currentFrame = sampleCtx.getImageData(
        0,
        0,
        sampleCanvas.width,
        sampleCanvas.height
    );

    if (previousFrame === null) {

        previousFrame = currentFrame;
        return;

    }

    let changedPixels = 0;

    let minX = 160;
    let minY = 120;

    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < 120; y++) {

        for (let x = 0; x < 160; x++) {

            const i = (y * 160 + x) * 4;

            const r = Math.abs(
                currentFrame.data[i] -
                previousFrame.data[i]
            );

            const g = Math.abs(
                currentFrame.data[i + 1] -
                previousFrame.data[i + 1]
            );

            const b = Math.abs(
                currentFrame.data[i + 2] -
                previousFrame.data[i + 2]
            );

            const difference = (r + g + b) / 3;

            if (difference > 30) {

                changedPixels++;

                minX = Math.min(minX, x);
                minY = Math.min(minY, y);

                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);

            }

        }

    }

    const motionPercentage =
        (changedPixels / (160 * 120)) * 100;


    // SENSITIVITY THRESHOLD
    const threshold =
        6 - (sensitivity - 1) * 0.5;

    const isMoving =
        motionPercentage > threshold;


    // CLEAR OLD DETECTION BOX
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    if (isMoving) {

        statusText.textContent = "MOTION DETECTED!";
        statusText.style.color = "#ef4444";

        const scaleX = canvas.width / 160;
        const scaleY = canvas.height / 120;

        ctx.strokeStyle = "#ff3333";
        ctx.lineWidth = 5;

        ctx.strokeRect(
            minX * scaleX,
            minY * scaleY,
            (maxX - minX) * scaleX,
            (maxY - minY) * scaleY
        );


        // MOTION EVENT COUNTER
        const now = Date.now();

        if (!wasMoving && now - lastEventTime > 1000) {

            motionEvents++;

            counter.textContent = motionEvents;

            lastEventTime = now;

        }

    } else {

        statusText.textContent = "Monitoring Active";
        statusText.style.color = "#22c55e";

    }


    wasMoving = isMoving;

    previousFrame = currentFrame;

}


// STOP CAMERA
function stopCamera() {

    if (detectionTimer !== null) {

        clearInterval(detectionTimer);

        detectionTimer = null;

    }

    if (cameraStream) {

        cameraStream.getTracks().forEach(track => {
            track.stop();
        });

        cameraStream = null;

    }

    video.pause();
    video.srcObject = null;

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    previousFrame = null;
    wasMoving = false;

    statusText.textContent = "System Ready";
    statusText.style.color = "#22c55e";

    startBtn.disabled = false;

}


// BUTTON EVENTS
startBtn.addEventListener("click", startCamera);

stopBtn.addEventListener("click", stopCamera);


// INITIAL STATE
stopBtn.disabled = false;

console.log("MotionAI initialized successfully.");
