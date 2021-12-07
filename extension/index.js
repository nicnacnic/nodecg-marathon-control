const OBSWebSocket = require('obs-websocket-js');
const defaultValue = require('./defaultValues');

module.exports = function (nodecg) {
    const obs = new OBSWebSocket();
    let connectionError = false;

    // Initialize replicants.
    const activeRunners = nodecg.Replicant('activeRunners', { defaultValue: defaultValue.activeRunners }); // Active runner data.
    const currentScene = nodecg.Replicant('currentScene', { defaultValue: { preview: '', program: '' } }); // Current scene in OBS.
    const sceneList = nodecg.Replicant('sceneList', { persistent: false, defaultValue: [] }); // List of all available scenes.
    const audioSources = nodecg.Replicant('audioSources'); // List of all OBS audio sources.
    const stats = nodecg.Replicant('stats', { persistent: false, defaultValue: defaultValue.stats }); // All OBS stats.
    const settings = nodecg.Replicant('settings', { defaultValue: defaultValue.settings }) // All dashboard settings.
    const streamSync = nodecg.Replicant('streamSync', { defaultValue: defaultValue.streamSync }) // Stream Sync data.
    const autoRecord = nodecg.Replicant('autoRecord', { defaultValue: defaultValue.autoRecord }) // Auto Record settings
    const runDataActiveRun = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol') // Active run data from nodecg-speedcontrol.

    obs.connect({ address: nodecg.bundleConfig.address, password: nodecg.bundleConfig.password }).then(async () => {
        nodecg.log.info('Connected to OBS instance!')

        settings.value.emergencyTransition = false;
        streamSync.value.syncing = false;

        // Get OBS data.
        obs.send('GetStreamingStatus').then(result => { settings.value.streaming = result.streaming; settings.value.recording = result.recording })
        obs.send('GetStudioModeStatus').then(result => { if (!result.studioMode) obs.send('EnableStudioMode').catch((error) => websocketError(error)) });
        obs.send('GetPreviewScene').then(result => currentScene.value.preview = result.name).catch((error) => websocketError(error));
        obs.send('GetSceneList').then(result => {
            currentScene.value.program = result.currentScene;
            result.scenes.forEach(scene => {
                sceneList.value.push(scene.name);
            })
        });

        // Get audio sources.
        getAudioSources();

        // Get stream latency.
        setInterval(() => nodecg.sendMessage('getStreamLatency'), 2000)

        // Listening for OBS events.
        obs.on('error', (error) => websocketError(error));
        obs.on('Exiting', () => connectionLost());
        obs.on('StreamStatus', (data) => stats.value = data)
        obs.on('StreamStarted', () => settings.value.streaming = true)
        obs.on('StreamStopped', () => settings.value.streaming = false)
        obs.on('RecordingStarted', () => settings.value.recording = true)
        obs.on('RecordingStopped', () => settings.value.recording = false)
        obs.on('TransitionBegin', () => settings.value.inTransition = true)
        obs.on('TransitionEnd', (data) => toggleAutoRecord(data))
        obs.on('SourceCreated', () => getAudioSources())
        obs.on('SourceDestroyed', () => getAudioSources())
        obs.on('ScenesChanged', (data) => sceneList.value = data.scenes)
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

        // Stream Sync™ 
        streamSync.on('change', (newVal) => {
            let filteredArray = newVal.delay.filter(e => e)
            let biggestDelay = Math.max(...filteredArray)
            let smallestDelay = Math.min(...filteredArray)
            if (newVal.forceSync || (newVal.active && (biggestDelay - smallestDelay) > newVal.maxOffset) && !newVal.syncing && filteredArray.length > 1) {
                nodecg.log.info('Stream sync requested on ' + Date() + '.')
                streamSync.value.syncing = true;
                streamSync.value.forceSync = false;
                let syncArray = [];
                newVal.delay.forEach(delay => {
                    switch (delay) {
                        case null: syncArray.push(null); break;
                        default: syncArray.push(biggestDelay - delay); break;
                    }
                })
                nodecg.sendMessage('syncStreams', (syncArray))
                setTimeout(() => streamSync.value.syncing = false, Math.max(...syncArray));
            }
        })

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
                            if (result.audioActive && source.typeId === 'browser_source') {
                                obs.send('GetSourceSettings', { sourceName: source.name }).then((data) => {
                                    switch (true) {
                                        case (data.sourceSettings.url.includes('streamPlayer1')): activeRunners.value[0].source = source.name; break;
                                        case (data.sourceSettings.url.includes('streamPlayer2')): activeRunners.value[1].source = source.name; break;
                                        case (data.sourceSettings.url.includes('streamPlayer3')): activeRunners.value[2].source = source.name; break;
                                        case (data.sourceSettings.url.includes('streamPlayer4')): activeRunners.value[3].source = source.name; break;
                                    }
                                    getAudioSourceData(source.name)
                                }).catch((error) => websocketError(error));
                            }
                            else if (result.audioActive)
                                getAudioSourceData(source.name)
                        }).catch((error) => websocketError(error));
                    }
                })
            }).catch((error) => websocketError(error));
        }

        function getAudioSourceData(source) {
            obs.send('GetVolume', { source: source, useDecibel: true }).then(result => {
                obs.send('GetSyncOffset', { source: source }).then(data => {
                    audioSources.value.push({ name: source, volume: result.volume.toFixed(1), muted: result.muted, offset: data.offset })
                }).catch((error) => websocketError(error));
            }).catch((error) => websocketError(error));
        }

        // Auto-Record logic.
        function toggleAutoRecord(data) {
            settings.value.inTransition = false;
            currentScene.value.program = data.toScene;
            if (autoRecord.value.active) {
                if (data.toScene !== settings.value.intermissionScene && !settings.value.recording) {
                    settings.value.emergencyTransition = false;
                    obs.send('StartRecording').catch((error) => websocketError(error));
                }
                else if (data.toScene !== settings.value.intermissionScene) settings.value.emergencyTransition = false;
                else if (data.toScene === settings.value.intermissionScene && settings.value.recording && !settings.value.emergencyTransition) obs.send('StopRecording').catch((error) => websocketError(error));
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