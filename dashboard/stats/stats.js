const stats = nodecg.Replicant('stats');
const autoRecord = nodecg.Replicant('autoRecord');

window.addEventListener('load', function() {
	NodeCG.waitForReplicants(stats, autoRecord).then(() => {
		stats.on('change', (newVal) => {
			document.getElementById("cpuUsage").innerHTML = newVal.cpuUsage.toFixed(1) + '%';
			document.getElementById("fps").innerHTML = newVal.fps.toFixed(1) + ' FPS';
			document.getElementById("bitrate").innerHTML = newVal.kbitsPerSec + ' kb/s';
			document.getElementById("frameTime").innerHTML = newVal.averageFrameTime.toFixed(1) + ' ms';
			document.getElementById("rendering").innerHTML = newVal.renderMissedFrames + ' / ' + newVal.renderTotalFrames + ' (' + (newVal.renderMissedFrames / newVal.renderTotalFrames).toFixed(1) + '%)';
			document.getElementById("encoding").innerHTML = newVal.outputSkippedFrames + ' / ' + newVal.outputTotalFrames + ' (' + (newVal.outputSkippedFrames / newVal.outputTotalFrames).toFixed(1) + '%)';
			document.getElementById("network").innerHTML = newVal.numDroppedFrames + ' / ' + newVal.numTotalFrames + ' (' + (newVal.numDroppedFrames / newVal.numTotalFrames).toFixed(1) + '%)';
			document.getElementById("uptime").innerHTML = new Date(newVal.totalStreamTime * 1000).toISOString().substr(11, 8)
			document.getElementById("diskSpace").innerHTML = (newVal.freeDiskSpace / 1000).toFixed(1) + ' GB';
		});

		autoRecord.on('change', (newVal) => {
			switch (newVal.active) {
                case true: document.getElementById("autoRecord").innerHTML = 'Active'; break;
                case false: document.getElementById("autoRecord").innerHTML = 'Inactive'; break;
            }
		})
	});
});