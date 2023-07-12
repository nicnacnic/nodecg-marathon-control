const OBSWebSocket = require('obs-websocket-js').default;
const path = require('path')
const defaultValue = require('./defaultValues');
const DACBot = require('./bot');
const { EventSubscription } = require('obs-websocket-js');
const WebSocket = require('ws');

module.exports = async (nodecg) => {
    const obs = new OBSWebSocket();
    let lastRun = +new Date();
    let serverUpgrade = false;
    let delayArray = {};
    let clients = { delay: [], bot: [] };

    // Initialize replicants.
    const activeRunners = nodecg.Replicant('activeRunners', { defaultValue: defaultValue.activeRunners }); // Active runner data.
    const sceneList = nodecg.Replicant('sceneList', { persistent: false }); // List of all available scenes.
    const audioSources = nodecg.Replicant('audioSources'); // List of all OBS audio sources.
    const stats = nodecg.Replicant('stats', { persistent: false, defaultValue: defaultValue.stats }); // All OBS stats.
    const settings = nodecg.Replicant('settings', { defaultValue: defaultValue.settings }) // All dashboard settings.
    const obsStatus = nodecg.Replicant('obsStatus') // OBS data such as scenes.
    const streamSync = nodecg.Replicant('streamSync', { defaultValue: defaultValue.streamSync }) // Stream Sync data.
    const autoRecord = nodecg.Replicant('autoRecord', { defaultValue: defaultValue.autoRecord }) // Auto Record settings
    const botData = nodecg.Replicant('botData', { defaultValue: defaultValue.botData }) // Bot data.
    const botSpeaking = nodecg.Replicant('botSpeaking', { persistent: false, defaultValue: [] }) // Bot speaking map.
    const botSettings = nodecg.Replicant('botSettings', { defaultValue: defaultValue.botSettings }) // Bot settings.
    const adPlayer = nodecg.Replicant('adPlayer', { defaultValue: defaultValue.adPlayer }) // Ad player.
    const checklist = nodecg.Replicant('checklist', { defaultValue: defaultValue.checklist }) // Checklist tasks.
    const runDataActiveRun = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol') // Active run data from nodecg-speedcontrol.
    const timer = nodecg.Replicant('timer', 'nodecg-speedcontrol') // Timer from nodecg-speedcontrol.

    if (!nodecg.bundleConfig.websocket.ip || nodecg.bundleConfig.websocket.ip === '' || !nodecg.bundleConfig.websocket.port || nodecg.bundleConfig.websocket.port === '') {
        nodecg.log.error('OBS Websocket address has not been defined! Please add the IP address and port in the config.');
        process.exit(1)
        gracefulExit()
    }

    nodecg.log.info(`Connecting to OBS instance at ws://${nodecg.bundleConfig.websocket.ip}:${nodecg.bundleConfig.websocket.port}...`)

    obs.connect(`ws://${nodecg.bundleConfig.websocket.ip}:${nodecg.bundleConfig.websocket.port}`, nodecg.bundleConfig.websocket.password, {
        eventSubscriptions: EventSubscription.All
    }).catch((e) => {
        nodecg.log.error(`Could not connect to OBS instance at ws://${nodecg.bundleConfig.websocket.ip}:${nodecg.bundleConfig.websocket.port}.`)
        nodecg.log.error(e)
        process.exit(1)
    });

    obs.once('Identified', () => setup(true))

    // Set up delay page.
    let app = nodecg.Router();
    app.get('/delay', (req, res) => res.sendFile(path.join(__dirname, '../graphics/delay.html')));

    let wsServer = new WebSocket.WebSocketServer({ noServer: true, });

    app.get('/bundles/nodecg-marathon-control/ws/start', (req, res) => {
        if (!serverUpgrade) upgradeServer(req.connection.server);
        res.sendStatus(200);
    });

    nodecg.mount(app);

    function upgradeServer(server) {
        serverUpgrade = true;
        server.on('upgrade', (req, socket, head) => {
            if (req.url.includes('/bundles/nodecg-marathon-control/ws/data')) {
                wsServer.handleUpgrade(req, socket, head, (wsConnection) => {
                    wsServer.emit('connection', wsConnection, req);
                    wsServer.ws = wsConnection;
                });
            }
        })
    }

    wsServer.on('connection', (ws, req) => {
        if (req.url.includes('/bundles/nodecg-marathon-control/ws/data/')) {
            let split = req.url.split('/bundles/nodecg-marathon-control/ws/data/')[1];
            switch (split) {
                case 'delay': clients.delay.push(ws); break;
                case 'bot': clients.bot.push(ws); break;
            }
        }
    })

    // Start DACBot.
    if (botSettings.value.active) {
        switch (nodecg.bundleConfig.botToken) {
            case '': nodecg.log.warn('No bot token has been provided!'); break;
            default: DACBot.start(nodecg, wsServer.bot); break;
        }
    }

    //obs.on('InputVolumeMeters', (data) => console.log(data.inputs[4].inputLevelsMul))

    // Listen to OBS events.
    // General events.
    obs.on('ExitStarted', () => websocketDisconnect());
    obs.on('CurrentSceneCollectionChanged', () => {
        getScenes();
        getAudioSources();
    })

    // Scene events.
    obs.on('SceneCreated', () => getScenes());
    obs.on('SceneRemoved', () => getScenes());
    obs.on('SceneNameChanged', () => getScenes());
    obs.on('CurrentPreviewSceneChanged', (data) => obsStatus.value.previewScene = data.sceneName);
    obs.on('CurrentProgramSceneChanged', (data) => obsStatus.value.programScene = data.sceneName)

    // Audio events.
    obs.on('InputCreated', () => getAudioSources());
    obs.on('InputRemoved', () => getAudioSources());
    obs.on('InputNameChanged', () => getAudioSources());
    obs.on('InputVolumeChanged', (data) => audioSources.value.find(input => input.name === data.inputName).volume = { mul: data.inputVolumeMul.toFixed(1), db: data.inputVolumeDb.toFixed(1) })
    obs.on('InputMuteStateChanged', (data) => audioSources.value.find(input => input.name === data.inputName).muted = data.inputMuted)
    obs.on('InputAudioSyncOffsetChanged', (data) => audioSources.value.find(input => input.name === data.inputName).offset = data.inputAudioSyncOffset)

    // Output events.
    obs.on('StreamStateChanged', (data) => obsStatus.value.streaming = data.outputActive);
    obs.on('RecordStateChanged', (data) => obsStatus.value.recording = data.outputActive);

    // Transition events.
    obs.on('SceneTransitionStarted', (data) => transition(data))

    // Listen for requests from clients.
    nodecg.listenFor('setPreviewScene', (value) => send('SetCurrentPreviewScene', { sceneName: value }))
    nodecg.listenFor('startTransition', () => send('TriggerStudioModeTransition'));
    nodecg.listenFor('setVolume', (value) => send('SetInputVolume', { inputName: value.source, inputVolumeDb: (value.volume === null) ? -100.0 : value.volume }));
    nodecg.listenFor('toggleMute', (value) => send('ToggleInputMute', { inputName: value }))
    nodecg.listenFor('setOffset', (value) => send('SetInputAudioSyncOffset', { inputName: value.source, inputAudioSyncOffset: value.offset }))
    nodecg.listenFor('toggleStream', () => send('ToggleStream'));
    nodecg.listenFor('toggleRecording', () => send('ToggleRecord'));
    nodecg.listenFor('restartMedia', (value) => send('PressInputPropertiesButton', { inputName: value, propertyName: 'refreshnocache' }))
    nodecg.listenFor('startAd', () => playAds());
    nodecg.listenFor('refreshVideoSource', () => refreshVideoSource());
    nodecg.listenFor('returnDelay', (value) => syncStreams(value, streamSync.value))

    async function setup(msg) {
        if (msg) nodecg.log.info(`Successfully connected to OBS instance at ws://${nodecg.bundleConfig.websocket.ip}:${nodecg.bundleConfig.websocket.port}`)

        streamSync.value.status = {
            delays: false,
            syncing: false,
            autoSync: false,
        };
        adPlayer.value.adPlaying = false;

        await send('SetStudioModeEnabled', { studioModeEnabled: true });

        let streamStatus = await send('GetStreamStatus');
        let recordingStatus = await send('GetRecordStatus');
        let previewScene = await send('GetCurrentPreviewScene');
        let programScene = await send('GetCurrentProgramScene');
        obsStatus.value = {
            previewScene: previewScene.currentPreviewSceneName,
            programScene: programScene.currentProgramSceneName,
            inIntermission: (programScene.currentProgramSceneName === settings.value.intermissionScene) ? true : false,
            inTransition: false,
            emergencyTransition: false,
            streaming: streamStatus.outputActive,
            recording: recordingStatus.outputActive,
        };

        // Auto Stream Sync™
        setInterval(() => {
            if (streamSync.value.autoSync && (timer.value.state === 'running' || timer.value.state === 'paused')) sendSyncSignal(true)
        }, 120000)

        setInterval(async () => {
            let data = await send('GetStats');
            let streamData = {};
            if (obsStatus.streaming) streamData = await send('GetOutputStatus', { outputName: 'adv_stream' });
            stats.value = {
                cpuUsage: `${data.cpuUsage.toFixed(1)}%`,
                fps: `${data.activeFps.toFixed(1)} FPS`,
                kbitsPerSec: `? kb/s`,
                averageFrameTime: `${data.averageFrameRenderTime.toFixed(1)} ms`,
                skippedFrames: `${data.renderSkippedFrames} / ${data.renderTotalFrames} (${((data.renderSkippedFrames / data.renderTotalFrames) * 100).toFixed(1)}%)`,
                missedFrames: `${data.outputSkippedFrames} / ${data.outputTotalFrames} (${((data.outputSkippedFrames / data.outputTotalFrames) * 100).toFixed(1)}%)`,
                droppedFrames: (streamData.outputSkippedFrames !== undefined) ? `${streamData.outputSkippedFrames} / ${streamData.outputTotalFrames} (${((streamData.outputSkippedFrames / streamData.outputTotalFrames) * 100).toFixed(1)}%)` : '0 / 0 (NaN%)',
                uptime: (streamData.outputTimecode) ? streamData.outputTimecode.slice(0, -4) : '00:00:00',
                diskSpace: `${(data.availableDiskSpace / 1024).toFixed(1)} GB`,
                autoRecord: (settings.value.autoRecord) ? 'Active' : 'Inactive',
            }
        }, 2000)

        getScenes();
        getAudioSources();
    }

    runDataActiveRun.on('change', (newVal, oldVal) => {
        if (!oldVal) return;
        if (!newVal) {
            activeRunners.value = defaultValue.activeRunners;
            return;
        }
        if (newVal.id !== oldVal.id) {
            if (checklist.value.started) checklist.value.default.playRun = true;
            if (settings.value.autoSetRunners) {
                try {
                    for (let j = 0; j < 4; j++) {
                        activeRunners.value[j].streamKey = null;
                    }
                    let i = 0;
                    newVal.teams.forEach(team => {
                        team.players.forEach(player => {
                            activeRunners.value[i].streamKey = player.social.twitch;
                            i++;
                        })
                    })
                    for (let j = i; j < 4; j++) {
                        activeRunners.value[i].streamKey = null;
                    }
                } catch { };
            }
            if (settings.value.autoSetLayout && newVal.customData !== undefined && newVal.customData.layout !== undefined) try { send('SetCurrentPreviewScene', { sceneName: newVal.customData.layout }) } catch { }
            setFilenameFormatting(autoRecord.value.filenameFormatting);
            streamSync.value.delay = [null, null, null, null];
        }
    })

    async function getScenes() {
        const scenes = await send('GetSceneList');
        let sceneArray = [];
        for (const scene of scenes.scenes) {
            sceneArray.push(scene.sceneName);
        }
        sceneList.value = sceneArray;
    }

    async function getAudioSources() {
        let inputs = await send('GetInputList');
        let inputList = inputs.inputs.filter((input) => { return defaultValue.audioSourceTypes.includes(input.inputKind) })
        let audioSourceList = [];
        for (const input of inputList) {
            if (input.inputName.includes('--')) continue;
            if (input.inputKind === 'browser_source') {
                let sourceSettings = await send('GetInputSettings', { inputName: input.inputName })
                if (!sourceSettings.inputSettings.reroute_audio) continue;
                else if (sourceSettings.inputSettings.url.includes('/bundles/nodecg-marathon-control/graphics/streamPlayer')) setPlayerSource(input, sourceSettings);
            }
            let volume = await send('GetInputVolume', { inputName: input.inputName });
            let mute = await send('GetInputMute', { inputName: input.inputName });
            let offset = await send('GetInputAudioSyncOffset', { inputName: input.inputName });
            audioSourceList.push({ name: input.inputName, type: input.inputKind, volume: { mul: volume.inputVolumeMul.toFixed(1), db: volume.inputVolumeDb.toFixed(1) }, muted: mute.inputMuted, offset: offset.inputAudioSyncOffset, updateLocation: 'server' })
        }
        audioSources.value = audioSourceList;

        async function setPlayerSource(input, sourceSettings) {
            switch (true) {
                case (sourceSettings.inputSettings.url.includes('/bundles/nodecg-marathon-control/graphics/streamPlayer/1.html')): activeRunners.value[0].source = input.inputName; break;
                case (sourceSettings.inputSettings.url.includes('/bundles/nodecg-marathon-control/graphics/streamPlayer/2.html')): activeRunners.value[1].source = input.inputName; break;
                case (sourceSettings.inputSettings.url.includes('/bundles/nodecg-marathon-control/graphics/streamPlayer/3.html')): activeRunners.value[2].source = input.inputName; break;
                case (sourceSettings.inputSettings.url.includes('/bundles/nodecg-marathon-control/graphics/streamPlayer/4.html')): activeRunners.value[3].source = input.inputName; break;
            }
        }
    }

    obsStatus.on('change', (newVal, oldVal) => {
        if (!oldVal) return;
        if (newVal.emergencyTransition !== oldVal.emergencyTransition) emergencyTransition(newVal);
        if (newVal.inIntermission !== oldVal.inIntermission) updateChecklist(newVal);
    })

    // Auto record logic.
    async function transition() {
        obsStatus.value.inTransition = true;
        let startRecord = false;
        if (obsStatus.value.previewScene === settings.value.intermissionScene) {
            obsStatus.value.inIntermission = true;
            if (settings.value.autoRecord && obsStatus.value.recording && !obsStatus.value.emergencyTransition) await send('StopRecord');
        }
        if (obsStatus.value.previewScene !== settings.value.intermissionScene && obsStatus.value.previewScene !== adPlayer.value.videoScene) {
            startRecord = true;
            obsStatus.value.emergencyTransition = false;
        }

        obs.once('SceneTransitionEnded', async () => {
            obsStatus.value.inTransition = false;
            if (startRecord) {
                obsStatus.value.inIntermission = false;
                if (!obsStatus.value.recording && settings.value.autoRecord) await send('StartRecord');
            }
        });
    }

    // Emergency transition logic.
    async function emergencyTransition(data) {
        if (!data.emergencyTransition) {
            await send('TriggerStudioModeTransition');
            return;
        }
        await send('SetCurrentPreviewScene', { sceneName: settings.value.intermissionScene });
        await send('TriggerStudioModeTransition');
        return;
    }

    function updateChecklist(newVal) {
        if ((newVal.inIntermission) && timer.value.state === 'finished') {
            let def = {};
            let custom = {};
            for (let item of Object.keys(checklist.value.default)) {
                def[item] = false;
            }
            for (let item of Object.keys(checklist.value.custom)) {
                custom[item] = false;
            }
            checklist.value = {
                started: true,
                completed: false,
                default: def,
                custom: custom
            }
        }
    }

    checklist.on('change', (newVal, oldVal) => {
        if (!oldVal && JSON.stringify(newVal.customOld) !== JSON.stringify(nodecg.bundleConfig.checklist)) createCustomChecklist(newVal);
        if (newVal.started && !newVal.completed) {
            for (let item of Object.keys(newVal.default)) {
                if (!newVal.default[item]) return checklist.value.completed = false;
            }
            for (let item of Object.keys(newVal.custom)) {
                if (!newVal.custom[item]) return checklist.value.completed = false;
            }
            setTimeout(() => {
                checklist.value.completed = true;
            }, 100);
        }
    })

    function createCustomChecklist(newVal) {
        checklist.value.customOld = nodecg.bundleConfig.checklist;
        let custom = {};
        for (let item of Object.keys(nodecg.bundleConfig.checklist)) {
            custom[item] = false;
        }
        checklist.value.custom = custom;
    }

    // Set filename formatting.
    async function setFilenameFormatting(filename) {
        filename = filename.replace(new RegExp('%GAME', 'g'), runDataActiveRun.value.game)
        filename = filename.replace(new RegExp('%CAT', 'g'), runDataActiveRun.value.category)
        filename = filename.replace(new RegExp('%RGN', 'g'), runDataActiveRun.value.region)
        filename = filename.replace(new RegExp('%REL', 'g'), runDataActiveRun.value.release)
        filename = filename.replace(new RegExp('%TWIT', 'g'), runDataActiveRun.value.gameTwitch)
        filename = filename.replace(new RegExp('%SYS', 'g'), runDataActiveRun.value.system)
        filename = filename.replace(new RegExp('%EST', 'g'), runDataActiveRun.value.estimate)
        filename = filename.replace(new RegExp('%SET', 'g'), runDataActiveRun.value.setupTime)
        if (filename.includes('%RNR')) {
            let playerString = '';
            runDataActiveRun.value.teams.forEach(team => {
                team.players.forEach(player => {
                    if (playerString === '') playerString = player.name;
                    else playerString = playerString.concat(', ', player.name)
                })
            })
            filename = filename.replace(new RegExp('%RNR', 'g'), playerString)
        }
        filename = filename.replaceAll('%', '%%')
        filename = filename.replaceAll('<', '')
        filename = filename.replaceAll('>', '')
        filename = filename.replaceAll(':', '')
        filename = filename.replaceAll('"', '')
        filename = filename.replaceAll('/', '')
        filename = filename.replaceAll('\\', '')
        filename = filename.replaceAll('|', '')
        filename = filename.replaceAll('?', '')
        filename = filename.replaceAll('*', '')
        await send('SetProfileParameter', { parameterCategory: 'Output', parameterName: 'FilenameFormatting', parameterValue: filename })
    }

    // Get stream delay.
    nodecg.listenFor('startStreamSync', () => getStreamDelay(streamSync.value))

    streamSync.on('change', (newVal, oldVal) => {
        if (!oldVal) return;
        if (newVal.active && newVal.status.delays && JSON.stringify(newVal.delay) !== JSON.stringify(oldVal.delay)) checkDelayArray(newVal);
    })

    sendSyncSignal();

    function sendSyncSignal() {
        let num = 0;
        setInterval(() => {
            clients.delay.forEach(async client => {
                client.send(JSON.stringify({
                    type: 'delay', data: {
                        num: num,
                        binary: num.toString(2).split('').map(x => !!+x).reverse(),
                        frame: (num % 2 === 0)
                    }
                }));
            });
            num++;
            if (num > 128) num = 0;
        }, 500)
    }

    function getStreamDelay() {
        if (streamSync.value.status.delays) return;
        streamSync.value.status.delays = true;
        delayArray = [null, null, null, null];
        nodecg.sendMessage('getDelay');
    }

    // function sendSyncSignal(autoSync) {
    //     if (!autoSync) nodecg.log.info('Stream sync requested on ' + Date() + '.');
    //     //streamSync.value.delay = [null, null, null, null];
    //     streamSync.value.status = { delays: true, syncing: false, error: false, autoSync: autoSync, checked: 0 };
    //     clients.delay.forEach(async client => {
    //         client.send(JSON.stringify({ type: 'delay', data: 'Trigger ty square!' }));
    //     });
    //     nodecg.sendMessage('getDelay');
    //     setTimeout(() => {
    //         if (streamSync.value.status.delays) {
    //             checklist.value.default.syncStreams = true;
    //             streamSync.value.status = { delays: false, syncing: false, error: true, autoSync: null, checked: null };
    //         }
    //     }, 60000)
    // }

    // function checkDelayArray(newVal) {
    //     streamSync.value.status.checked = streamSync.value.status.checked + 1;
    //     let numRunners = activeRunners.value.filter((x) => x.streamKey !== null);
    //     if (streamSync.value.status.checked >= numRunners.length && streamSync.value.status.checked !== null) syncStreams(newVal);
    // }

    // Stream Sync™
    function syncStreams(res, newVal, autoSync) {
        delayArray[res.playerNum] = res.delay;
        if (delayArray.filter(Boolean).length < streamSync.value.delay.filter(Boolean).length) return;
        streamSync.value.status = { delays: false, syncing: true, autoSync: (autoSync) ? true : false }
        let filteredArray = delayArray.filter(e => e);
        let biggestDelay = Math.max(...filteredArray);
        let smallestDelay = Math.min(...filteredArray);
        if ((autoSync && (biggestDelay - smallestDelay) < newVal.maxOffset) || filteredArray <= 1) return finishSync();
        if (!autoSync) nodecg.log.info('Stream sync requested on ' + Date() + '.');
        let syncArray = [];
        for (let delay of delayArray) {
            switch (delay) {
                case null: syncArray.push(null); break;
                default: syncArray.push(biggestDelay - delay); break;
            }
        }
        nodecg.sendMessage('syncStreams', syncArray);
        setTimeout(() => finishSync(), Math.max(...syncArray) + 500)

        function finishSync() {
            streamSync.value.status = { delays: false, syncing: false, autoSync: false };
            // for (let i = 0; i < 4; i++) {
            //     if (syncArray && syncArray[i] > 0) streamSync.value.delay[i] = streamSync.value.delay[i] + syncArray[i];
            // }
            checklist.value.default.syncStreams = true;
        }
    }

    // Ad player.
    async function playAds() {
        let newVal = adPlayer.value;
        nodecg.log.info('Ad requested on ' + Date() + '.')
        let video = {};
        if (newVal.videoAds) {
            let sceneItems = await send('GetSceneItemList', { sceneName: newVal.videoScene });
            let inputs = [];
            for (const item of sceneItems.sceneItems) {
                if (item.inputKind === 'ffmpeg_source') inputs.push(item.sourceName);
            }
            video.name = inputs[Math.floor(Math.random() * inputs.length)];
            await send('TriggerMediaInputAction', { inputName: video.name, mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART' })
            let status = await send('GetMediaInputStatus', { inputName: video.name });
            video.duration = status.mediaDuration;
            await send('TriggerMediaInputAction', { inputName: video.name, mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP' })
        }
        let secondsLeft = 0;

        switch (true) {
            case (newVal.videoAds && newVal.twitchAds):
                secondsLeft = Math.ceil(video.duration / 1000) + parseFloat(newVal.twitchAdLength) + 1 + 10;
                break;
            case (newVal.videoAds):
                secondsLeft = Math.ceil(video.duration / 1000) + 1;
                break;
            case (newVal.twitchAds):
                secondsLeft = parseFloat(newVal.twitchAdLength) + 10;
                break;
        }

        adPlayer.value.adPlaying = true;
        adPlayer.value.secondsLeft = secondsLeft;
        secondsLeft--;
        const timerInterval = setInterval(() => {
            adPlayer.value.secondsLeft = secondsLeft;
            secondsLeft--;
            if (secondsLeft < 0) {
                adPlayer.value.secondsLeft = 0;
                adPlayer.value.adPlaying = false;
                checklist.value.default.playAd = true;
                clearInterval(timerInterval);
            }
        }, 1000);

        if (newVal.videoAds) await playVideo();
        if (newVal.twitchAds) await playTwitch();

        try { clearInterval(timerInterval) } catch { };

        adPlayer.value.secondsLeft = 0;
        adPlayer.value.adPlaying = false;
        checklist.value.default.playAd = true;

        async function playVideo() {
            return new Promise(async (resolve) => {
                let previewScene = obsStatus.value.previewScene;
                await send('SetCurrentPreviewScene', { sceneName: newVal.videoScene });
                await send('TriggerStudioModeTransition');
                obs.once('SceneTransitionEnded', async () => {
                    setTimeout(() => {
                        send('TriggerMediaInputAction', { inputName: video.name, mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART' });
                        send('SetCurrentPreviewScene', { sceneName: previewScene })
                    }, 500);
                    setTimeout(async () => {
                        await send('SetCurrentPreviewScene', { sceneName: settings.value.intermissionScene });
                        setTimeout(async () => await send('TriggerMediaInputAction', { inputName: video.name, mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP' }), 5000)
                        setTimeout(async () => {
                            await send('TriggerStudioModeTransition');
                            obs.once('SceneTransitionEnded', () => {
                                setTimeout(() => send('SetCurrentPreviewScene', { sceneName: previewScene }), 500);
                                resolve();
                            });
                        }, 6000)
                    }, video.duration - 4000)
                })
            })
        }

        async function playTwitch() {
            return new Promise(async (resolve) => {
                let duration = parseInt(adPlayer.value.twitchAdLength);
                nodecg.log.debug({ duration: duration, fromDashboard: false })
                nodecg.sendMessageToBundle('twitchStartCommercial', 'nodecg-speedcontrol', { duration: duration, fromDashboard: false })
                nodecg.sendMessageToBundle('twitchStartCommercialTimer', 'nodecg-speedcontrol', { duration: duration })
                setTimeout(() => resolve(), (duration + 5) * 1000);
            })
        }
    }

    async function refreshVideoSource() {
        let itemList = await send('GetSceneItemList', { sceneName: adPlayer.value.videoScene })
        for (let item of itemList.sceneItems) {
            if (item.inputKind !== 'browser_source') continue;
            await send('PressInputPropertiesButton', { inputName: item.sourceName, propertyName: 'refreshnocache' })
        }
        adPlayer.value.adPlaying = false;
        adPlayer.value.secondsLeft = 0;
    }

    async function websocketDisconnect() {
        nodecg.log.error('Disconnected from OBS instance! Attempting to reconnect...');
        audioSources.value = [];
        const reconnectInterval = setInterval(() => {
            obs.connect(`ws://${nodecg.bundleConfig.websocket.ip}:${nodecg.bundleConfig.websocket.port}`, nodecg.bundleConfig.websocket.password, {
                eventSubscriptions: EventSubscription.All
            }).then(() => {
                obs.once('Identified', () => {
                    nodecg.log.info('Reconnected to OBS instance!');
                    clearInterval(reconnectInterval);
                    setup(false)
                })
            }).catch(() => { });
        }, 2500)
    }

    async function send(request, data) {
        return new Promise(async (resolve, reject) => {
            obs.call(request, data)
                .then((result) => resolve(result))
                .catch((error) => {
                    if (error.code === 600 || !error.code) return;
                    nodecg.log.error('A OBS Websocket error has occurred.\n', {
                        code: error.code,
                        request: request,
                        requestData: data,
                    })
                    return;
                })
        })
    }

    //     function updateCurrentScene(scene) {
    //         currentScene.value.program = scene;
    //         settings.value.inTransition = false;
    //         if (scene !== settings.value.intermissionScene && !adPlayer.value.adPlaying) {
    //             settings.value.inIntermission = false;
    //             settings.value.emergencyTransition = false;
    //         }
    //         else {
    //             settings.value.inIntermission = true;
    //             if (timer.value.state === 'finished') {
    //                 checklist.value = {
    //                     started: true,
    //                     completed: false,
    //                     playRun: false,
    //                     playAd: false,
    //                     verifyStream: false,
    //                     syncStreams: false,
    //                     checkAudio: false,
    //                     checkInfo: false,
    //                     checkReady: false,
    //                     finalCheck: false
    //                 }
    //                 if (!adPlayer.value.videoAds && !adPlayer.value.twitchAds) checklist.value.playAd = true;
    //             }
    //         }
    //     }
}