import _classCallCheck from '@babel/runtime/helpers/classCallCheck';
import _createClass from '@babel/runtime/helpers/createClass';
import _inherits from '@babel/runtime/helpers/inherits';
import _possibleConstructorReturn from '@babel/runtime/helpers/possibleConstructorReturn';
import _getPrototypeOf from '@babel/runtime/helpers/getPrototypeOf';
import { template, Events, Log, Playback, Styler } from '@clappr/core';
import YouTubeIframeLoader from 'youtube-iframe';

function styleInject(css, ref) {
  if ( ref === void 0 ) ref = {};
  var insertAt = ref.insertAt;

  if (!css || typeof document === 'undefined') { return; }

  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';

  if (insertAt === 'top') {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

var css_248z = ".clappr-youtube-playback[data-youtube-playback] {\n  position: absolute;\n  height: 100%;\n  width: 100%;\n  display: block;\n}";
styleInject(css_248z);

var playbackHtml = "<div id=\"<%=id%>\"></div>";

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
var REG_EXP = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;

var YoutubePlayback = /*#__PURE__*/function (_Playback) {
  _inherits(YoutubePlayback, _Playback);

  var _super = _createSuper(YoutubePlayback);

  function YoutubePlayback(options) {
    var _this;

    _classCallCheck(this, YoutubePlayback);

    _this = _super.call(this, options);
    _this.settings = {
      changeCount: 0,
      seekEnabled: true,
      left: ['playpause', 'position', 'duration'],
      default: ['seekbar'],
      right: ['fullscreen', 'volume', 'hd-indicator']
    };

    var match = _this.options.src.match(REG_EXP);

    _this._src = match && match[7];
    _this.YTPlayer = null;
    _this.YT = null;
    if (_this.options.playback.controls || _this.options.useVideoTagDefaultControls) _this.$el.attr('controls', '');
    YouTubeIframeLoader.load(function (YT) {
      _this.YT = YT;

      _this.setupYoutubePlayer();
    });
    return _this;
  }

  _createClass(YoutubePlayback, [{
    key: "name",
    get: function get() {
      return 'youtube_playback';
    }
  }, {
    key: "template",
    get: function get() {
      return template(playbackHtml);
    }
  }, {
    key: "attributes",
    get: function get() {
      return {
        'data-youtube-playback': '',
        class: 'clappr-youtube-playback',
        id: this.cid
      };
    }
  }, {
    key: "ended",
    get: function get() {
      return false;
    }
  }, {
    key: "buffering",
    get: function get() {
      return this.YTPlayer && this.YTPlayer.getPlayerState() === YT.PlayerState.BUFFERING;
    }
  }, {
    key: "isReady",
    get: function get() {
      return this._ready;
    }
  }, {
    key: "setupYoutubePlayer",
    value: function setupYoutubePlayer() {
      var _this2 = this;

      if (this.YT && this.YT.Player) {
        this.embedYoutubePlayer();
      } else {
        this.once(Events.PLAYBACK_READY, function () {
          return _this2.embedYoutubePlayer();
        });
      }

      if (!this.options.playback || !this.options.playback.controls) {
        this.enableMediaControl();
      }
    }
  }, {
    key: "embedYoutubePlayer",
    value: function embedYoutubePlayer() {
      var _this3 = this;

      var playerVars = {
        controls: 0,
        autoplay: this.options.autoPlay ? 1 : 0,
        disablekb: 1,
        enablejsapi: 1,
        iv_load_policy: 3,
        modestbranding: 1,
        showinfo: 0,
        html5: 1,
        origin: window.location.host
      };
      this.YTPlayer = new this.YT.Player("yt".concat(this.cid), {
        videoId: this._src,
        playerVars: playerVars,
        width: '100%',
        height: '100%',
        events: {
          onReady: function onReady() {
            return _this3.ready();
          },
          onStateChange: function onStateChange(event) {
            return _this3.stateChange(event);
          },
          onPlaybackQualityChange: function onPlaybackQualityChange(event) {
            return _this3.qualityChange(event);
          },
          onError: function (_onError) {
            function onError(_x) {
              return _onError.apply(this, arguments);
            }

            onError.toString = function () {
              return _onError.toString();
            };

            return onError;
          }(function (error) {
            return onError(error);
          })
        }
      });
    }
  }, {
    key: "onError",
    value: function onError(error) {
      var formattedError;

      switch (error.data) {
        case 2:
          Log.error('Youtube: Invalide parameter.');
          formattedError = this.createError(error);
          this.trigger(Events.PLAYBACK_ERROR, formattedError);
          this.stop();
          break;

        case 5:
          Log.error('Youtube: HTML5 player error.');
          formattedError = this.createError(error);
          this.trigger(Events.PLAYBACK_ERROR, formattedError);
          this.stop();
          break;

        case 100:
          Log.error('Youtube: Video not found.');
          formattedError = this.createError(error);
          this.trigger(Events.PLAYBACK_ERROR, formattedError);
          this.stop();
          break;

        default:
          Log.error('Youtube: Embed not allowed by user.');
          formattedError = this.createError(error);
          this.trigger(Events.PLAYBACK_ERROR, formattedError);
          this.stop();
          break;
      }
    }
  }, {
    key: "ready",
    value: function ready() {
      this._ready = true;

      if (this.options.autoPlay) {
        this.play();
      }

      this.trigger(Events.PLAYBACK_READY, this.name);
    }
  }, {
    key: "qualityChange",
    value: function qualityChange(event) {
      // eslint-disable-line no-unused-vars
      this.trigger(Events.PLAYBACK_HIGHDEFINITIONUPDATE, this.isHighDefinitionInUse());
    }
  }, {
    key: "stateChange",
    value: function stateChange(event) {
      switch (event.data) {
        case this.YT.PlayerState.PLAYING:
          {
            var playbackType = this.getPlaybackType();

            if (this._playbackType !== playbackType) {
              this.settings.changeCount++;
              this._playbackType = playbackType;
              this.trigger(Events.PLAYBACK_SETTINGSUPDATE);
            }

            this.trigger(Events.PLAYBACK_BUFFERFULL);
            this.trigger(Events.PLAYBACK_PLAY);
            break;
          }

        case this.YT.PlayerState.PAUSED:
          this.trigger(Events.PLAYBACK_PAUSE);
          break;

        case this.YT.PlayerState.BUFFERING:
          this.trigger(Events.PLAYBACK_BUFFERING);
          break;

        case this.YT.PlayerState.ENDED:
          if (this.options.youtubeShowRelated) {
            this.disableMediaControl();
          } else {
            this.trigger(Events.PLAYBACK_ENDED);
          }

          break;
      }
    }
  }, {
    key: "play",
    value: function play() {
      var _this4 = this;

      if (this.YTPlayer) {
        this._progressTimer = this._progressTimer || setInterval(function () {
          return _this4.progress();
        }, 100);
        this._timeupdateTimer = this._timeupdateTimer || setInterval(function () {
          return _this4.timeupdate();
        }, 100);
        this.YTPlayer.playVideo();
      } else if (this._ready) {
        this.trigger(Events.PLAYBACK_BUFFERING);
        this._progressTimer = this._progressTimer || setInterval(function () {
          return _this4.progress();
        }, 100);
        this._timeupdateTimer = this._timeupdateTimer || setInterval(function () {
          return _this4.timeupdate();
        }, 100);
        this.setupYoutubePlayer();
      } else {
        this.trigger(Events.PLAYBACK_BUFFERING);
        this.listenToOnce(this, Events.PLAYBACK_READY, this.play);
      }
    }
  }, {
    key: "pause",
    value: function pause() {
      clearInterval(this._timeupdateTimer);
      this._timeupdateTimer = null;
      this.YTPlayer && this.YTPlayer.pauseVideo();
    }
  }, {
    key: "seek",
    value: function seek(time) {
      if (!this.YTPlayer) return;
      this.YTPlayer.seekTo(time);
    }
  }, {
    key: "seekPercentage",
    value: function seekPercentage(percentage) {
      if (!this.YTPlayer) return;
      var duration = this.YTPlayer.getDuration();
      var time = percentage * duration / 100;
      this.seekTo(time);
    }
  }, {
    key: "volume",
    value: function volume(value) {
      this.YTPlayer && this.YTPlayer.setVolume && this.YTPlayer.setVolume(value);
    }
  }, {
    key: "progress",
    value: function progress() {
      if (!this.YTPlayer || !this.YTPlayer.getDuration) return;
      var buffered = this.YTPlayer.getDuration() * this.YTPlayer.getVideoLoadedFraction();
      this.trigger(Events.PLAYBACK_PROGRESS, {
        start: 0,
        current: buffered,
        total: this.YTPlayer.getDuration()
      });
    }
  }, {
    key: "timeupdate",
    value: function timeupdate() {
      if (!this.YTPlayer || !this.YTPlayer.getDuration) return;
      this.trigger(Events.PLAYBACK_TIMEUPDATE, {
        current: this.YTPlayer.getCurrentTime(),
        total: this.YTPlayer.getDuration()
      });
    }
  }, {
    key: "isPlaying",
    value: function isPlaying() {
      return this.YTPlayer && this.YTPlayer.getPlayerState() == this.YT.PlayerState.PLAYING;
    }
  }, {
    key: "isHighDefinitionInUse",
    value: function isHighDefinitionInUse() {
      return this.YTPlayer && !!this.YTPlayer.getPlaybackQuality().match(/^hd\d+/);
    }
  }, {
    key: "getDuration",
    value: function getDuration() {
      var duration = 0;

      if (this.YTPlayer) {
        duration = this.YTPlayer.getDuration();
      }

      return duration;
    }
  }, {
    key: "getPlaybackType",
    value: function getPlaybackType() {
      return Playback.VOD;
    }
  }, {
    key: "disableMediaControl",
    value: function disableMediaControl() {
      this.$el.css({
        'pointer-events': 'auto'
      });
      this.trigger(Events.PLAYBACK_MEDIACONTROL_DISABLE);
    }
  }, {
    key: "enableMediaControl",
    value: function enableMediaControl() {
      this.$el.css({
        'pointer-events': 'none'
      });
      this.trigger(Events.PLAYBACK_MEDIACONTROL_ENABLE);
    }
  }, {
    key: "render",
    value: function render() {
      this.$el.html(this.template({
        id: "yt".concat(this.cid)
      }));
      var style = Styler.getStyleFor(css_248z, {
        baseUrl: this.options.baseUrl
      });
      this.$el.append(style);
      return this;
    }
  }]);

  return YoutubePlayback;
}(Playback);

YoutubePlayback.canPlay = function (source) {
  // eslint-disable-line no-unused-vars
  var match = source.match(REG_EXP);
  return match && match[7].length === 11;
};

export default YoutubePlayback;
