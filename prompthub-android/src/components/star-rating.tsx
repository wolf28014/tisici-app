'use client'

import * as React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  value: number // 0-5
  onChange?: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
  readOnly?: boolean
  className?: string
}

export function StarRating({ value, onChange, size = 'md', readOnly = false, className }: Props) {
  const [hover, setHover] = React.useState<number | null>(null)

  const sizeClass = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }[size]

  const displayValue = hover ?? value

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={(e) => {
            e.stopPropagation()
            if (onChange) {
              // Click same star again to clear rating
              onChange(value === star ? 0 : star)
            }
          }}
          onMouseEnter={() => !readOnly && setHover(star)}
          className={cn(
            'transition-transform',
            !readOnly && 'hover:scale-110 cursor-pointer',
            readOnly && 'cursor-default',
          )}
          title={`${star} 星${readOnly ? `（${value} 星）` : ''}`}
        >
          <Star
            className={cn(
              sizeClass,
              star <= displayValue
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/40',
            )}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="text-xs text-muted-foreground ml-1">{value.toFixed(1)}</span>
      )}
    </div>
  )
}
