const OBSWebSocket = require('obs-websocket-js');
const { setDefaultLayoutProperties, setDefaultIntermissionProperties, statsValue } = require('./defaultValues');

module.exports = function (nodecg) {
    const obs = new OBSWebSocket();
    let connectionError = false;

    // Initialize replicants.
    const activeRunners = nodecg.Replicant('activeRunners', { defaultValue: [{ name: '', quality: 'Auto', mute: true, cam: false }, { name: '', quality: 'Auto', mute: true, cam: false }, { name: '', quality: 'Auto', mute: true, cam: false }, { name: '', quality: 'Auto', mute: true, cam: false }] });
    const streamStatus = nodecg.Replicant('streamStatus', { defaultValue: { streaming: false, recording: false } });
    const sceneList = nodecg.Replicant('sceneList', { persistent: false });
    const currentScene = nodecg.Replicant('currentScene', { defaultValue: { preview: "", program: "" } });
    const currentLayout = nodecg.Replicant('currentLayout');
    const currentCrop = nodecg.Replicant('currentCrop');
    const audioSources = nodecg.Replicant('audioSources');
    const showBorders = nodecg.Replicant('showBorders', { defaultValue: false })
    const fontFaces = nodecg.Replicant('fontFaces', { defaultValue: [] })
    const intermissionProperties = nodecg.Replicant('intermissionProperties', { defaultValue: [] });

    const timerColors = nodecg.Replicant('timerColors', { defaultValue: { running: 'FFFFFF', stopped: 'FFFFFF', paused: 'FFFFFF', finished: 'FFFFFF' } })

    const layoutList = nodecg.Replicant('assets:game-layouts');
    const layoutProperties = nodecg.Replicant('layoutProperties', { defaultValue: [] })
    const stats = nodecg.Replicant('stats', { defaultValue: statsValue });

    const settings = nodecg.Replicant('settings', {
        defaultValue: {
            previewURL: '',
            programURL: '',
            streaming: false,
            recording: false,
            intermissionScene: '',
            gameScene: '',
            autoRecord: false,
            emergencyTransition: false
        }
    })

    obs.connect({ address: nodecg.bundleConfig.websocketAddress, password: nodecg.bundleConfig.websocketPassword }).then(async () => {
        nodecg.log.info('Connected to OBS instance!')

        // Get OBS data.
        obs.send('GetStudioModeStatus').then(result => {
            if (!result['studio-mode'])
                obs.send('EnableStudioMode').catch((error) => websocketError(error));
        }).catch((error) => websocketError(error));

        obs.send('GetSceneList').then(result => {
            sceneList.value = result.scenes;
            currentScene.value.program = result.currentScene;
        }).catch((error) => websocketError(error));

        obs.send('GetPreviewScene').then(result => currentScene.value.preview = result.name).catch((error) => websocketError(error));
        getAudioSources()

        // Listening for OBS events.
        obs.on('error', (error) => websocketError(error));
        obs.on('Exiting', () => connectionLost());
        obs.on('StreamStatus', (data) => stats.value = data)
        obs.on('StreamStarted', () => settings.value.streaming = true)
        obs.on('StreamStopped', () => settings.value.streaming = false)
        obs.on('RecordingStarted', () => settings.value.recording = true)
        obs.on('RecordingStopped', () => settings.value.recording = false)
        obs.on('TransitionBegin', () => nodecg.sendMessage('transitionBegin'))
        obs.on('TransitionEnd', () => toggleAutoRecord())
        obs.on('SourceCreated', () => getAudioSources())
        obs.on('SourceDestroyed', () => getAudioSources())
        obs.on('SourceVolumeChanged', (data) => {
            audioSources.value.forEach(element => {
                if (element.name === data.sourceName) {
                    element.volume = data.volume;
                }
            })
        })
        obs.on('SourceMuteStateChanged', (data) => {
            audioSources.value.forEach(element => {
                if (element.name === data.sourceName) {
                    element.muted = data.muted;
                }
            })
        })
        obs.on('SourceAudioSyncOffsetChanged', (data) => {
            audioSources.value.forEach(element => {
                if (element.name === data.sourceName) {
                    element.offset = data.syncOffset;
                }
            })
        })

        // Listening for requests from clients.
        nodecg.listenFor('setVolume', (value) => obs.send('SetVolume', { source: value.source, volume: value.volume }))
        nodecg.listenFor('setMute', (value) => obs.send('SetMute', { source: value.source, mute: value.mute }))
        nodecg.listenFor('setOffset', (value) => obs.send('SetSyncOffset', { source: value.source, offset: value.offset }))
        nodecg.listenFor('transitionToProgram', () => obs.send('TransitionToProgram'))

        if (intermissionProperties.value.length < 27)
            setDefaultIntermissionProperties((callback) => intermissionProperties.value = callback);

        // Update layout element properties.
        setTimeout(() => {
            layoutList.on('change', (newVal) => {
                let missingItems = [];
                let duplicateItems = [];
                newVal.forEach(element => {
                    if (!layoutProperties.value.some(item => item.layout === element.name)) {
                        missingItems.push(element.name)
                    }
                });
                layoutProperties.value.forEach(element => {
                    if (!newVal.some(item => item.name === element.layout)) {
                        duplicateItems.push(element.layout)
                    }
                })
                duplicateItems.forEach(element => layoutProperties.value.splice(layoutProperties.value.findIndex(obj => obj.layout === element), 1));
                missingItems.forEach(element => setDefaultLayoutProperties(element, (callback) => layoutProperties.value.push(callback)))
            })
        }, 1000)

        // Populate audio sources.
        async function getAudioSources() {
            const audioSourceTypes = ['wasapi_input_capture', 'wasapi_output_capture', 'pulse_input_capture', 'pulse_output_capture', 'browser_source', 'ffmpeg_source', 'vlc_source']
            let audioSourcesList = [];
            let sortedArray = [];
            let getSourceVolume, getSourceSyncOffset;
            obs.send('GetSourcesList').then(async result => {
                result.sources.forEach(source => {
                    if (audioSourceTypes.includes(source.typeId))
                        audioSourcesList.push(source.name)
                })
                audioSourcesList.forEach(element => {
                    getSourceVolume = obs.send('GetVolume', { source: element }).then(result => {
                        getSourceSyncOffset = obs.send('GetSyncOffset', { source: element }).then(data => {
                            sortedArray.push({ name: element, volume: result.volume, muted: result.muted, offset: data.offset })
                        }).catch((error) => websocketError(error));
                    }).catch((error) => websocketError(error));
                });
                await getSourceVolume;
                await getSourceSyncOffset;
                audioSources.value = sortedArray;
            });
        };

        // Auto-Record logic.
        function toggleAutoRecord() {
            nodecg.sendMessage('transitionEnd')
            if (settings.value.autoRecord) {
                if (data.toScene !== settings.value.intermissionScene && !streamStatus.value.recording) {
                    obs.send('StartRecording').catch((error) => websocketError(error));
                    settings.value.emergencyTransition.value = false;
                }
                else if (data.toScene === settings.value.intermissionScene && streamStatus.value.recording && !settings.value.emergencyTransition)
                    obs.send('StopRecording').catch((error) => websocketError(error));
            }
        }

        // Emergency Transition logic.
        settings.on('change', (newVal) => {
            if (newVal.emergencyTransition) {
                obs.send('SetPreviewScene', { "scene-name": newVal.intermissionScene }).then(() => {
                    obs.send('TransitionToProgram').catch((error) => websocketError(error));
                    nodecg.log.warn('Emergency transition activated on ' + Date() + '.')
                }).catch((error) => websocketError(error));
            }
        });

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