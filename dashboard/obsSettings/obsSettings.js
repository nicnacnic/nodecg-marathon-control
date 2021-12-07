const settings = nodecg.Replicant('settings');

window.addEventListener('load', function () {
    NodeCG.waitForReplicants(settings).then(() => {

        // Update preview/program URL.
        settings.on('change', (newVal) => {
            switch (newVal.streaming) {
                case true: document.getElementById('toggleStream').innerHTML = 'Stop Streaming'; document.getElementById("toggleStream").style.backgroundColor = '#990000'; break;
                case false: document.getElementById('toggleStream').innerHTML = 'Start Streaming'; document.getElementById("toggleStream").style.backgroundColor = '#272727'; break;
            }
            switch (newVal.recording) {
                case true: document.getElementById('toggleRecording').innerHTML = 'Stop Recording'; document.getElementById("toggleRecording").style.backgroundColor = '#990000'; break;
                case false: document.getElementById('toggleRecording').innerHTML = 'Start Recording'; document.getElementById("toggleRecording").style.backgroundColor = '#272727'; break;
            }
            switch (newVal.autoSetRunners) {
                case true: document.getElementById('autoRunner').innerHTML = 'Turn Off Auto Runner'; document.getElementById("autoRunner").style.backgroundColor = '#990000'; break;
                case false: document.getElementById('autoRunner').innerHTML = 'Turn On Auto Runner'; document.getElementById("autoRunner").style.backgroundColor = '#272727'; break;
            }
            switch (newVal.autoSetLayout) {
                case true: document.getElementById('autoLayout').innerHTML = 'Turn Off Auto Layout'; document.getElementById("autoLayout").style.backgroundColor = '#990000'; break;
                case false: document.getElementById('autoLayout').innerHTML = 'Turn On Auto Layout'; document.getElementById("autoLayout").style.backgroundColor = '#272727'; break;
            }
            document.getElementById('toggleStream').removeAttribute('disabled');
            document.getElementById('toggleRecording').removeAttribute('disabled');

        });
    });
});

function toggleStream(element) {
    nodecg.sendMessage('toggleStream')
    element.setAttribute('disabled', true)
    element.style.backgroundColor = '#485264'
}

function toggleRecording(element) {
    nodecg.sendMessage('toggleRecording')
    element.setAttribute('disabled', true)
    element.style.backgroundColor = '#485264'
}

function setPreviewWindow() {
    let roomCode = (Math.random()).toString(36).substring(2);
    settings.value.previewCode = roomCode;
    window.open(`https://vdo.ninja/?push=${roomCode}&screenshare&audiodevice=0`)
}

function setProgramWindow() {
    let roomCode = (Math.random()).toString(36).substring(2);
    settings.value.programCode = roomCode;
    window.open(`https://vdo.ninja/?push=${roomCode}&screenshare&audiodevice=0`)
}