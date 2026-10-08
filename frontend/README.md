ProductIQ

ProductIQ is a multimodal e-commerce product intelligence and catalog automation platform. It combines computer vision classification with multimodal generative AI to turn product images into structured, evidence-aware catalog information while keeping human review and publication control in the loop.

## Problem

Manual product cataloging is slow, inconsistent, and difficult to scale. ProductIQ reduces repetitive work without allowing unsupported attributes or unreviewed products to reach the storefront.

## Solution

The reviewer uploads an image, the backend combines MobileNetV2 classification with Gemini multimodal analysis, validation compares and scores the results, and a human reviewer edits or approves the structured record before publication.

## Key Features

- Google Identity Services authentication with reviewer and customer roles
- Drag-and-drop product image analysis
- Four-class MobileNetV2 product classification
- Gemini structured attributes with visual, inferred, and unknown evidence
- AI status kept separate from publication status
- Human-editable review fields
- Approval, rejection, publish, and unpublish workflow
- Real-data reviewer dashboard, catalog, history, and analytics
- Customer-safe published-product storefront with search and category filtering
- Responsive reviewer and storefront layouts

## Architecture

```text
React Frontend
	|
	v
FastAPI Backend
	|
	+----------------------+------------------+
	|                      |                  |
	v                      v                  v
MobileNetV2          Gemini Multimodal       MongoDB
	|                      |                  |
	+----------+-----------+                  |
		    v                              |
	   Validation Engine                      |
		    v                              |
	    Human Review                          |
		    v                              |
	 Publication Workflow --------------------+
		    v
	   Customer Storefront
```

## Technology Stack

- React, Vite, JavaScript, Axios, React Router, Tailwind CSS
- Python, FastAPI, PyMongo, MongoDB
- TensorFlow/Keras and MobileNetV2 transfer learning
- Google Gemini multimodal analysis
- Google Identity Services with a secure HttpOnly session cookie

## ML Model and Dataset

The existing model is a MobileNetV2 transfer-learning classifier with a `224x224x3` input and four classes: Accessories, Bags, Clothing, and Footwear. It uses the Myntra product dataset and the existing train, validation, and test split. The model is not retrained by the frontend application.

Offline test-set evaluation:

| Metric | Result |
| --- | ---: |
| Test samples | 6,283 |
| Accuracy | 97.77% |
| Macro F1 | 96.67% |
| Weighted F1 | 97.78% |

These are offline evaluation results, not real-time production metrics.

## AI and Review Pipeline

1. Reviewer uploads a product image.
2. MobileNetV2 predicts one of the four product categories.
3. Gemini extracts structured attributes and evidence.
4. Validation compares category signals and validates attributes.
5. The AI result is marked `ACCEPT`, `REVIEW`, or `UNKNOWN`.
6. A reviewer can edit fields and save the review.
7. Publication transitions are enforced separately: `DRAFT` or `PENDING_REVIEW` to `APPROVED` or `REJECTED`, `APPROVED` to `PUBLISHED`, and `PUBLISHED` back to `APPROVED` when unpublished.
8. The storefront exposes published customer-safe fields only.

## API Overview

- Authentication: `POST /auth/google`, `GET /auth/me`, `POST /auth/logout`
- Products: `POST /products`, `GET /products`, `GET /products/{id}`, `PUT /products/{id}`
- Analysis: `POST /analyze`, `POST /predict`
- Publication: `/products/{id}/approve`, `/reject`, `/publish`, `/unpublish`
- Storefront: `GET /store/products`, `GET /store/products/{id}`

The frontend uses the shared Axios client with `withCredentials: true` and does not contain backend secrets.

## Folder Structure

```text
frontend/
  src/
    components/   Shared layout, analysis, catalog, review, and store UI
    context/      Authentication state
    pages/        Reviewer and customer routes
    services/     Centralized API and authentication clients
    utils/        Formatting and product normalization helpers
backend/
  main.py        FastAPI application
  ml_model/      Classifier training, evaluation, and inference
  product_*.py   Product routes and schemas
  validation_engine.py
  review_engine.py
  store_routes.py
```

## Setup

Start MongoDB, then configure the backend environment variables in `backend/.env` without committing secrets. Start the FastAPI backend on `http://127.0.0.1:8000`, then run the frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`. The optional public frontend configuration may include the Google client ID and `VITE_API_BASE_URL`; API keys, MongoDB URLs, and session secrets remain backend-only.

## Screenshots

Add current reviewer dashboard, analysis workspace, and customer storefront screenshots here for demos and resumes.

## Limitations

- Analysis progress is indeterminate because the current API does not expose backend stage events.
- The storefront intentionally does not implement cart, checkout, payments, or orders.
- Analytics are calculated from persisted product records and show empty states when data is insufficient.
- Offline model metrics do not guarantee production performance on unseen catalog imagery.

## Future Improvements

- Optional server-sent analysis stage events
- More detailed audit history and reviewer activity views
- Confidence calibration and duplicate detection
- Search and recommendation improvements
- Cart and checkout workflows after the catalog foundation is stable

## Zero-Cost Development

The project is designed for local, free-tier development using the existing MongoDB, FastAPI, TensorFlow/Keras, Gemini, and Google authentication integrations. No paid API or billing requirement is introduced by the frontend.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
