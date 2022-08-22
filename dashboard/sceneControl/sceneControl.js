const obsStatus = nodecg.Replicant('obsStatus');
const activeRunners = nodecg.Replicant('activeRunners');
const sceneList = nodecg.Replicant('sceneList');
const adPlayer = nodecg.Replicant('adPlayer');
const checklist = nodecg.Replicant('checklist');

window.onload = () => {

    // Load replicants.
    NodeCG.waitForReplicants(obsStatus, activeRunners, sceneList, adPlayer).then(() => {

        // Populates dropdown with uploaded layouts.
        sceneList.on('change', (newVal) => {
            let select = document.querySelector('select');
            select.innerHTML = '';
            for (let scene of newVal) {
                select.innerHTML += `<option ${(obsStatus.value.previewScene === scene) ? 'selected' : ''}>${scene}</option>`
            }
            // for (let i = 0; i < newVal.length; i++) {
            //     let option = document.createElement("option");
            //     option.innerHTML = newVal[i];
            //     if (newVal[i] === obsStatus.value.previewScene)
            //         option.setAttribute('selected', "")
            //     select.appendChild(option);
            // }
        });

        // Update active runners and quality.
        activeRunners.on('change', (newVal) => {
            for (let i = 0; i < 4; i++) {
                document.querySelector(`.runnerInput[player="${i}"]`).value = newVal[i].streamKey;
                switch (newVal[i].cam) {
                    case true: document.getElementById(`p${i + 1}Cam`).childNodes[0].innerHTML = 'videocam'; document.getElementById(`p${i + 1}Cam`).style.color = 'white'; break;
                    case false: document.getElementById(`p${i + 1}Cam`).childNodes[0].innerHTML = 'videocam_off'; document.getElementById(`p${i + 1}Cam`).style.color = 'red'; break;
                }
            }
        });

        adPlayer.on('change', (newVal) => {
            if (!newVal.videoAds && !newVal.twitchAds) document.getElementById('adPlayer').style.display = 'none';
            else document.getElementById('adPlayer').style.display = 'inherit'
            switch (newVal.adPlaying) {
                case true: document.getElementById('adPlayer').setAttribute("disabled", "true"); document.getElementById('adPlayer').innerHTML = `Ads Playing (${newVal.secondsLeft}s Remaining)`; break;
                case false: document.getElementById('adPlayer').removeAttribute("disabled"); document.getElementById('adPlayer').innerHTML = 'Play Ads'; break;
            }
        })

        obsStatus.on('change', (newVal, oldVal) => { if (!oldVal || newVal.previewScene !== oldVal.previewScene) document.getElementById("sceneList").value = newVal.previewScene; });
    })
}

function setStreamKey(element) {
    if (element.value === '') activeRunners.value[element.getAttribute('player')].streamKey = null;
    else activeRunners.value[element.getAttribute('player')].streamKey = element.value;
}