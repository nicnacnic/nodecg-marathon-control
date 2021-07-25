const intermissionLayout = nodecg.Replicant('assets:intermission-layout');
const intermissionProperties = nodecg.Replicant('intermissionProperties');
const runDataActiveRun = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol')
const runDataArray = nodecg.Replicant('runDataArray', 'nodecg-speedcontrol')
const showBorders = nodecg.Replicant('showBorders');
const itemList = ['donationTotal', 'host', 'gameName1', 'category1', 'estimate1', 'system1', 'release1', 'players1', 'gameName2', 'category2', 'estimate2', 'system2', 'release2', 'players2', 'gameName3', 'category3', 'estimate3', 'system3', 'release3', 'players3', 'gameName4', 'category4', 'estimate4', 'system4', 'release4', 'players4', 'gameName5', 'category5', 'estimate5', 'system5', 'release5', 'players5']

window.addEventListener('load', () => {

    // Load replicants.
    NodeCG.waitForReplicants(intermissionLayout, intermissionProperties, fonts, runDataActiveRun, runDataArray, showBorders).then(() => {
        runDataActiveRun.on('change', (newVal) => setText(newVal))
        intermissionProperties.on('change', (newVal, oldVal) => setProperties(newVal, oldVal))
        intermissionLayout.on('change', (newVal) => {
            if (newVal.length === 0)
                document.getElementById('layoutImg').src = './img/default_layout.png';
            else
                document.getElementById('layoutImg').src = newVal[0].url;
        })
        showBorders.on('change', (newVal) => toggleBorder(newVal))
    });
});

function setText(newVal) {
    let index = runDataArray.value.findIndex(obj => obj.id === newVal.id);
    let properties = intermissionProperties.value;
    let host = '';
    if (newVal.hasOwnProperty('customData') && newVal.customData.hasOwnProperty('host'))
        host = newVal.customData.host;
    fadeHtml('host', properties.host.prefix + host + properties.host.suffix, properties.host.fontSize)
    for (let i = 1; i < 6; i++) {
        let runData = {};
        let playerList = [];
        if (index + (i - 1) < runDataArray.value.length)
            runData = runDataArray.value[index + (i - 1)]
        switch (runData.hasOwnProperty('game')) {
            case false: runData.game = ''; break;
        }
        switch (runData.hasOwnProperty('category')) {
            case false: runData.category = ''; break;
        }
        switch (runData.hasOwnProperty('estimate')) {
            case false: runData.estimate = ''; break;
        }
        switch (runData.hasOwnProperty('system')) {
            case false: runData.system = ''; break;
        }
        switch (runData.hasOwnProperty('release')) {
            case false: runData.release = ''; break;
        }
        if (runData.hasOwnProperty('teams')) {
            runData.teams.forEach(team => {
                team.players.forEach(player => {
                    playerList.push(player.name)
                })
            })
        }
        fadeHtml('gameName' + i, properties['gameName' + i].prefix + runData.game + properties['gameName' + i].suffix, properties['gameName' + i].fontSize)
        fadeHtml('category' + i, properties['category' + i].prefix + runData.category + properties['category' + i].suffix, properties['category' + i].fontSize)
        fadeHtml('estimate' + i, properties['estimate' + i].prefix + runData.estimate + properties['estimate' + i].suffix, properties['estimate' + i].fontSize)
        fadeHtml('system' + i, properties['system' + i].prefix + runData.system + properties['system' + i].suffix, properties['system' + i].fontSize)
        fadeHtml('release' + i, properties['release' + i].prefix + runData.release + properties['release' + i].suffix, properties['release' + i].fontSize)
        fadeHtml('players' + i, properties['players' + i].prefix + playerList.join(', ') + properties['players' + i].suffix, properties['players' + i].fontSize)
    }
}

function setProperties(newVal, oldVal) {
    let properties = newVal;
    itemList.forEach(item => {
        let element = document.getElementById(item)
        switch (properties[item].visible) {
            case true: element.style.visibility = 'visible'; break;
            case false: element.style.visibility = 'hidden'; break;
        }
        element.style.top = properties[item].posTop + 'px';
        element.style.left = properties[item].posLeft + 'px';
        element.style.width = properties[item].width + 'px';
        element.style.height = properties[item].height + 'px';
        element.style.lineHeight = properties[item].height + 'px';
        element.style.padding = properties[item].paddingTB + 'px ' + properties[item].paddingLR + 'px';
        element.style.color = '#' + properties[item].fontColor;
        element.style.textAlign = properties[item].textAlign.toLowerCase();
        element.style.fontFamily = properties[item].fontFamily;
        switch (element.innerHTML) {
            case undefined: fitText(item, '', properties[item].fontSize, () => { }); break;
            default: fitText(item, element.innerHTML, properties[item].fontSize, () => { }); break;
        }
    })


    // console.log(newVal)
    // let changedElements = [];
    // newVal.forEach(item => {
    //     console.log(item)
    //     if (oldVal === undefined || JSON.stringify(newVal[iitem]) != JSON.stringify(oldVal[item])) {
    //         changedElements.push({
    //             element: item,
    //             properties: newVal[i][item],
    //         })
    //     }
    // })
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