const activeRunners = nodecg.Replicant('activeRunners');
const currentLayout = nodecg.Replicant('currentLayout');
const layoutList = nodecg.Replicant('assets:game-layouts');
const layoutProperties = nodecg.Replicant('layoutProperties');
const showBorders = nodecg.Replicant('showBorders');
const runDataActiveRun = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol')
const camCoverList = nodecg.Replicant('assets:cam-cover');
const timer = nodecg.Replicant('timer', 'nodecg-speedcontrol')
const timerColors = nodecg.Replicant('timerColors')
const medalImgs = ['./img/medal_gold.png', './img/medal_silver.png', './img/medal_bronze.png', './img/medal_none.png']
const itemList = ['gameName', 'category', 'estimate', 'system', 'release', 'timer', 'sponsor', 'name1Container', 'pronouns1', 'camCover1', 'name2Container', 'pronouns2', 'camCover2', 'name3Container', 'pronouns3', 'camCover3', 'name4Container', 'pronouns4', 'camCover4', 'twitchP1', 'twitchP2', 'twitchP3', 'twitchP4'];
let playerArray = [];

window.addEventListener('load', function () {

    // Load replicants.
    NodeCG.waitForReplicants(activeRunners, currentLayout, activeRunners, layoutList, layoutProperties, runDataActiveRun, timer, timerColors).then(() => {

        // Create Twitch players and set text.
        createTwitchPlayer();

        // Update current layout.
        currentLayout.on('change', (newVal) => {
            for (let i = 0; i < layoutList.value.length; i++) {
                if (layoutList.value[i].name === newVal) {
                    document.getElementById('layoutImg').src = layoutList.value[i].url;
                    break;
                }
            }
        })

        // Update active runners.
        activeRunners.on('change', (newVal, oldVal) => updateTwitchPlayer(newVal, oldVal))

        // Update runner information.
        runDataActiveRun.on('change', (newVal) => setText(newVal, () => { setMedals() }));

        // Update timer.
        timer.on('change', (newVal, oldVal) => {
            document.getElementById('timer').innerHTML = newVal.time;
            const properties = layoutProperties.value[layoutProperties.value.findIndex(obj => obj.layout === currentLayout.value)]
            if (properties.medals && oldVal !== undefined && JSON.stringify(newVal.teamFinishTimes) !== JSON.stringify(oldVal.teamFinishTimes))
                setMedals();
            switch (newVal.state) {
                case 'stopped': document.getElementById('timer').style.color = '#' + timerColors.value.stopped; break;
                case 'running': document.getElementById('timer').style.color = '#' + timerColors.value.running; break;
                case 'paused': document.getElementById('timer').style.color = '#' + timerColors.value.paused; break;
                case 'finished': document.getElementById('timer').style.color = '#' + timerColors.value.finished; break;
            }
        })

        // Update layout properties.
        currentLayout.on('change', () => setProperties(layoutProperties.value))
        showBorders.on('change', (newVal) => toggleBorder(newVal))
        layoutProperties.on('change', (newVal, oldVal) => {
            if (runDataActiveRun.value !== undefined && oldVal !== undefined)
                setProperties(newVal, oldVal)
        });

        // Update cam cover image.
        camCoverList.on('change', (newVal) => {
            for (let i = 1; i < 5; i++) {
                try { document.getElementById('camCoverImg' + i).src = newVal[0].url; } catch { document.getElementById('camCoverImg' + i).src = './img/cam_cover.jpg'; }
            }
        })
    })
})

function setProperties(newVal, oldVal) {
    let i = layoutProperties.value.findIndex(obj => obj.layout === currentLayout.value);
    let changedElements = [];
    itemList.forEach(item => {
        if (oldVal === undefined || JSON.stringify(newVal[i][item]) != JSON.stringify(oldVal[i][item])) {
            changedElements.push({
                element: item,
                properties: newVal[i][item],
            })
        }
    })
    changedElements.forEach(item => {
        let element = document.getElementById(item.element);
        element.style.top = item.properties.posTop + 'px';
        element.style.left = item.properties.posLeft + 'px';
        switch (item.properties.visible) {
            case true: element.style.visibility = 'visible'; break;
            case false: element.style.visibility = 'hidden'; break;
        }
        if (item.element.includes('twitch')) {
            element.style.marginTop = -Math.abs(item.properties.cropTop) + 'px'
            element.style.height = (1080 - item.properties.cropBottom) + 'px'
            element.style.marginLeft = -Math.abs(item.properties.cropLeft) + 'px'
            element.style.width = (1920 - item.properties.cropRight) + 'px'
        }
        else if (item.element.includes('camCover')) {
            document.getElementById('camCoverImg' + item.element.replace(/^\D+/g, '')).style.width = item.properties.width + 'px';
            document.getElementById('camCoverImg' + item.element.replace(/^\D+/g, '')).style.height = item.properties.height + 'px';
        }
        else {
            element.style.width = item.properties.width + 'px';
            element.style.height = item.properties.height + 'px';
            element.style.lineHeight = item.properties.height + 'px';
            element.style.padding = item.properties.paddingTB + 'px ' + item.properties.paddingLR + 'px';
            element.style.color = '#' + item.properties.fontColor;
            element.style.textAlign = item.properties.textAlign.toLowerCase();
            element.style.fontFamily = item.properties.fontFamily;
            if (item.element.includes('name'))
                fitTextName(item.element.match(/\d+/)[0], document.getElementById('name' + item.element.match(/\d+/)[0]).innerHTML, item.properties.fontSize, () => setMedals());
            else
                fitText(item.element, element.innerHTML, item.properties.fontSize, () => { });
        }
    })
}


