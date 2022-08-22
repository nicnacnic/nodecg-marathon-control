const activeRunners = nodecg.Replicant('activeRunners');
const streamSync = nodecg.Replicant('streamSync')
let playerID, video, hls;
let playing = false;

function createPlayer(num) {
    NodeCG.waitForReplicants(activeRunners, streamSync).then(() => {
        playerID = num;
        video = document.querySelector('video');

        activeRunners.on('change', (newVal, oldVal) => {
            if (oldVal == undefined || oldVal[playerID].streamKey !== newVal[playerID].streamKey && newVal[playerID].streamKey !== null) {
                hls = new Hls();
                hls.attachMedia(video);
                hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                    hls.loadSource(`${nodecg.bundleConfig.baseRtmpUrl}${newVal[playerID].streamKey}.m3u8`);
                    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
                    playing = true;
                });
            }
            else if (oldVal[playerID].streamKey !== newVal[playerID].streamKey && newVal[playerID].streamKey === null) {
                streamSync.value.delay[playerID] = null;
                hls.destroy();
                playing = false;
            }
        })
    })
}

nodecg.listenFor('getDelay', () => {
    if (!playing) return;
    let time = Date.now();
    let canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    document.body.appendChild(canvas)
    let ctx = canvas.getContext('2d');
    let count = 0;
    const delayInterval = setInterval(() => {
        ctx.drawImage(video, 0, 0, 1920, 1080);
        let colorData = ctx.getImageData(25, 1055, 1, 1);
        if (colorData.data[0] >= 250) {
            clearInterval(delayInterval);
            streamSync.value.delay[playerID] = Date.now() - time;
            console.log(Date.now() - time)
            canvas.remove();
        }
        count++;
        if (count > 3000) { //1500 for 30s
            clearInterval(delayInterval);
        }
    }, 20);
})

nodecg.listenFor(`syncStreams`, (sync) => {
    if (playing) {
        if (sync[playerID] !== null && sync[playerID] > 50) {
            video.pause();
            setTimeout(() => video.play(), sync[playerID]);
        }
    }
})