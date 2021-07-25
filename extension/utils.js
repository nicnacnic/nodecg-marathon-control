function websocketError(error) {
    console.log(error)
    if (error.code === 'CONNECTION_ERROR')
        nodecg.log.error('Not connected to OBS.')
    /*
    if (error.code === 'NOT_CONNECTED' || error.code === 'CONNECTION_ERROR' || error.error === 'Not Authenticated') {
        if (!connectionError) {
            connectionError = true;
            nodecg.log.error('Disconnected from OBS. Retrying every 10s, please check your connection.');
            let obsReconnect = setInterval(function () {
                obs.connect({ address: nodecg.bundleConfig.obsWebsocket.address, password: nodecg.bundleConfig.obsWebsocket.password }).then(() => {
                    nodecg.log.info('Reconnected to OBS instance!');
                    connectionError = false;
                    clearInterval(obsReconnect);
                }).catch((error));
            }, 10000);
        }
    }
    else
        nodecg.log.error(JSON.stringify(error, null, 2)); */
    //nodecg.log.error(error)
}

module.exports = { websocketError };