function setText(newVal, callback) {
    let properties = layoutProperties.value[layoutProperties.value.findIndex(obj => obj.layout === currentLayout.value)];
    let i = 1;
    fadeHtml('gameName', properties.gameName.prefix + newVal.game.toUpperCase() + properties.gameName.suffix, properties.gameName.fontSize)
    fadeHtml('category', properties.category.prefix + newVal.category + properties.category.suffix, properties.category.fontSize)
    fadeHtml('estimate', properties.estimate.prefix + newVal.estimate + properties.estimate.suffix, properties.estimate.fontSize)
    fadeHtml('system', properties.system.prefix + newVal.system + properties.system.suffix, properties.system.fontSize)
    fadeHtml('release', properties.release.prefix + newVal.release + properties.release.suffix, properties.release.fontSize)
    newVal.teams.forEach(team => {
        team.players.forEach(player => {
            let element = 'name' + i;
            let parent = 'name' + i + 'Container';
            let pronouns = 'pronouns' + i;
            fadeHtmlName(element, parent, properties[parent].prefix + player.name + properties[parent].suffix, properties[parent].fontSize)
            fadeHtml(pronouns, properties[pronouns].prefix + player.pronouns + properties[pronouns].suffix, properties[pronouns].fontSize)
            i++;
        })
    })
}

function toggleBorder(active) {
    itemList.forEach(item => {
        let element = document.getElementById(item);
        switch (active) {
            case true: element.style.border = '2px solid white'; break;
            case false: element.style.border = '2px solid transparent'; break;
        }
    });
}

function setMedals() {
    let teamFinishTimes = timer.value.teamFinishTimes;
    for (let i = 1; i < 5; i++) {
        document.getElementById('medalsImg' + i).src = medalImgs[3];
        document.getElementById('medalsText' + i).innerHTML = '';
    }
    const medalOrder = Object.entries(teamFinishTimes).sort((a, b) => b.milliseconds - a.milliseconds)
    for (let i = 0; i < medalOrder.length; i++) {
        let j = runDataActiveRun.value.teams.findIndex(obj => obj.id === medalOrder[i][0])
        document.getElementById('medalsImg' + (j + 1)).src = medalImgs[i];
        document.getElementById('medalsText' + (j + 1)).innerHTML = medalOrder[i][1].time;
        document.getElementById('medalsText' + (j + 1)).style.color = '#' + timerColors.value.finished;
    }
}

function createTwitchPlayer() {
    for (let i = 0; i < 4; i++) {
        let quality, channel;
        switch (activeRunners.value[i].quality) {
            case "Source": quality = "chunked"; break;
            case "720p60": quality = "720p60"; break;
            case "720p": quality = "720p30"; break;
            case "480p": quality = "480p30"; break;
            case "360p": quality = "360p30"; break;
            case "160p": quality = "160p30"; break;
            default: quality = "auto"; break;
        }
        switch (activeRunners.value[i].name) {
            case '': channel = ' '; break;
            default: channel = activeRunners.value[i].name; break;
        }
        let options = {
            width: 1920,
            height: 1080,
            channel: channel,
            muted: activeRunners.value[i].mute,
            quality: quality,
            controls: false
        };
        playerArray[i] = new Twitch.Player('twitchP' + (i + 1), options);
        playerArray[i].setVolume(2.0);
    }
}

function updateTwitchPlayer(newVal, oldVal) {
    for (let i = 0; i < 4; i++) {
        let quality;
        if (oldVal !== undefined && newVal[i].name !== oldVal[i].name)
            playerArray[i].setChannel(newVal[i].name)
        playerArray[i].setMuted(newVal[i].mute)
        if (oldVal !== undefined && newVal[i].quality !== oldVal[i].quality) {
            switch (newVal[i].quality) {
                case "Source": quality = "chunked"; break;
                case "720p60": quality = "720p60"; break;
                case "720p": quality = "720p30"; break;
                case "480p": quality = "480p30"; break;
                case "360p": quality = "360p30"; break;
                case "160p": quality = "160p30"; break;
                default: quality = "auto"; break;
            }
            playerArray[i].setQuality(quality)
        }
        switch (newVal[i].cam) {
            case true: document.getElementById('camCover' + (i + 1)).style.visibility = 'hidden'; break;
            case false: document.getElementById('camCover' + (i + 1)).style.visibility = 'visible'; break;
        }
    }
}