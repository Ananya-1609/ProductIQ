import { formatConfidence } from '../../utils/formatConfidence'
export default function ConfidenceBadge({ value }) { return <span className="text-xs font-semibold text-slate-500">{formatConfidence(value)}</span> }
