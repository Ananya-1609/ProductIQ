import axios from 'axios'

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    '/api',
  timeout: 300000,
  withCredentials: true,
})

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error?.response) return 'Unable to connect to ProductIQ server.'
  const detail = error.response.data?.detail
  if (detail) return detail
  const messages = { 401: 'Your session has expired. Please sign in again.', 403: 'You do not have access to this action.', 404: 'The requested record was not found.', 409: 'This action is not valid for the current product state.', 422: 'Please check the submitted information.', 500: 'ProductIQ could not complete the request.', 502: 'The upstream service is unavailable.', 503: 'ProductIQ is temporarily unavailable.' }
  return messages[error.response.status] || fallback
}

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(Object.assign(error, { userMessage: getApiErrorMessage(error) })),
)


// ============================================================
// ANALYZE PRODUCT
// ============================================================

export async function analyzeProduct(file) {
  if (!file) {
    throw new Error('Please upload a valid product image.')
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await api.post('/analyze', formData)

    const payload = response.data

    if (payload?.success !== true || !payload.analysis) {
      throw new Error(
        'The backend returned an incomplete analysis.'
      )
    }

    return payload

  } catch (error) {

    if (error.response?.status === 400) {
      throw new Error(
        error.response.data?.detail ||
        'Only product images are supported.',
        { cause: error }
      )
    }

    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT'
    ) {
      throw new Error(
        'The AI analysis is taking longer than expected. Please try again.',
        { cause: error }
      )
    }

    if (axios.isAxiosError(error) && !error.response) {
      throw new Error(
        'Unable to connect to the FastAPI backend. Please check that it is running.',
        { cause: error }
      )
    }

    if (
      error.response?.status === 502 ||
      error.response?.status === 503
    ) {
      throw new Error(
        'The analysis service is temporarily unavailable. Please try again shortly.',
        { cause: error }
      )
    }

    if (error.response?.status >= 500) {
      throw new Error(
        'The server could not complete the product analysis. Please try again.',
        { cause: error }
      )
    }

    throw new Error(
      error.message || 'Unable to analyze this image. Please try again.',
      { cause: error }
    )
  }
}


// ============================================================
// CREATE PRODUCT
// ============================================================

export async function createProduct(product) {
  try {
    const response = await api.post('/products', product)

    if (response.data?.success !== true) {
      throw new Error('The product could not be saved.')
    }

    return response.data

  } catch (error) {

    if (axios.isAxiosError(error) && !error.response) {
      throw new Error(
        'Unable to connect to the backend.',
        { cause: error }
      )
    }

    throw new Error(
      error.response?.data?.detail ||
      error.message ||
      'Unable to save the product.',
      { cause: error }
    )
  }
}


// ============================================================
// GET ALL PRODUCTS
// ============================================================

export async function getProducts() {
  try {
    const response = await api.get('/products')

    if (response.data?.success !== true) {
      throw new Error('The backend returned an invalid product list.')
    }

    return response.data.products || []

  } catch (error) {

    if (axios.isAxiosError(error) && !error.response) {
      throw new Error(
        'Unable to connect to the backend.',
        { cause: error }
      )
    }

    throw new Error(
      error.response?.data?.detail ||
      error.message ||
      'Unable to load products.',
      { cause: error }
    )
  }
}


// ============================================================
// GET SINGLE PRODUCT
// ============================================================

export async function getProduct(productId) {
  if (!productId) {
    throw new Error('Product ID is required.')
  }

  try {
    const response = await api.get(
      `/products/${productId}`
    )

    if (
      response.data?.success !== true ||
      !response.data.product
    ) {
      throw new Error('Product not found.')
    }

    return response.data.product

  } catch (error) {

    if (axios.isAxiosError(error) && !error.response) {
      throw new Error(
        'Unable to connect to the backend.',
        { cause: error }
      )
    }

    throw new Error(
      error.response?.data?.detail ||
      error.message ||
      'Unable to load product.',
      { cause: error }
    )
  }
}


// ============================================================
// UPDATE PRODUCT
// ============================================================

export async function updateProduct(
  productId,
  analysis,
  status,
  catalog_fields
) {
  if (!productId) {
    throw new Error('Product ID is required.')
  }

  try {
    const response = await api.put(
      `/products/${productId}`,
      {
        analysis,
        status,
        catalog_fields,
      }
    )

    if (response.data?.success !== true) {
      throw new Error('The product could not be updated.')
    }

    return response.data

  } catch (error) {

    if (axios.isAxiosError(error) && !error.response) {
      throw new Error(
        'Unable to connect to the backend.',
        { cause: error }
      )
    }

    throw new Error(
      error.response?.data?.detail ||
      error.message ||
      'Unable to update product.',
      { cause: error }
    )
  }
}


export async function approveProduct(productId) {
  const response = await api.post(`/products/${productId}/approve`)
  return response.data.product
}


export async function rejectProduct(productId, reason) {
  const response = await api.post(
    `/products/${productId}/reject`,
    { reason }
  )
  return response.data.product
}


export async function publishProduct(productId) {
  const response = await api.post(`/products/${productId}/publish`)
  return response.data.product
}


export async function unpublishProduct(productId) {
  const response = await api.post(`/products/${productId}/unpublish`)
  return response.data.product
}


export async function getStoreProducts({ query = '', category = '', sort = 'newest' } = {}) {
  const response = await api.get('/store/products', {
    params: { q: query, category, sort },
  })
  return response.data.products || []
}


export async function getStoreProduct(productId) {
  const response = await api.get(`/store/products/${productId}`)
  return response.data.product
}

export async function getSellerProducts() {
  const response = await api.get('/seller/products')
  return response.data.products || []
}

export async function getSellerProduct(productId) {
  const response = await api.get(`/seller/products/${productId}`)
  return response.data.product
}

export async function updateSellerProduct(productId, analysis, status, catalog_fields) {
  const response = await api.put(`/seller/products/${productId}`, { analysis, status, catalog_fields })
  return response.data.product
}


export default api
