let model;
let audioInput = document.getElementById("audio-input");
let predictButton = document.getElementById("predict-button");
let predictionOutput = document.getElementById("prediction");


async function loadModel() {
    console.log("checkpoint 1");
    model = await tf.lite.loadModel("model1.tflite");
    console.log("checkpoint 2");
    predictButton.disabled = false;
}

async function predict() {
    console.log("checkpoint 3");
    let audio = audioInput.files[0];
    let spectrogram = await preprocessAudio(audio);
    let predictions = await model.predict(spectrogram).data();
    let prediction = await getPredictionLabel(predictions);
    predictionOutput.innerText = `Prediction: ${prediction}`;
    console.log("checkpoint 4");
}

async function preprocessAudio(audio) {
    let audioBuffer = await audio.arrayBuffer();
    let audioCtx = new AudioContext();
    let audioSource = audioCtx.createBufferSource();
    let audioData = await audioCtx.decodeAudioData(audioBuffer);
    audioSource.buffer = audioData;
    audioSource.connect(audioCtx.destination);
    let audioArray = await audioData.getChannelData(0);
    let audioTensor = tf.tensor(audioArray);
    let spectrogram = await tf.tidy(() => {
        let stft = tf.signal.stft(audioTensor, 2048, 512);
        let magnitude = stft.abs();
        let power = tf.square(magnitude);
        let db = tf.mul(tf.scalar(10), tf.log(tf.add(power, tf.scalar(1e-6))));
        let normalized = tf.div(tf.sub(db, tf.min(db)), tf.sub(tf.max(db), tf.min(db)));
        let resized = tf.image.resizeBilinear(normalized, [128, 128]).expandDims(0);
        return resized;
    });
    return spectrogram;
}

async function getPredictionLabel(predictions) {
    let classId = predictions.indexOf(Math.max(...predictions));
    let response = await fetch("class_names.txt");
    let classNames = await response.text();
    classNames = classNames.split("\n");
    return classNames[classId];
}

audioInput.addEventListener("change", () => {
    if (audioInput.files.length > 0) {
        predictButton.disabled = false;
    }
});


console.log("Loading model...");
loadModel();
console.log("Model loaded.");
predictButton.addEventListener("click", predict);
console.log("Predict button loaded.");
