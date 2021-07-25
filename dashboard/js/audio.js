const audioSources = nodecg.Replicant('audioSources');

window.addEventListener('load', function () {

	audioSources.on('change', (newVal, oldVal) => {
		if (oldVal === undefined || newVal.length !== oldVal.length)
			createSliders(newVal);
		else
			changeValue(newVal, oldVal);
	});
});

function createSliders(newVal) {
	let newArray = [];
	newVal.forEach(element => newArray.push(element))
	newArray.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
	const main = document.getElementById("main");
	main.innerHTML = '';
	newArray.forEach(element => {
		displayVolume = mulToDb(element.volume)
		percentVolume = dbToPercent(displayVolume);

		let sliderContainer = document.createElement("div");
		sliderContainer.setAttribute("class", "sliderContainer");

		let label = document.createElement("div");
		label.setAttribute("class", "label");
		label.innerHTML = element.name;

		let labelValue = document.createElement("span");
		labelValue.setAttribute("id", "labl" + element.name);
		labelValue.setAttribute("class", "labelValue");

		if (!isFinite(displayVolume))
			labelValue.innerHTML = "-inf dB";
		else
			labelValue.innerHTML = displayVolume + " dB";

		let sliderDiv = document.createElement("div");
		sliderDiv.setAttribute("class", "sliderDiv");

		let muteButton = document.createElement("paper-button");
		muteButton.setAttribute("class", "button");

		let muteButtonIcon = document.createElement("span");
		muteButtonIcon.setAttribute("id", "mute" + element.name);
		muteButtonIcon.setAttribute("class", "material-icons");
		muteButtonIcon.setAttribute("style", "font-size: 24px; vertical-align: middle;");
		muteButtonIcon.setAttribute("onClick", 'toggleMute(\'' + element.name + '\', this.innerHTML)');
		switch (element.muted) {
			case true:
				muteButtonIcon.innerHTML = "volume_off";
				muteButtonIcon.style.color = 'red';
				break;
			case false:
				muteButtonIcon.innerHTML = "volume_up";
				muteButtonIcon.style.color = 'white';
				break;
		}
		let slider = document.createElement("paper-slider");
		slider.setAttribute("id", "slid" + element.name);
		slider.setAttribute("class", "slider");
		slider.setAttribute("min", "0");
		slider.setAttribute("max", "100");
		slider.setAttribute("value", percentVolume);
		slider.setAttribute("onChange", 'changeVolume(\'' + element.name + '\', this.value)')

		let syncOffsetDiv = document.createElement("div");
		syncOffsetDiv.setAttribute("class", "syncOffsetDiv");
		syncOffsetDiv.innerHTML = "ms";

		let syncOffset = document.createElement("paper-input");
		syncOffset.setAttribute("id", "sync" + element.name);
		syncOffset.setAttribute("class", "syncOffset");
		syncOffset.setAttribute("type", "number");
		syncOffset.setAttribute("no-label-float");
		syncOffset.setAttribute("onChange", 'changeSync(\'' + element.name + '\', this.value)');
		syncOffset.value = (element.offset / 1000000);

		label.appendChild(labelValue);
		muteButton.appendChild(muteButtonIcon);
		sliderDiv.appendChild(muteButton);
		sliderDiv.appendChild(slider);
		sliderDiv.appendChild(syncOffset);
		sliderDiv.appendChild(syncOffsetDiv)
		sliderContainer.appendChild(label);
		sliderContainer.appendChild(sliderDiv);

		main.appendChild(sliderContainer);
	})
}

function changeValue(newVal, oldVal) {
	let changedElements = [];
	for (let i = 0; i < newVal.length; i++) {
		if (JSON.stringify(newVal[i]) !== JSON.stringify(oldVal[i])) {
			changedElements.push(newVal[i])
		}
	}
	changedElements.forEach(element => {
		document.getElementById('slid' + element.name).setAttribute("value", dbToPercent(mulToDb(element.volume)));
		document.getElementById('sync' + element.name).setAttribute('value', (element.offset / 1000000));
		switch (isFinite(mulToDb(element.volume))) {
			case true: document.getElementById('labl' + element.name).innerHTML = mulToDb(element.volume) + " dB"; break;
			case false: document.getElementById('labl' + element.name).innerHTML = "-inf dB";
		}
		switch (element.muted) {
			case true:
				document.getElementById('mute' + element.name).innerHTML = 'volume_off';
				document.getElementById('mute' + element.name).style.color = 'red';
				break;
			case false:
				document.getElementById('mute' + element.name).innerHTML = 'volume_up';
				document.getElementById('mute' + element.name).style.color = 'white';
				break;
		}
	})
}

function toggleMute(name, value) {
	switch (value) {
		case 'volume_up': nodecg.sendMessage('setMute', { source: name, mute: true }); break;
		case 'volume_off': nodecg.sendMessage('setMute', { source: name, mute: false }); break;
	}
}

function changeVolume(name, value) {
	nodecg.sendMessage('setVolume', { source: name, volume: percentToMul(value.toFixed(1)) })
}

function changeSync(name, value) {
	nodecg.sendMessage('setOffset', { source: name, offset: value * 1000000 })
}

function percentToMul(value) {
	value = value / 100;
	value = 20 * Math.log10(value);
	value = Math.pow(10, -Math.abs(value / 10));
	value = value.toFixed(2);
	return parseFloat(value);
}

function mulToDb(value) {
	return (20 * Math.log10(value)).toFixed(1);
}

function dbToPercent(value) {
	return ((Math.pow(10, value / 40)) * 100).toFixed(0);
}