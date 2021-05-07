import { Events, Playback, Styler, template, Log } from 'clappr'
import YouTubeIframeLoader from 'youtube-iframe'

import playbackStyle from './public/style.css'
import playbackHtml from './public/youtube.html'
const REG_EXP = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
const AUTO = -1

export default class YoutubePlayback extends Playback {
  get name() { return 'youtube_playback' }

  get template() { return template(playbackHtml) }

  get attributes() {
    return {
      'data-youtube-playback': '',
      class: 'clappr-youtube-playback',
      id: this.cid
    }
  }

  get ended() { return false }
  get buffering() { return this.YTPlayer && this.YTPlayer.getPlayerState() === YT.PlayerState.BUFFERING }
  get isReady() { return this._ready }

  constructor(options) {
    super(options)
    this.settings = {
      changeCount: 0,
      seekEnabled: true,
      left: ['playpause', 'position', 'duration'],
      default: ['seekbar'],
      right:['fullscreen','volume', 'hd-indicator']
    }
    const match = this.options.source.match(REG_EXP)
    this._src = match && match[7]
    this.YTPlayer = null
    this.YT = null
    if (this.options.playback.controls || this.options.useVideoTagDefaultControls)
      this.$el.attr('controls', '')
    YouTubeIframeLoader.load((YT) => {
      this.YT = YT
      this.setupYoutubePlayer()
    })
  }

  setupYoutubePlayer() {
    if (this.YT && this.YT.Player) {
      this.embedYoutubePlayer()
    } else {
      this.once(Events.PLAYBACK_READY, () => this.embedYoutubePlayer())
    }
    if (!this.options.playback || !this.options.playback.controls) {
      this.enableMediaControl()
    }
  }

  embedYoutubePlayer() {
    let playerVars = {
      controls: 0,
      autoplay: 1,
      disablekb: 1,
      enablejsapi: 1,
      iv_load_policy: 3,
      modestbranding: 1,
      showinfo: 0,
      html5: 1,
      origin: window.location.host
    }
    this.YTPlayer = new this.YT.Player(`yt${this.cid}`, {
      videoId: this._src,
      playerVars: playerVars,
      width: '100%',
      height: '100%',
      events: {
        onReady: () => this.ready(),
        onStateChange: (event) => this.stateChange(event),
        onPlaybackQualityChange: (event) => this.qualityChange(event),
        onError: (error) => onError(error)
      }
    })
  }

  onError(error) {
    let formattedError
    switch (error.data) {
      case 2:
        Log.error('Youtube: Invalide parameter.')
        formattedError = this.createError(error)
        this.trigger(Events.PLAYBACK_ERROR, formattedError)
        this.stop()
        break
      case 5:
        Log.error('Youtube: HTML5 player error.')
        formattedError = this.createError(error)
        this.trigger(Events.PLAYBACK_ERROR, formattedError)
        this.stop()
        break
      case 100:
        Log.error('Youtube: Video not found.')
        formattedError = this.createError(error)
        this.trigger(Events.PLAYBACK_ERROR, formattedError)
        this.stop()
        break
      default:
        Log.error('Youtube: Embed not allowed by user.')
        formattedError = this.createError(error)
        this.trigger(Events.PLAYBACK_ERROR, formattedError)
        this.stop()
        break
    }
  }

  ready() {
    this._ready = true
    this.play()
    this.trigger(Events.PLAYBACK_READY, this.name)
  }

  qualityChange(event) { // eslint-disable-line no-unused-vars
    this.trigger(Events.PLAYBACK_HIGHDEFINITIONUPDATE, this.isHighDefinitionInUse())
  }

