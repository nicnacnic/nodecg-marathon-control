const activeRunners = nodecg.Replicant('activeRunners');
const streamSync = nodecg.Replicant('streamSync')
let syncDate = {};
let playerID, video, hls;
let playing = false;
let canvas, ctx;
let resMultiplier;
let isWhite;
let delayArray = [];
let currentDelay;

function createPlayer(num) {
    canvas = document.querySelector('canvas')
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    video = document.querySelector('video');
    video.addEventListener("loadeddata", () => resMultiplier = 1080 / video.videoHeight);

    NodeCG.waitForReplicants(activeRunners, streamSync).then(() => {
        playerID = num;

        activeRunners.on('change', (newVal, oldVal) => {
            if (oldVal == undefined || (oldVal[playerID].streamKey !== newVal[playerID].streamKey && newVal[playerID].streamKey !== '') || (oldVal[playerID].server !== newVal[playerID].server && newVal[playerID].server !== '')) {
                streamSync.value.delay[playerID] = null;
                currentDelay = null;
                hls = new Hls();
                hls.attachMedia(video);
                hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                    console.log(`Source: ${nodecg.bundleConfig.RTMPServers[newVal[playerID].server]}${newVal[playerID].streamKey}.m3u8`)
                    hls.loadSource(`${nodecg.bundleConfig.RTMPServers[newVal[playerID].server]}${newVal[playerID].streamKey}.m3u8`);
                    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
                    playing = true;
                });
            }
            else if (oldVal[playerID].streamKey !== newVal[playerID].streamKey && newVal[playerID].streamKey === null) {
                currentDelay = null;
                streamSync.value.delay[playerID] = null;
                hls.destroy();
                playing = false;
            }
        })
    })
}


connect();

async function connect() {
    console.log('Connecting to websocket...')
    await fetch(`${window.location.origin}/bundles/nodecg-marathon-control/ws/start`)

    const ws = new WebSocket(`${(window.location.protocol === 'https:') ? 'wss' : 'ws'}://${window.location.host}/bundles/nodecg-marathon-control/ws/data/delay`);

    ws.onopen = () => {
        console.log('Connected to websocket!')
    }

    ws.onmessage = (event) => {
        let data = JSON.parse(event.data);
        if (data.type === 'delay') syncDate[data.data.num] = new Date();
    };
    ws.onclose = () => {
        console.error('Websocket connection closed. Attemping to reconnect...');
        setTimeout(() => {
            connect();
        }, 1000);
    }
}


// setTimeout(() => calibrate(), 4000)

// function calibrate() {
//     canvas.width = video.videoWidth;
//     canvas.height = video.videoHeight;
//     ctx.drawImage(video, 0, 1064, 130, 16, 0, 0, 130, 16);

//     //ctx.drawImage(video, 0, (1064 / resMultiplier), (140 / resMultiplier), (40 / resMultiplier))

//     //ctx.drawImage(video, 0, (1064 / resMultiplier), (140 / resMultiplier), (40 / resMultiplier), 0, 0, 322, 360)
//     let width = 130;

//     while (width >= 0) {
//         let colorData = ctx.getImageData(width, 8, 1, 1);
//         //console.log(colorData.data[0], colorData.data[1], colorData.data[2])
//         if (colorData.data[0] > 250 && colorData.data[1] < 6 && colorData.data[2] < 6) console.log(width);
//         width--
//     }
// }

// Y of all squares: 8,
// X below:
// S0: 7
// S1: 23
// S2: 39
// S3: 55
// S4: 71
// S5: 87
// S6: 103
// S7: 122

setInterval(() => {
    ctx.drawImage(video, 0, (1064 / resMultiplier), (140 / resMultiplier), (16 / resMultiplier), 0, 0, 140, 16)
    let colorData = ctx.getImageData(122, 8, 1, 1)
    if (playing && colorData.data.every(x => x >= 250) !== isWhite) {
        isWhite = !isWhite
        calculateDelay();
    }
}, 33);

setInterval(() => {
    if (delayArray.length > 0) streamSync.value.delay[playerID] = Math.trunc(delayArray.reduce((a, b) => a + b) / delayArray.length)
}, 2500)

function calculateDelay() {
    let binary = [];
    binary[0] = (ctx.getImageData(103, 8, 1, 1)).data.every(x => x >= 250)
    binary[1] = (ctx.getImageData(87, 8, 1, 1)).data.every(x => x >= 250)
    binary[2] = (ctx.getImageData(71, 8, 1, 1)).data.every(x => x >= 250)
    binary[3] = (ctx.getImageData(55, 8, 1, 1)).data.every(x => x >= 250)
    binary[4] = (ctx.getImageData(39, 8, 1, 1)).data.every(x => x >= 250)
    binary[5] = (ctx.getImageData(23, 8, 1, 1)).data.every(x => x >= 250)
    binary[6] = (ctx.getImageData(7, 8, 1, 1)).data.every(x => x >= 250)

    const num = binary.reduce((res, x) => res << 1 | x)
    const delay = Date.now() - new Date(syncDate[num])
    if (!isNaN(delay)) {
        currentDelay = delay;
        if (delayArray.length <= 0) streamSync.value.delay[playerID] = delay;
        delayArray.push(delay);
    }
}
// console.log('calculating...')
// let canvas = document.createElement('canvas');
// canvas.width = 1920;
// canvas.height = 1080;
// body.appendChild(canvas)
// let ctx = canvas.getContext('2d');
// let count = 0;
// const delayInterval = setInterval(() => {
//     ctx.drawImage(video, 0, 0, 1920, 1080);
//     ctx.style.display = 'inline'
//     let colorData = ctx.getImageData(25, 1055, 1, 1);
//     if (colorData.data[0] >= 250) {
//         clearInterval(delayInterval);
//         let delayAmount = Date.now() - time;
//         if (streamSync.value.delay[playerID] !== null && streamSync.value.delay[playerID] === delayAmount) delayAmount--;
//         streamSync.value.delay[playerID] = delayAmount;
//         console.log(Date.now() - time)
//         canvas.remove();
//     }
//     count++;
//     if (count > 3000) { //1500 for 30s
//         clearInterval(delayInterval);
//     }
// }, 20);


// nodecg.listenFor('getDelay', () => {
//     if (!playing) return;
//     let time = Date.now();
//     let canvas = document.createElement('canvas');
//     canvas.width = 1920;
//     canvas.height = 1080;
//     document.body.appendChild(canvas)
//     let ctx = canvas.getContext('2d');
//     let count = 0;
//     const delayInterval = setInterval(() => {
//         ctx.drawImage(video, 0, 0, 1920, 1080);
//         let colorData = ctx.getImageData(25, 1055, 1, 1);
//         if (colorData.data[0] >= 250) {
//             clearInterval(delayInterval);
//             let delayAmount = Date.now() - time;
//             if (streamSync.value.delay[playerID] !== null && streamSync.value.delay[playerID] === delayAmount) delayAmount--;
//             streamSync.value.delay[playerID] = delayAmount;
//             console.log(Date.now() - time)
//             canvas.remove();
//         }
//         count++;
//         if (count > 3000) { //1500 for 30s
//             clearInterval(delayInterval);
//         }
//     }, 20);
// })

nodecg.listenFor('getDelay', () => {
    nodecg.sendMessage('returnDelay', {
        playerNum: playerID,
        delay: currentDelay,
    })
})

nodecg.listenFor(`syncStreams`, (sync) => {
    if (playing) {
        if (sync[playerID] !== null && sync[playerID] > 50) {
            console.log('pausing')
            video.pause();
            setTimeout(() => video.play(), sync[playerID]);
        }
    }
})