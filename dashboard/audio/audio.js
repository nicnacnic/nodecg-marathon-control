const activeRunners = nodecg.Replicant('activeRunners');
const streamSync = nodecg.Replicant('streamSync')
const audioSources = nodecg.Replicant('audioSources');
const botSettings = nodecg.Replicant('botSettings');
const sliderChange = new Event('input');

window.onLoad = () => {

	NodeCG.waitForReplicants(audioSources, streamSync, botSettings).then(() => {

		audioSources.on('change', (newVal, oldVal) => {
			if (oldVal === undefined || newVal.length !== oldVal.length)
				parseAudioSources();
			else {
				let changedElements = [];
				newVal.forEach((player, index) => {
					if (JSON.stringify(player) !== JSON.stringify(oldVal[index]))
						changedElements.push(player)
				})
				changedElements.forEach(element => {
					setTimeout(() => document.querySelector(`#slider[source="${element.name}"]`).dispatchEvent(sliderChange), 250);
					document.querySelector(`#slider[source="${element.name}"]`).value = dbToPercent(element.volume);
					document.querySelector(`#offset[source="${element.name}"]`).value = element.offset / 1000000;
					let muteButtonIcon = document.querySelector(`#mute[source="${element.name}"]`);
					switch (element.muted) {
						case true: muteButtonIcon.innerHTML = 'volume_off'; muteButtonIcon.style.color = 'red'; break;
						case false: muteButtonIcon.innerHTML = 'volume_up'; muteButtonIcon.style.color = 'white'; break;
					}
				});
			}
		});

		activeRunners.on('change', (newVal, oldVal) => {
			let changedElements = [];
			if (oldVal === undefined)
				changedElements = newVal;
			else {
				for (let i = 0; i < newVal.length; i++) {
					if (JSON.stringify(newVal[i]) !== JSON.stringify(oldVal[i])) {
						changedElements.push(newVal[i])
					}
				}
			}
		});
	})
}

function parseAudioSources() {
	let newArray = [];
	audioSources.value.forEach(element => newArray.push(element))
	newArray.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
	document.getElementById("sourceSliders").innerHTML = '';
	let playerSources = [];
	activeRunners.value.forEach(player => {
		playerSources.push(player.source)
	})
	newArray.forEach(element => {
		if (playerSources.includes(element.name))
			createSlider(element)
	})
	// if (botSettings.value.active && botSettings.value.outputSource !== null)
	// 	createSlider(newArray.find(element => element.name === botSettings.value.outputSource), true)
	newArray.forEach(element => {
		if (!playerSources.includes(element.name))
			createSlider(element)
	});
}

function createSlider(element) {
	let containerDiv = createElement('div', {
		class: 'sliderContainer'
	})

	let label = createElement('span', {
		class: 'label',
		innerHTML: element.name
	})

	let volumeLabel = createElement('span', {
		class: 'volumeLabel',
		id: 'volume',
		source: element.name,
		innerHTML: dbToString(element.volume),
	})

	let sliderDiv = createElement('div', {
		class: 'sliderDiv'
	})

	let muteButton = createElement('button', {
		class: 'muteButton',
	})

	let muteState = createElement('span', {
		class: 'material-icons',
		id: 'mute',
		source: element.name,
		onClick: `nodecg.sendMessage('toggleMute', '${element.name}')`
	})

	switch (element.muted) {
		case true: muteState.style.color = 'red'; muteState.innerHTML = 'volume_off'; break;
		case false: muteState.style.color = 'white'; muteState.innerHTML = 'volume_up'; break;
	}

	let slider = createElement('input', {
		type: 'range',
		id: 'slider',
		source: element.name,
		min: 0,
		max: 100,
		value: dbToPercent(element.volume),
		onInput: `document.querySelector('#volume[source="${element.name}"]').innerHTML = dbToString(percentToDb(this.value))`,
		onChange: `nodecg.sendMessage('setVolume', { source: '${element.name}', volume: percentToMul(this.value) })`
	})

	let inputDiv = createElement('div', {
		class: 'input'
	})

	let syncOffset = createElement('input', {
		type: 'number',
		id: 'offset',
		source: element.name,
		value: element.offset / 1000000,
		onchange: `nodecg.sendMessage('setOffset', { source: '${element.name}', offset: this.value * 1000000 })`
	})

	let syncOffsetLabel = createElement('label', {
		innerHTML: 'Offset'
	})

	let syncOffsetBorder = createElement('div', {
		class: 'inputBorder'
	})

	muteButton.appendChild(muteState)
	inputDiv.appendChild(syncOffset)
	inputDiv.appendChild(syncOffsetLabel)
	inputDiv.appendChild(syncOffsetBorder)
	sliderDiv.appendChild(muteButton)
	sliderDiv.appendChild(slider)
	sliderDiv.appendChild(inputDiv)
	containerDiv.appendChild(label)
	containerDiv.appendChild(volumeLabel)
	containerDiv.appendChild(sliderDiv)
	document.getElementById('sourceSliders').appendChild(containerDiv)
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

function percentToMul(value) {
	value = value / 100;
	value = 20 * Math.log10(value);
	value = Math.pow(10, -Math.abs(value / 10));
	value = value.toFixed(2);
	return parseFloat(value);
}

function dbToPercent(value) { return ((Math.pow(10, value / 40)) * 100).toFixed(0) }

function dbToString(value) {
	if (value < -99) return '-inf dB'
	return value + ' dB'
}

function percentToDb(value) { return (40 * Math.log10(value) - 80).toFixed(1) }