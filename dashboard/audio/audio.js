const activeRunners = nodecg.Replicant('activeRunners');
const audioSources = nodecg.Replicant('audioSources');

window.onload = () => {

	NodeCG.waitForReplicants(audioSources, activeRunners).then(() => {

		audioSources.on('change', (newVal, oldVal) => {
			if (!oldVal || newVal.length !== oldVal.length) return createAudioSources(newVal);
			let changedSources = [];
			newVal.forEach((source, index) => {
				if (JSON.stringify(source) !== JSON.stringify(oldVal[index])) changedSources.push(source)
			})
			for (const source of changedSources) {
				document.querySelector(`.volumeLabel[source="${source.name}"]`).innerHTML = dbToString(source.volume.db)
				document.querySelector(`.mute[source="${source.name}"]`).innerHTML = (source.muted) ? 'volume_off' : 'volume_up';
				document.querySelector(`.mute[source="${source.name}"]`).style.color = (source.muted) ? 'red' : 'white';
				document.querySelector(`.slider[source="${source.name}"]`).value = dbToPercent(source.volume.db);
				document.querySelector(`.slider[source="${source.name}"]`).style.setProperty('--slider-value', `${document.querySelector(`.slider[source="${source.name}"]`).value}%`);
				document.querySelector(`.offset[source="${source.name}"]`).value = source.offset;
			}
		})
	});
}


function createAudioSources(newVal) {
	let newArray = [];
	newVal.forEach(element => newArray.push(element))
	let audioSources = newArray.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
	for (const playerSource of activeRunners.value) {
		let source = audioSources.find(x => x.name === playerSource.source);
		if (source) createSlider(source);
	}
	for (const source of audioSources) {
		if (document.querySelector(`.volumeLabel[source="${source.name}"]`) === null) createSlider(source);
	}
}

function createSlider(source) {
	let slider = `
	<div class="sliderContainer">
		<span class="label">${source.name}</span>
		<span class="volumeLabel" source="${source.name}">${dbToString(source.volume.db)}</span>
		<div class="sliderDiv">
			<button class="muteButton">
				<span class="material-icons mute" source="${source.name}" onclick="nodecg.sendMessage('toggleMute', '${source.name}')" style="color: ${(source.muted) ? 'red' : 'white'}">${(source.muted) ? 'volume_off' : 'volume_up'}</span>
			</button>
			<input type="range" class="slider" source="${source.name}" min="0" max="100" value="${dbToPercent(source.volume.db)}" onInput="setLabel('${source.name}', this.value)" onChange="nodecg.sendMessage('setVolume', { source: '${source.name}', volume: parseFloat(percentToDb(this.value)) })">
			<div class="input">	
				<input type="number" class="offset" source="${source.name}" value="${source.offset}" onChange="nodecg.sendMessage('setOffset', { source: '${source.name}', offset: parseInt(this.value) })">
				<label>Offset</label>
				<div class="inputBorder">
			</div>
		</div>
	</div>`
	document.getElementById('sourceSliders').innerHTML += slider;
	document.querySelector(`.slider[source="${source.name}"]`).style.setProperty('--slider-value', `${document.querySelector(`.slider[source="${source.name}"]`).value}%`);
}

function setLabel(source, value) {
	document.querySelector(`.volumeLabel[source="${source}"]`).innerHTML = dbToString(percentToDb(value));
	document.querySelector(`.slider[source="${source}"]`).style.setProperty('--slider-value', `${document.querySelector(`.slider[source="${source}"]`).value}%`);
}

// function percentToMul(value) {
// 	value = value / 100;
// 	value = 20 * Math.log10(value);
// 	value = Math.pow(10, -Math.abs(value / 10));
// 	value = value.toFixed(2);
// 	return parseFloat(value);
// }

function dbToPercent(value) { return ((Math.pow(10, value / 40)) * 100).toFixed(0) }

function dbToString(value) {
	if (value < -99) return '-inf dB'
	return value + ' dB'
}

function percentToDb(value) { return (40 * Math.log10(value) - 80).toFixed(1) }