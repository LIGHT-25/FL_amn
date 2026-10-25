import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-lime-400",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-lime-400/15 text-lime-400 border-lime-400/25",
        secondary:
          "border-transparent bg-stone-800 text-stone-300",
        destructive:
          "border-transparent bg-red-500/15 text-red-400 border-red-500/25",
        outline:
          "border-stone-800 text-stone-400",
        success:
          "border-transparent bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
        warning:
          "border-transparent bg-amber-500/15 text-amber-400 border-amber-500/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
