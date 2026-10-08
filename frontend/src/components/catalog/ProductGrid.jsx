import ProductCard from './ProductCard'
export default function ProductGrid({ products }) { return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> }
