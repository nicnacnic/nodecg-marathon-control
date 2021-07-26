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
            document.getElementById('toggleStream').removeAttribute('disabled');
            document.getElementById('toggleRecording').removeAttribute('disabled');
            document.getElementById('autoRecord').removeAttribute('disabled');
            document.getElementById('preview').value = newVal.previewURL;
            document.getElementById('program').value = newVal.programURL;
        });

        sceneList.on('change', (newVal) => {
            const dropdownContent1 = document.getElementById("intermissionList");
            const dropdownContent2 = document.getElementById("gameList");
            dropdownContent1.innerHTML = '';
            dropdownContent2.innerHTML = '';
            for (let i = 0; i < newVal.length; i++) {
                let paperItem = document.createElement("paper-item");
                paperItem.innerHTML = newVal[i].name;
                if (newVal[i].name === settings.value.intermissionScene)
                    dropdownContent1.setAttribute('selected', i)
                else
                    dropdownContent1.setAttribute('selected', 0)
                if (newVal[i].name === settings.value.gameScene)
                    dropdownContent2.setAttribute('selected', i)
                else
                    dropdownContent2.setAttribute('selected', 0)
                dropdownContent1.appendChild(paperItem);
                dropdownContent2.appendChild(paperItem);
            }
            console.log(dropdownContent1)
            console.log(dropdownContent2)
        });
    });
});

function changePreview(value) {
    settings.value.previewURL = value;
}

function changeProgram(value) {
    settings.value.programURL = value;
}

function toggleStream() {
    nodecg.sendMessage('toggleStream')
    document.getElementById('toggleStream').setAttribute('disabled', true)
}
function toggleRecording() {
    nodecg.sendMessage('toggleRecording')
    document.getElementById('toggleRecording').setAttribute('disabled', true)
}
function toggleAutoRecord() {
    settings.value.autoRecord = !settings.value.autoRecord;
}