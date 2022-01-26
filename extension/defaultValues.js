module.exports.audioSourceTypes = [
    'wasapi_input_capture',
    'wasapi_output_capture',
    'pulse_input_capture',
    'pulse_output_capture',
    'browser_source',
    'ffmpeg_source',
    'vlc_source'
];

module.exports.activeRunners = [
    {
        source: 'Player 1',
        streamKey: '',
        cam: false
    },
    {
        source: 'Player 2',
        streamKey: '',
        cam: false
    },
    {
        source: 'Player 3',
        streamKey: '',
        cam: false
    },
    {
        source: 'Player 4',
        streamKey: '',
        cam: false
    }
];

module.exports.streamSync = {
    syncing: false,
    startSync: false,
    autoSync: false,
    maxOffset: 500,
    error: false,
    delay: [null, null, null, null]
}

module.exports.autoRecord = {
    active: false,
    filenameFormatting: '%CCYY-%MM-%DD %hh-%mm-%ss',
}

module.exports.botData = {
    connected: false,
    users: {},
}

module.exports.botSettings = {
    active: false,
    channel: null,
    outputDevice: -1,
    outputSource: null,
    channels: {},
    devices: {}
}

module.exports.settings = {
    previewCode: '',
    programCode: '',
    inIntermission: false,
    inTransition: false,
    emergencyTransition: false,
    streaming: false,
    recording: false,
    intermissionScene: '',
    autoSetLayout: false,
    autoSetRunners: false,
    forceChecklist: false,
    firstLaunch: true
};

module.exports.stats = {
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
};

module.exports.checklist = {
    started: false,
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

module.exports.adPlayer = {
    adPlaying: false,
    videoAds: false,
    twitchAds: false,
    twitchAdLength: 0,
    secondsLeft: 0,
    videoScene: null,
    videoSources: []
}