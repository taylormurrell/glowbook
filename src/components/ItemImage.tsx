'use client'

export default function ItemImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}
