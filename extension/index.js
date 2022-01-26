const OBSWebSocket = require('obs-websocket-js');
const path = require('path')
const getCurrentLine = require('get-current-line').default
const defaultValue = require('./defaultValues');
const DACBot = require('./bot');

module.exports = (nodecg) => {
    const obs = new OBSWebSocket();
    let lastRun = +new Date();
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
    const botSettings = nodecg.Replicant('botSettings', { defaultValue: defaultValue.botSettings }) // Bot settings.
    const botData = nodecg.Replicant('botData', { defaultValue: defaultValue.botData }) // Bot data.
    const adPlayer = nodecg.Replicant('adPlayer', { defaultValue: defaultValue.adPlayer }) // Ad player.
    const checklist = nodecg.Replicant('checklist', { defaultValue: defaultValue.checklist }) // Checklist tasks.
    const runDataActiveRun = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol') // Active run data from nodecg-speedcontrol.
    const timer = nodecg.Replicant('timer', 'nodecg-speedcontrol') // Timer from nodecg-speedcontrol.

    obs.connect({ address: nodecg.bundleConfig.address, password: nodecg.bundleConfig.password }).then(async () => {
        nodecg.log.info('Connected to OBS instance!')

        settings.value.emergencyTransition = false;
        streamSync.value.syncing = false;
        streamSync.value.startSync = false;
        adPlayer.value.adPlaying = false;

        // Get OBS data.
        obs.send('GetStreamingStatus').then(result => { settings.value.streaming = result.streaming; settings.value.recording = result.recording })
        obs.send('GetStudioModeStatus').then(result => {
            if (!result.studioMode) obs.send('EnableStudioMode').catch((error) => websocketError(error, getCurrentLine()));
            obs.send('GetPreviewScene').then(result => currentScene.value.preview = result.name).catch((error) => websocketError(error, getCurrentLine()))
            obs.send('GetCurrentScene').then(result => updateCurrentScene(result.name)).catch((error) => websocketError(error, getCurrentLine()))
        });

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
            if (streamSync.value.autoSync && (timer.value.state === 'running' || timer.value.state === 'paused')) getDelay(streamSync.value)
        }, 300000)

        // Listening for OBS events.
        obs.on('error', (error) => websocketError(error, getCurrentLine()));
        obs.on('Exiting', () => { connectionError = true; websocketError() });
        obs.on('StreamStatus', (data) => stats.value = data)
        obs.on('StreamStarted', () => settings.value.streaming = true)
        obs.on('StreamStopped', () => settings.value.streaming = false)
        obs.on('RecordingStarted', () => settings.value.recording = true)
        obs.on('RecordingStopped', () => settings.value.recording = false)
        obs.on('TransitionBegin', (data) => transitionBegin(data['to-scene']))
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
        nodecg.listenFor('startTransition', () => obs.send('TransitionToProgram').catch((error) => websocketError(error, getCurrentLine())));
        nodecg.listenFor('emergencyTransition', () => emergencyTransition())
        nodecg.listenFor('setVolume', (value) => obs.send('SetVolume', { source: value.source, volume: value.volume }).catch((error) => websocketError(error, getCurrentLine())));
        nodecg.listenFor('toggleMute', (value) => obs.send('ToggleMute', { source: value }).catch((error) => websocketError(error, getCurrentLine())));
        nodecg.listenFor('setOffset', (value) => obs.send('SetSyncOffset', { source: value.source, offset: value.offset }).catch((error) => websocketError(error, getCurrentLine())));
        nodecg.listenFor('toggleStream', () => obs.send('StartStopStreaming').catch((error) => websocketError(error, getCurrentLine())));
        nodecg.listenFor('toggleRecording', () => obs.send('StartStopRecording').catch((error) => websocketError(error, getCurrentLine())));
        nodecg.listenFor('restartMedia', (value) => obs.send('RefreshBrowserSource', { sourceName: value }).catch((error) => websocketError(error, getCurrentLine())));
        nodecg.listenFor('getAdSources', () => getAdSources());
        nodecg.listenFor('reauthenticate', () => {
            obs.disconnect();
            obs.connect({ address: nodecg.bundleConfig.address, password: nodecg.bundleConfig.password }).then(() => {
                nodecg.log.warn('Reauthentication requested on ' + Date() + '.')
            }).catch((error) => websocketError(error, getCurrentLine()));
        })

        // Change preview scene.
        currentScene.on('change', (newVal) => { if (newVal !== undefined) obs.send('SetPreviewScene', { "scene-name": newVal.preview }).catch((error) => websocketError(error, getCurrentLine())); });

        // Change filename formatting.
        autoRecord.on('change', (newVal) => { if (newVal.active) setFilenameFormatting(newVal.filenameFormatting) })

        // Auto set streamkey.
        runDataActiveRun.on('change', (newVal, oldVal) => {
            if (checklist.value.started) checklist.value.playRun = true;
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
                if (settings.value.autoSetLayout && newVal.customData !== undefined && newVal.customData.layout !== undefined) try { currentScene.value.preview = newVal.customData.layout } catch { }
                if (autoRecord.value.active) setFilenameFormatting(autoRecord.value.filenameFormatting)
            }
        })

        // Auto record logic.
        settings.on('change', (newVal, oldVal) => {
            if (autoRecord.value.active && (oldVal !== undefined && newVal.inIntermission !== oldVal.inIntermission)) {
                if (!newVal.inIntermission && !settings.value.recording && !adPlayer.value.adPlaying) {
                    settings.value.emergencyTransition = false;
                    obs.send('StartRecording').catch((error) => websocketError(error, getCurrentLine()));
                }
                else if (!newVal.inIntermission) settings.value.emergencyTransition = false;
                else if (newVal.inIntermission && settings.value.recording && !settings.value.emergencyTransition) obs.send('StopRecording').catch((error) => websocketError(error, getCurrentLine()));
            }
        })

        streamSync.on('change', (newVal) => {
            if (newVal.startSync && !newVal.syncing) getDelay(newVal);
        })

        adPlayer.on('change', (newVal, oldVal) => {
            if (oldVal === undefined || oldVal.videoScene !== newVal.videoScene) getAdSources();
            else if (!oldVal.adPlaying && newVal.adPlaying) playAds(newVal);
        })

        checklist.on('change', (newVal) => {
            if (newVal.playRun && newVal.playAd && newVal.verifyStream && newVal.syncStreams && newVal.checkAudio && newVal.checkInfo && newVal.checkReady && newVal.finalCheck) checklist.value.completed = true;
            else checklist.value.completed = false;
        })

        // Get stream delay.
        function getDelay(newVal) {
            streamSync.value.error = false;
            streamSync.value.syncing = true;
            if (newVal.startSync) nodecg.log.info('Stream sync requested on ' + Date() + '.');
            let returnValue = [false, false, false, false];
            for (let i = 0; i < 4; i++) {
                if (activeRunners.value[i].streamKey === '') {
                    returnValue[i] = true;
                    streamSync.value.delay[i] = null;
                }
            }
            let time = Date.now()
            nodecg.sendMessage('flashSquare');
            nodecg.sendMessage('getDelay', time);
            nodecg.listenFor('returnDelay', (index) => returnValue[index] = true);
            let checkNum = 0;
            const waitForReturn = setInterval(() => {
                if (returnValue.every(value => value === true)) {
                    clearInterval(waitForReturn);
                    syncStreams()
                }
                checkNum++;
                if (checkNum > 120) {
                    clearInterval(waitForReturn);
                    streamSync.value.error = true;
                    streamSync.value.syncing = false;
                    streamSync.value.startSync = false;
                    checklist.value.syncStreams = true;
                }
            }, 250)
        }

        // Stream Sync™
        function syncStreams(auto) {
            let newVal = streamSync.value;
            let filteredArray = newVal.delay.filter(e => e)
            let biggestDelay = Math.max(...filteredArray)
            let smallestDelay = Math.min(...filteredArray)
            if (newVal.startSync || (newVal.autoSync && (biggestDelay - smallestDelay) > newVal.maxOffset) && filteredArray.length > 1) {
                if (auto) nodecg.log.info('Auto stream sync activated on ' + Date() + '.')
                let syncArray = [];
                newVal.delay.forEach(delay => {
                    switch (delay) {
                        case null: syncArray.push(null); break;
                        default: syncArray.push(biggestDelay - delay); break;
                    }
                })
                nodecg.sendMessage('syncStreams', syncArray)
                setTimeout(() => {
                    streamSync.value.syncing = false;
                    streamSync.value.startSync = false;
                    checklist.value.syncStreams = true;
                    let array = newVal.delay;
                    for (let i = 0; i < 4; i++) {
                        if (array[i] !== null) array[i] = array[i] + syncArray[i];
                    }
                    streamSync.value.delay = array;
                }, Math.max(...syncArray));
            }
            else {
                streamSync.value.syncing = false;
                checklist.value.syncStreams = true;
                streamSync.value.startSync = false;
            }
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
                        if (source.typeId === 'browser_source') {
                            obs.send('GetSourceSettings', { sourceName: source.name }).then((data) => {
                                if (data.sourceSettings['reroute_audio'] !== undefined && data.sourceSettings['reroute_audio']) {
                                    switch (true) {
                                        case (data.sourceSettings.url.includes('/bundles/nodecg-marathon-control/graphics/streamPlayer/streamPlayer1.html')): activeRunners.value[0].source = source.name; break;
                                        case (data.sourceSettings.url.includes('/bundles/nodecg-marathon-control/graphics/streamPlayer/streamPlayer2.html')): activeRunners.value[1].source = source.name; break;
                                        case (data.sourceSettings.url.includes('/bundles/nodecg-marathon-control/graphics/streamPlayer/streamPlayer3.html')): activeRunners.value[2].source = source.name; break;
                                        case (data.sourceSettings.url.includes('/bundles/nodecg-marathon-control/graphics/streamPlayer/streamPlayer4.html')): activeRunners.value[3].source = source.name; break;
                                    }
                                    getAudioSourceData(source.name, source.typeId)
                                }
                            }).catch((error) => websocketError(error, getCurrentLine()));
                        }
                        else getAudioSourceData(source.name, source.typeId)
                    }
                })
            }).catch((error) => websocketError(error, getCurrentLine()));
        }

        function getAudioSourceData(source, type) {
            obs.send('GetVolume', { source: source, useDecibel: true }).then(result => {
                obs.send('GetSyncOffset', { source: source }).then(data => {
                    audioSources.value.push({ name: source, type: type, volume: result.volume.toFixed(1), muted: result.muted, offset: data.offset })
                }).catch((error) => websocketError(error, getCurrentLine()));
            }).catch((error) => websocketError(error, getCurrentLine()));
        }

        // Ad player.
        function playAds(newVal) {
            nodecg.log.info('Ad requested on ' + Date() + '.')
            let secondsLeft = 0;
            let transitionTime = 0;
            let videoSource = null;
            obs.send('GetTransitionDuration').then(result => transitionTime = result['transition-duration']);
            if (newVal.videoAds && newVal.twitchAds) {
                videoSource = newVal.videoSources[Math.floor(Math.random() * newVal.videoSources.length)];
                secondsLeft = Math.ceil((videoSource.duration + newVal.twitchAdLength + (transitionTime * 2)) / 1000);
            }
            else if (newVal.videoAds) {
                videoSource = newVal.videoSources[Math.floor(Math.random() * newVal.videoSources.length)];
                secondsLeft = Math.ceil((videoSource.duration + (transitionTime * 2)) / 1000);
            }
            else if (newVal.twitchAds) newVal.twitchAdLength;
            const timerInterval = setInterval(() => {
                adPlayer.value.secondsLeft = secondsLeft;
                secondsLeft--;
                if (secondsLeft < 0) {
                    clearInterval(timerInterval);
                    adPlayer.value.secondsLeft = 0;
                    adPlayer.value.adPlaying = false;
                    checklist.value.playAd = true;
                }
            }, 1000);

            if (newVal.videoAds && newVal.videoScene !== null) {
                playVideo(newVal);
                setTimeout(() => {
                    if (newVal.twitchAds) playTwitch(newVal);
                }, Math.ceil(videoSource.duration + transitionTime))
            }
            else if (newVal.playTwitch) playTwitch(newVal)

            function playVideo(newVal) {
                let previewScene = currentScene.value.preview;
                obs.send('SetCurrentScene', { "scene-name": newVal.videoScene }).then(() => {
                    obs.once('TransitionEnd', () => {
                        obs.send('RestartMedia', { sourceName: videoSource.source })
                        setTimeout(() => obs.send('SetPreviewScene', { "scene-name": previewScene }), 1000)
                        setTimeout(() => {
                            previewScene = currentScene.value.preview;
                            obs.send('SetCurrentScene', { "scene-name": settings.value.intermissionScene }).then(() => {
                                obs.once('TransitionEnd', () => setTimeout(() => obs.send('SetPreviewScene', { "scene-name": previewScene }), 1000))
                            })
                        }, videoSource.duration + 1000);
                    });
                });
            }

            function playTwitch(newVal) {
                nodecg.sendMessageToBundle('twitchStartCommercial', 'nodecg-speedcontrol', { duration: newVal.twitchAdLength, fromDashboard: false })
                    .then(() => nodecg.sendMessageToBundle('twitchStartCommercialTimer', 'nodecg-speedcontrol', { duration: newVal.twitchAdLength }))
                    .catch(() => {
                        nodecg.log.error('Error playing Twitch ads. Are you sure your channel is an affiliate or partner?')
                        clearInterval(timerInterval);
                        adPlayer.value.adPlaying = false;
                        checklist.value.playAd = true;
                    });
            }
        }

        // Get ad player sources. 
        function getAdSources() {
            adPlayer.value.videoSources = [];
            obs.send('GetSceneItemList', { sceneName: adPlayer.value.videoScene }).then(result => {
                result.sceneItems.forEach(source => {
                    if (source.sourceKind === 'ffmpeg_source') obs.send('GetMediaDuration', { sourceName: source.sourceName }).then(duration => adPlayer.value.videoSources.push({ source: source.sourceName, duration: duration.mediaDuration })).catch((error) => websocketError(error, getCurrentLine()));
                })
            }).catch((error) => websocketError(error, getCurrentLine()));
        }

        function transitionBegin(scene) {
            settings.value.inTransition = true;
            if (!adPlayer.value.adPlaying && scene !== settings.value.intermissionScene) {
                settings.value.inIntermission = false;
                let runnerSources = activeRunners.value;
                if (!adPlayer.value.adPlaying) {
                    runnerSources.forEach(source => {
                        obs.send('SetAudioMonitorType', { sourceName: source.source, monitorType: 'monitorAndOutput' }).catch((error) => websocketError(error, getCurrentLine()));
                    })
                }
            }
        }

        function updateCurrentScene(scene) {
            currentScene.value.program = scene;
            settings.value.inTransition = false;
            if (scene === settings.value.intermissionScene) {
                settings.value.inIntermission = true;
                let runnerSources = activeRunners.value;
                runnerSources.forEach(source => {
                    obs.send('SetAudioMonitorType', { sourceName: source.source, monitorType: 'monitorOnly' }).catch((error) => websocketError(error, getCurrentLine()));
                })
                if (timer.value.state === 'finished') {
                    checklist.value = {
                        started: true,
                        completed: false,
                        playRun: false,
                        playAd: false,
                        verifyStream: false,
                        syncStreams: false,
                        checkAudio: false,
                        checkInfo: false,
                        checkReady: false,
                        finalCheck: false
                    }
                    if (!adPlayer.value.videoAds && !adPlayer.value.twitchAds) checklist.value.playAd = true;
                }
            }
            else settings.value.emergencyTransition = false; 
        }

        // Emergency Transition logic.
        function emergencyTransition() {
            settings.value.emergencyTransition = true;
            nodecg.sendMessageToBundle('timerPause', 'nodecg-speedcontrol');
            obs.send('SetPreviewScene', { "scene-name": settings.value.intermissionScene }).then(() => {
                obs.send('TransitionToProgram').catch((error) => websocketError(error, getCurrentLine()));
                nodecg.log.warn('Emergency transition activated on ' + Date() + '.')
            }).catch((error) => websocketError(error, getCurrentLine()));
        };
    }).catch(() => { nodecg.log.error('Could not connect to OBS. Wrong websocket address?'); process.exit(); });

    // Error codes.
    function websocketError(error, line) {
        if (!connectionError && error !== undefined) {
            switch (error.error) {
                case 'Authentication Failed.': nodecg.log.error('OBS authentication failed. Wrong websocket password?'); process.exit(); break;
                case 'There is no Socket connection available.': connectionLost(); break;
                default: nodecg.log.error('An OBS error has occured at line ' + line.line + '\n' + JSON.stringify(error)); break;
            }
        }
        else {
            nodecg.log.error('Disconnected from OBS. Please check your connection.');
            const obsReconnect = setInterval(() => {
                obs.connect({ address: nodecg.bundleConfig.address, password: nodecg.bundleConfig.password }).then(() => {
                    nodecg.log.info('Reconnected to OBS!');
                    connectionError = false;
                    clearInterval(obsReconnect);
                }).catch((error) => { nodecg.log.warn(JSON.stringify(error)) });
            }, 5000);
        }
    }
}
