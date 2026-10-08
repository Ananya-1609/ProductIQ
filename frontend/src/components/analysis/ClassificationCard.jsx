import AttributeCard from './AttributeCard'
const classificationKeys = ['category', 'subcategory', 'gender']
export default function ClassificationCard({ analysis }) { return <div className="grid gap-3 sm:grid-cols-3">{classificationKeys.map((key) => analysis?.[key] ? <AttributeCard key={key} label={key} data={analysis[key]} compact /> : null)}</div> }
