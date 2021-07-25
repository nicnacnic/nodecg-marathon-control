const activeRunners = nodecg.Replicant('activeRunners');
const sceneList = nodecg.Replicant('sceneList');
const layoutList = nodecg.Replicant('assets:game-layouts');
const currentScene = nodecg.Replicant('currentScene');
const currentLayout = nodecg.Replicant('currentLayout');

window.addEventListener('load', function () {

    // Load replicants.
    NodeCG.waitForReplicants(activeRunners, sceneList, layoutList, currentScene, currentLayout).then(() => {

        // Populates dropdown with current scenes.
        sceneList.on('change', (newVal, oldVal) => {
            const dropdownContent = document.getElementById("sceneList");
            dropdownContent.innerHTML = '';
            for (let i = 0; i < newVal.length; i++) {
                let paperItem = document.createElement("paper-item");
                paperItem.innerHTML = newVal[i].name;
                if (newVal[i].name === currentScene.value.preview)
                    dropdownContent.setAttribute('selected', i)
                dropdownContent.appendChild(paperItem);
            }
        });

        // Populates dropdown with uploaded layouts.
        layoutList.on('change', (newVal, oldVal) => {
            const dropdownContent = document.getElementById("layoutList");
            dropdownContent.innerHTML = '';
            for (let i = 0; i < newVal.length; i++) {
                let paperItem = document.createElement("paper-item");
                paperItem.innerHTML = newVal[i].name;
                if (newVal[i].name === currentLayout.value)
                    dropdownContent.setAttribute('selected', i)
                if (currentLayout.value === undefined)
                    dropdownContent.setAttribute('selected', 0)
                dropdownContent.appendChild(paperItem);
            }
        });

        // Update selected scene if changed in OBS.
        currentScene.on('change', (newVal, oldVal) => {
            const dropdownContent = document.getElementById('sceneList');
            const items = dropdownContent.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].outerText === newVal.preview) {
                    dropdownContent.selectIndex(i);
                    break;
                }
            }
        });

        // Update selected layout.
        currentLayout.on('change', (newVal, oldVal) => {
            const dropdownContent = document.getElementById('layoutList');
            const items = dropdownContent.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].outerText === newVal) {
                    dropdownContent.selectIndex(i);
                    break;
                }
            }
        });

        // Update active runners and quality.
        activeRunners.on('change', (newVal, oldVal) => {
            for (let i = 0; i < 4; i++) {
                if (newVal[i].name === null || newVal[i].name === undefined)
                    newVal[i].name = '';
                document.getElementById('player' + (i + 1)).setAttribute('value', newVal[i].name);
                const dropdownContent = document.getElementById('player' + (i + 1) + 'QualityList');
                let items = dropdownContent.items;
                for (let j = 0; j < items.length; j++) {
                    if (items[j].outerText === newVal[i].quality) {
                        dropdownContent.selectIndex(j);
                        break;
                    }
                    else if (j + 1 === items.length)
                        dropdownContent.selectIndex(0);
                }
                if (newVal[i].mute) {
                    document.getElementById('player' + (i + 1) + 'MuteButton').innerHTML = 'volume_off'
                    document.getElementById('player' + (i + 1) + 'MuteButton').style.color = 'red'
                }
                else {
                    document.getElementById('player' + (i + 1) + 'MuteButton').innerHTML = 'volume_up'
                    document.getElementById('player' + (i + 1) + 'MuteButton').style.color = 'white'
                }
                if (newVal[i].cam) {
                    document.getElementById('player' + (i + 1) + 'CamButton').innerHTML = 'videocam'
                    document.getElementById('player' + (i + 1) + 'CamButton').style.color = 'white'
                }
                else {
                    document.getElementById('player' + (i + 1) + 'CamButton').innerHTML = 'videocam_off'
                    document.getElementById('player' + (i + 1) + 'CamButton').style.color = 'red'
                }
            }
        });
    })
})

function changeScene(element) {
    currentScene.value.preview = element.selectedItem.innerHTML;
}

function changeLayout(element) {
    currentLayout.value = element.selectedItem.innerHTML;
}

function refreshPlayer(id) {
    let player = activeRunners.value[id - 1].name;
    activeRunners.value[id - 1].name = "";
    setTimeout(function () {
        activeRunners.value[id - 1].name = player;
    }, 100)
}

function mutePlayer(id) {
    let muteState = false;
    if (document.getElementById('player' + id + 'MuteButton').innerHTML === 'volume_up')
        muteState = true;
    activeRunners.value[id - 1].mute = muteState;
}

function camPlayer(id) {
    let camState = false;
    if (document.getElementById('player' + id + 'CamButton').innerHTML === 'videocam_off')
        camState = true;
    activeRunners.value[id - 1].cam = camState;
}

function updateSource() {
    runnersArray = [];
    for (i = 0; i < 4; i++) {
        let muteState = false;
        let camState = false;
        if (document.getElementById('player' + (i + 1) + 'MuteButton').innerHTML === 'volume_off')
            muteState = true;
        if (document.getElementById('player' + (i + 1) + 'CamButton').innerHTML === 'videocam')
            camState = true;
        runnersArray.push({ name: document.getElementById('player' + (i + 1)).value, quality: document.getElementById('player' + (i + 1) + 'QualityList').selectedItem.innerHTML, mute: muteState, cam: camState })
    }
    activeRunners.value = runnersArray;
}