const settings = nodecg.Replicant('settings');
const streamStatus = nodecg.Replicant('streamStatus');

window.addEventListener('load', function () {
    NodeCG.waitForReplicants(previewProgram, streamStatus).then(() => {

        // Update preview/program player URL.
        settings.on('change', (newVal) => {
            document.getElementById('preview').src = newVal.previewURL + '&cleanish';
            document.getElementById('program').src = newVal.programURL + '&cleanish';
        });

        // Update stream status icons.
        streamStatus.on('change', (newVal) => {
            switch (newVal.streaming) {
                case true: document.getElementById('streaming').style.color = 'limegreen'; break;
                case false: document.getElementById('streaming').style.color = 'white'; break;
            }
            switch (newVal.recording) {
                case true: document.getElementById('recording').style.color = 'red'; break;
                case false: document.getElementById('recording').style.color = 'white'; break;
            }
        })
    });
});