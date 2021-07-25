const previewProgram = nodecg.Replicant('previewProgram');

window.addEventListener('load', function () {
    NodeCG.waitForReplicants(previewProgram).then(() => {
        previewProgram.on('change', (newVal) => {
            document.getElementById('preview').value = newVal.preview;
            document.getElementById('program').value = newVal.program;
        });
    });
});

function changePreview(value) {
    previewProgram.value.preview = value;
}

function changeProgram(value) {
    previewProgram.value.program = value;
}