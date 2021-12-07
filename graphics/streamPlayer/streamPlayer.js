const activeRunners = nodecg.Replicant('activeRunners');
const streamSync = nodecg.Replicant('streamSync')
let playerID, video, hls;
let latencyArray = [];
setInterval(() => latencyArray.push(Math.round(hls.latency * 1000)), 100);

function createPlayer(num) {
    NodeCG.waitForReplicants(activeRunners, streamSync).then(() => {
        playerID = num;
        video = document.querySelector('video');
        hls = new Hls();
        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => attatchStream());
    })
}

function attatchStream() {
    activeRunners.on('change', (newVal) => {
        if (newVal[playerID].streamKey !== '') {
            hls.loadSource(`${nodecg.bundleConfig.baseRtmlUrl}${newVal[playerID].streamKey}.m3u8`);
            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => video.play());
        }
        else streamSync.value.delay[playerID] = null;
    })
}

nodecg.listenFor('getStreamLatency', () => {
    latencyArray = latencyArray.filter(a => a !== 0);
    switch (latencyArray.length) {
        case 0: streamSync.value.delay[playerID] = null; break;
        default: streamSync.value.delay[playerID] = Math.round(latencyArray.reduce((a, b) => a + b) / latencyArray.length); break;
    }
    latencyArray = [];
})

nodecg.listenFor(`syncStreams`, (sync) => {
    if (sync[playerID] !== null && sync[playerID > 0]) {
        video.pause();
        setTimeout(() => video.play(), sync[playerID]);
    }
})