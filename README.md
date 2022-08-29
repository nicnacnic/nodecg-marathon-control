# nodecg-marathon-control
A NodeCG bundle to control all aspects of a marathon's stream.

**This bundle only uses RTMP for streams, no Twitch!**

Twitch is unreliable, and has the Purple Screen Of Death (which is very annoying!)  
To use RTMP, make sure your server can transcode the stream into [HLS](https://docs.peer5.com/guides/setting-up-hls-live-streaming-server-using-nginx/) and allows [CORS](https://michielkalkman.com/snippets/nginx-cors-open-configuration/)

### To add multiple RTMP servers
- Open the config (`<path-to-nodecg>/cfg/nodecg-marathon-control.json`)
- Under `RTMPServers`, add a new object for each server. The key is the name displayed on the dashboard, the value is the server URL.
- Save the file.

For example: 
```json
"RTMPServers": {
   "US-E": "https://use.example.com/hls/",
   "US-W": "https://usw.example.com/hls/",
   "ABCDEFG": "https://abcdefg.example.com/hls/"
}
  ```

This version of nodecg-marathon-control uses OBS Websocket v4.9.1.
