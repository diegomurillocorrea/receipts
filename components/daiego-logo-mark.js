import { DaiegoLogo } from "@/components/daiego-logo"

/**
 * DAIEGO mark in a padded tile. Keeps the native 7:5 logo ratio so the frame
 * is not letterboxed inside a square container.
 *
 * Use tile="dark" on colored surfaces (e.g. emerald footer) so the mark always
 * renders as white-on-black regardless of theme.
 */
export function DaiegoLogoMark({
  className = "rounded-xl p-1",
  markClassName = "h-8",
  tile = "auto",
  priority = false,
}) {
  const tileClassName =
    tile === "dark" ? "bg-black" : "bg-white dark:bg-black"
  const logoVariant = tile === "dark" ? "dark" : "auto"

  return (
    <div className={`inline-flex shrink-0 ${tileClassName} ${className}`}>
      <div className={`relative aspect-[7/5] ${markClassName}`}>
        <DaiegoLogo
          variant={logoVariant}
          width={105}
          height={75}
          priority={priority}
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  )
}
