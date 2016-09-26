// Global Variables for Audio
var audioContext;

var sourceNode;
var analyserNode;
var javascriptNode;
var playbackSourceNode;
var audioStream;

var recording = null;  // this is the cumulative buffer for your recording

var audioBufferNode = null;
var audioBuffer = null;
var audioSampleSize = 2048;

// Worker thread
var worker;

// Setup the WebAPI
window.browserAudioContext = (function () {
    return window.AudioContext;
})();

navigator.getMedia = (navigator.mozGetUserMedia ||
                       navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.msGetUserMedia);

$(document).ready(function () {
    var $startRecBtn = $("#startRecording"),
        $stopRecBtn = $("#stopRecording"),
        $pauseRecBtn = $("#pauseRecording"),
        $resumeRecBtn = $("#resumeRecording"),
        $playRecBtn = $("#playRecording");

    // Load buttons in the corresponding state
    initializeButtons();

    // Check that the browser can handle web audio
    try {
        audioContext = new browserAudioContext();
    }
    catch (e) {
        alert('Web Audio API is not supported in this browser');
    }

    // Get the input audio stream and set up the nodes
    try {
        navigator.getMedia({ audio: true }, setupAudioNodes, onError);
    } catch (e) {
        alert('webkitGetUserMedia threw exception :' + e);
    }

    // Event handlers
    $startRecBtn.on("click", function (event) {
        var trackId = 1; //hardcoded - to be deleted

        event.preventDefault();
        console.log("Start recording was pressed");
        changeButtonsOnStart();

        initWorker(trackId);
        startRecording();
    });

    $stopRecBtn.on("click", function (event) {
        event.preventDefault();
        console.log("Stop recording was pressed");
        changeButtonsOnStop();
        stopRecording();
    });

    $pauseRecBtn.on("click", function (event) {
        changeButtonsOnPause();
        pauseRecording();
    });

    $resumeRecBtn.on("click", function (event) {
        changeButtonsOnResume();
        console.log("Resume recording was pressed");
        resumeRecording();
    });

    $playRecBtn.on("click", function (event) {
        event.preventDefault();
        console.log("not implemented");
    });

    function initWorker(trackId) {
        if (worker != null) {
            worker.terminate();
        }
        worker = new Worker("https://github.com/NicuStejar/audiorec/blob/master/RecorderWorker.js");
        worker.addEventListener("message",
            function (event) {
                alert(event.data);
            },
            false);
        worker.postMessage({
            command: "init",
            config: {
                bufferLength: audioSampleSize,
                arrayElementSize: Float32Array.BYTES_PER_ELEMENT,
                trackId: trackId
            }
        });
    }
        
    function playRecording() {
        if (recording != null) {
            // create the Buffer from the recording
            audioBuffer = audioContext.createBuffer(1, recording.length, audioContext.sampleRate);
            audioBuffer.getChannelData(0).set(recording, 0);

            // create the Buffer Node with this Buffer
            audioBufferNode = audioContext.createBufferSource();
            audioBufferNode.buffer = audioBuffer;
            console.log('recording buffer length ' + audioBufferNode.buffer.length.toString());

            // connect the node to the destination and play the audio
            audioBufferNode.connect(audioContext.destination);
            audioBufferNode.start();
        }
    };

    function startRecording() {
        javascriptNode.onaudioprocess = function (e) {
            worker.postMessage({
                command: "record",
                buffer: e.inputBuffer.getChannelData(0)
            });
        };
    };

    function pauseRecording() {
        javascriptNode.onaudioprocess = null;
    };

    function resumeRecording() {
        javascriptNode.onaudioprocess = function (e) {
            worker.postMessage({
                command: "record",
                buffer: e.inputBuffer.getChannelData(0)
            });
        };
    };

    function stopRecording() {
        worker.postMessage({
            command: "stop"
        });
        javascriptNode.onaudioprocess = null;
    };

    function setupAudioNodes(stream) {
        var sampleSize = audioSampleSize;  // number of samples to collect before analyzing FFT
        audioStream = stream;

        // The nodes are:  sourceNode -> javascriptNode -> destination

        // create an audio buffer source node
        sourceNode = audioContext.createMediaStreamSource(audioStream);

        // Set up the javascript node - this uses only one channel - i.e. a mono microphone
        javascriptNode = audioContext.createScriptProcessor(sampleSize, 1, 1);

        // connect the nodes together
        sourceNode.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);

        // optional - connect input to audio output (speaker)
        // This will echo your input back to your speakers - Beware of Feedback !!
        // sourceNode.connect(audioContext.destination);
    }

    function onError(e) {
        console.log(e);
    }

    function initializeButtons() {
        $stopRecBtn.attr("disabled", true);
        $pauseRecBtn.attr("disabled", true);
        $resumeRecBtn.attr("disabled", true);
    };
    function changeButtonsOnStart() {
        $startRecBtn.attr("disabled", true);
        $stopRecBtn.attr("disabled", false);
        $pauseRecBtn.attr("disabled", false);
    };
    function changeButtonsOnStop() {
        $stopRecBtn.attr("disabled", true);
        $pauseRecBtn.attr("disabled", true);
        $resumeRecBtn.attr("disabled", true);
        $startRecBtn.attr("disabled", false);
    };
    function changeButtonsOnPause() {
        $pauseRecBtn.attr("disabled", true);
        $resumeRecBtn.attr("disabled", false);
    };
    function changeButtonsOnResume() {
        $resumeRecBtn.attr("disabled", true);
        $pauseRecBtn.attr("disabled", false);
    };
});