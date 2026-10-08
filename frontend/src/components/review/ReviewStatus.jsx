import StatusBadge from '../common/StatusBadge'
export default function ReviewStatus({ status = 'REVIEW' }) { return <div className="flex items-center gap-2 text-sm text-slate-500"><span>Review status</span><StatusBadge status={status} /></div> }
