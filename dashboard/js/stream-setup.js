const sceneList = nodecg.Replicant('sceneList');
const settings = nodecg.Replicant('settings');

window.addEventListener('load', function () {
    NodeCG.waitForReplicants(sceneList, settings).then(() => {

        // Update preview/program URL.
        settings.on('change', (newVal) => {
            switch (newVal.streaming) {
                case true: document.getElementById('toggleStream').innerHTML = 'Stop Streaming'; document.getElementById("toggleStream").setAttribute("active", true); break;
                case false: document.getElementById('toggleStream').innerHTML = 'Start Streaming'; document.getElementById("toggleStream").removeAttribute("active"); break;
            }
            switch (newVal.recording) {
                case true: document.getElementById('toggleRecording').innerHTML = 'Stop Recording'; document.getElementById("toggleRecording").setAttribute("active", true); break;
                case false: document.getElementById('toggleRecording').innerHTML = 'Start Recording'; document.getElementById("toggleRecording").removeAttribute("active"); break;
            }
            switch (newVal.autoRecord) {
                case true: document.getElementById('autoRecord').innerHTML = 'Turn Off Auto Record'; document.getElementById("autoRecord").setAttribute("active", true); break;
                case false: document.getElementById('autoRecord').innerHTML = 'Turn On Auto Record'; document.getElementById("autoRecord").removeAttribute("active"); break;
            }
            switch (newVal.autoSetRunners) {
                case true: document.getElementById('autoRunner').innerHTML = 'Turn Off Auto Runner'; document.getElementById("autoRunner").setAttribute("active", true); break;
                case false: document.getElementById('autoRunner').innerHTML = 'Turn On Auto Runner'; document.getElementById("autoRunner").removeAttribute("active"); break;
            }
            switch (newVal.autoSetLayout) {
                case true: document.getElementById('autoLayout').innerHTML = 'Turn Off Auto Layout'; document.getElementById("autoLayout").setAttribute("active", true); break;
                case false: document.getElementById('autoLayout').innerHTML = 'Turn On Auto Layout'; document.getElementById("autoLayout").removeAttribute("active"); break;
            }
            document.getElementById('toggleStream').removeAttribute('disabled');
            document.getElementById('toggleRecording').removeAttribute('disabled');
            document.getElementById('autoRecord').removeAttribute('disabled');
            document.getElementById('preview').value = newVal.previewURL;
            document.getElementById('program').value = newVal.programURL;
        });

        sceneList.on('change', (newVal) => {
            document.getElementById("intermissionList").innerHTML = '';
            document.getElementById("gameList").innerHTML = '';
            for (let i = 0; i < newVal.length; i++) {
                let paperItem = document.createElement("paper-item");
                paperItem.innerHTML = newVal[i].name;
                switch (newVal[i].name) {
                    case settings.value.intermissionScene: document.getElementById("intermissionList").setAttribute('selected', i); break;
                    default:  document.getElementById("intermissionList").setAttribute('selected', 0); break;
                }
                document.getElementById("intermissionList").appendChild(paperItem);
            }
            for (let i = 0; i < newVal.length; i++) {
                let paperItem = document.createElement("paper-item");
                paperItem.innerHTML = newVal[i].name;
                switch (newVal[i].name) {
                    case settings.value.gameScene: document.getElementById("gameList").setAttribute('selected', i); break;
                    default:  document.getElementById("gameList").setAttribute('selected', 0); break;
                }
                document.getElementById("gameList").appendChild(paperItem);
            }
        });
    });
});

function changePreview(value) {
    settings.value.previewURL = value;
}

function changeProgram(value) {
    settings.value.programURL = value;
}

function changeIntermission(element) {
    settings.value.intermissionScene = element.selectedItem.innerHTML;
}

function changeGame(element) {
    settings.value.gameScene = element.selectedItem.innerHTML;
}

function toggleStream(element) {
    nodecg.sendMessage('toggleStream')
    element.setAttribute('disabled', true)
}

function toggleRecording(element) {
    nodecg.sendMessage('toggleRecording')
    element.setAttribute('disabled', true)
}

function toggleAutoRecord() {
    settings.value.autoRecord = !settings.value.autoRecord;
}

function toggleAutoRunner() {
    settings.value.autoSetRunners = !settings.value.autoSetRunners;
}

function toggleAutoLayout() {
    settings.value.autoSetLayout = !settings.value.autoSetLayout;
}

function reauthenticate() {
    nodecg.sendMessage('reauthenticate')
}