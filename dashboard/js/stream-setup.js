const settings = nodecg.Replicant('settings');

window.addEventListener('load', function () {
    NodeCG.waitForReplicants(settings).then(() => {

        // Update preview/program URL.
        settings.on('change', (newVal) => {
            document.getElementById('preview').value = newVal.previewURL;
            document.getElementById('program').value = newVal.programURL;
        });
    });
});

function changePreview(value) {
    settings.value.previewURL = value;
}

function changeProgram(value) {
    settings.value.programURL = value;
}