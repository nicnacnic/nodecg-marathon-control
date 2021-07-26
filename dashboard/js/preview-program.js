const settings = nodecg.Replicant('settings');
const firstLaunch = nodecg.Replicant('firstLaunch')

window.addEventListener('load', function () {
    NodeCG.waitForReplicants(settings, firstLaunch).then(() => {

        // Open welcome dialog on first launch.
        if (firstLaunch.value) {
            document.getElementById('test').click()
            firstLaunch.value = false;
        }

        // Update preview/program player URL.
        settings.on('change', (newVal) => {
            document.getElementById('preview').src = newVal.previewURL + '&cleanish';
            document.getElementById('program').src = newVal.programURL + '&cleanish';
        });

        // Update stream status icons.
        settings.on('change', (newVal) => {
            switch (newVal.streaming) {
                case true: document.getElementById('streaming').style.color = 'limegreen'; break;
                case false: document.getElementById('streaming').style.color = 'white'; break;
            }
            switch (newVal.recording) {
                case true: document.getElementById('recording').style.color = 'red'; break;
                case false: document.getElementById('recording').style.color = 'white'; break;
            }
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