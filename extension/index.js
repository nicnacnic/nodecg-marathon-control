const OBSWebSocket = require('obs-websocket-js');
const { websocketError } = require('./utils')
const { setDefaultLayoutProperties, setDefaultIntermissionProperties } = require('./defaultValues')

module.exports = function (nodecg) {
    const obs = new OBSWebSocket();

    // Initialize replicants.
    const activeRunners = nodecg.Replicant('activeRunners', { defaultValue: [{ name: '', quality: 'Auto', mute: true, cam: false }, { name: '', quality: 'Auto', mute: true, cam: false }, { name: '', quality: 'Auto', mute: true, cam: false }, { name: '', quality: 'Auto', mute: true, cam: false }] });
    const quality = nodecg.Replicant('quality', { defaultValue: 'Auto' })
    const streamStatus = nodecg.Replicant('streamStatus');
    const sceneList = nodecg.Replicant('sceneList', { persistent: false });
    const currentScene = nodecg.Replicant('currentScene', { defaultValue: { preview: "", program: "" } });
    const currentLayout = nodecg.Replicant('currentLayout');
    const currentCrop = nodecg.Replicant('currentCrop');
    const cropItems = nodecg.Replicant('cropItems');
    const audioSources = nodecg.Replicant('audioSources');
    const previewProgram = nodecg.Replicant('previewProgram', { persistent: false });
    const emergencyTransition = nodecg.Replicant('emergencyTransition', false);
    const autoRecord = nodecg.Replicant('autoRecord', { defaultValue: false });
    const showBorders = nodecg.Replicant('showBorders', { defaultValue: false })
    const fontFaces = nodecg.Replicant('fontFaces', { defaultValue: [] })
    const intermissionProperties = nodecg.Replicant('intermissionProperties', { defaultValue: [] });

    const timerColors = nodecg.Replicant('timerColors', { defaultValue: { running: 'FFFFFF', stopped: 'FFFFFF', paused: 'FFFFFF', finished: 'FFFFFF' } })

    const layoutList = nodecg.Replicant('assets:game-layouts');
    const layoutProperties = nodecg.Replicant('layoutProperties', { defaultValue: [] })
    const stats = nodecg.Replicant('stats', {
        defaultValue: {
            cpuUsage: 0.00,
            fps: 0.00,
            kbitsPerSec: 0000,
            averageFrameTime: 0.0,
            renderMissedFrames: 0,
            renderTotalFrames: 0,
            outputSkippedFrames: 0,
            outputTotalFrames: 0,
            numDroppedFrames: 0,
            numTotalFrames: 0,
            totalStreamTime: 0,
            freeDiskSpace: 0
        }
    });

    obs.on('error', error => {
        websocketError(error)
    });

    obs.connect({ address: "localhost:4444", password: "Kunodaddy" }).then(async () => {
        nodecg.log.info('Connected to OBS instance!')

        obs.on('error', error => {
            websocketError(error)
        });

        // Get OBS data.
        getAudioSources()
        obs.send('GetStudioModeStatus').then(result => {
            if (!result['studio-mode'])
                nodecg.log.error('Studio mode not enabled! Enable studio mode in OBS then restart NodeCG.')
        }).catch((error) => websocketError(error));

        obs.send('GetSceneList').then(result => {
            sceneList.value = result.scenes;
            currentScene.value.program = result.currentScene;
        }).catch((error) => websocketError(error));

        obs.send('GetPreviewScene').then(result => {
            currentScene.value.preview = result.name;
            const blockedTypes = ['wasapi_input_capture', 'wasapi_output_capture', 'pulse_input_capture', 'pulse_output_capture', 'group'];
            let sourceArray = [];
            for (let i = 0; i < result.sources.length; i++) {
                if (!blockedTypes.includes(result.sources[i].type))
                    sourceArray.push(result.sources[i].name)
            }
            if (sourceArray.length > 0)
                cropItems.value = sourceArray;
            else
                cropItems.value = '';

        }).catch((error) => websocketError(error));

        // Listening for OBS events.
        obs.on('StreamStatus', (data) => stats.value = data)
        obs.on('PreviewSceneChanged', (data) => {
            const blockedTypes = ['wasapi_input_capture', 'wasapi_output_capture', 'pulse_input_capture', 'pulse_output_capture', 'group']
            let sourceArray = [];
            currentScene.value.preview = data.sceneName;
            for (let i = 0; i < data.sources.length; i++) {
                if (!blockedTypes.includes(data.sources[i].type))
                    sourceArray.push(data.sources[i].name)
            }
            if (sourceArray.length > 0)
                cropItems.value = sourceArray;
            else
                cropItems.value = '';
        })
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
        obs.on('SourceCreated', () => getAudioSources())
        obs.on('SourceDestroyed', () => getAudioSources())

        // Listening for requests from clients.
        nodecg.listenFor('setVolume', (value) => obs.send('SetVolume', { source: value.source, volume: value.volume }))
        nodecg.listenFor('setMute', (value) => obs.send('SetMute', { source: value.source, mute: value.mute }))
        nodecg.listenFor('setOffset', (value) => obs.send('SetSyncOffset', { source: value.source, offset: value.offset }))
    })

    if (intermissionProperties.value.length < 27)
        setDefaultIntermissionProperties((callback) => intermissionProperties.value = callback);

    setTimeout(function () {

        // Update layout element properties.
        layoutList.on('change', (newVal, oldVal) => {
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
            duplicateItems.forEach(element => {
                layoutProperties.value.splice(layoutProperties.value.findIndex(obj => obj.layout === element), 1)
            });
            missingItems.forEach(element => {
                setDefaultLayoutProperties(element, (callback) => layoutProperties.value.push(callback));
            })
        })
    }, 1000)

    // Populate audio sources.
    async function getAudioSources() {
        const audioSourceTypes = ['wasapi_input_capture', 'wasapi_output_capture', 'pulse_input_capture', 'pulse_output_capture', 'browser_source', 'ffmpeg_source', 'vlc_source']
        let audioSourcesList = [];
        let sortedArray = [];
        let getSourceVolume, getSourceSyncOffset;
        obs.send('GetSourcesList').then(async result => {
            for (let i = 0; i < result.sources.length; i++) {
                if (audioSourceTypes.includes(result.sources[i].typeId))
                    audioSourcesList.push(result.sources[i].name);
            }
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
};