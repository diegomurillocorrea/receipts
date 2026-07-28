const LOGO_LIGHT_SRC = "/logos/daiego-light.svg"
const LOGO_DARK_SRC = "/logos/daiego-dark.svg"

export function DaiegoLogo({
  className = "",
  width = 180,
  height = 54,
  priority = false,
}) {
  const sharedProps = {
    alt: "DAIEGO",
    width,
    height,
    decoding: "async",
    ...(priority ? { fetchPriority: "high" } : {}),
  }

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <img
        {...sharedProps}
        src={LOGO_LIGHT_SRC}
        className="h-full w-full object-contain dark:hidden"
      />
      <img
        {...sharedProps}
        src={LOGO_DARK_SRC}
        alt=""
        className="hidden h-full w-full object-contain dark:block"
        aria-hidden
      />
    </span>
  )
}
