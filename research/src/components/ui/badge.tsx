import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from './utils'

const badgeVariants = cva('inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none', {
  variants: {
    variant: {
      default: 'border-transparent bg-muted text-muted-foreground',
      outline: 'text-muted-foreground',
      up: 'border-transparent bg-up/12 text-up',
      down: 'border-transparent bg-down/12 text-down',
      neutral: 'border-transparent bg-neutral/15 text-neutral',
      primary: 'border-transparent bg-primary/12 text-primary',
      ai: 'border-ai/40 bg-ai/10 text-ai',
      sample: 'border-warn-fg/30 bg-warn-bg text-warn-fg',
    },
  },
  defaultVariants: { variant: 'default' },
})

export function Badge({ className, variant, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
