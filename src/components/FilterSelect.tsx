interface FilterSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string; count?: number }[];
  onChange: (value: string) => void;
}

/** One filter in a row of filters: a labelled select whose empty option means "any". */
export function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
            {o.count !== undefined ? ' (' + o.count + ')' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SearchBox({ value, onChange, placeholder, id }: { value: string; onChange: (value: string) => void; placeholder: string; id?: string }) {
  return (
    <label className="relative block">
      <span className="sr-only">Search</span>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">
        <circle cx="11" cy="11" r="7" />
        <path d="m20.5 20.5-4.6-4.6" />
      </svg>
      <input
        id={id}
        type="search"
        className="input pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-search-box
      />
    </label>
  );
}
