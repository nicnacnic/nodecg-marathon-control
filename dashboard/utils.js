const activeRunners = nodecg.Replicant('activeRunners')
const currentScene = nodecg.Replicant('currentScene')
const sceneList = nodecg.Replicant('sceneList')
const audioSources = nodecg.Replicant('audioSources')
const audioData = nodecg.Replicant('audioData')
const stats = nodecg.Replicant('stats')
const settings = nodecg.Replicant('settings')
const streamSync = nodecg.Replicant('streamSync')
const autoRecord = nodecg.Replicant('autoRecord')
const botData = nodecg.Replicant('botData')
const botSpeaking = nodecg.Replicant('botSpeaking')
const botSettings = nodecg.Replicant('botSettings')
const adPlayer = nodecg.Replicant('adPlayer')
const obsStatus = nodecg.Replicant('obsStatus')
const checklist = nodecg.Replicant('checklist')

NodeCG.waitForReplicants(
    activeRunners,
    currentScene,
    sceneList,
    audioSources,
    stats,
    settings,
    streamSync,
    autoRecord,
    botSpeaking,
    botSettings,
    adPlayer,
    obsStatus,
    checklist
    ).then(() => {
    try { load() } catch {};
})