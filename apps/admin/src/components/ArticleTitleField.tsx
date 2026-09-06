interface ArticleTitleFieldProps {
  value: string
  onChange: (value: string) => void
}

export function ArticleTitleField({ value, onChange }: ArticleTitleFieldProps) {
  return (
    <textarea
      className="article-title-input"
      rows={2}
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\r?\n/g, ' '))}
      placeholder="文章标题"
      maxLength={120}
      aria-label="文章标题"
    />
  )
}
