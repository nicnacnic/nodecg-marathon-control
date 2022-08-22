const activeRunners = nodecg.Replicant('activeRunners');
const image = nodecg.Replicant('assets:camCover');
let playerID;

function getImage(playerID) {
    NodeCG.waitForReplicants(activeRunners, image).then(() => {
        activeRunners.on('change', (newVal) => {
            switch (newVal[playerID].cam) {
                case true: document.querySelector('img').src = ''; break;
                case false: document.querySelector('img').src = image.value[0].url; break;
            }
        })
    })
}