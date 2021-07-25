const previewProgram = nodecg.Replicant('previewProgram');
const streamStatus = nodecg.Replicant('streamStatus');

window.addEventListener('load', function () {
    NodeCG.waitForReplicants(previewProgram, streamStatus).then(() => {
        previewProgram.on('change', (newVal) => {
            document.getElementById('preview').src = newVal.preview + '&cleanish';
            document.getElementById('program').src = newVal.program + '&cleanish';
        });

        streamStatus.on('change', (newVal) => {
            console.log(newVal.streaming)
            console.log(newVal.recording)
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