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
    active: false,
    maxOffset: 500,
    syncing: false,
    forceSync: false,
    delay: [null, null, null, null, null]
}

module.exports.autoRecord = {
    active: false,
    filenameFormatting: '%CCYY-%MM-%DD %hh-%mm-%ss',
}

module.exports.settings = {
    previewCode: '',
    programCode: '',
    inTransition: false,
    emergencyTransition: false,
    streaming: false,
    recording: false,
    intermissionScene: '',
    autoSetLayout: false,
    autoSetRunners: false,
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