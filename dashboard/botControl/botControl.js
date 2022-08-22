const botData = nodecg.Replicant('botData')
const botSettings = nodecg.Replicant('botSettings')

window.onload = () => {
    NodeCG.waitForReplicants(botData, botSettings).then(() => {
        switch (botSettings.value.active) {
            case false: document.querySelector('body').style.display = 'inherit'; break;
            case true: document.querySelector('body').style.display = 'none'; break;
        }
        botData.on('change', (newVal, oldVal) => {
            if (oldVal === undefined || newVal.users === {} || Object.keys(newVal.users).length !== Object.keys(oldVal.users).length) {
                document.getElementById('userDiv').innerHTML = '';
                for (const user in newVal.users) { createUser(newVal.users[user]) }
            }
            else if (JSON.stringify(newVal.users) !== JSON.stringify(oldVal.users)) {
                for (const user in newVal.users) {
                    if (JSON.stringify(newVal.users[user]) !== JSON.stringify(oldVal.users[user])) changeButtons(newVal.users[user])
                };
            }
            switch (newVal.connected) {
                case false: document.getElementById('toggleBot').innerHTML = 'Join'; break;
                case true: document.getElementById('toggleBot').innerHTML = 'Leave'; break;
            }
        })
    });
}

function createUser(user) {
    let containerDiv = createElement('div', {
        class: 'userContainer'
    })

    let avatar = createElement('img', {
        class: 'avatar',
        user: user.id,
        src: user.avatar
    })

    let username = createElement('div', {
        class: 'username',
        innerHTML: `<b>${user.name}</b>`,
    })

    let muteButton = createElement('button', {
        class: 'muteButton',
        user: user.id,
        onClick: `botData.value.users['${user.id}'].mute = !botData.value.users['${user.id}'].mute`
    })

    let muteState = createElement('span', {
        class: 'material-icons',
        id: 'mute',
        user: user.id,
    })

    switch (user.mute) {
        case true: muteState.style.color = 'red'; muteState.innerHTML = 'mic_off'; break;
        case false: muteState.style.color = 'white'; muteState.innerHTML = 'mic'; break;
    }

    let deafButton = createElement('button', {
        class: 'deafButton',
        user: user.id,
        onClick: `botData.value.users['${user.id}'].deaf = !botData.value.users['${user.id}'].deaf`
    })

    let deafState = createElement('span', {
        class: 'material-icons',
        id: 'deaf',
        user: user.id,
    })

    switch (user.deaf) {
        case true: deafState.style.color = 'red'; deafState.innerHTML = 'headset_off'; break;
        case false: deafState.style.color = 'white'; deafState.innerHTML = 'headset'; break;
    }

    let inputDiv = createElement('div', {
        class: 'input'
    })

    let volume = createElement('input', {
        type: 'number',
        id: 'volume',
        user: user.id,
        value: user.volume,
        min: 0,
        mac: 100,
        onchange: `botData.value.users['${user.id}'].volume = this.value`
    })

    let volumeLabel = createElement('label', {
        innerHTML: 'Volume'
    })

    let volumeBorder = createElement('div', {
        class: 'inputBorder'
    })

    muteButton.appendChild(muteState)
    deafButton.appendChild(deafState)
    inputDiv.appendChild(volume)
    inputDiv.appendChild(volumeLabel)
    inputDiv.appendChild(volumeBorder)
    containerDiv.appendChild(avatar)
    containerDiv.appendChild(username)
    containerDiv.appendChild(muteButton)
    containerDiv.appendChild(deafButton)
    containerDiv.appendChild(inputDiv)
    document.getElementById('userDiv').appendChild(containerDiv)
}

function createElement(type, attributes) {
    let element = document.createElement(type);
    for (let attr in attributes) {
        if (attr === 'innerHTML')
            element.innerHTML = attributes[attr];
        else
            element.setAttribute(attr, attributes[attr]);
    }
    return element;
}

function changeButtons(user) {
    let muteState = document.querySelector(`#mute[user='${user.id}']`)
    let deafState = document.querySelector(`#deaf[user='${user.id}']`)
    switch (user.mute) {
        case true: muteState.style.color = 'red'; muteState.innerHTML = 'mic_off'; break;
        case false: muteState.style.color = 'white'; muteState.innerHTML = 'mic'; break;
    }
    switch (user.deaf) {
        case true: deafState.style.color = 'red'; deafState.innerHTML = 'headset_off'; break;
        case false: deafState.style.color = 'white'; deafState.innerHTML = 'headset'; break;
    }
}