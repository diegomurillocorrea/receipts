import { DaiegoLogo } from "@/components/daiego-logo"

/**
 * Crops the square DAIEGO SVG to the centered 7:5 mark, then adds equal
 * padding on all sides. Use this whenever the mark should look balanced.
 */
export function DaiegoLogoMark({
  className = "rounded-lg p-1.5",
  markClassName = "h-8",
  priority = false,
}) {
  return (
    <div className={`shrink-0 bg-white dark:bg-black ${className}`}>
      <div className={`relative aspect-[7/5] overflow-hidden ${markClassName}`}>
        <div className="absolute left-1/2 top-1/2 aspect-square h-[160%] -translate-x-1/2 -translate-y-1/2">
          <DaiegoLogo
            width={240}
            height={240}
            priority={priority}
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  )
}
