// Copyright 2023 The MediaPipe Authors.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//      http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

const demosSection = document.getElementById("demos");

let handLandmarker = undefined;
let runningMode = "IMAGE";
let enableWebcamButton;
let webcamRunning = false;

// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createHandLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `./models/hand_landmarker.task`,
      delegate: "GPU"
    },
    runningMode: runningMode,
    numHands: 2
  });
  demosSection.classList.remove("invisible");
  console.log("scuces fetch")
};
createHandLandmarker();

/********************************************************************
// Demo 1: Grab a bunch of images from the page and detection them
// upon click.
********************************************************************/

// In this demo, we have put all our clickable images in divs with the
// CSS class 'detectionOnClick'. Lets get all the elements that have
// this class.
const imageContainers = document.getElementsByClassName("detectOnClick");

// Now let's go through all of these and add a click event listener.
for (let i = 0; i < imageContainers.length; i++) {
  // Add event listener to the child element whichis the img element.
  imageContainers[i].children[0].addEventListener("click", handleClick);
}

function checkCollision(fingertip, element) {
  const rect = element.getBoundingClientRect();
  const videoRect = video.getBoundingClientRect();

  // Transform the normalized fingertip coordinates to video size coordinates (in pixels)
  const x = fingertip.x * video.videoWidth;
  const y = fingertip.y * video.videoHeight;

  console.log(rect, " col X: "+x, " col Y: " + y);

  if (
    x >= rect.left - videoRect.left &&
    x <= rect.right - videoRect.left &&
    y >= rect.top - videoRect.top &&
    y <= rect.bottom - videoRect.top
  ) {
    console.log("Collision!")
    return true; 
  }
  return false;
}


/********************************************************************
// Continuously grab image from webcam stream and detect it.
********************************************************************/

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
let myDiv = document.getElementById("myDiv")

// Check if webcam access is supported.
const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

function generateRandomShape() {
  let randomShape = Math.floor(Math.random() * 3); // 3 shapes - square, circle, triangle
  let newDiv = document.createElement("div"); // Create a new div element

  // Assign the new div the id of "myDiv"
  newDiv.id = "myDiv";

  // Assign properties based on the random shape
  switch(randomShape) {
    case 0: // square
      newDiv.style.width = "100px";
      newDiv.style.height = "100px";
      break;
    case 1: // circle
      newDiv.style.width = "100px";
      newDiv.style.height = "100px";
      newDiv.style.borderRadius = "50%";
      break;
    case 2: // triangle
    newDiv.style.width = "100px";
    newDiv.style.height = "100px";
    newDiv.style.borderRadius = "10%";
    break;
  }

  // Remove the old div from the DOM
  myDiv.remove();

  // Assign the newly created div to myDiv
  myDiv = newDiv;
  myDiv.style.width = "10%"
  myDiv.style.height = "10%"
  myDiv.style.top = Math.floor(Math.random() * 100) + 1 + '%'
  myDiv.style.left = Math.floor(Math.random() * 100) + 1 + '%'
  
  // Append the new div to the DOM
  const videoContainer = document.getElementById("videoContainer")
  videoContainer.appendChild(myDiv);
}
document.getElementById("generateShapeBtn").addEventListener("click", generateRandomShape);

  // Start the movement
// Enable the live webcam view and start detection.
function enableCam(event) {

  if (!handLandmarker) {
    console.log("Wait! objectDetector not loaded yet.");
    return;
  }

  if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.innerText = "ENABLE PREDICTIONS";
  } else {
    webcamRunning = true;
    enableWebcamButton.innerText = "DISABLE PREDICTIONS";
  }

  // getUsermedia parameters.
  const constraints = {
    video: true
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  });
}

let lastVideoTime = -1;
let results = undefined;


console.log(video);
async function predictWebcam() {
  canvasElement.style.width = video.videoWidth;
  canvasElement.style.height = video.videoHeight;
  canvasElement.width = video.videoWidth;
  canvasElement.height = video.videoHeight;
  
  
  // Now let's start detecting the stream.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await handLandmarker.setOptions({ runningMode: "VIDEO" });
  }
  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    results = handLandmarker.detectForVideo(video, startTimeMs);
    
  }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  if (results.landmarks) {
    
    for (const landmarks of results.landmarks) {
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 5
      });
      let pointerFingertip = landmarks[8]
      console.log(`real x: ${pointerFingertip.x.toFixed(3)}, real y: ${pointerFingertip.y.toFixed(3)}`)
      drawLandmarks(canvasCtx, landmarks, { color: "#FFFF00", lineWidth: 1 });

      if (checkCollision(pointerFingertip, myDiv)) {
        myDiv.style.backgroundColor = 'blue';
      } else {
        myDiv.style.backgroundColor = 'red';
      }
    }
  }
  canvasCtx.restore();

  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

