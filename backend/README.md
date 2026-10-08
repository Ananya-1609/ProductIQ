# Backend configuration

Copy `.env.example` to `.env` and provide a Google web client ID, a long random
`SESSION_SECRET`, and the MongoDB connection string. `REVIEWER_EMAILS` and
`SELLER_EMAILS` are comma-separated server-side allowlists. Role resolution is
always server-controlled: reviewer emails receive `REVIEWER` first, seller
emails receive `SELLER` only when the user requests Seller, and all other users
receive `USER`. The frontend cannot grant reviewer access.

Example environment configuration (use real addresses only in your local
`.env`):

```env
REVIEWER_EMAILS=reviewer@example.com
SELLER_EMAILS=seller@example.com
```

Create the Google OAuth client as a **Web application** and add
`http://localhost:5173` to its authorized JavaScript origins. The backend
verifies the Google ID token audience against `GOOGLE_CLIENT_ID`.