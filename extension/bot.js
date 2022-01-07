const fs = require('fs')
const path = require("path");
const portAudio = require('naudiodon')
const prism = require('prism-media')
const { Mixer } = require('audio-mixer');
const { Client, Intents } = require('discord.js');
const { joinVoiceChannel, EndBehaviorType, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');

module.exports.start = (nodecg) => {

    let currentMembers = {};
    let silenceInterval, connection, channel, ao;
    const botData = nodecg.Replicant('botData');
    const botSettings = nodecg.Replicant('botSettings');

    const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES] });
    const mixer = new Mixer({ channels: 2, bitDepth: 16, ampleRate: 48000 })

    client.once('ready', () => {

        // Get all channels.
        botSettings.value.channels = {};
        client.channels.cache.map(channel => {
            if (channel.type === 'GUILD_VOICE')
                botSettings.value.channels[channel.id] = channel.name
        })

        // Get all audio devices.
        botSettings.value.devices = {};
        const audioDevices = portAudio.getDevices();
        audioDevices.forEach(device => {
            if (device.maxOutputChannels > 0)
                botSettings.value.devices[device.id] = device.name;
        });

        botData.value.users = {};
        nodecg.log.info('Bot has been started!')

        botData.on('change', (newVal, oldVal) => {
            if (oldVal === undefined || (!oldVal.connected && newVal.connected)) joinChannel(botSettings.value.channel)
            else if (newVal.connected === oldVal.connected) {
                for (const user in newVal.users) {
                    if (JSON.stringify(newVal.users[user]) !== JSON.stringify(oldVal.users[user])) {
                        channel.members.get(user).voice.setMute(newVal.users[user].mute)
                        channel.members.get(user).voice.setDeaf(newVal.users[user].deaf)
                        currentMembers[user].mixer.setVolume(newVal.users[user].volume)
                    }
                }
            }
            else leaveChannel();
        })

        botSettings.on('change', async (newVal, oldVal) => {
            if (oldVal === undefined || newVal.outputDevice !== oldVal.outputDevice) outputAudio(newVal.outputDevice)
            if (oldVal !== undefined && newVal.channel !== oldVal.channel) { 
                botData.value.connected = false;
                setTimeout(() => botData.value.connected = true, 250)
            }
        })

        // Join the specified voice channel.
        function joinChannel(value) {
            if (value === '') return;
            channel = client.channels.cache.get(value);
            connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guildId,
                selfDeaf: false,
                selfMute: true,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            botData.value.connected = true;

            // Play silent audio to not get auto kicked for inactivity,
            const player = createAudioPlayer();
            connection.subscribe(player)
            silenceInterval = setInterval(() => {
                const resource = createAudioResource(fs.createReadStream(path.join(__dirname, 'silence.ogg'), { inputType: StreamType.OggOpus }));
                player.play(resource)
            }, 270000)

            // Start recording each user in VC.
            channel.members.forEach(member => { if (member.user.id !== client.user.id && !member.user.bot) subscribeToUser(member.user, member.voice.serverMute, member.voice.serverDeaf) })
        }

        // Add user to mixer.
        function subscribeToUser(user, muted, deafened) {
            const discordStream = connection.receiver.subscribe(user.id, { end: { behavior: EndBehaviorType.Manual, }, });
            const audio = discordStream.pipe((new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 })))
            const input = mixer.input({ channels: 2, volume: 50 });
            audio.pipe(input);
            currentMembers[user.id] = { mixer: input };
            botData.value.users[user.id] = { id: user.id, name: user.username, avatar: user.displayAvatarURL({ format: 'png' }), mute: muted, deaf: deafened, volume: 50 }
        }

        // Remove user from mixer.
        function endUserSubscription(userID) {
            delete currentMembers[userID];
            delete botData.value.users[userID];
        }

        function leaveChannel() {
            connection.destroy();
            currentMembers = {};
            botData.value.users = {};
            return;
        }

        // Listen for VC changes.
        client.on('voiceStateUpdate', (oldVal, newVal) => {
            if (newVal.id === client.user.id && newVal.channelId !== botSettings.value.channel) botData.value.connected = false;
            else if (newVal.id !== client.user.id) {
                if ((oldVal.channelId !== channel.id || oldVal.channelId === null) && newVal.channelId === channel.id) subscribeToUser(newVal.member.user, newVal.serverMute, newVal.serverDeaf);
                else if (oldVal.channelId === channel.id && (newVal.channelId !== channel.id || newVal.channelId === null)) endUserSubscription(newVal.member.user.id)
                else if (oldVal.serverMute !== newVal.serverMute) try { botData.value.users[newVal.member.id].mute = newVal.serverMute } catch { }
                else if (oldVal.serverDeaf !== newVal.serverDeaf) try { botData.value.users[newVal.member.id].deaf = newVal.serverDeaf } catch { }
            }
        })

        // Create audio output.
        function outputAudio(device) {
            ao = new portAudio.AudioIO({
                outOptions: {
                    channelCount: 2,
                    sampleFormat: portAudio.SampleFormat16Bit,
                    sampleRate: 48000,
                    closeOnError: false,
                    deviceId: device,
                }
            });
            mixer.pipe(ao)
            ao.start();
        }
    });

    client.login(nodecg.bundleConfig.botToken);
}