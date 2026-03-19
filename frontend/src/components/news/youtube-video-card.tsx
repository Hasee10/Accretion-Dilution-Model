import { Play, Youtube } from 'lucide-react'
import type { YouTubeVideo } from '@/lib/news/api'
import { relativeTime } from './news-utils'

function getVideoId(video: YouTubeVideo) {
  const embedId = video.embed_url?.split('/embed/')[1]?.split('?')[0]
  if (embedId) return embedId

  const watchId = video.youtube_url?.split('v=')[1]?.split('&')[0]
  if (watchId) return watchId

  return video.id
}

export function YouTubeVideoCard({ video }: { video: YouTubeVideo }) {
  const videoId = getVideoId(video)
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  const fallbackThumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`

  function openVideo() {
    window.open(watchUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      type='button'
      onClick={openVideo}
      className='group cursor-pointer overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface text-start transition duration-200 hover:-translate-y-0.5 hover:border-border-default'
    >
      <div className='relative aspect-video overflow-hidden'>
        <img
          src={thumbnailUrl}
          alt={video.title}
          onError={(event) => {
            event.currentTarget.src = fallbackThumbnailUrl
          }}
          className='h-full w-full object-cover transition duration-300 group-hover:brightness-110'
        />
        <span className='pointer-events-none absolute left-3 top-3 rounded-full bg-accent-cyan/85 px-2.5 py-1 font-ui text-[10px] uppercase tracking-[0.12em] text-black'>
          {video.channel}
        </span>
        <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
          <div className='flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white transition duration-300 group-hover:scale-110'>
            <Play className='ml-1 h-5 w-5 fill-current' />
          </div>
        </div>
        <div className='pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-4 py-3 opacity-0 transition duration-300 group-hover:opacity-100'>
          <span className='font-ui text-xs text-white'>Watch on YouTube</span>
          <Youtube className='h-4 w-4 text-white' />
        </div>
      </div>
      <div className='space-y-2 p-4'>
        <h3 className='line-clamp-2 font-display text-[14px] text-text-primary'>{video.title}</h3>
        <p className='font-ui text-xs text-text-secondary'>
          {video.channel} - {relativeTime(video.published_at)}
        </p>
      </div>
    </button>
  )
}
