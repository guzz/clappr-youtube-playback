const playerElement = document.getElementById('player-wrapper')

const player = new Clappr.Player({
  source: 'https://www.youtube.com/watch?v=fCUTX1jurJ4',
  poster: 'http://clappr.io/poster.png',
  plugins: [
    window.YoutubePlayback
  ],
})

player.attachTo(playerElement)
