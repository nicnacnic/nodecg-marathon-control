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
        source: null,
        streamKey: null,
        server: null,
        cam: false
    },
    {
        source: null,
        streamKey: null,
        server: null,
        cam: false
    },
    {
        source: null,
        streamKey: null,
        server: null,
        cam: false
    },
    {
        source: null,
        streamKey: null,
        server: null,
        cam: false
    }
];

module.exports.streamSync = {
    active: false,
    status: {
        delays: false,
        syncing: false,
        error: false,
    },
    autoSync: false,
    maxOffset: 500,
    delay: [null, null, null, null],
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
    websocketURL: null,
    channel: null,
    audioOffset: 675,
    channels: {}
}

module.exports.settings = {
    previewCode: '',
    programCode: '',
    intermissionScene: '',
    autoRecord: false,
    filenameFormatting: '%CCYY-%MM-%DD %hh-%mm-%ss',
    autoSetLayout: false,
    autoSetRunners: false,
    forceChecklist: false,
    firstLaunch: true
};

module.exports.status = {
    previewScene: '',
    programScene: '',
    inIntermission: false,
    inTransition: false,
    emergencyTransition: false,
    streaming: false,
    recording: false,
}

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
    default: {
        playRun: false,
        playAd: false,
        verifyStream: false,
        syncStreams: false,
        checkAudio: false,
        checkInfo: false,
        checkReady: false,
        finalCheck: false
    },
    custom: {},
    customOld: {}
}

module.exports.adPlayer = {
    adPlaying: false,
    videoAds: false,
    twitchAds: false,
    twitchAdLength: 0,
    secondsLeft: 0,
    videoScene: null,
}