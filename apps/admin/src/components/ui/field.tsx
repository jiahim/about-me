import * as React from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FieldProps extends React.ComponentProps<'div'> {
  description?: React.ReactNode
  error?: React.ReactNode
  htmlFor?: string
  label?: React.ReactNode
  required?: boolean
}

function Field({ children, className, description, error, htmlFor, label, required, ...props }: FieldProps) {
  const descriptionId = htmlFor && description ? `${htmlFor}-description` : undefined
  const errorId = htmlFor && error ? `${htmlFor}-error` : undefined
  return <div data-slot="field" className={cn('grid gap-2', className)} {...props}>{label && <Label htmlFor={htmlFor}>{label}{required && <span aria-hidden="true" className="text-destructive">*</span>}</Label>}{children}{description && <p id={descriptionId} className="text-sm text-muted-foreground">{description}</p>}{error && <p id={errorId} role="alert" className="text-sm text-destructive">{error}</p>}</div>
}

export { Field }
export type { FieldProps }
