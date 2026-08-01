import FilterPanel from '../ui/FilterPanel'

export default function PriceFilter({ type = 'flight', ...props }) {
  return <FilterPanel type={type} {...props} />
}
