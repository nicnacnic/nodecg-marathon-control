const settings = nodecg.Replicant('settings')
const firstLaunch = nodecg.Replicant('firstLaunch')
const currentLayout = nodecg.Replicant('currentLayout')
const previewProgram = nodecg.Replicant('previewProgram')
const checklist = nodecg.Replicant('checklist')
const twitchCommercialTimer = nodecg.Replicant('twitchCommercialTimer', 'nodecg-speedcontrol')

window.onload = () => {
    NodeCG.waitForReplicants(settings, firstLaunch, currentLayout, previewProgram, checklist, twitchCommercialTimer).then(() => {

        // Open welcome dialog on first launch.
        if (settings.value.firstLaunch) {
            setTimeout(() => {
                nodecg.getDialog('welcome').open()
                settings.value.firstLaunch = false;
            }, 2000)
        }

        // Update buttons, icons, and VBO.Ninja room codes.
        settings.on('change', (newVal) => {
            switch (newVal.previewCode) {
                case '': document.getElementById('preview').src = ``; break;
                default: document.getElementById('preview').src = `https://vdo.ninja/?view=${newVal.previewCode}&autostart&cleanish&transparent`; break;
            }
            switch (newVal.programCode) {
                case '': document.getElementById('program').src = ``; break;
                default: document.getElementById('program').src = `https://vdo.ninja/?view=${newVal.programCode}&autostart&cleanish&transparent`; break;
            }
            switch (newVal.streaming) {
                case true: document.getElementById('streaming').style.color = 'limegreen'; break;
                case false: document.getElementById('streaming').style.color = 'white'; break;
            }
            switch (newVal.recording) {
                case true: document.getElementById('recording').style.color = 'red'; break;
                case false: document.getElementById('recording').style.color = 'white'; break;
            }
            switch (newVal.emergencyTransition) {
                case true: document.getElementById("emergency").setAttribute("disabled", "true"); break;
                case false: document.getElementById("emergency").removeAttribute("disabled"); break;
            }
            if (!newVal.forceChecklist || checklist.value.completed || !checklist.value.started) {
                switch (newVal.inTransition) {
                    case true: document.getElementById("transition").setAttribute("disabled", "true"); break;
                    case false: document.getElementById("transition").removeAttribute("disabled"); break;
                }
            }
        })

        checklist.on('change', (newVal) => {
            if (settings.value.forceChecklist) {
                if (settings.value.inIntermission && newVal.started && !newVal.completed) {
                    document.getElementById("transition").setAttribute("disabled", "true")
                    document.getElementById("transition").setAttribute('title', "Please complete the checklist to unlock this button.");
                }
                else if (settings.value.inIntermission && newVal.completed) {
                    document.getElementById("transition").removeAttribute("disabled")
                    document.getElementById("transition").removeAttribute('title');
                }
            }
        })
    });
}