import { Link } from 'react-router-dom'
import Button from '../components/common/Button'
export default function NotFound() { return <div className="grid min-h-[60vh] place-items-center text-center"><div><p className="text-sm font-semibold text-teal-700">404</p><h2 className="mt-2 text-3xl font-semibold text-slate-950">Page not found</h2><p className="mt-2 text-slate-500">The workspace page you requested does not exist.</p><Link to="/reviewer/dashboard"><Button className="mt-6">Return to dashboard</Button></Link></div></div> }
