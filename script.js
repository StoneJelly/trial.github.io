const video = document.getElementById('video');
let dominantEmotion;
let timer;
let age, gender;

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models'),
  faceapi.nets.ageGenderNet.loadFromUri('/models')
]).then(startVideo);

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(err => console.error(err));
}

video.addEventListener('playing', () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  const duration = 5000; // Set the duration in milliseconds (e.g., 5000ms = 5 seconds)
  let elapsedTime = 0;

  timer = setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

    resizedDetections.forEach(result => {
      const { expressions } = result;

      // Find the dominant emotion
      const maxExpression = Object.keys(expressions).reduce((a, b) =>
        expressions[a] > expressions[b] ? a : b
      );

      // Display the dominant emotion
      new faceapi.draw.DrawTextField(
        [
          `${Math.round(result.age)} years`,
          `${result.gender}`,
          `${maxExpression}`
        ],
        result.detection.box.bottomRight
      ).draw(canvas);

      if (elapsedTime >= duration) {
        dominantEmotion = maxExpression;
        age = result.age;
        gender = result.gender;
        clearInterval(timer); // Stop the interval timer
        stopVideoStream();

        // Display the results directly
        // Display the results in separate containers
        const emotionContainer = document.getElementById('emotion-container');
        emotionContainer.textContent = `Dominant Emotion: ${dominantEmotion}`;

        const ageContainer = document.getElementById('age-container');
        ageContainer.textContent = `Age: ${Math.round(age)} years`;

        const genderContainer = document.getElementById('gender-container');
        genderContainer.textContent = `Gender: ${gender}`;
      }
    });

    elapsedTime += 100; // Increase the elapsed time (in this case, every 100ms)
  }, 100);
});

function stopVideoStream() {
  const stream = video.srcObject;
  const tracks = stream.getTracks();
  tracks.forEach(track => track.stop());
  video.srcObject = null;
}
