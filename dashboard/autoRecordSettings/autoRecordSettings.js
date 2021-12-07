const autoRecord = nodecg.Replicant('autoRecord');
const sceneList = nodecg.Replicant('sceneList');
const settings = nodecg.Replicant('settings');

window.addEventListener('load', () => {
    NodeCG.waitForReplicants(autoRecord, sceneList, settings).then(() => {

        autoRecord.on('change', (newVal) => {
            switch (newVal.active) {
                case true: document.getElementById('autoRecord').innerHTML = 'Turn Off Auto Record'; document.getElementById("autoRecord").style.backgroundColor = '#990000'; document.getElementById("filenameFormatting").disabled = false; break;
                case false: document.getElementById('autoRecord').innerHTML = 'Turn On Auto Record'; document.getElementById("autoRecord").style.backgroundColor = '#272727'; document.getElementById("filenameFormatting").disabled = true; break;
            }
            document.getElementById('filenameFormatting').value = newVal.filenameFormatting;
        })

        sceneList.on('change', (newVal) => {
            document.getElementById("intermissionScene").innerHTML = '';
            for (let i = 0; i < newVal.length; i++) {
                let option = document.createElement("option");
                option.innerHTML = newVal[i];
                switch (newVal[i]) {
                    case settings.value.intermissionScene: document.getElementById("intermissionScene").setAttribute('selected', i); break;
                    default: document.getElementById("intermissionScene").setAttribute('selected', 0); break;
                }
                document.getElementById("intermissionScene").appendChild(option);
            }
        });

        settings.on('change', (newVal) => document.getElementById('intermissionScene').value = newVal.intermissionScene)
    })
});

function toggleTable() {
    switch (window.getComputedStyle(document.getElementById('variableTable')).getPropertyValue('display')) {
        case 'none': document.getElementById('variableTable').style.display = 'table'; break;
        case 'table': document.getElementById('variableTable').style.display = 'none'; break;
    }
}