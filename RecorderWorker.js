var buffersPerPOSTRequest = 100;
var recording = null; // this is the cumulative buffer for the recording
var chunkIndex = 1;
var bufferLength,
    arrayElementSize,
    maxDataSize,
    trackId;

// Init settings
function init(data) {
    bufferLength = data.bufferLength;
    arrayElementSize = data.arrayElementSize;
    maxDataSize = bufferLength * arrayElementSize * buffersPerPOSTRequest;

    trackId = data.trackId;
    console.log(data);
    console.log(maxDataSize);
};

// User pressed "record" or "resume"
function record(inputBuffer) {
    console.log("An audioBuffer has arrived");

    addSampleToRecording(inputBuffer);
    // If there is enough space, we add the sample
    if (!isStillSpace()) {
        var data = {
            mediaContent: parseArrayBuffer(recording),
            chunkId: chunkIndex,
            trackId: trackId
        };
        chunkIndex++;
        recording = null;

        uploadRecordingChunk(data);
    }
};

// User pressed "stop"
function stop() {
    var mediaContent;
    if (recording !== null) {
        mediaContent = parseArrayBuffer(recording);
    }
    var data = {
        mediaContent: mediaContent,
        chunkId: chunkIndex,
        trackId: trackId
    };
    finishRecording(data);
};

// Add another sample to the recording
function addSampleToRecording(inputBuffer) {
    if (recording == null) {
        // handle the first buffer
        recording = inputBuffer;
    } else {
        // allocate a new Float32Array with the updated length
        var newLength = recording.length + inputBuffer.length;
        var newBuffer = new Float32Array(newLength);
        newBuffer.set(recording, 0);
        newBuffer.set(inputBuffer, recording.length);
        recording = newBuffer;

        delete newBuffer;
    }
}

// Reduce size
function parseArrayBuffer(buffer) {
    var length = buffer.length;
    var int16arr = new Int16Array(length);
    while (length--) {
        int16arr[length] = Math.min(1, buffer[length]) * 0x7FFF;
    }
    var arr = Array.prototype.slice.call(int16arr);
    return arr;
}

function isStillSpace() {
    var currentRecordingSize = recording.length * arrayElementSize;
    var audioBufferSize = bufferLength * arrayElementSize;

    // Checks if there is still available space for another AudioBuffer
    if ((currentRecordingSize + audioBufferSize) <= maxDataSize)
        return true;
    return false;
};

function uploadRecordingChunk(data) {
    var formData = new FormData();
    formData.append('trackId', data.trackId);
    formData.append('chunkId', data.chunkId);
    formData.append('mediaContent', JSON.stringify(data.mediaContent));

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://localhost/AudioRecorder/Chunk/Upload', true);
    xhr.send(formData);
    console.log("A chunk was uploaded: " + data.chunkId);
};

function finishRecording(data) {
    if (data.mediaContent !== null) {
        uploadRecordingChunk(data);
    }

    var formData = new FormData();
    formData.append('trackId', trackId);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://localhost/AudioRecorder/Chunk/FinishRecording', true);
    xhr.send(formData);
    console.log("A track was uploaded: " + data.trackId);
}

onmessage = function (event) {
    var data = event.data;
    switch (data.command) {
        case "init": init(data.config); break;
        case "record": record(data.buffer); break;
        case "stop": stop(); break;
    }
};