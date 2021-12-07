const streamSync = nodecg.Replicant('streamSync')

window.addEventListener('load', function () {

    // Load replicants.
    NodeCG.waitForReplicants(streamSync).then(() => {

        // Sync streams button.
        streamSync.on('change', (newVal) => {
            switch (newVal.syncing) {
                case true: document.getElementById('syncStreams').disabled = true; document.getElementById('syncStreams').innerHTML = 'Syncing...'; break;
                case false: document.getElementById('syncStreams').disabled = false; document.getElementById('syncStreams').innerHTML = 'Sync Streams'; break;
            }
            document.getElementById('0').value = newVal.delay[0];
            document.getElementById('1').value = newVal.delay[1];
            document.getElementById('2').value = newVal.delay[2];
            document.getElementById('3').value = newVal.delay[3];
        })
    });
})