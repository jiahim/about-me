'use client'

import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

export type SettingsFieldChange = (
  path: readonly (string | number)[],
  value: unknown
) => void

export function TextField({ label, value, readOnly = false, onChange }: { label: string; value: string; readOnly?: boolean; onChange: (value: string) => void }) {
  const id = `settings-${label.replace(/\s+/g, '-').toLowerCase()}`
  return <Field className="settings-field" htmlFor={id} label={label}><Input id={id} aria-label={label} readOnly={readOnly} value={value} onChange={(event) => onChange(event.target.value)} /></Field>
}

export function NumberField({ label, value, min, max, readOnly = false, onChange }: { label: string; value: number; min?: number; max?: number; readOnly?: boolean; onChange: (value: number) => void }) {
  const id = `settings-${label.replace(/\s+/g, '-').toLowerCase()}`
  return <Field className="settings-field" htmlFor={id} label={label}><Input id={id} aria-label={label} max={max} min={min} readOnly={readOnly} type="number" value={value} onChange={(event) => { const next = event.target.valueAsNumber; if (Number.isFinite(next)) onChange(next) }} /></Field>
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  const id = `settings-${label.replace(/\s+/g, '-').toLowerCase()}`
  return <div className="settings-toggle flex items-center justify-between gap-3 rounded-lg border p-3"><Label htmlFor={id}>{label}</Label><Switch id={id} aria-label={label} checked={checked} onCheckedChange={onChange} /></div>
}

export function SelectField({ label, value, options, onChange }: { label: string; value: string; options: readonly { value: string; label: string }[]; onChange: (value: string) => void }) {
  const id = `settings-${label.replace(/\s+/g, '-').toLowerCase()}`
  return <Field className="settings-field" htmlFor={id} label={label}><Select value={value} onValueChange={onChange}><SelectTrigger id={id} aria-label={label} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></Field>
}
