import Card from './Card'

const listText = (items = []) => (Array.isArray(items) ? items : []).join(', ')
const parseList = (value) => value.split(',').map((item) => item.trim()).filter(Boolean)

export default function CatalogFieldsEditor({ value = {}, onChange, title = 'Catalog fields' }) {
  const fields = {
    product_title: value.product_title || '',
    price: value.price ?? '',
    sizes: listText(value.sizes),
    tags: listText(value.tags),
    seo_keywords: listText(value.seo_keywords),
  }
  const set = (key, next) => onChange({
    ...value,
    [key]: key === 'price' ? (next === '' ? null : Number(next)) : ['sizes', 'tags', 'seo_keywords'].includes(key) ? parseList(next) : next,
  })
  const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500'
  return <Card className="p-5"><h2 className="font-semibold text-slate-950">{title}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-medium text-slate-700">Product Title<input className={inputClass} value={fields.product_title} onChange={(event) => set('product_title', event.target.value)} /></label>
    <label className="text-sm font-medium text-slate-700">Price<input className={inputClass} type="number" min="0" step="0.01" placeholder="Not provided" value={fields.price} onChange={(event) => set('price', event.target.value)} /></label>
    <label className="text-sm font-medium text-slate-700">Available Sizes<input className={inputClass} placeholder="Comma-separated; leave blank if not provided" value={fields.sizes} onChange={(event) => set('sizes', event.target.value)} /></label>
    <label className="text-sm font-medium text-slate-700">Tags<input className={inputClass} placeholder="Comma-separated tags" value={fields.tags} onChange={(event) => set('tags', event.target.value)} /></label>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">SEO Keywords<input className={inputClass} placeholder="Comma-separated search phrases" value={fields.seo_keywords} onChange={(event) => set('seo_keywords', event.target.value)} /></label>
  </div></Card>
}
