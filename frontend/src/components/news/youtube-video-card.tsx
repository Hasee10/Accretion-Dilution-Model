import { Play, Youtube } from 'lucide-react'
import type { YouTubeVideo } from '@/lib/news/api'
import { relativeTime } from './news-utils'

export function YouTubeVideoCard({ video }: { video: YouTubeVideo }) {
  return (
    <a
      href={video.youtube_url}
      target='_blank'
      rel='noreferrer'
      className='group overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface transition duration-200 hover:-translate-y-0.5 hover:border-border-default'
    >
      <div className='relative aspect-video overflow-hidden'>
        <img src={video.thumbnail_url} alt={video.title} className='h-full w-full object-cover transition duration-300 group-hover:brightness-110' />
        <span className='absolute left-3 top-3 rounded-full bg-accent-cyan/85 px-2.5 py-1 font-ui text-[10px] uppercase tracking-[0.12em] text-black'>
          {video.channel}
        </span>
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white transition duration-300 group-hover:scale-110'>
            <Play className='ml-1 h-5 w-5 fill-current' />
          </div>
        </div>
        <div className='absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-4 py-3 opacity-0 transition duration-300 group-hover:opacity-100'>
          <span className='font-ui text-xs text-white'>Watch on YouTube</span>
          <Youtube className='h-4 w-4 text-white' />
        </div>
      </div>
      <div className='space-y-2 p-4'>
        <h3 className='line-clamp-2 font-display text-[14px] text-text-primary'>{video.title}</h3>
        <p className='font-ui text-xs text-text-secondary'>
          {video.channel} · {relativeTime(video.published_at)}
        </p>
      </div>
    </a>
  )
}
