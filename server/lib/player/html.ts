import type { ArtplayerOptions, DplayerOptions } from './types'

const HLS_JS_URL = '/player/lib/hls.min.js'
const FLV_JS_URL = '/player/lib/flv.min.js'
const DASH_JS_URL = '/player/lib/dash.all.min.js'
const DPLAYER_JS_URL = '/player/lib/DPlayer.min.js'
const ARTPLAYER_JS_URL = '/player/lib/artplayer.js'

function jsonScriptValue(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

function renderHiddenDplayerControls(hideplay: boolean): string {
  if (!hideplay) return ''
  return `
        .dplayer-controller,
        .dplayer-controller-mask,
        .dplayer-menu,
        .dplayer-mask {
            display: none !important;
        }`
}

function renderHiddenArtplayerControls(hideplay: boolean): string {
  return hideplay
    ? `
        .art-controls {
            display: none !important;
        }`
    : ''
}

export function renderDplayerHtml(options: DplayerOptions): string {
  return `<!DOCTYPE html>
<html lang="${options.lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta http-equiv="X-UA-Compatible" content="IE=11">
    <meta name="referrer" content="no-referrer">
    <title>视频播放器</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body,
        html {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #000;
        }

        #player-container {
            position: relative;
            width: 100%;
            height: 100%;
        }
${renderHiddenDplayerControls(options.hideplay)}
    </style>
</head>
<body>
    <div id="player-container"></div>

    <script src="${HLS_JS_URL}"></script>
    <script src="${FLV_JS_URL}"></script>
    <script src="${DASH_JS_URL}"></script>
    <script src="${DPLAYER_JS_URL}"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            try {
                const dp = new DPlayer({
                    container: document.getElementById('player-container'),
                    live: ${jsonScriptValue(options.live)},
                    muted: ${jsonScriptValue(options.muted)},
                    autoplay: ${jsonScriptValue(options.autoplay)},
                    loop: ${jsonScriptValue(options.loop)},
                    lang: ${jsonScriptValue(options.lang)},
                    volume: ${jsonScriptValue(options.volume)},
                    video: {
                        url: ${jsonScriptValue(options.url)},
                        type: ${jsonScriptValue(options.type)},
                        pic: ${jsonScriptValue(options.cover)}
                    }
                });

                window.addEventListener('resize', function() {
                    dp.resize();
                });
            } catch (error) {
                console.error('播放器初始化失败：', error);
            }
        });
    </script>
</body>
</html>`
}

export function renderArtplayerHtml(options: ArtplayerOptions): string {
  return `<!DOCTYPE html>
<html lang="${options.lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta http-equiv="X-UA-Compatible" content="IE=11">
    <meta name="referrer" content="no-referrer">
    <title>视频播放器</title>
    <style>
        body,
        html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        .player-container {
            width: 100%;
            height: 100%;
        }
${renderHiddenArtplayerControls(options.hideplay)}
    </style>
    <script src="${HLS_JS_URL}"></script>
    <script src="${FLV_JS_URL}"></script>
    <script src="${DASH_JS_URL}"></script>
</head>
<body>
    <div class="player-container"></div>
    <script src="${ARTPLAYER_JS_URL}"></script>
    <script>
        const art = new Artplayer({
            id: ${jsonScriptValue(options.id)},
            container: '.player-container',
            url: ${jsonScriptValue(options.url)},
            type: ${jsonScriptValue(options.type)},
            lang: ${jsonScriptValue(options.lang)},
            poster: ${jsonScriptValue(options.poster)},
            theme: ${jsonScriptValue(options.theme)},
            volume: ${jsonScriptValue(options.volume)},
            isLive: ${jsonScriptValue(options.islive)},
            muted: ${jsonScriptValue(options.muted)},
            autoplay: ${jsonScriptValue(options.autoplay)},
            autoPlayback: ${jsonScriptValue(options.autoplayback)},
            autoMini: ${jsonScriptValue(options.automini)},
            loop: ${jsonScriptValue(options.loop)},
            flip: ${jsonScriptValue(options.flip)},
            playbackRate: ${jsonScriptValue(options.playbackrate)},
            aspectRatio: ${jsonScriptValue(options.aspectratio)},
            setting: ${jsonScriptValue(options.setting)},
            hotkey: ${jsonScriptValue(options.hotkey)},
            pip: ${jsonScriptValue(options.pip)},
            mutex: ${jsonScriptValue(options.mutex)},
            fullscreen: ${jsonScriptValue(options.fullscreen)},
            fullscreenWeb: ${jsonScriptValue(options.fullscreenweb)},
            miniProgressBar: ${jsonScriptValue(options.miniprogressbar)},
            playsInline: ${jsonScriptValue(options.playsinline)},
            customType: {
                m3u8: function playM3u8(video, url, art) {
                    if (Hls.isSupported()) {
                        if (art.hls) art.hls.destroy();
                        const hls = new Hls();
                        hls.loadSource(url);
                        hls.attachMedia(video);
                        art.hls = hls;
                        art.on('destroy', function() { hls.destroy(); });
                    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                        video.src = url;
                    } else {
                        art.notice.show = 'Unsupported playback format: m3u8';
                    }
                },
                flv: function playFlv(video, url, art) {
                    if (flvjs.isSupported()) {
                        if (art.flv) art.flv.destroy();
                        const flv = flvjs.createPlayer({ type: 'flv', url });
                        flv.attachMediaElement(video);
                        flv.load();
                        art.flv = flv;
                        art.on('destroy', function() { flv.destroy(); });
                    } else {
                        art.notice.show = 'Unsupported playback format: flv';
                    }
                },
                mpd: function playMpd(video, url, art) {
                    if (dashjs.supportsMediaSource()) {
                        if (art.dash) art.dash.destroy();
                        const dash = dashjs.MediaPlayer().create();
                        dash.initialize(video, url, art.option.autoplay);
                        art.dash = dash;
                        art.on('destroy', function() { dash.destroy(); });
                    } else {
                        art.notice.show = 'Unsupported playback format: mpd';
                    }
                }
            }
        });
    </script>
</body>
</html>`
}
