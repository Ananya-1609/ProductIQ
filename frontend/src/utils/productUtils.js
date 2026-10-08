export function getProductName(product) {
  const analysis = product?.analysis || {}
  return product?.catalog_fields?.product_title || analysis.product_title || analysis.subcategory?.value || analysis.category?.value || product?.filename || 'Untitled product'
}

export function getProductCategory(product) {
  return product?.analysis?.category?.value || 'Unknown'
}

export function getProductSubcategory(product) {
  return product?.analysis?.subcategory?.value || 'Unknown'
}

export function getProductConfidence(product) {
  const values = Object.values(product?.analysis || {})
    .filter((field) => field && typeof field === 'object' && typeof field.confidence === 'number' && field.value !== null && field.value !== undefined && String(field.value).trim() !== '')
    .map((field) => field.confidence)

  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

export function normalizeProduct(product) {
  return {
    ...product,
    name: getProductName(product),
    category: getProductCategory(product),
    subcategory: getProductSubcategory(product),
    aiStatus: product.status || 'UNKNOWN',
    publicationStatus: product.publication_status || 'DRAFT',
    confidence: getProductConfidence(product),
  }
}
