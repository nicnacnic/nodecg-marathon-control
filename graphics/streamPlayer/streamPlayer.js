const activeRunners = nodecg.Replicant('activeRunners');
const streamSync = nodecg.Replicant('streamSync')
let playerID, video, hls, callback;

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
            hls.loadSource(`${nodecg.bundleConfig.baseRtmpUrl}${newVal[playerID].streamKey}.m3u8`);
            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => video.play());
        }
        else streamSync.value.delay[playerID] = null;
    })
}

nodecg.listenFor('getDelay', (time) => {
    let canvas = document.querySelector('canvas').getContext('2d');
    const delayInterval = setInterval(() => {
        canvas.drawImage(video, 0, 700, 50, 50, 0, 0, 1920, 1080);
        let colorData = canvas.getImageData(25, 25, 1, 1);
        if (colorData.data[0] === 255) {
            clearInterval(delayInterval);
            streamSync.value.delay[playerID] = Date.now() - time;
            nodecg.sendMessage('returnDelay', playerID)
        }
    }, 10)  
})

nodecg.listenFor(`syncStreams`, (sync) => {
    if (sync[playerID] !== null && sync[playerID] > 100) {
        video.pause();
        setTimeout(() => video.play(), sync[playerID]);
    }
})