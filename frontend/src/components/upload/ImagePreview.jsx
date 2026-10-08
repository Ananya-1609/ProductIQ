export default function ImagePreview({ src, alt = 'Product preview' }) { return src ? <img src={src} alt={alt} className="max-h-full w-full object-contain" /> : null }
