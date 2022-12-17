# nodecg-marathon-control
A bundle to control all aspects of a speedrun marathon's stream.

[![Release](https://img.shields.io/github/v/release/nicnacnic/nodecg-marathon-control?label=Release)](https://github.com/nicnacnic/nodecg-marathon-control/releases)
![License](https://img.shields.io/github/license/nicnacnic/nodecg-marathon-control?label=License)
[![Twitter](https://img.shields.io/twitter/follow/nicnacnic11?style=social)](https://twitter.com/nicnacnic11)
[![Discord](https://img.shields.io/badge/-Join%20the%20Discord!-brightgreen?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.gg/A34Qpfe)

## About
*This is a bundle for [NodeCG](https://github.com/nodecg/nodecg); if you do not understand what that is, we advise you read their website first for more information.*

nodecg-marathon-control description.

### Features
- Live preview and program windows powered by [VDO.Ninja](https://vdo.ninja)
- Perfectly sync multiple runner perspectives using StreamSync™
- Automatically record every run using Auto Record
- Automate everything, from stream keys to runner layouts, with [NodeCG Speedcontrol]() compatibility
- A customizable checklist to make sure restreamers don't forget crucial steps
- Full audio management, with volume, mute and offset control for each source
- Capture and sync run commentary using the included Discord bot (coming soon!)

## Requirements
- [NodeCG](https://github.com/nodecg/nodecg)
- [NodeCG Speedcontrol](https://github.com/speedcontrol/nodecg-speedcontrol) (please use the build branch)
- [OBS Websocket]() v5 or above
- A RTMP server

## Installation
Navigate to your root NodeCG folder, then run `nodecg install nicnacnic/nodecg-marathon-control`. After the installation is complete, type `nodecg defaultconfig nodecg-marathon-control` to generate the config file.

## Usage
Once you have everything configured in the config, launch your OBS instance, then NodeCG. If everything is configured correctly, NodeCG should connect to OBS and you should be able to control OBS through the dashboard. Graphics in NodeCG are designed to be used with the browser source in OBS.

If you end up using nodecg-marathon-control during your marathon/event, it would be greatly appreciated if you included the repository name and author in your end credits. Thank you!

## Other Bundles
- [speedcontrol-layouts](https://github.com/nicnacnic/speedcontrol-layouts) A bundle of easy-to-use NodeCG layouts for marathons to use.
- [speedcontrol-tweetr](https://github.com/nicnacnic/speedcontrol-tweetr) Control Twitter right from your NodeCG dashboard!

## Contributing
If you find a bug or glitch, kindly report it using the [issue tracker](https://github.com/nicnacnic/nodecg-marathon-control/issues). Suggestions are welcome as well!

You're welcome to fix bugs and issues, but before submitting a pull request, please **test your code** to make sure everything works properly.

If you're having issues or just want to chat, I can be reached on my [Discord](https://discord.gg/A34Qpfe) server.

## Special Thanks
The NodeCG Discord server, for helping solve small issues that I encountered while developing this bundle.

Cinaeth and Kuno Dementries, for allowing this bundle to be tested during their marathons.

Thedmpanda, for emotional support.

## License
MIT  License

Copyright (c) 2022 nicnacnic

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
