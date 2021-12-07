const streamSync = nodecg.Replicant('streamSync');

window.addEventListener('load', () => {

    NodeCG.waitForReplicants(streamSync).then(() => {

        streamSync.on('change', (newVal) => {
            switch (newVal.active) {
                case true: document.getElementById('streamSync').innerHTML = 'Turn Off Auto Stream Sync'; document.getElementById("streamSync").style.backgroundColor = '#990000'; document.getElementById("maxOffset").disabled = false; break;
                case false: document.getElementById('streamSync').innerHTML = 'Turn On Auto Stream Sync'; document.getElementById("streamSync").style.backgroundColor = '#272727'; document.getElementById("maxOffset").disabled = true; break;
            }
            document.getElementById('maxOffset').value = newVal.maxOffset;
        })
    })
})