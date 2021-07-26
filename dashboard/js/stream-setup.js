const previewProgram = nodecg.Replicant('previewProgram');

window.addEventListener('load', function () {
    NodeCG.waitForReplicants(previewProgram).then(() => {

        // Update preview/program URL.
        previewProgram.on('change', (newVal) => {
            document.getElementById('preview').value = newVal.previewURL;
            document.getElementById('program').value = newVal.programURL;
        });
    });
});

function changePreview(value) {
    previewProgram.value.preview = value;
}

function changeProgram(value) {
    previewProgram.value.program = value;
}