  stateChange(event) {
    switch (event.data) {
    case this.YT.PlayerState.PLAYING: {
      let playbackType = this.getPlaybackType()
      if (this._playbackType !== playbackType) {
        this.settings.changeCount++
        this._playbackType = playbackType
        this.trigger(Events.PLAYBACK_SETTINGSUPDATE)
      }
      this.trigger(Events.PLAYBACK_BUFFERFULL)
      this.trigger(Events.PLAYBACK_PLAY)
      break
    }
    case this.YT.PlayerState.PAUSED:
      this.trigger(Events.PLAYBACK_PAUSE)
      break
    case this.YT.PlayerState.BUFFERING:
      this.trigger(Events.PLAYBACK_BUFFERING)
      break
    case this.YT.PlayerState.ENDED:
      if (this.options.youtubeShowRelated) {
        this.disableMediaControl()
      } else {
        this.trigger(Events.PLAYBACK_ENDED)
      }
      break
    default: break
    }
  }

  play() {
    if (this.YTPlayer) {
      this._progressTimer = this._progressTimer || setInterval(() => this.progress(), 100)
      this._timeupdateTimer = this._timeupdateTimer || setInterval(() => this.timeupdate(), 100)
      this.YTPlayer.playVideo()
    } else if (this._ready) {
      this.trigger(Events.PLAYBACK_BUFFERING)
      this._progressTimer = this._progressTimer || setInterval(() => this.progress(), 100)
      this._timeupdateTimer = this._timeupdateTimer || setInterval(() => this.timeupdate(), 100)
      this.setupYoutubePlayer()
    } else {
      this.trigger(Events.PLAYBACK_BUFFERING)
      this.listenToOnce(this, Events.PLAYBACK_READY, this.play)
    }
  }

  pause() {
    clearInterval(this._timeupdateTimer)
    this._timeupdateTimer = null
    this.YTPlayer && this.YTPlayer.pauseVideo()
  }

  seek(time) {
    if (!this.YTPlayer) return
    this.YTPlayer.seekTo(time)
  }

  seekPercentage(percentage) {
    if (!this.YTPlayer) return
    let duration = this.YTPlayer.getDuration()
    let time = percentage * duration / 100
    this.seekTo(time)
  }

  volume(value) {
    this.YTPlayer && this.YTPlayer.setVolume && this.YTPlayer.setVolume(value)
  }

  progress() {
    if (!this.YTPlayer || !this.YTPlayer.getDuration) return
    let buffered = this.YTPlayer.getDuration() * this.YTPlayer.getVideoLoadedFraction()
    this.trigger(Events.PLAYBACK_PROGRESS, {start: 0, current: buffered, total: this.YTPlayer.getDuration()})
  }

  timeupdate() {
    if (!this.YTPlayer || !this.YTPlayer.getDuration) return
    this.trigger(Events.PLAYBACK_TIMEUPDATE, {current: this.YTPlayer.getCurrentTime(), total: this.YTPlayer.getDuration()})
  }

  isPlaying() {
    return this.YTPlayer && this.YTPlayer.getPlayerState() == this.YT.PlayerState.PLAYING
  }

  isHighDefinitionInUse() {
    return this.YTPlayer && !!this.YTPlayer.getPlaybackQuality().match(/^hd\d+/)
  }

  getDuration() {
    let duration = 0
    if (this.YTPlayer) {
      duration = this.YTPlayer.getDuration()
    }
    return duration
  }

  getPlaybackType() {
    return Playback.VOD
  }

  disableMediaControl() {
    this.$el.css({'pointer-events': 'auto'})
    this.trigger(Events.PLAYBACK_MEDIACONTROL_DISABLE)
  }

  enableMediaControl() {
    this.$el.css({'pointer-events': 'none'})
    this.trigger(Events.PLAYBACK_MEDIACONTROL_ENABLE)
  }

  render() {
    this.$el.html(this.template({id: `yt${this.cid}`}))
    let style = Styler.getStyleFor(playbackStyle, {baseUrl: this.options.baseUrl})
    this.$el.append(style)
    return this
  }
}

YoutubePlayback.canPlay = function(source) { // eslint-disable-line no-unused-vars
  const match = source.match(REG_EXP)
  return match && match[7].length === 11
}