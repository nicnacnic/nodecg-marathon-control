const settings = nodecg.Replicant('settings');
const firstLaunch = nodecg.Replicant('firstLaunch')

window.addEventListener('load', function () {
    NodeCG.waitForReplicants(settings, firstLaunch).then(() => {

        // Open welcome dialog on first launch.
        if (firstLaunch.value) {
            setTimeout(() => {
                document.getElementById('test').click()
                firstLaunch.value = false;
            }, 2000)
        }

        // Update stream status icons and preview/program URL.
        settings.on('change', (newVal) => {
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

            if (newVal.previewURL !== '')
                document.getElementById('preview').src = newVal.previewURL + '&cleanish';
            else
                document.getElementById('preview').src = '../graphics/img/blank_preview.png'
            if (newVal.programURL !== '')
                document.getElementById('program').src = newVal.programURL + '&cleanish';
            else
                document.getElementById('program').src = '../graphics/img/blank_preview.png'
        })

        nodecg.listenFor('transitionBegin', (value) => {
            document.getElementById("transition").setAttribute("disabled", "true");
        });

        nodecg.listenFor('transitionEnd', (value) => {
            document.getElementById("transition").removeAttribute("disabled");
        });
    });
});

// Transition button functionality.
function transitionToProgram() {
    nodecg.sendMessage('transitionToProgram');
    document.getElementById("transition").setAttribute("disabled", "true");
}

function emergencyTransition() {
    settings.value.emergencyTransition = true;
}