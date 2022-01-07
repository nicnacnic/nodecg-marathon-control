const OBSWebSocket = require('obs-websocket-js');
const path = require('path')
const defaultValue = require('./defaultValues');
const DACBot = require('./bot');

module.exports = function (nodecg) {
    const router = nodecg.Router();
    const obs = new OBSWebSocket();
    let lastRun = +new Date();
    let connectionError = false;

    // Allow runners to access delay graphic.
    router.get('/bundles/nodecg-marathon-control/delay', (req, res) => res.sendFile(path.join(__dirname , '../graphics/delay/delay.html')));
    nodecg.mount('/', router);

    // Initialize replicants.
    const activeRunners = nodecg.Replicant('activeRunners', { defaultValue: defaultValue.activeRunners }); // Active runner data.
    const currentScene = nodecg.Replicant('currentScene', { defaultValue: { preview: '', program: '' } }); // Current scene in OBS.
    const sceneList = nodecg.Replicant('sceneList', { persistent: false, defaultValue: [] }); // List of all available scenes.
    const audioSources = nodecg.Replicant('audioSources'); // List of all OBS audio sources.
    const stats = nodecg.Replicant('stats', { persistent: false, defaultValue: defaultValue.stats }); // All OBS stats.
    const settings = nodecg.Replicant('settings', { defaultValue: defaultValue.settings }) // All dashboard settings.
    const streamSync = nodecg.Replicant('streamSync', { defaultValue: defaultValue.streamSync }) // Stream Sync data.
    const autoRecord = nodecg.Replicant('autoRecord', { defaultValue: defaultValue.autoRecord }) // Auto Record settings
    const botSettings = nodecg.Replicant('botSettings', { defaultValue: defaultValue.botSettings }) // Bot settings.
    const botData = nodecg.Replicant('botData', { defaultValue: defaultValue.botData }) // Bot settings.
    const runDataActiveRun = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol') // Active run data from nodecg-speedcontrol.
    const timer = nodecg.Replicant('timer', 'nodecg-speedcontrol') // Timer from nodecg-speedcontrol.

    obs.connect({ address: nodecg.bundleConfig.address, password: nodecg.bundleConfig.password }).then(async () => {
        nodecg.log.info('Connected to OBS instance!')

        settings.value.emergencyTransition = false;
        streamSync.value.syncing = false;

        // Get OBS data.
        obs.send('GetStreamingStatus').then(result => { settings.value.streaming = result.streaming; settings.value.recording = result.recording })
        obs.send('GetStudioModeStatus').then(result => { if (!result.studioMode) obs.send('EnableStudioMode').catch((error) => websocketError(error)) });
        obs.send('GetPreviewScene').then(result => updateCurrentScene(result.name)).catch((error) => websocketError(error));

        // Start DACBot.
        if (botSettings.value.active) {
            switch (nodecg.bundleConfig.botToken) {
                case '': nodecg.log.warn('No bot token has been provided!'); break;
                default: DACBot.start(nodecg); break;
            }
        }

        // Get audio sources.
        getAudioSources();

        // Get scene list.
        getScenes()

        // Auto Stream Sync™
        setInterval(() => {
            if (streamSync.value.autoSync && (timer.value.state === 'running' || timer.value.state === 'paused')) getDelay()
        }, 120000)

        // Listening for OBS events.
        obs.on('error', (error) => websocketError(error));
        obs.on('Exiting', () => connectionLost());
        obs.on('StreamStatus', (data) => stats.value = data)
        obs.on('StreamStarted', () => settings.value.streaming = true)
        obs.on('StreamStopped', () => settings.value.streaming = false)
        obs.on('RecordingStarted', () => settings.value.recording = true)
        obs.on('RecordingStopped', () => settings.value.recording = false)
        obs.on('TransitionBegin', () => settings.value.inTransition = true)
        obs.on('TransitionEnd', (data) => updateCurrentScene(data.toScene))
        obs.on('SourceCreated', () => getAudioSources())
        obs.on('SourceDestroyed', () => getAudioSources())
        obs.on('ScenesChanged', (data) => getScenesLimiter());
        obs.on('SwitchScenes', (data) => currentScene.value.program = data.sceneName)
        obs.on('PreviewSceneChanged', (data) => currentScene.value.preview = data.sceneName)
        obs.on('SourceVolumeChanged', (data) => audioSources.value.find(element => element.name === data.sourceName).volume = data.volumeDb.toFixed(1))
        obs.on('SourceMuteStateChanged', (data) => audioSources.value.find(element => element.name === data.sourceName).muted = data.muted)
        obs.on('SourceAudioSyncOffsetChanged', (data) => audioSources.value.find(element => element.name === data.sourceName).offset = data.syncOffset)

        // Listening for requests from clients.
        nodecg.listenFor('startTransition', () => obs.send('TransitionToProgram').catch((error) => websocketError(error)))
        nodecg.listenFor('emergencyTransition', () => emergencyTransition())
        nodecg.listenFor('setVolume', (value) => obs.send('SetVolume', { source: value.source, volume: value.volume }))
        nodecg.listenFor('toggleMute', (value) => obs.send('ToggleMute', { source: value }))
        nodecg.listenFor('setOffset', (value) => obs.send('SetSyncOffset', { source: value.source, offset: value.offset }))
        nodecg.listenFor('toggleStream', () => obs.send('StartStopStreaming'))
        nodecg.listenFor('toggleRecording', () => obs.send('StartStopRecording'))
        nodecg.listenFor('reauthenticate', () => {
            obs.disconnect();
            obs.connect({ address: nodecg.bundleConfig.address, password: nodecg.bundleConfig.password }).then(() => {
                nodecg.log.warn('Reauthentication requested on ' + Date() + '.')
            }).catch((error) => websocketError(error));
        })

        // Change preview scene.
        currentScene.on('change', (newVal, oldVal) => { if (newVal !== undefined) obs.send('SetPreviewScene', { "scene-name": newVal.preview }).catch((error) => websocketError(error)) });

        // Change filename formatting.
        autoRecord.on('change', (newVal) => { if (newVal.active) setFilenameFormatting(newVal.filenameFormatting) })

        // Auto set streamkey.
        runDataActiveRun.on('change', (newVal, oldVal) => {
            if (oldVal !== undefined && newVal !== undefined) {
                if (settings.value.autoSetRunners) {
                    try {
                        let i = 0;
                        newVal.teams.forEach(team => {
                            team.players.forEach(player => {
                                activeRunners.value[i].streamKey = player.social.twitch;
                                i++;
                            })
                        })
                    } catch { };
                }
                if (settings.value.autoSetLayout) try { currentScene.value.preview = newVal.customData.layout } catch { }
                if (autoRecord.value.active) setFilenameFormatting(autoRecord.value.filenameFormatting)
            }
        })

        // Auto record logic.
        settings.on('change', (newVal, oldVal) => {
            if (autoRecord.value.active && (oldVal === undefined || newVal.inIntermission !== oldVal.inIntermission)) {
                if (!newVal.inIntermission && !settings.value.recording) {
                    settings.value.emergencyTransition = false;
                    obs.send('StartRecording').catch((error) => websocketError(error));
                }
                else if (!newVal.inIntermission) settings.value.emergencyTransition = false;
                else if (newVal.inIntermission && settings.value.recording && !settings.value.emergencyTransition) obs.send('StopRecording').catch((error) => websocketError(error));
            }
        })

        streamSync.on('change', (newVal) => {
            if (!newVal.syncing && newVal.startSync) getDelay(newVal);
        })

        // Get stream delay.
        function getDelay(newVal) {
            streamSync.value.syncing = true;
            streamSync.value.startSync = false;
            if (!newVal.autoSync) nodecg.log.info('Stream sync requested on ' + Date() + '.')
            let returnValue = [false, false, false, false];
            let time = Date.now()
            nodecg.sendMessage('flashSquare');
            nodecg.sendMessage('getDelay', time);
            for (let i = 0; i < 4; i++) {
                if (activeRunners.value[i].streamKey === '') returnValue[i] = true;
            }
            nodecg.listenFor('returnDelay', (index) => returnValue[index] = true);
            const waitForReturn = setInterval(() => {
                if (returnValue.every(value => value === true)) {
                    syncStreams(streamSync.value)
                    clearInterval(waitForReturn);
                }
            }, 250)
        }

        // Stream Sync™
        function syncStreams(newVal) {
            let filteredArray = newVal.delay.filter(e => e)
            let biggestDelay = Math.max(...filteredArray)
            let smallestDelay = Math.min(...filteredArray)
            if (newVal.startSync || (newVal.autoSync && (biggestDelay - smallestDelay) > newVal.maxOffset) && !newVal.syncing && filteredArray.length > 1) {
                let syncArray = [];
                newVal.delay.forEach(delay => {
                    switch (delay) {
                        case null: syncArray.push(null); break;
                        default: syncArray.push(biggestDelay - delay); break;
                    }
                })
                nodecg.sendMessage('syncStreams', syncArray)
                setTimeout(() => streamSync.value.syncing = false, Math.max(...syncArray));
            }
            else
                streamSync.value.syncing = false;
        }

        // Fetch scene list.
        function getScenes() {
            sceneList.value = [];
            obs.send('GetSceneList').then(result => {
                currentScene.value.program = result.currentScene;
                result.scenes.forEach(scene => {
                    sceneList.value.push(scene.name);
                })
            });
        }

        // Fetch scene list limiter (because of a bug in OBS Websocket JS)
        function getScenesLimiter() {
            const now = +new Date();
            if (now - lastRun > 500) {
                lastRun = now;
                getScenes()
            }
        }

        // Set filename formatting.
        function setFilenameFormatting(filename) {
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
            obs.send('SetFilenameFormatting', { "filename-formatting": filename })
        }

        // Populate audio sources.
        function getAudioSources() {
            audioSources.value = [];
            obs.send('GetSourcesList').then(result => {
                result.sources.forEach(source => {
                    if (defaultValue.audioSourceTypes.includes(source.typeId)) {
                        obs.send('GetAudioActive', { sourceName: source.name }).then(result => {
                            if (source.typeId === 'browser_source') {
                                obs.send('GetSourceSettings', { sourceName: source.name }).then((data) => {
                                    switch (true) {
                                        case (data.sourceSettings.url.includes('/bundles/nodecg-marathon-control/graphics/streamPlayer/streamPlayer1.html')): activeRunners.value[0].source = source.name; break;
                                        case (data.sourceSettings.url.includes('/bundles/nodecg-marathon-control/graphics/streamPlayer/streamPlayer2.html')): activeRunners.value[1].source = source.name; break;
                                        case (data.sourceSettings.url.includes('/bundles/nodecg-marathon-control/graphics/streamPlayer/streamPlayer3.html')): activeRunners.value[2].source = source.name; break;
                                        case (data.sourceSettings.url.includes('/bundles/nodecg-marathon-control/graphics/streamPlayer/streamPlayer4.html')): activeRunners.value[3].source = source.name; break;
                                    }
                                }).catch((error) => websocketError(error));
                            }
                            getAudioSourceData(source.name, source.typeId)
                        }).catch((error) => websocketError(error));
                    }
                })
            }).catch((error) => websocketError(error));
        }

        function getAudioSourceData(source, type) {
            obs.send('GetVolume', { source: source, useDecibel: true }).then(result => {
                obs.send('GetSyncOffset', { source: source }).then(data => {
                    audioSources.value.push({ name: source, type: type, volume: result.volume.toFixed(1), muted: result.muted, offset: data.offset })
                }).catch((error) => websocketError(error));
            }).catch((error) => websocketError(error));
        }

        function updateCurrentScene(scene) {
            currentScene.value.program = scene;
            settings.value.inTransition = false;
            switch (scene) {
                case settings.value.intermissionScene: settings.value.inIntermission = true; break;
                default: settings.value.inIntermission = false; break;
            }
        }

        // Emergency Transition logic.
        function emergencyTransition() {
            settings.value.emergencyTransition = true;
            obs.send('SetPreviewScene', { "scene-name": settings.value.intermissionScene }).then(() => {
                obs.send('TransitionToProgram').catch((error) => websocketError(error));
                nodecg.log.warn('Emergency transition activated on ' + Date() + '.')
            }).catch((error) => websocketError(error));
        };

        // Error codes.
        function websocketError(error) {
            if (!connectionError) {
                switch (error.error) {
                    case 'Connection error.': nodecg.log.error('Could not connect to OBS. Wrong websocket address?'); process.exit(); break;
                    case 'Authentication Failed.': nodecg.log.error('OBS authentication failed. Wrong websocket password?'); process.exit(); break;
                    case 'There is no Socket connection available.': connectionLost(); break;
                    default: nodecg.log.error('OBS Error: ' + error.error); break;
                }
            }
        }

        function connectionLost() {
            if (!connectionError) {
                nodecg.log.error('Disconnected from OBS. Please check your connection.');
                let obsReconnect = setInterval(() => {
                    obs.connect({ address: nodecg.bundleConfig.websocketAddress, password: nodecg.bundleConfig.websocketPassword }).then(() => {
                        nodecg.log.info('Reconnected to OBS!');
                        connectionError = false;
                        clearInterval(obsReconnect);
                    }).catch((error) => { });
                }, 1000);
            }
        }
    })
}