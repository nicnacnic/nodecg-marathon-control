const timerColors = nodecg.Replicant('timerColors');

window.addEventListener('load', () => {

    // Load replicants.
    NodeCG.waitForReplicants(timerColors).then(() => {

        timerColors.on('change', (newVal) => { 
            document.getElementById('stopped').value = newVal.stopped;
            document.getElementById('running').value = newVal.running;
            document.getElementById('finished').value = newVal.finished;
            document.getElementById('paused').value = newVal.paused;
        
        });
    })
});

function changeProperties() {
    timerColors.value.stopped = document.getElementById('stopped').value;
    timerColors.value.running = document.getElementById('running').value;
    timerColors.value.finished = document.getElementById('finished').value;
    timerColors.value.paused = document.getElementById('paused').value;
}