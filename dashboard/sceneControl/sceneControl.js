const runDataActiveRun = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol')
const activeRunners = nodecg.Replicant('activeRunners');
const sceneList = nodecg.Replicant('sceneList');
const currentScene = nodecg.Replicant('currentScene');
const settings = nodecg.Replicant('settings');
const adPlayer = nodecg.Replicant('adPlayer')

window.onload = () => {

    // Load replicants.
    NodeCG.waitForReplicants(runDataActiveRun, activeRunners, sceneList, currentScene, settings, adPlayer).then(() => {

        // Populates dropdown with uploaded layouts.
        sceneList.on('change', (newVal) => {
            let select = document.getElementById("sceneList");
            select.innerHTML = '';
            for (let i = 0; i < newVal.length; i++) {
                let option = document.createElement("option");
                option.innerHTML = newVal[i];
                if (newVal[i] === currentScene.value.preview)
                    option.setAttribute('selected', "")
                select.appendChild(option);
            }
        });

        // Update active runners and quality.
        activeRunners.on('change', (newVal) => {
            for (let i = 0; i < 4; i++) {
                document.getElementById(`p${i + 1}Input`).value = newVal[i].streamKey;
                switch (newVal[i].cam) {
                    case true: document.getElementById(`p${i + 1}Cam`).childNodes[0].innerHTML = 'videocam'; document.getElementById(`p${i + 1}Cam`).style.color = 'white'; break;
                    case false: document.getElementById(`p${i + 1}Cam`).childNodes[0].innerHTML = 'videocam_off'; document.getElementById(`p${i + 1}Cam`).style.color = 'red'; break;
                }
            }
        });

        adPlayer.on('change', (newVal) => {
            switch (newVal.adPlaying) {
                case true: document.getElementById('adPlayer').setAttribute("disabled", "true"); document.getElementById('adPlayer').innerHTML = `Ads Playing (${newVal.secondsLeft}s Remaining)`; break;
                case false: document.getElementById('adPlayer').removeAttribute("disabled"); document.getElementById('adPlayer').innerHTML = 'Play Ads'; break;
            }
        })

        currentScene.on('change', (newVal) => document.getElementById("sceneList").value = newVal.preview)
    });
}

function getStream(num, player) {
    nodecg.sendMessage('getStreamURL', player).then(result => {
        activeRunners.value[num].streamKey = player;
        activeRunners.value[num].url = result;
    }).catch(error => console.error(error));
}